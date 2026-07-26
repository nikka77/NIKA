// scripts/ops-rejoue-relectures.mjs — rejoue les relectures ORPHELINES (26/07 : Spirit Bomb
// bloquée par deux « fetch failed » du juge local — l'échec technique d'un juge ne doit pas
// laisser une production sans verdict pour toujours).
// Orpheline = production en attente (pending, done/suspect) dont un slot de juge est vide ou en
// erreur, et assez vieille pour ne plus être « en cours » (la file a une visibilité de 10 min).
// Usage : node --env-file=.env.local scripts/ops-rejoue-relectures.mjs [--dry] [--age-min=30]
import { createClient } from '@supabase/supabase-js';
import { fetchFandomProse } from './lib/fandom.mjs';
import { splitPreuves } from './lib/akasha-axes.mjs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');
const AGE_MIN = Number(process.argv.find((a) => a.startsWith('--age-min='))?.split('=')[1] ?? 30);

const { data: rows } = await supabase
  .from('agent_results')
  .select('id, task_type, target_slug, payload, result, auto_verdict, auto_motif, auto2_verdict, auto2_motif, created_at')
  .eq('review_status', 'pending')
  .in('status', ['done', 'suspect'])
  .neq('task_type', 'review_local')
  .lt('created_at', new Date(Date.now() - AGE_MIN * 60_000).toISOString())
  .order('id', { ascending: true })
  .limit(60);

// Un slot est à rejouer si : jamais rempli, ou rempli par une ERREUR technique (pas un verdict).
const enErreur = (verdict, motif) => !verdict && /error|failed|http \d|timeout/i.test(motif ?? '');
const jamaisJuge = (verdict, motif) => !verdict && !motif;

// MIROIR de chainReview (scripts/agent-worker.mjs) : mise en forme de la production pour le juge.
function productionDe(row) {
  if (row.task_type === 'akasha_attrs') {
    const { valeurs, preuves } = splitPreuves(row.result);
    const etablis = Object.entries(valeurs).filter(([, v]) => v && v !== 'inconnu');
    if (!etablis.length) return null;
    return etablis.map(([k, v]) => `${k} = ${v}  (preuve avancée : « ${preuves[k] ?? 'aucune'} »)`).join('\n');
  }
  if (row.task_type === 'akasha_relations') {
    const rel = row.result?.relations ?? [];
    if (!rel.length) return null;
    return rel.map((r) => `${r.avec} (${r.nature}, ${r.periode}) : ${r.resume}  (preuve avancée : « ${r.preuve} »)`).join('\n');
  }
  return row.result?.descFr ?? null;
}

const messages = [];
for (const row of rows ?? []) {
  const slots = [];
  if (enErreur(row.auto_verdict, row.auto_motif) || jamaisJuge(row.auto_verdict, row.auto_motif))
    slots.push({ juge_modele: 'ollama/gemma4:12b', slot: 'auto' });
  if (process.env.GEMINI_API_KEY && (enErreur(row.auto2_verdict, row.auto2_motif) || jamaisJuge(row.auto2_verdict, row.auto2_motif)))
    slots.push({ juge_modele: 'gemini/gemini-flash-lite-latest', slot: 'auto2' });
  if (!slots.length) continue;

  const production = productionDe(row);
  if (!production) continue;                                 // rien à juger (abstention honnête)
  const p = row.payload ?? {};
  const page = await fetchFandomProse(p.universe, p.name).catch(() => null);
  if (!page?.text) continue;                                 // pas de source → pas de jugement

  for (const j of slots) {
    console.log(`  ↻ #${row.id} ${row.target_slug} → ${j.slot} (${j.juge_modele.split('/')[1] ?? j.juge_modele})`);
    messages.push({
      type: 'review_local',
      payload: {
        reviewed_id: row.id, slug: row.target_slug, name: p.name, universe: p.universe,
        production, source: page.text.slice(0, 4500), ...j,
      },
    });
  }
}

console.log(`${messages.length} relecture(s) orpheline(s) à rejouer`);
if (!DRY && messages.length) {
  const { data: ids, error } = await supabase.rpc('ops_queue_send_batch', { messages });
  console.log(error ? 'envoi pgmq: ' + error.message : `→ ${ids?.length ?? 0} envoyée(s)`);
}
