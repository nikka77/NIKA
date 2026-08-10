// scripts/resumes-creux-vague2.mjs — VAGUE 2 des résumés de remplissage (chantier 3 du carnet).
//
// CE QUI RESTE APRÈS LA VAGUE 1 (10/08/2026, trace resumes-creux-ecriture-20260810-100918.json)
// 420 fiches portaient « Personnage secondaire de Dragon Ball. » ; 131 ont reçu la phrase de tête de
// leur `descFr`, 289 ont été REFUSÉES. Les motifs de refus sont dans cette trace, et deux d'entre
// eux ne jugent pas la qualité du texte mais sa TAILLE :
//   · « phrase utilisable hors bande 90–160 » (117) — la phrase avait passé TOUS les tests de forme
//     et n'a été écartée que par sa longueur. « Marcarita est l'Ange de l'Univers 11. » fait 37
//     caractères et dit exactement ce qu'elle est.
//   · « descFr trop court (< 80 car.) » (48) — le texte source entier tenait sous le plancher, alors
//     que c'était souvent UNE définition parfaite : « Sidra est le Dieu de la Destruction de
//     l'Univers 9. »
// C'est la leçon du jour, payée par Shenron : un seuil de longueur mesure la taille, jamais la
// valeur. La vague 2 garde les MÊMES tests de forme (identité, sujet nommé tôt, définitoire ou
// nominale, pas de méta, pas de deux-points, une seule phrase) et ne descend la longueur qu'au rang
// de garde-fou : 30–190 pour ACCEPTER une phrase telle quelle, mais toujours 90 minimum pour se
// permettre de COUPER une phrase trop longue — couper trop tôt fabrique une définition fausse,
// accepter une phrase courte n'en fabrique aucune.
//
// UN SEUL AJOUT DE FORME : la GLOSE PARENTHÉTIQUE (`retirerGlose`). « Le Kaïô de l'Est (Higashi no
// Kaiô ; litt. « Kaïô de l'Est ») est un Kaïô petit et trapu qui règne sur la Galaxie de l'Est. »
// La parenthèse ne dit rien du sujet et faisait sortir la phrase de la bande. On la retranche —
// jamais rien d'ajouté, le résumé reste une sous-chaîne du texte en base.
//
// CE QU'ON NE TOUCHE PAS, ET POURQUOI :
//   · `descFr absent` → c'est le chantier « textes FR » qui tourne en parallèle qui le débloquera.
//   · `identité non confirmée` → notre fiche s'appelle « Recoome » et son texte dit « Reacoom »,
//     « Gozu »/« Goz », « Bardock »/« Baddack ». Rien EN BASE ne prouve l'équivalence :
//     `attributes.descFrSource` ne nomme pas une page mais le MODÈLE qui a rédigé (mesuré : 43
//     fiches sur 289 le portent, aucune ne cite d'URL). Et le pont « le nom apparaît dans le
//     texte » a déjà donné deux faux sur trois ce matin. Le tiroir par défaut est celui qui existait.
//
// Traite AUSSI les fiches sans aucun résumé (`summary` vide) : même méthode, mêmes gardes.
// N'écrit QUE la colonne `summary`. `attributes` n'est jamais réécrit.
//
// Usage :
//   node scripts/resumes-creux-vague2.mjs --test            (découpeur de phrases, hors ligne)
//   node --env-file=.env.local scripts/resumes-creux-vague2.mjs --trace=<chemin.json>
//   node --env-file=.env.local scripts/resumes-creux-vague2.mjs --trace=<chemin.json> --vague1
//   node --env-file=.env.local scripts/resumes-creux-vague2.mjs --trace=<chemin-NEUF.json> --ecrire
import fs from 'node:fs';
import { REMPLISSAGE, VAGUE1, VAGUE2, norm, phrases, proposer, retirerGlose } from './lib/resume-forme.mjs';

const args = process.argv.slice(2);

// ── ÉPREUVE DU DÉCOUPEUR DE PHRASES ───────────────────────────────────────────────────────────
// La vague 1 a payé ce défaut : un découpeur naïf coupe sur « Mr. », « Jr. », et rend deux phrases
// là où il n'y en a qu'une. Les cas viennent du corpus réel, pas de mon imagination.
const CAS = [
  ['Mr. Satan est le champion du monde. Il a battu Cell devant les caméras.',
    ['Mr. Satan est le champion du monde.', 'Il a battu Cell devant les caméras.']],
  ['Garlic Junior est un démon qui apparaît dans la saga Garlic Jr. Il est décrit comme humanoïde.',
    ['Garlic Junior est un démon qui apparaît dans la saga Garlic Jr.', 'Il est décrit comme humanoïde.']],
  ['Le Dr Gero a créé C-19. Ce cyborg absorbe l\'énergie.',
    ['Le Dr Gero a créé C-19.', 'Ce cyborg absorbe l\'énergie.']],
  ['Une seule phrase sans abréviation.', ['Une seule phrase sans abréviation.']],
  ['Il mesure env. 180 cm et pèse 90 kg.', ['Il mesure env. 180 cm et pèse 90 kg.']],
];
const CAS_GLOSE = [
  ['Le Kaïô de l\'Est (Higashi no Kaiô ; litt. « Kaïô de l\'Est ») est un Kaïô petit et trapu.',
    'Le Kaïô de l\'Est est un Kaïô petit et trapu.'],
  ['Le sergent Metallic (alias Full Metal Jacket) est un robot de la Tour Muscle.',
    'Le sergent Metallic (alias Full Metal Jacket) est un robot de la Tour Muscle.'],
];
if (args.includes('--test')) {
  let ko = 0;
  for (const [entree, attendu] of CAS) {
    const rendu = phrases(entree);
    const bon = JSON.stringify(rendu) === JSON.stringify(attendu);
    if (!bon) ko += 1;
    console.log(`${bon ? 'OK ' : 'KO '} ${JSON.stringify(entree.slice(0, 52))} → ${JSON.stringify(rendu)}`);
  }
  for (const [entree, attendu] of CAS_GLOSE) {
    const rendu = retirerGlose(entree);
    const bon = rendu === attendu;
    if (!bon) ko += 1;
    console.log(`${bon ? 'OK ' : 'KO '} glose → ${JSON.stringify(rendu)}`);
  }
  console.log(ko ? `${ko} cas en échec` : 'découpeur et glose : tous les cas passent');
  process.exit(ko ? 1 : 0);
}

const { clientSite } = await import('../lib/ops/db.mjs');
const db = clientSite();
const ECRIRE = args.includes('--ecrire');
const OPTS = args.includes('--vague1') ? VAGUE1 : VAGUE2;
const TRACE = (args.find((a) => a.startsWith('--trace=')) ?? '').slice(8);
const SEULEMENT = (args.find((a) => a.startsWith('--seulement=')) ?? '').slice(12);
if (!TRACE) throw new Error('--trace=<chemin> obligatoire : la trace se pose AVANT toute écriture');
if (ECRIRE && fs.existsSync(TRACE)) throw new Error(`trace déjà présente (${TRACE}) : un chemin NEUF par exécution qui écrit`);

// ── Lecture paginée (un select nu s'arrête à 1000 lignes SANS erreur) ─────────────────────────
const page = async (table, sel) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(table).select(sel).range(d, d + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};

const entries = await page('akasha_entries', 'id, slug, name, type, universe, summary, attributes');
const remplissage = entries.filter((e) => REMPLISSAGE.test(norm(e.summary)));
const vides = entries.filter((e) => !norm(e.summary));
const cibles = [...remplissage, ...vides];
console.log(`corpus ${entries.length} fiches · remplissage ${remplissage.length} · sans résumé ${vides.length}`);

const propositions = [];
const refuses = [];
for (const e of cibles) {
  const r = proposer(e, OPTS);
  const base = {
    id: e.id, slug: e.slug, name: e.name, universe: e.universe, type: e.type,
    origine: norm(e.summary) ? 'remplissage' : 'sans résumé',
    avant: e.summary ?? null,
  };
  if (r.refus) refuses.push({ ...base, refus: r.refus, descFrLen: norm(e.attributes?.descFr).length, quasi: r.quasi ?? null });
  else propositions.push({ ...base, apres: r.resume, longueur: r.resume.length, rangPhrase: r.rang, preuve: r.preuve });
}

const clef = (s) => s.replace(/\(\d+[^)]*\)/, '(…)');
const parRefus = refuses.reduce((a, r) => ((a[clef(r.refus)] = (a[clef(r.refus)] ?? 0) + 1), a), {});
const longueurs = propositions.map((p) => p.longueur).sort((a, b) => a - b);
console.log(`propositions ${propositions.length} · refus ${refuses.length}`);
console.log('motifs de refus :', parRefus);
if (longueurs.length) console.log(`longueurs : min ${longueurs[0]} · médiane ${longueurs[Math.floor(longueurs.length / 2)]} · max ${longueurs.at(-1)}`);

const lot = SEULEMENT ? propositions.filter((p) => SEULEMENT.split(',').includes(p.slug)) : propositions;

const trace = {
  chantier: 'chantier 3 — vague 2 des résumés de remplissage (longueur ramenée au rang de garde-fou)',
  quand: new Date().toISOString(),
  mode: ECRIRE ? 'ECRITURE' : 'lecture seule (proposition)',
  colonneEcrite: 'summary',
  reglages: OPTS,
  corpus: entries.length,
  cibles: { remplissage: remplissage.length, sansResume: vides.length, total: cibles.length },
  propositions: propositions.length,
  aEcrire: lot.length,
  refus: refuses.length,
  parRefus,
  longueurs: longueurs.length ? { min: longueurs[0], mediane: longueurs[Math.floor(longueurs.length / 2)], max: longueurs.at(-1) } : null,
  parUnivers: propositions.reduce((a, p) => ((a[p.universe] = (a[p.universe] ?? 0) + 1), a), {}),
  lot,
  refuses,
  ecritures: [],
};
fs.writeFileSync(TRACE, JSON.stringify(trace, null, 1));
console.log(`trace posée : ${TRACE}`);

if (!ECRIRE) {
  console.log('\n— lecture seule, rien écrit —');
  process.exit(0);
}

// ── Écriture : UNE SEULE COLONNE (`summary`). ─────────────────────────────────────────────────
let ok = 0;
let ko = 0;
for (const p of lot) {
  const { error } = await db.from('akasha_entries').update({ summary: p.apres }).eq('id', p.id);
  if (error) { ko += 1; trace.ecritures.push({ id: p.id, slug: p.slug, ok: false, erreur: error.message }); }
  else { ok += 1; trace.ecritures.push({ id: p.id, slug: p.slug, ok: true }); }
  if ((ok + ko) % 50 === 0) console.log(`  ${ok + ko}/${lot.length}…`);
}
trace.bilan = { ecrites: ok, echecs: ko };
fs.writeFileSync(TRACE, JSON.stringify(trace, null, 1));
console.log(`écrites ${ok} · échecs ${ko} · trace ${TRACE}`);
