// scripts/ops-fill-relations.mjs — met en file l'extraction des relations entre personnages.
// Usage : node --env-file=.env.local scripts/ops-fill-relations.mjs [--dry] [--limit=10]
//         [--universe="One Piece"] [--slug=trafalgar-law]
// Cible d'abord les personnages MAJEURS (favorites) : c'est là que l'histoire est la plus riche.
import { createClient } from '@supabase/supabase-js';
import { AXES } from './lib/akasha-axes.mjs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 10);
const UNIVERSE = process.argv.find((a) => a.startsWith('--universe='))?.split('=')[1];
const SLUG = process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1];

let q = supabase
  .from('akasha_entries')
  .select('slug, name, type, universe, summary, attributes')
  .eq('type', 'character')
  .order('attributes->favorites', { ascending: false, nullsFirst: false })
  .limit(400);
if (SLUG) q = q.eq('slug', SLUG);
else if (UNIVERSE) q = q.eq('universe', UNIVERSE);
else q = q.in('universe', Object.keys(AXES));
const { data, error } = await q;
if (error) { console.error(error.message); process.exit(1); }

// Idempotence : ni les fiches déjà pourvues, ni celles dont une production attend la review.
const { data: pendantes } = await supabase
  .from('agent_results')
  .select('target_slug')
  .eq('task_type', 'akasha_relations')
  .in('status', ['done', 'suspect', 'refused']);
const dejaEnReview = new Set((pendantes ?? []).map((r) => r.target_slug));

const candidates = (data ?? [])
  .filter((e) => !e.attributes?.relations && !dejaEnReview.has(e.slug))
  .slice(0, LIMIT);

console.log(`${candidates.length} fiches sans relations :`);
for (const c of candidates) console.log(`  · ${c.name} [${c.universe}]`);

if (DRY || !candidates.length) process.exit(0);

const messages = candidates.map((c) => ({
  type: 'akasha_relations',
  payload: { slug: c.slug, name: c.name, type: c.type, universe: c.universe, summary: c.summary },
}));
const { data: ids, error: sendErr } = await supabase.rpc('ops_queue_send_batch', { messages });
if (sendErr) { console.error('envoi pgmq:', sendErr.message); process.exit(1); }
console.log(`→ ${ids?.length ?? 0} tâches akasha_relations envoyées`);
