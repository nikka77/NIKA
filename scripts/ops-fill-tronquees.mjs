// scripts/ops-fill-tronquees.mjs — remet en file les descFr COUPÉES EN PLEINE PHRASE.
//
// Audit du 01/08 : 104 fiches de la base finissent en plein mot — « …et sa réponse extérieure
// fut de » (Naruto), « …se téléporter vers n'importe quel endroit à l'aide de » (Minato).
// Origine : un slice() brut au caractère dans les scripts de build (descRaw coupé à 1 200 ou
// 1 500), que la traduction recopiait fidèlement. Ces fiches sont invisibles pour les autres
// remplisseurs, qui ne ciblent que `descFr IS NULL` — d'où ce ramasseur dédié.
//
// Le worker refuse désormais d'écrire une descFr sans ponctuation finale (schéma DescFr),
// donc les fiches reproduites ici sortiront entières ou pas du tout.
//
// Usage : node --env-file=.env.local scripts/ops-fill-tronquees.mjs [--dry] [--limit=50] [--universe="Naruto"]
import { createClient } from '@supabase/supabase-js';
import { clientOps, clientSite } from '../lib/ops/db.mjs';
import { dejaEnFile, refusesParLaGarde } from './lib/deja-en-file.mjs';

const supabase = clientOps();
const DRY = process.argv.includes('--dry');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 50);
const UNIVERSE = process.argv.find((a) => a.startsWith('--universe='))?.split('=')[1];

// Fin acceptable : ponctuation de phrase, guillemet ou parenthèse fermante.
const FIN_OK = /[.!?…»"”)\]]$/;
// Certaines fiches finissent par une métadonnée collée (« Première apparition : Épisode 318 ») :
// ce n'est pas une phrase coupée, on ne les retouche pas.
const META_FINALE = /(première apparition|premiere apparition|chapitre\s*:|épisode\s*:|episode\s*:|source\s*:)[^.]{0,60}$/i;
// Le type de l'entrée décide du rôle d'expert qui la reprend (miroir de ops-fill-fiches.mjs).
const TACHE_POUR = {
  character: 'fandom_descfr', power: 'fiche_technique', skill: 'fiche_technique',
  artifact: 'fiche_artefact', place: 'fiche_lieu',
  status: 'fiche_lexique', profession: 'fiche_lexique',
};

// PAGINATION OBLIGATOIRE : Supabase plafonne une réponse à 1 000 lignes. Sans elle, on ne
// scannait que 13 % de la base et on ne « trouvait » que 3 fiches coupées sur 104 (01/08).
const data = [];
for (let debut = 0; ; debut += 1000) {
  let q = clientSite().from('akasha_entries')
    .select('slug, name, type, universe, summary, attributes')
    .order('slug').range(debut, debut + 999);
  if (UNIVERSE) q = q.eq('universe', UNIVERSE);
  const { data: page, error } = await q;
  if (error) { console.error('lecture entrées :', error.message); process.exit(1); }
  data.push(...(page ?? []));
  if ((page?.length ?? 0) < 1000) break;
}

// Les fiches déjà en attente de relecture ne sont pas remises en file (idempotence).
// PAGINÉ (07/08) : un `.select()` nu plafonne à 1 000 lignes chez PostgREST — le garde ne
// voyait que le premier millier d'une pile de 11 000 et laissait repartir tout le reste.
const dejaEnReview = await dejaEnFile(supabase);
// Voir scripts/lib/deja-en-file.mjs : un refus de garde est une impasse, pas un aléa.
const refusees = await refusesParLaGarde(supabase);

const coupees = data.filter((e) => {
  const d = String(e.attributes?.descFr ?? '').trim();
  if (!d || d.length < 40) return false;
  if (FIN_OK.test(d) || META_FINALE.test(d)) return false;
  return TACHE_POUR[e.type] && !(dejaEnReview.has(e.slug) || refusees.has(e.slug));
});

console.log(`${coupees.length} fiche(s) coupée(s) en pleine phrase${UNIVERSE ? ` (${UNIVERSE})` : ''}`);
for (const e of coupees.slice(0, 8)) {
  console.log(`  · ${e.name} [${e.type}] …${String(e.attributes.descFr).slice(-60)}`);
}
const lot = coupees.slice(0, LIMIT);
if (!lot.length) process.exit(0);
if (DRY) { console.log(`(à blanc — ${lot.length} seraient mises en file)`); process.exit(0); }

const messages = lot.map((e) => ({
  type: TACHE_POUR[e.type],
  payload: { slug: e.slug, name: e.name, type: e.type, universe: e.universe, summary: e.summary },
}));
const { error: eFile } = await supabase.rpc('ops_queue_send_batch', { messages });
if (eFile) { console.error('mise en file :', eFile.message); process.exit(1); }
console.log(`${lot.length} fiche(s) remise(s) en file pour reproduction complète`);
