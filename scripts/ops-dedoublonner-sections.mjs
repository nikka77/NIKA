// scripts/ops-dedoublonner-sections.mjs — DÉDOUBLONNAGE des dossiers (07/08/2026).
//
// LE DÉFAUT. L'export Fandom a gardé la section PARENTE (« Histoire », « Partie II »,
// « Biographie ») ET ses sous-sections de niveau 3 (« Arc de Wano », « Whole Cake Island Saga »),
// rédigées séparément par l'usine : la même scène est racontée deux fois sur la même fiche, une
// fois sous un titre de conteneur et une fois sous le titre de l'arc. Les index sont PLATS en
// base (aucun « 2.1 ») : la hiérarchie du wiki a été perdue à la découpe, on ne peut donc pas
// reconnaître un parent à son numéro — seul le texte peut le dire.
//
// LE CRITÈRE (scripts/lib/redondance-sections.mjs, commenté en détail là-bas). On ne demande pas
// « ces deux sections se ressemblent-elles ? » mais « cette section dit-elle quelque chose que le
// RESTE du dossier ne dit pas ? ». Trois gardes cumulatives, plus une reprise :
//   1. zéro TÉMOIN neuf — aucun nom propre ni nombre que le reste du dossier ignore ;
//   2. chaque PHRASE a un répondant ailleurs, mesuré DEUX fois : en sac de mots pleins contre la
//      meilleure phrase d'en face (≥ 0,6 ; tolère la reformulation) ET en bigrammes contre tout
//      ce qui reste (≥ 0,3 ; refuse un énoncé neuf bâti avec du vocabulaire connu) ;
//   3. au plus 2 mots pleins sans parent morphologique ailleurs, OU recouvrement ≥ 0,45.
//   4. REPRISE : tout retrait est revérifié contre l'état FINAL du dossier, et remis s'il n'y
//      tient plus (une section retirée au premier tour pouvait s'appuyer sur une section
//      retirée au second).
// Conséquence : l'union des sections conservées couvre l'union des sections d'origine. Le doute
// profite systématiquement à la conservation — ce script ne sait retirer que du DÉJÀ-DIT.
//
// Usage : node --env-file=.env.local scripts/ops-dedoublonner-sections.mjs [--univers="Naruto"]
//         [--appliquer]
// Sans --appliquer : à blanc, écrit seulement le rapport. La TRACE de l'état d'avant est écrite
// dans data/audits/sections-curation-trace.json AVANT la première suppression.
import fs from 'node:fs';
import path from 'node:path';
import { clientSite } from '../lib/ops/db.mjs';
import { retirerSections } from '../lib/akasha/sections.ts';
import { traiterFiche } from './lib/redondance-sections.mjs';

const supabase = clientSite();
const APPLIQUER = process.argv.includes('--appliquer');
const UNIVERS = process.argv.find((a) => a.startsWith('--univers='))?.split('=')[1];
const RACINE = path.resolve(import.meta.dirname, '..');
const TRACE = path.join(RACINE, 'data/audits/sections-curation-trace.json');
const RAPPORT = path.join(RACINE, 'data/audits/sections-curation.json');

// Cas LUS À LA MAIN et conservés malgré le critère — chacun avec son motif. Les seuils ne
// tranchent pas tout : sous vingt cas ambigus on lit (leçon du 06/08).
const CONSERVES_A_LA_MAIN = new Map([
  ['hamura-otsutsuki#9', "la section rattache le vol au Six Paths Senjutsu là où « Capacités » "
    + "l'attribue à la manifestation du chakra : l'attribution est une nuance que le reste ne reprend pas"],
]);

async function tout(table, colonnes, filtre) {
  const out = [];
  for (let d = 0; ; d += 1000) {
    let q = supabase.from(table).select(colonnes).order('id').range(d, d + 999);
    if (filtre) q = filtre(q);
    const { data, error } = await q;
    if (error) { console.error(`${table} : ${error.message}`); process.exit(1); }
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
}

const entrees = await tout('akasha_entries', 'id, slug, name, universe', UNIVERS ? (q) => q.eq('universe', UNIVERS) : null);
const gardees = new Set(entrees.map((e) => e.id));
const parId = new Map(entrees.map((e) => [e.id, e]));
const sections = (await tout('akasha_sections', 'id, entry_id, idx, titre, texte, source'))
  .filter((s) => gardees.has(s.entry_id));

const parFiche = new Map();
for (const s of sections) {
  if (!parFiche.has(s.entry_id)) parFiche.set(s.entry_id, []);
  parFiche.get(s.entry_id).push(s);
}

let candidates = 0, sautees = 0;
const retraits = [], conserves = [], remisEnPlace = [];
for (const [id, lignes] of parFiche) {
  if (lignes.length < 2) { sautees += lignes.length; continue; }   // dossier à une section : rien à comparer
  candidates += lignes.length;
  const e = parId.get(id);
  const { retraits: r, restants, remis } = traiterFiche(lignes);
  for (const x of remis) remisEnPlace.push({ slug: e.slug, idx: x.l.idx, titre: x.l.titre, motif: x.motif });
  for (const x of r) {
    const cle = `${e.slug}#${x.l.idx}`;
    const aLaMain = CONSERVES_A_LA_MAIN.get(cle);
    if (aLaMain) { conserves.push({ slug: e.slug, idx: x.l.idx, titre: x.l.titre, motif: aLaMain }); continue; }
    retraits.push({
      entryId: id, slug: e.slug, nom: e.name, univers: e.universe,
      sectionId: x.l.id, idx: String(x.l.idx), titre: x.l.titre, source: x.l.source,
      longueur: x.l.texte.length, texte: x.l.texte,                 // ← la trace de l'AVANT
      voie: x.voie, recouvrement: x.a.recouvrement, apportsReels: x.a.reels,
      motif: x.voie === 'lexicale'
        ? `déjà dit par le reste du dossier : recouvrement ${x.a.recouvrement}, `
          + `${x.a.reels.length} mot(s) plein(s) sans parent ailleurs (${x.a.reels.join(', ') || 'aucun'}), 0 nom propre neuf`
        : `reformulation de ce que dit le reste du dossier : recouvrement ${x.a.recouvrement}, `
          + `chaque phrase appariée (mots pleins ≥ 0,6 et bigrammes ≥ 0,3), 0 nom propre neuf`,
      restantsApres: restants.map((y) => ({ idx: String(y.idx), titre: y.titre })),
    });
  }
}

const parUnivers = {};
for (const r of retraits) parUnivers[r.univers] = (parUnivers[r.univers] ?? 0) + 1;
const parTitre = {};
for (const r of retraits) parTitre[r.titre ?? '—'] = (parTitre[r.titre ?? '—'] ?? 0) + 1;

console.log(`sections lues            : ${sections.length}${UNIVERS ? ` [${UNIVERS}]` : ''}`);
console.log(`  · dossiers à 1 section : ${sautees} (hors examen)`);
console.log(`  · examinées            : ${candidates}`);
console.log(`RETRAITS                 : ${retraits.length} sur ${new Set(retraits.map((r) => r.entryId)).size} fiche(s)`);
console.log(`  · conservés à la main  : ${conserves.length}`);
console.log(`  · remis par la reprise : ${remisEnPlace.length}`);
console.log(`COMPTE CROISÉ (avant)    : ${retraits.length} + ${candidates - retraits.length} + ${sautees} = `
  + `${retraits.length + (candidates - retraits.length) + sautees} / ${sections.length} `
  + `${retraits.length + (candidates - retraits.length) + sautees === sections.length ? 'OK' : 'ÉCART'}`);
console.log('par univers :', parUnivers);
console.log('titres les plus retirés :', Object.entries(parTitre).sort((a, b) => b[1] - a[1]).slice(0, 10));

// ——— TRACE AVANT TOUTE ÉCRITURE ———
const trace = {
  chantier: 'sections — passe 1, dédoublonnage intra-fiche',
  date: new Date().toISOString(),
  applique: APPLIQUER,
  univers: UNIVERS ?? 'tous',
  etatLu: { sectionsEnBase: sections.length, fichesDossierees: parFiche.size, examinees: candidates, dossiersAUneSection: sautees },
  retraits,                       // texte intégral d'avant, ligne par ligne, avec son motif
  conservesALaMain: conserves,
  remisParLaReprise: remisEnPlace,
};
fs.mkdirSync(path.dirname(TRACE), { recursive: true });
fs.writeFileSync(TRACE, JSON.stringify(trace, null, 1));
console.log(`\ntrace écrite : ${TRACE} (${(fs.statSync(TRACE).size / 1024).toFixed(0)} Ko)`);

if (!APPLIQUER) {
  console.log('\n(à blanc — rien n’a été supprimé. Relancer avec --appliquer.)');
  process.exit(0);
}

// ——— APPLICATION ———
const parEntree = new Map();
for (const r of retraits) {
  if (!parEntree.has(r.entryId)) parEntree.set(r.entryId, []);
  parEntree.get(r.entryId).push(r.idx);
}
let supprimees = 0, echecs = 0;
for (const [entryId, index] of parEntree) {
  try {
    const n = await retirerSections(supabase, entryId, index);
    supprimees += n;
    if (n !== index.length) console.error(`  ⚠ ${parId.get(entryId).slug} : ${n} retirée(s) pour ${index.length} demandée(s)`);
  } catch (e) {
    echecs++;
    console.error(`  ✗ ${parId.get(entryId).slug} : ${e.message}`);
  }
}

// ——— COMPTE CROISÉ APRÈS, relu en base ———
const apres = (await tout('akasha_sections', 'id, entry_id')).filter((s) => gardees.has(s.entry_id));
console.log(`\nsupprimées (retour de retirerSections) : ${supprimees} · fiches en échec : ${echecs}`);
console.log(`sections en base après                 : ${apres.length}`);
console.log(`COMPTE CROISÉ (après) : ${sections.length} − ${retraits.length} = ${sections.length - retraits.length} `
  + `vs ${apres.length} en base → ${sections.length - retraits.length === apres.length ? 'OK' : 'ÉCART'}`);

fs.writeFileSync(RAPPORT, JSON.stringify({
  chantier: 'sections — passe 1, dédoublonnage intra-fiche',
  date: new Date().toISOString(),
  univers: UNIVERS ?? 'tous',
  avant: sections.length, retires: retraits.length, apres: apres.length,
  fichesTouchees: parEntree.size,
  parUnivers, parTitre,
  conservesALaMain: conserves, remisParLaReprise: remisEnPlace,
  compteCroise: sections.length - retraits.length === apres.length ? 'OK' : 'ÉCART',
}, null, 1));
console.log(`rapport écrit : ${RAPPORT}`);
