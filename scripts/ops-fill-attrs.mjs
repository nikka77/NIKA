// scripts/ops-fill-attrs.mjs — met en file les fiches à qui il MANQUE des axes de taxonomie.
// Ce sont ces axes qui alimentent les filtres et les zones AKASHA (village, clan, équipage, division…).
// Usage : node --env-file=.env.local scripts/ops-fill-attrs.mjs [--dry] [--limit=20] [--universe="Naruto"]
import { createClient } from '@supabase/supabase-js';
import { clientOps, clientSite } from '../lib/ops/db.mjs';
import { dejaEnFile, refusesParLaGarde } from './lib/deja-en-file.mjs';
import { AXES } from './lib/akasha-axes.mjs';

const supabase = clientOps();
const DRY = process.argv.includes('--dry');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 20);
const UNIVERSE = process.argv.find((a) => a.startsWith('--universe='))?.split('=')[1];

const universes = UNIVERSE ? [UNIVERSE] : Object.keys(AXES);
const { data, error } = await clientSite().from('akasha_entries')
  .select('slug, name, type, universe, summary, attributes')
  .eq('type', 'character')
  .in('universe', universes)
  .order('attributes->favorites', { ascending: false, nullsFirst: false })
  .limit(600);
if (error) { console.error(error.message); process.exit(1); }

// Idempotence : une fiche dont une production akasha_attrs attend déjà la review de Dan
// ne doit PAS être re-traitée (constaté le 26/07 : le remplisseur re-proposait les mêmes 6).
// PAGINÉ (07/08) : un `.select()` nu plafonne à 1 000 lignes chez PostgREST — le garde ne
// voyait que le premier millier d'une pile de 11 000 et laissait repartir tout le reste.
const dejaEnReview = await dejaEnFile(supabase, 'akasha_attrs');
// Voir scripts/lib/deja-en-file.mjs : un refus de garde est une impasse, pas un aléa.
const refusees = await refusesParLaGarde(supabase, 'akasha_attrs');

// une fiche est candidate si AU MOINS un axe de son univers est vide
const manquants = (e) => Object.keys(AXES[e.universe] ?? {}).filter((a) => !e.attributes?.[a]);
const candidates = (data ?? []).filter((e) => manquants(e).length && !(dejaEnReview.has(e.slug) || refusees.has(e.slug))).slice(0, LIMIT);

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
