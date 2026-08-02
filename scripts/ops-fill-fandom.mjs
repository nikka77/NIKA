// scripts/ops-fill-fandom.mjs — remplit la file avec des tâches d'ENRICHISSEMENT Fandom.
// Cible : fiches sans descFr, dans un univers couvert par un wiki, les plus notoires d'abord
// (une fiche notoire a une vraie page canon → matière réelle ; la longue traîne n'apporte rien).
// Usage : node --env-file=.env.local scripts/ops-fill-fandom.mjs [--dry] [--limit=12] [--universe="Naruto"]
import { createClient } from '@supabase/supabase-js';
import { clientOps, clientSite } from '../lib/ops/db.mjs';
import { WIKIS } from './lib/fandom.mjs';

const supabase = clientOps();
const DRY = process.argv.includes('--dry');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 12);
const UNIVERSE = process.argv.find((a) => a.startsWith('--universe='))?.split('=')[1];

let q = clientSite().from('akasha_entries')
  .select('slug, name, type, universe, summary, attributes')
  .eq('type', 'character')
  .filter('attributes->>descFr', 'is', null)
  .in('universe', UNIVERSE ? [UNIVERSE] : Object.keys(WIKIS))
  .order('attributes->favorites', { ascending: false, nullsFirst: false })
  .limit(LIMIT * 2);

const { data, error } = await q;
if (error) { console.error(error.message); process.exit(1); }

const candidates = (data ?? []).slice(0, LIMIT);
console.log(`${candidates.length} fiches retenues (sans descFr, univers avec wiki) :`);
for (const c of candidates)
  console.log(`  · ${String(c.attributes?.favorites ?? 0).padStart(5)} fav — ${c.name} [${c.universe}]`);

if (DRY || !candidates.length) process.exit(0);

const messages = candidates.map((c) => ({
  type: 'fandom_descfr',
  payload: { slug: c.slug, name: c.name, type: c.type, universe: c.universe, summary: c.summary },
}));
const { data: ids, error: sendErr } = await supabase.rpc('ops_queue_send_batch', { messages });
if (sendErr) { console.error('envoi pgmq:', sendErr.message); process.exit(1); }
console.log(`→ ${ids?.length ?? 0} tâches fandom_descfr envoyées`);
