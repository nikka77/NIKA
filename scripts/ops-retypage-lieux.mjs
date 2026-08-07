// scripts/ops-retypage-lieux.mjs — CHANTIER « RE-TYPAGE ET AXES » (07/08/2026).
//
// Re-type en `place` les fiches catalogées `status`/Organisation (Naruto) ou `status`/Équipage
// (One Piece) dont la PREUVE établit que ce sont des lieux, et corrige les axes devenus faux.
//
// PREUVE retenue, par fiche (jamais l'intuition) :
//   · Naruto  — catégorie de la page canon sur naruto.fandom.com (Villages / Locations / Countries),
//               relevée par action=query&prop=categories le 07/08 ; à défaut, nom en « -gakure » ou
//               en « … Village » (formes de preuve admises par le brief).
//   · OP      — catégorie de la page canon sur onepiece.fandom.com, ET absence de fiche `place`
//               JUMELLE. Les 31 fiches OP qui ont déjà un jumeau `place` (alabasta ↔ alabasta-lieu,
//               skypiea ↔ skypiea-lieu…) sont VOLONTAIREMENT LAISSÉES : les re-typer fabriquerait
//               deux lieux pour la même île. Elles relèvent de la fusion (plan, entrée 15b).
//
// AXES corrigés en même temps (une fiche re-typée doit rester cohérente) :
//   · attributes.category : 'Organisation' / 'Équipage' → 'Village' ou 'Lieu' (vocabulaire déjà
//     en place sur les 11 lieux Naruto et les 37 lieux OP qui portent une catégorie).
//   · attributes.scope    : RETIRÉ. 'Organisation' / 'Équipage pirate' est faux sur un lieu, et le
//     bloc « Attributs » est une liste de PUBLICATION : la clé s'afficherait telle quelle sur la
//     page publique, et la chip de la zone organigramme la lit (OrganizationZone l.35).
//   · attributes.region   : POSÉ uniquement quand la valeur FR est ATTESTÉE (infobox « Country » du
//     wiki recoupée avec le vocabulaire déjà en base / lib/akasha/naruto-world.ts). Aucun pays
//     traduit à vue : un trou honnête vaut mieux qu'une invention.
//   · attributes.organization des PERSONNAGES : les valeurs qui désignent une fiche re-typée en lieu
//     (« Fire Temple », « Konoha Orphanage ») sont retirées de l'axe — le fait survit dans le graphe
//     (arête `appartient`), vérifié fiche à fiche avant retrait.
//
// Usage :
//   node --env-file=.env.local scripts/ops-retypage-lieux.mjs            → trace + rapport, AUCUNE écriture
//   node --env-file=.env.local scripts/ops-retypage-lieux.mjs --appliquer → écrit après la trace
import fs from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';

const APPLIQUER = process.argv.includes('--appliquer');
const TRACE = 'data/audits/retypage-trace.json';
const RAPPORT = 'data/audits/retypage.json';

// ─────────────────────────────────────────────────────────────────────────────
// LA LISTE, PAR PREUVE. `wiki` = catégories relevées sur la page canon (vide = page absente).
// `cat` = catégorie AKASHA visée. `region` = valeur FR attestée, ou null (on ne pose rien).
// ─────────────────────────────────────────────────────────────────────────────
const NARUTO = [
  // — villages cachés (suffixe -gakure + catégorie wiki « Villages ») —
  { slug: 'hoshigakure',   wiki: ['Villages'], cat: 'Village', region: null,                   preuve: 'nom en -gakure + wiki:Villages ; infobox Country=Land of Bears (VF non attestée, en conflit avec naruto-world.ts « Pays des Étoiles » → rien posé)' },
  { slug: 'ishigakure',    wiki: ['Villages'], cat: 'Village', region: 'Pays de la Pierre',    preuve: 'nom en -gakure + wiki:Villages ; pays attesté NW_LANDMARKS' },
  { slug: 'kusagakure',    wiki: ['Villages'], cat: 'Village', region: "Pays de l'Herbe",      preuve: 'nom en -gakure + wiki:Villages ; pays attesté NW_LANDMARKS + region existante (tenchi-bridge)' },
  { slug: 'takigakure',    wiki: ['Villages'], cat: 'Village', region: 'Pays de la Cascade',   preuve: 'nom en -gakure + wiki:Villages ; pays attesté NW_LANDMARKS' },
  { slug: 'uzushiogakure', wiki: ['Villages'], cat: 'Village', region: 'Pays des Tourbillons', preuve: 'nom en -gakure + wiki:Villages ; infobox Country=Land of Whirlpools = NW_LANDMARKS' },
  { slug: 'yugakure',      wiki: ['Villages'], cat: 'Village', region: "Pays de l'Eau Chaude", preuve: 'nom en -gakure + wiki:Villages ; infobox Country=Land of Hot Water = NW_LANDMARKS' },
  { slug: 'yukigakure',    wiki: ['Villages'], cat: 'Village', region: null,                   preuve: 'nom en -gakure + wiki:Villages ; infobox Country=Land of Snow (VF non attestée)' },
  { slug: 'yumegakure',    wiki: ['Villages'], cat: 'Village', region: null,                   preuve: 'nom en -gakure + wiki:Villages ; pas de Country dans l’infobox' },
  // — villages nommés « … Village » (catégorie wiki « Villages ») —
  { slug: 'ceramic-village',      wiki: ['Villages'],             cat: 'Village', region: 'Pays du Vent',      preuve: 'wiki:Villages ; infobox Country=Land of Wind = NW_COUNTRIES' },
  { slug: 'daidai-village',       wiki: ['Stubs', 'Villages'],    cat: 'Village', region: null,                preuve: 'wiki:Villages (stub, pas d’infobox)' },
  { slug: 'howling-wolf-village', wiki: ['Villages'],             cat: 'Village', region: null,                preuve: 'wiki:Villages ; infobox Country=Land of Medicines (VF non attestée)' },
  { slug: 'nadeshiko-village',    wiki: ['Villages'],             cat: 'Village', region: null,                preuve: 'wiki:Villages ; pas de Country dans l’infobox' },
  { slug: 'takumi-village',       wiki: ['Villages'],             cat: 'Village', region: 'Pays de la Rivière', preuve: 'wiki:Villages ; infobox Country=Land of Rivers = NW_LANDMARKS (tanigakure)' },
  { slug: 'tonika-village',       wiki: ['Villages'],             cat: 'Village', region: 'Pays du Feu',       preuve: 'wiki:Villages ; infobox Country=Land of Fire = NW_COUNTRIES' },
  { slug: 'tree-felling-village', wiki: ['Locations', 'Villages'],cat: 'Village', region: null,                preuve: 'wiki:Locations+Villages' },
  { slug: 'tsuchigumo-village',   wiki: ['Villages'],             cat: 'Village', region: null,                preuve: 'wiki:Villages ; pas de Country dans l’infobox' },
  { slug: 'shuku-village',        wiki: [],                       cat: 'Village', region: null,                preuve: 'nom en « … Village » SEUL — page absente du wiki (recherche « Shuku » → aucun homologue) ; fiche vide, 0 arête' },
  // — autres lieux (catégorie wiki « Locations » / « Countries ») —
  { slug: 'benisu-island',       wiki: ['Countries'], cat: 'Lieu', region: null, preuve: 'wiki:Countries' },
  { slug: 'fire-temple',         wiki: ['Locations'], cat: 'Lieu', region: null, preuve: 'wiki:Locations' },
  { slug: 'green-banks',         wiki: ['Locations'], cat: 'Lieu', region: null, preuve: 'wiki:Locations' },
  { slug: 'kazahana-castle',     wiki: ['Locations'], cat: 'Lieu', region: null, preuve: 'wiki:Locations' },
  { slug: 'konoha-orphanage',    wiki: ['Locations'], cat: 'Lieu', region: null, preuve: 'wiki:Locations' },
  { slug: 'moon',                wiki: ['Locations'], cat: 'Lieu', region: null, preuve: 'wiki:Locations' },
  { slug: 'mount-shumisen',      wiki: ['Locations'], cat: 'Lieu', region: null, preuve: 'wiki:Locations' },
  { slug: 'roran',               wiki: ['Countries'], cat: 'Lieu', region: null, preuve: 'wiki:Countries' },
  { slug: 'temujin-s-continent', wiki: ['Locations'], cat: 'Lieu', region: null, preuve: 'wiki:Locations' },
  // — lieux à nom FR (résolus sur leur titre canon EN) —
  { slug: 'caverne-ryuchi', wiki: ['Locations', 'Villages'], cat: 'Lieu', region: null, preuve: 'titre canon « Ryūchi Cave » → wiki:Locations+Villages' },
  { slug: 'foret-shikkotsu', wiki: ['Locations', 'Villages'], cat: 'Lieu', region: null, preuve: 'titre canon « Shikkotsu Forest » → wiki:Locations+Villages' },
  { slug: 'mont-myoboku',   wiki: ['Villages'],              cat: 'Lieu', region: null, preuve: 'titre canon « Mount Myōboku » → wiki:Villages (terre des crapauds, pas un village ninja → Lieu)' },
];

const ONE_PIECE = [
  { slug: 'elegia',                         wiki: ['Archipelagos'],                                                                  cat: 'Lieu', region: null,        preuve: 'wiki « Elegia » : Archipelagos ; aucun jumeau `place`' },
  { slug: 'gran-tesero',                    wiki: ['Non-Canon New World Locations', 'Non-Canon Towns and Cities', 'Non-Canon Ships'], cat: 'Lieu', region: 'New World', preuve: 'titre canon « Gran Tesoro » ; wiki:Non-Canon New World Locations ; aucun jumeau `place`' },
  { slug: 'ile-d-asuka',                    wiki: ['Non-Canon Paradise Islands'],                                                    cat: 'Lieu', region: 'Paradise',  preuve: 'titre canon « Asuka Island » ; wiki:Non-Canon Paradise Islands ; aucun jumeau `place`' },
  { slug: 'ile-de-mecha',                   wiki: ['Non-Canon Paradise Islands', 'Non-Canon Animals'],                               cat: 'Lieu', region: 'Paradise',  preuve: 'titre canon « Mecha Island » ; wiki:Non-Canon Paradise Islands ; aucun jumeau `place`' },
  { slug: 'iile-de-la-couronne',            wiki: ['Non-Canon Paradise Islands', 'Location Stubs'],                                  cat: 'Lieu', region: 'Paradise',  preuve: 'titre canon « O-Kan Island » ; wiki:Non-Canon Paradise Islands ; aucun jumeau `place`' },
  { slug: 'la-lune',                        wiki: ['Locations'],                                                                     cat: 'Lieu', region: null,        preuve: 'titre canon « Moon » ; wiki:Locations ; aucun jumeau `place`' },
  { slug: 'royaume-malefique-de-black-drum',wiki: ['World Government Kingdoms', 'South Blue Locations'],                             cat: 'Lieu', region: 'South Blue',preuve: 'titre canon « Evil Black Drum Kingdom » ; wiki:World Government Kingdoms ; aucun jumeau `place`' },
];

// Axe `organization` devenu FAUX après re-typage : la valeur désigne un LIEU.
// Le fait n'est pas perdu : chaque fiche doit porter l'arête `appartient` vers ce lieu (vérifié).
const AXE_ORG_FAUX = ['Fire Temple', 'Konoha Orphanage'];

const CIBLES = [
  ...NARUTO.map((x) => ({ ...x, universe: 'Naruto' })),
  ...ONE_PIECE.map((x) => ({ ...x, universe: 'One Piece' })),
];

const canon = (v) => (v === null || typeof v !== 'object' ? v
  : Array.isArray(v) ? v.map(canon)
  : Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])));

const s = clientSite();

async function pagineParSlug(slugs, cols) {
  const out = [];
  for (let i = 0; i < slugs.length; i += 80) {
    const { data, error } = await s.from('akasha_entries').select(cols).in('slug', slugs.slice(i, i + 80));
    if (error) throw new Error(error.message);
    out.push(...data);
  }
  return out;
}

async function scanUnivers(universe, cols) {
  const out = []; let from = 0;
  for (;;) {
    const { data, error } = await s.from('akasha_entries').select(cols).eq('universe', universe).order('slug').range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return out;
}

async function comptesParType(universe) {
  const out = {};
  for (const t of ['character', 'place', 'artifact', 'profession', 'status', 'power', 'skill']) {
    const { count } = await s.from('akasha_entries').select('id', { count: 'exact', head: true }).eq('universe', universe).eq('type', t);
    out[t] = count;
  }
  return out;
}

// ═══ 1. ÉTAT AVANT (lu JUSTE avant l'écriture) ═══════════════════════════════
const slugs = CIBLES.map((c) => c.slug);
const avant = await pagineParSlug(slugs, 'id,slug,name,type,universe,attributes');
const parSlug = Object.fromEntries(avant.map((r) => [r.slug, r]));

const manquants = slugs.filter((sl) => !parSlug[sl]);

// Fiches personnages dont l'axe organization désigne un lieu re-typé.
const naruto = await scanUnivers('Naruto', 'id,slug,type,org:attributes->>organization');
const axeFaux = naruto.filter((r) => r.org && AXE_ORG_FAUX.includes(r.org));
const axeFauxDetail = await pagineParSlug(axeFaux.map((r) => r.slug), 'id,slug,name,type,attributes');
const axeFauxParSlug = Object.fromEntries(axeFauxDetail.map((r) => [r.slug, r]));

// L'arête `appartient` existe-t-elle bien vers le lieu ? (motif du retrait : redondance avec le graphe)
const lieuxOrg = avant.filter((r) => AXE_ORG_FAUX.includes(r.name));
const lieuIdParNom = Object.fromEntries(lieuxOrg.map((r) => [r.name, r.id]));
const { data: aretes, error: eA } = await s.from('akasha_relations')
  .select('from_entry,to_entry,relation').in('to_entry', Object.values(lieuIdParNom));
if (eA) throw new Error(eA.message);
const arSet = new Set((aretes ?? []).filter((a) => a.relation === 'appartient').map((a) => `${a.from_entry}|${a.to_entry}`));

const comptesAvant = { Naruto: await comptesParType('Naruto'), 'One Piece': await comptesParType('One Piece') };

const trace = {
  chantier: 'retypage-et-axes',
  date: new Date().toISOString(),
  depot: '/Users/macbookprom1pro/dev/NIKA',
  note: 'ÉTAT AVANT, lu juste avant écriture. attributes complet par slug (type ET attributs).',
  comptes_par_type_avant: comptesAvant,
  candidats: CIBLES.length,
  candidats_introuvables: manquants,
  fiches: avant
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((r) => {
      const c = CIBLES.find((x) => x.slug === r.slug);
      return {
        slug: r.slug, id: r.id, name: r.name, universe: r.universe,
        type_avant: r.type,
        attributes_avant: canon(r.attributes),
        preuve: c.preuve, wiki_categories: c.wiki,
        vise: { type: 'place', category: c.cat, region: c.region, scope: '(retiré)' },
      };
    }),
  axe_organization_faux: axeFauxDetail
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((r) => ({
      slug: r.slug, id: r.id, name: r.name,
      attributes_avant: canon(r.attributes),
      valeur_retiree: r.attributes.organization,
      motif: `« ${r.attributes.organization} » est un LIEU (preuve wiki ci-dessus), pas une organisation : l'axe organization du hub Naruto le présenterait comme une organisation alors que la fiche est désormais typée place`,
      fait_conserve_par_arete_appartient: arSet.has(`${r.id}|${lieuIdParNom[r.attributes.organization]}`),
    })),
};

fs.mkdirSync('data/audits', { recursive: true });
fs.writeFileSync(TRACE, JSON.stringify(trace, null, 1));
console.log(`TRACE écrite : ${TRACE} — ${trace.fiches.length} fiches + ${trace.axe_organization_faux.length} axes`);
if (manquants.length) console.log('  ⚠ introuvables :', manquants.join(', '));

if (!APPLIQUER) {
  console.log('\n(trace seule — relancer avec --appliquer pour écrire)');
  process.exit(0);
}

// ═══ 2. APPLICATION ══════════════════════════════════════════════════════════
const journal = { retypages: [], axes: [], echecs: [] };

for (const c of CIBLES) {
  const r = parSlug[c.slug];
  if (!r) { journal.echecs.push({ slug: c.slug, raison: 'fiche introuvable' }); continue; }
  const a = { ...r.attributes };
  const retires = [];
  if ('scope' in a) { retires.push({ cle: 'scope', valeur: a.scope }); delete a.scope; }
  const catAvant = a.category ?? null;
  a.category = c.cat;
  let regionPosee = null;
  if (c.region && !a.region) { a.region = c.region; regionPosee = c.region; }
  const { error } = await s.from('akasha_entries').update({ type: 'place', attributes: a }).eq('id', r.id);
  if (error) { journal.echecs.push({ slug: c.slug, raison: error.message }); continue; }
  journal.retypages.push({
    slug: c.slug, universe: r.universe, name: r.name,
    type: `${r.type} → place`,
    category: `${catAvant} → ${c.cat}`,
    scope_retire: retires,
    region_posee: regionPosee,
    preuve: c.preuve,
  });
}

for (const t of trace.axe_organization_faux) {
  const r = axeFauxParSlug[t.slug];
  const a = { ...r.attributes };
  const valeur = a.organization;
  delete a.organization;
  const { error } = await s.from('akasha_entries').update({ attributes: a }).eq('id', r.id);
  if (error) { journal.echecs.push({ slug: t.slug, raison: error.message }); continue; }
  journal.axes.push({ slug: t.slug, axe: 'organization', valeur_retiree: valeur, motif: t.motif, arete_appartient_conservee: t.fait_conserve_par_arete_appartient });
}

// ═══ 3. COMPTE CROISÉ AUX DEUX BOUTS ═════════════════════════════════════════
const apres = await pagineParSlug(slugs, 'id,slug,type,attributes');
const apresParSlug = Object.fromEntries(apres.map((r) => [r.slug, r]));
const comptesApres = { Naruto: await comptesParType('Naruto'), 'One Piece': await comptesParType('One Piece') };

const verif = CIBLES.map((c) => {
  const r = apresParSlug[c.slug];
  return {
    slug: c.slug,
    type_ok: r?.type === 'place',
    category_ok: r?.attributes?.category === c.cat,
    scope_absent_ok: r ? !('scope' in r.attributes) : false,
    region: r?.attributes?.region ?? null,
  };
});
const narutoApres = await scanUnivers('Naruto', 'slug,org:attributes->>organization');
const resteFaux = narutoApres.filter((r) => r.org && AXE_ORG_FAUX.includes(r.org));

const rapport = {
  chantier: 'retypage-et-axes',
  date: new Date().toISOString(),
  trace: TRACE,
  regle_de_preuve: 'catégorie de la page canon Fandom (prop=categories, 07/08) ; à défaut nom en -gakure / « … Village » ; côté OP, exigence supplémentaire : AUCUNE fiche place jumelle',
  compte_croise: {
    candidats: CIBLES.length,
    traites: journal.retypages.length,
    sautes: journal.echecs.length,
    somme_ok: journal.retypages.length + journal.echecs.length === CIBLES.length,
    verifies_type_place: verif.filter((v) => v.type_ok).length,
    verifies_category: verif.filter((v) => v.category_ok).length,
    verifies_scope_retire: verif.filter((v) => v.scope_absent_ok).length,
    axes_organization_candidats: trace.axe_organization_faux.length,
    axes_organization_traites: journal.axes.length,
    axes_organization_restants: resteFaux.length,
  },
  comptes_par_type: { avant: comptesAvant, apres: comptesApres },
  retypages: journal.retypages,
  axes_corriges: journal.axes,
  echecs: journal.echecs,
  verification_fiche_a_fiche: verif,
};
fs.writeFileSync(RAPPORT, JSON.stringify(rapport, null, 1));
console.log(`\nRAPPORT : ${RAPPORT}`);
console.log(JSON.stringify(rapport.compte_croise, null, 1));
console.log('types avant/après :', JSON.stringify(comptesAvant), '→', JSON.stringify(comptesApres));
