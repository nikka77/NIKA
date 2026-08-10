// scripts/descfr-appliquer-fr.mjs — DÉCIDE puis POSE les descriptions extraites du wiki FR.
//
// Séparé du crawl (`descfr-wiki-fr.mjs`) exprès : la résolution coûte un quart d'heure d'appels au
// wiki, la décision se rejoue en trois secondes sur sa trace. Deux étapes, deux fichiers.
//
// ── CE QUE CE SCRIPT AJOUTE AUX GARDES DU CRAWL ───────────────────────────────────────────────
//
// 1. LA GARDE D'ENRICHISSEMENT. Le gabarit affiche `bio = attributes.bio || attributes.descFr ||
//    entry.summary` (EntityZone/CharacterZone/OrganizationZone) et la méta-description fait pareil
//    (`flavorExcerpt(descFr,155) ?? summary`). Poser un descFr ne remplit donc pas un vide : il
//    CACHE le résumé. Sur `sweet-city`, le résumé en base dit « Capitale de Totto Land, dressée sur
//    Whole Cake Island. Bâtie en confiseries comestibles… » (161 signes) et le chapeau du wiki FR
//    dit « Sweet City est la capitale de l'Archipel Totto Land, se trouvant sur l'île de Whole Cake
//    Island. » (96) : écrire, ici, ferait RECULER la page. C'est la faute du 10/08 (« un plancher de
//    longueur a fait écrire des résumés pires là où mieux existait »), prise à l'endroit où elle se
//    reproduirait. On n'écrit donc que si le texte extrait apporte STRICTEMENT plus : au moins aussi
//    long que le résumé, ET au moins trois mots significatifs que le résumé n'a pas.
//
// 2. LES FICHES DÉJÀ TRANCHÉES À LA MAIN. Sept portent `descFrRetiree` / `descFrImpossible` /
//    `descFrPurgee` : un humain a retiré leur texte pour un motif écrit (« décrit le Mangekyō de
//    base, n'explique jamais ce qui rend l'Éternel éternel »). Le tiroir par défaut est celui qui
//    existait : on ne réécrit pas par-dessus une décision motivée, on la SIGNALE.
//
// 3. LES TROIS FICHES DONT LE NOM EST UN MESSAGE D'ERREUR DE WIKI (bandeau d'ébauche, note de
//    renvoi, message de validation Semantic MediaWiki). Ce ne sont pas des entités : leur donner un
//    texte, ce serait les faire passer pour telles.
//
// Usage :
//   node --env-file=.env.local scripts/descfr-appliquer-fr.mjs --trace=data/audits/<crawl>.json --dry
//   node --env-file=.env.local scripts/descfr-appliquer-fr.mjs --trace=… --appliquer [--n=20]
import { writeFile, readFile } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';

const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const TRACE = arg('trace');
const DRY = !process.argv.includes('--appliquer');
const N = Number(arg('n', 0));
const SEULEMENT = arg('slugs')?.split(',').map((x) => x.trim()).filter(Boolean) ?? null;
if (!TRACE) { console.error('--trace=<fichier du crawl> obligatoire'); process.exit(1); }

const motsNus = (s) => new Set(String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().split(/[^a-z0-9]+/).filter((m) => m.length > 3));
/** Mots significatifs que le texte apporte et que le résumé n'a pas. */
function motsNeufs(texte, resume) {
  const r = motsNus(resume);
  return [...motsNus(texte)].filter((m) => !r.has(m));
}
/** Nom de fiche qui n'est pas un nom : bandeau d'ébauche, note de renvoi, message de validation. */
const NOM_ABIME = /is not in the list|this article is a stub|this article is about .* for the/i;

const horodatage = new Date().toISOString().replace(/[:.]/g, '-');
const crawl = JSON.parse(await readFile(TRACE, 'utf8'));
const candidats = (crawl.cas ?? []).filter((c) => c.etat === 'candidat' && c.descFr);
console.log(`crawl : ${crawl.cas.length} fiche(s) sondée(s) · ${candidats.length} candidat(s)`);

// État courant de la base — PAGINÉ (un select nu s'arrête à 1 000 lignes sans le dire).
const s = clientSite();
const PAS = 1000; const corpus = [];
for (let d = 0; ; d += PAS) {
  const { data, error } = await s.from('akasha_entries')
    .select('id,slug,name,universe,summary,attributes').order('id').range(d, d + PAS - 1);
  if (error) throw new Error(`lecture @${d} : ${error.message}`);
  corpus.push(...(data ?? []));
  if (!data || data.length < PAS) break;
}
const parSlug = new Map(corpus.map((e) => [`${e.universe}|${e.slug}`, e]));
console.log(`corpus relu : ${corpus.length} fiches`);

const decisions = [];
for (const c of candidats) {
  const e = parSlug.get(`${c.universe}|${c.slug}`);
  const d = { slug: c.slug, name: c.name, universe: c.universe, type: c.type,
    route: c.route, identite: c.identite, titreFr: c.titreFr, url: c.url,
    longueurTexte: c.descFr.length };
  if (!e) { d.verdict = 'fiche-absente'; decisions.push(d); continue; }
  if (typeof e.attributes?.descFr === 'string' && e.attributes.descFr.trim()) {
    d.verdict = 'deja-decrite'; decisions.push(d); continue;   // l'usine a pu passer entre-temps
  }
  if (NOM_ABIME.test(e.name ?? '')) { d.verdict = 'nom-abime'; decisions.push(d); continue; }
  const note = e.attributes?.descFrRetiree ?? e.attributes?.descFrImpossible ?? e.attributes?.descFrPurgee;
  if (note) { d.verdict = 'deja-tranchee-a-la-main'; d.note = String(note).slice(0, 200); decisions.push(d); continue; }

  const resume = typeof e.summary === 'string' ? e.summary.trim() : '';
  const neufs = motsNeufs(c.descFr, resume);
  d.longueurResume = resume.length; d.motsNeufs = neufs.length; d.exemplesNeufs = neufs.slice(0, 8);
  if (resume && c.descFr.length < resume.length) { d.verdict = 'plus-pauvre-que-le-resume'; decisions.push(d); continue; }
  if (resume && neufs.length < 3) { d.verdict = 'redit-le-resume'; decisions.push(d); continue; }

  d.verdict = 'a-ecrire'; d.descFr = c.descFr; d.descFrSource = c.descFrSource; d.nommeSujet = c.nommeSujet;
  decisions.push(d);
}

const compte = {};
for (const d of decisions) compte[d.verdict] = (compte[d.verdict] ?? 0) + 1;
console.log('verdicts :', compte);

let aEcrire = decisions.filter((d) => d.verdict === 'a-ecrire');
if (SEULEMENT) aEcrire = aEcrire.filter((d) => SEULEMENT.includes(d.slug));
if (N) aEcrire = aEcrire.slice(0, N);
console.log(`à écrire : ${aEcrire.length}`);

// TRACE AVANT ÉCRITURE, chemin neuf à chaque exécution.
const chemin = `data/audits/descfr-decision-${DRY ? 'dry' : 'application'}-${horodatage}.json`;
await writeFile(new URL(`../${chemin}`, import.meta.url), JSON.stringify({
  chantier: 'descFr wiki FR — décision', mode: DRY ? 'dry' : 'application',
  quand: new Date().toISOString(), trace: TRACE, candidats: candidats.length,
  compte, aEcrire: aEcrire.length, decisions,
}, null, 1));
console.log(`trace → ${chemin}`);
if (DRY) process.exit(0);

// ── ÉCRITURE ──────────────────────────────────────────────────────────────────────────────────
// UNE SEULE COLONNE, la mienne : `attributes` est RELU juste avant chaque écriture et seules
// `descFr`/`descFrSource` y sont ajoutées — l'usine écrit en parallèle sur d'autres clés.
let posees = 0, deja = 0, absentes = 0, echecs = 0; const journal = [];
for (const c of aEcrire) {
  const { data, error } = await s.from('akasha_entries').select('id,attributes')
    .eq('slug', c.slug).eq('universe', c.universe).limit(2);
  if (error) { echecs++; console.log(`  ✗ ${c.slug} : ${error.message}`); continue; }
  if (!data?.length) { absentes++; continue; }
  if (data.length > 1) { echecs++; console.log(`  ✗ ${c.slug} : ${data.length} lignes`); continue; }
  const e = data[0];
  if (typeof e.attributes?.descFr === 'string' && e.attributes.descFr.trim()) { deja++; continue; }
  const attributes = { ...(e.attributes ?? {}), descFr: c.descFr, descFrSource: c.descFrSource };
  const { error: err2 } = await s.from('akasha_entries').update({ attributes }).eq('id', e.id);
  if (err2) { echecs++; console.log(`  ✗ ${c.slug} : ${err2.message}`); continue; }
  posees++; journal.push({ slug: c.slug, id: e.id, route: c.route, url: c.url, longueur: c.descFr.length });
  if (posees % 25 === 0) console.log(`  … ${posees} posées`);
}
console.log(`FINAL — ${posees} posée(s) · ${deja} déjà décrite(s) · ${absentes} absente(s) · ${echecs} échec(s)`);
await writeFile(new URL(`../data/audits/descfr-journal-${horodatage}.json`, import.meta.url),
  JSON.stringify({ quand: new Date().toISOString(), trace: TRACE, posees, deja, absentes, echecs, journal }, null, 1));
