// scripts/ops-fill-flavor.mjs — remplissage pilote L1 : fiches AKASHA sans descFr → file agent_tasks.
// Usage :  node --env-file=.env.local scripts/ops-fill-flavor.mjs --dry   (liste les candidates, n'envoie rien)
//          node --env-file=.env.local scripts/ops-fill-flavor.mjs        (envoie 20 tâches dans pgmq)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');
const LOT = 20;

const { data, error } = await supabase
  .from('akasha_entries')
  .select('slug, name, type, universe, summary, category:attributes->>category, descFr:attributes->>descFr')
  .eq('type', 'character')
  .filter('attributes->>descFr', 'is', null)
  .not('summary', 'is', null)
  .order('name')
  .limit(80);
if (error) { console.error(error.message); process.exit(1); }

// Garde n°1 côté remplissage : ne mettre en file que des fiches avec assez de matière.
const candidates = (data ?? []).filter((e) => (e.summary ?? '').length >= 40).slice(0, LOT);
console.log(`${data?.length ?? 0} fiches sans descFr trouvées · ${candidates.length} retenues (summary ≥ 40 car.)`);
for (const c of candidates) console.log(`  · ${c.slug} — ${c.name} (${c.universe ?? '?'}, summary ${c.summary.length} car.)`);

if (DRY || !candidates.length) process.exit(0);

const messages = candidates.map((c) => ({
  type: 'flavor_akasha',
  payload: { slug: c.slug, name: c.name, type: c.type, universe: c.universe, category: c.category, summary: c.summary },
}));
const { data: ids, error: sendErr } = await supabase.rpc('ops_queue_send_batch', { messages });
if (sendErr) { console.error('envoi pgmq:', sendErr.message); process.exit(1); }
console.log(`→ ${ids?.length ?? 0} tâches envoyées dans agent_tasks`);
