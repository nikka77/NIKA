// scripts/resumes-creux-proposer.mjs — CONDENSER descFr EN UN RÉSUMÉ D'UNE PHRASE.
//
// POURQUOI (10/08/2026, chantier 2 du carnet AKASHA)
// 420 fiches portent en `summary` une phrase de remplissage — « Personnage secondaire de Dragon
// Ball. », 410 fois à l'identique. Or le résumé est le seul texte que la recherche du registre
// indexe (lib/akasha/queries.ts:134 le met dans le `or(...ilike...)`), le repli de la méta
// description de la fiche, et le repli du texte de rangée quand descFr n'a pas de prose narrative.
//
// CE QUE FAIT CE SCRIPT : il EXTRAIT UNE phrase de `attributes.descFr`, déjà en base, et la borne
// à 90–160 caractères. Il n'écrit aucun fait que descFr ne contient pas ; chaque proposition sort
// dans la trace avec sa phrase-preuve — le texte source mot pour mot — pour comparaison.
//
// CE QU'IL NE FAIT PAS : quand descFr est absent, trop court, méta-encyclopédique (il parle de
// l'ŒUVRE, du doublage ou de l'étymologie et pas du personnage), ou qu'aucune phrase ne NOMME la
// fiche, il ne propose rien. Un résumé inventé est pire que le résumé creux qu'il remplace.
//
// ── CE QUE LE CONTRÔLE À LA MAIN DE 20 CAS A CORRIGÉ (avant toute écriture) ───────────────────
// Première version : 4 défauts sur 20 (20 %, très au-dessus du seuil de 5 %). Les quatre :
//  1. « Jimmy Firecracker est présenté comme un intervieweur biaisé et partial : au début du Cell
//     Game. » — coupe après un deux-points, la queue reste en l'air → AUCUN deux-points admis.
//  2. « Le Kaïô de l'Est adore sa moto volante et défie même Goku dans une course. » — anecdote de
//     4e phrase promue faute de mieux → la phrase de tête est la seule qui définisse ; si elle
//     n'est pas exploitable, on REFUSE plutôt que descendre dans le texte (règles de rang).
//  3. « Comme ses camarades Oolong et Jasmine, Oonaan porte le nom d'un type de thé. » — étymologie
//     déguisée en définition → « porte le nom » sort du définitoire et entre dans le méta.
//  4. « … la saga Garlic Jr. Il est décrit comme un être humainoïde … » — DEUX phrases, parce que
//     « Jr. » était masqué d'office au découpage → masquage distinct titres / suffixes, plus une
//     garde finale qui refuse toute rupture de phrase interne.
//
// GARDE D'IDENTITÉ : leçon du 25/07 — sur 12 fiches enrichies, 3 décrivaient la MAUVAISE entité.
// Le texte est déjà en base mais il peut avoir été contaminé (fiche « Mira-kun » dont le descFr
// parle de « Bandages »). On exige donc qu'un jeton du NOM de la fiche apparaisse dans la phrase
// retenue. Une romanisation différente fait échouer la garde : c'est voulu — le tiroir par défaut
// est celui qui existait.
//
// Lecture seule par défaut. `--ecrire` écrit la SEULE colonne `summary` ; `attributes` n'est
// jamais réécrit (d'autres chantiers tournent en parallèle).
//
// Usage :
//   node --env-file=.env.local scripts/resumes-creux-proposer.mjs --trace=<chemin.json>
//   node --env-file=.env.local scripts/resumes-creux-proposer.mjs --trace=<chemin-NEUF.json> --ecrire
import fs from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';
import { REMPLISSAGE, VAGUE1, norm, proposer } from './lib/resume-forme.mjs';

const db = clientSite();
const args = process.argv.slice(2);
const ECRIRE = args.includes('--ecrire');
const TRACE = (args.find((a) => a.startsWith('--trace=')) ?? '').slice(8);
const SEULEMENT = (args.find((a) => a.startsWith('--seulement=')) ?? '').slice(12); // slugs, virgules
if (!TRACE) throw new Error('--trace=<chemin> obligatoire : la trace se pose AVANT toute écriture');
if (ECRIRE && fs.existsSync(TRACE)) throw new Error(`trace déjà présente (${TRACE}) : un chemin NEUF par exécution qui écrit`);

// Bande de longueur. Le plancher est un réglage, pas une loi : beaucoup de bios courtes tiennent
// une phrase définitoire parfaite de 60–89 caractères que ce plancher écarte volontairement
// (chiffre exact dans la trace, clé `sousLePlancher`).
const MIN = Number((args.find((a) => a.startsWith('--min=')) ?? '').slice(6)) || 90;
const MAX = Number((args.find((a) => a.startsWith('--max=')) ?? '').slice(6)) || 160;

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

// ── LES RÈGLES DE FORME VIVENT DANS `scripts/lib/resume-forme.mjs` ────────────────────────────
// Elles étaient écrites ici en dur. La vague 2 (`resumes-creux-vague2.mjs`) devait les reprendre en
// changeant deux réglages : deux copies auraient divergé en silence — le défaut relevé le 10/08
// entre le miroir des axes de l'usine et la taxonomie du site. Ce script garde son comportement
// EXACT via le préréglage `VAGUE1` (bande 90–160, plancher descFr 80, deux rangs de repli) ;
// relancé, il rend le même histogramme de refus qu'au 10/08 10:09.

// ── Exécution ─────────────────────────────────────────────────────────────────────────────────
const entries = await page('akasha_entries', 'id, slug, name, type, universe, summary, description, attributes');
const cibles = entries.filter((e) => REMPLISSAGE.test(norm(e.summary)));
console.log(`corpus ${entries.length} fiches · cibles ${cibles.length}`);

const propositions = [];
const refuses = [];
for (const e of cibles) {
  const r = proposer(e, { ...VAGUE1, min: MIN, max: MAX, seuilCoupe: MIN });
  const base = {
    id: e.id, slug: e.slug, name: e.name, universe: e.universe, type: e.type,
    avant: e.summary,
    descriptionNonVide: Boolean(norm(e.description)),
  };
  if (r.refus) refuses.push({ ...base, refus: r.refus, descFrLen: norm(e.attributes?.descFr).length, quasi: r.quasi ?? null });
  else propositions.push({ ...base, apres: r.resume, longueur: r.resume.length, rangPhrase: r.rang, preuve: r.preuve });
}

const clef = (s) => s.replace(/\(\d+[^)]*\)/, '(…)');
const parRefus = refuses.reduce((a, r) => ((a[clef(r.refus)] = (a[clef(r.refus)] ?? 0) + 1), a), {});

// Prix exact du plancher : combien de fiches ont une phrase définitoire parfaite mais trop courte.
const sousLePlancher = refuses.filter((r) => r.quasi?.length && r.quasi[0].len < MIN && r.quasi[0].def);
const parPalier = { '70-89': 0, '50-69': 0, '<50': 0 };
for (const r of sousLePlancher) {
  const l = r.quasi[0].len;
  parPalier[l >= 70 ? '70-89' : l >= 50 ? '50-69' : '<50'] += 1;
}

console.log(`propositions ${propositions.length} · refus ${refuses.length}`);
console.log('motifs de refus :', parRefus);
console.log(`sous le plancher (phrase définitoire < ${MIN} car.) : ${sousLePlancher.length}`, parPalier);

const lot = SEULEMENT ? propositions.filter((p) => SEULEMENT.split(',').includes(p.slug)) : propositions;

const trace = {
  chantier: 'chantier 2 — résumés de remplissage → condensation d\'UNE phrase de descFr',
  quand: new Date().toISOString(),
  mode: ECRIRE ? 'ECRITURE' : 'lecture seule (proposition)',
  colonneEcrite: 'summary',
  corpus: entries.length,
  cibles: cibles.length,
  bornes: { min: MIN, max: MAX },
  motifCible: String(REMPLISSAGE),
  propositions: propositions.length,
  aEcrire: lot.length,
  refus: refuses.length,
  parRefus,
  sousLePlancher: { n: sousLePlancher.length, parPalier, exemples: sousLePlancher.slice(0, 25).map((r) => ({ name: r.name, len: r.quasi[0].len, texte: r.quasi[0].texte })) },
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
