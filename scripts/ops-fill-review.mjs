// scripts/ops-fill-review.mjs — met en file la RELECTURE LOCALE des résultats en attente.
// Le juge local n'applique rien : il annote (auto_verdict / auto_motif) pour trier la file
// humaine — « valide » se survole, « a_corriger » et « rejeter » se regardent en priorité.
// Usage : node --env-file=.env.local scripts/ops-fill-review.mjs [--dry] [--limit=30] [--re]
import { createClient } from '@supabase/supabase-js';
import { clientOps } from '../lib/ops/db.mjs';
import { splitPreuves } from './lib/akasha-axes.mjs';
import { fetchFandomProse } from './lib/fandom.mjs';

const supabase = clientOps();
const DRY = process.argv.includes('--dry');
const REDO = process.argv.includes('--re');           // rejuger même si un verdict existe
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 30);

let q = supabase
  .from('agent_results')
  .select('id, task_type, target_slug, payload, result, status, auto_verdict')
  .eq('review_status', 'pending')
  .in('status', ['done', 'suspect'])
  .order('id', { ascending: false })
  .limit(LIMIT * 2);

const { data, error } = await q;
if (error) { console.error(error.message); process.exit(1); }

const rows = (data ?? []).filter((r) => REDO || !r.auto_verdict).slice(0, LIMIT);
console.log(`${rows.length} production(s) à faire relire`);

const messages = [];
for (const r of rows) {
  // production lisible par le juge (prose ou attributs+preuves)
  let production;
  if (r.task_type === 'akasha_attrs') {
    const { valeurs, preuves } = splitPreuves(r.result);
    const etablis = Object.entries(valeurs).filter(([, v]) => v && v !== 'inconnu');
    // Une abstention totale n'est pas une erreur à juger : le juge local la classait « à corriger »
    // alors qu'elle est légitime. Le code tranche, pas le modèle (mesure du 25/07).
    if (!etablis.length) { console.log(`  ⊘ ${r.payload?.name ?? r.target_slug} — abstention, rien à juger`); continue; }
    production = etablis
      .map(([k, v]) => `${k} = ${v}  (preuve avancée : « ${preuves[k] ?? 'aucune'} »)`)
      .join('\n');
  } else {
    production = r.result?.descFr ?? JSON.stringify(r.result);
  }

  // la source de vérité : l'article canon (cache disque → quasi gratuit)
  const page = await fetchFandomProse(r.payload?.universe, r.payload?.name);
  if (!page?.text) { console.log(`  ⊘ ${r.payload?.name ?? r.target_slug} — pas de source vérifiable`); continue; }

  messages.push({
    type: 'review_local',
    payload: {
      reviewed_id: r.id,
      slug: r.target_slug,
      name: r.payload?.name,
      universe: r.payload?.universe,
      production,
      source: page.text.slice(0, 4500),
    },
  });
  console.log(`  · ${r.payload?.name ?? r.target_slug} (${r.task_type})`);
}

if (DRY || !messages.length) process.exit(0);
const { data: ids, error: sendErr } = await supabase.rpc('ops_queue_send_batch', { messages });
if (sendErr) { console.error('envoi pgmq:', sendErr.message); process.exit(1); }
console.log(`→ ${ids?.length ?? 0} relectures envoyées`);
