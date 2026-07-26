// scripts/ops-fill-fiches.mjs — met en file les fiches d'un RÔLE (techniques, artefacts, lieux, lexique).
// Usage : node --env-file=.env.local scripts/ops-fill-fiches.mjs --role=fiche_technique
//         [--dry] [--limit=10] [--universe="Naruto"] [--slug=rasengan]
// Le rôle définit les types d'entrées couverts (scripts/lib/akasha-roles.mjs) ; l'expert de
// l'univers rédige, la chaîne de contrôle (garde → juge → review Dan) est la même que partout.
import { createClient } from '@supabase/supabase-js';
import { ROLES, typesFor } from './lib/akasha-roles.mjs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');
const ROLE = process.argv.find((a) => a.startsWith('--role='))?.split('=')[1];
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 10);
const UNIVERSE = process.argv.find((a) => a.startsWith('--universe='))?.split('=')[1];
const SLUG = process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1];

if (!ROLES[ROLE]) {
  console.error(`--role obligatoire, parmi : ${Object.keys(ROLES).join(', ')}`);
  process.exit(1);
}

let q = supabase
  .from('akasha_entries')
  .select('slug, name, type, universe, summary, attributes')
  .in('type', typesFor(ROLE))
  .order('attributes->favorites', { ascending: false, nullsFirst: false })
  .limit(800);
if (SLUG) q = q.eq('slug', SLUG);
if (UNIVERSE) q = q.eq('universe', UNIVERSE);
const { data, error } = await q;
if (error) { console.error(error.message); process.exit(1); }

// Idempotence : ni fiches déjà rédigées, ni productions en attente de review.
const { data: pendantes } = await supabase
  .from('agent_results')
  .select('target_slug')
  .eq('task_type', ROLE)
  .in('status', ['done', 'suspect', 'refused']);
const dejaEnReview = new Set((pendantes ?? []).map((r) => r.target_slug));

const candidates = (data ?? [])
  .filter((e) => !e.attributes?.descFr && !dejaEnReview.has(e.slug))
  .slice(0, LIMIT);

console.log(`${ROLES[ROLE].nom} — ${candidates.length} fiche(s) à rédiger :`);
for (const c of candidates) console.log(`  · ${c.name} [${c.universe} · ${c.type}]`);

if (DRY || !candidates.length) process.exit(0);

const messages = candidates.map((c) => ({
  type: ROLE,
  payload: { slug: c.slug, name: c.name, type: c.type, universe: c.universe, summary: c.summary },
}));
const { data: ids, error: sendErr } = await supabase.rpc('ops_queue_send_batch', { messages });
if (sendErr) { console.error('envoi pgmq:', sendErr.message); process.exit(1); }
console.log(`→ ${ids?.length ?? 0} tâche(s) ${ROLE} envoyée(s)`);
