// scripts/ops-fill-attrs.mjs — met en file les fiches à qui il MANQUE des axes de taxonomie.
// Ce sont ces axes qui alimentent les filtres et les zones AKASHA (village, clan, équipage, division…).
// Usage : node --env-file=.env.local scripts/ops-fill-attrs.mjs [--dry] [--limit=20] [--universe="Naruto"]
import { createClient } from '@supabase/supabase-js';
import { AXES } from './lib/akasha-axes.mjs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 20);
const UNIVERSE = process.argv.find((a) => a.startsWith('--universe='))?.split('=')[1];

const universes = UNIVERSE ? [UNIVERSE] : Object.keys(AXES);
const { data, error } = await supabase
  .from('akasha_entries')
  .select('slug, name, type, universe, summary, attributes')
  .eq('type', 'character')
  .in('universe', universes)
  .order('attributes->favorites', { ascending: false, nullsFirst: false })
  .limit(600);
if (error) { console.error(error.message); process.exit(1); }

// une fiche est candidate si AU MOINS un axe de son univers est vide
const manquants = (e) => Object.keys(AXES[e.universe] ?? {}).filter((a) => !e.attributes?.[a]);
const candidates = (data ?? []).filter((e) => manquants(e).length).slice(0, LIMIT);

console.log(`${candidates.length} fiches avec des axes manquants :`);
for (const c of candidates)
  console.log(`  · ${c.name} [${c.universe}] → manque : ${manquants(c).join(', ')}`);

if (DRY || !candidates.length) process.exit(0);

const messages = candidates.map((c) => ({
  type: 'akasha_attrs',
  payload: { slug: c.slug, name: c.name, type: c.type, universe: c.universe, summary: c.summary, manquants: manquants(c) },
}));
const { data: ids, error: sendErr } = await supabase.rpc('ops_queue_send_batch', { messages });
if (sendErr) { console.error('envoi pgmq:', sendErr.message); process.exit(1); }
console.log(`→ ${ids?.length ?? 0} tâches akasha_attrs envoyées`);
