// scripts/akasha-isolees-op-sonde.mjs — SONDE PRÉALABLE DU CHANTIER « 451 ISOLÉES ONE PIECE ».
//
// POURQUOI (10/08/2026, vague 5)
// La vague 4 a mis au point, POUR NARUTO, la mécanique qui débloque (akasha-isolees-html.mjs +
// akasha-alias-registre.mjs). Avant de la PORTER sur One Piece, on mesure le mur — et d'abord son
// VERSANT SOURCE, que la vague 4 n'a vu qu'en le heurtant : le script demande au wiki une page au
// nom de NOTRE fiche. Si nos noms One Piece sont français là où le wiki est anglais, la moitié du
// lot n'est même pas CHERCHABLE et tombe en silence dans `journal.pageAbsente`.
//
// N'ÉCRIT RIEN, NI EN BASE NI DANS UN REGISTRE. Trace horodatée dans data/audits/.
// Usage : node --env-file=.env.local scripts/akasha-isolees-op-sonde.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';
import { norm, wikitextes } from './audit-isolees-fandom.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const UNIVERS = 'One Piece';
const HOTE = 'onepiece.fandom.com';
const HORODATE = new Date().toISOString().replace(/[:.]/g, '-');

const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;      // un select nu s'arrête à 1000 SANS erreur
  }
  console.log(`  ${t} : ${out.length} lignes`);
  return out;
};

console.log('→ lecture de la base (paginée)…');
const entries = await page('akasha_entries', 'id, slug, name, type, universe, attributes');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');
const degre = new Set();
for (const r of rels) { degre.add(r.from_entry); degre.add(r.to_entry); }
const isolees = entries.filter((e) => !degre.has(e.id));

const parUnivers = {};
for (const e of isolees) parUnivers[e.universe] = (parUnivers[e.universe] ?? 0) + 1;
console.log(`\nMESURE : ${entries.length} fiches · ${rels.length} arêtes · ${isolees.length} isolées`);
console.log('  par univers : ' + Object.entries(parUnivers).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' · '));

const lot = isolees.filter((e) => e.universe === UNIVERS);
const parType = {};
for (const e of lot) parType[e.type] = (parType[e.type] ?? 0) + 1;
console.log(`\n${UNIVERS} : ${lot.length} isolées · par type : ` + Object.entries(parType).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' · '));

// Combien portent un roman_name ? Combien ont un nom déjà latin (donc plausiblement anglais) ?
const avecRoman = lot.filter((e) => e.attributes?.roman_name).length;
const aliasCures = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/alias-cures.json'), 'utf8'))[UNIVERS] ?? {};
const couvertsParCure = lot.filter((e) => aliasCures[e.name]).length;
console.log(`  avec roman_name : ${avecRoman} · déjà couvertes par data/alias-cures.json : ${couvertsParCure} (le fichier porte ${Object.keys(aliasCures).length} paires ${UNIVERS})`);

/* ═══ LE VERSANT SOURCE — nos titres sont-ils cherchables sur le wiki ? ═══════════════════════ */
console.log(`\n→ VERSANT SOURCE : on demande à ${HOTE} une page pour CHAQUE isolée, sous trois titres.`);
const candidatsTitres = new Map();          // titre demandé → [fiches]
const pousser = (t, e) => { if (!t) return; if (!candidatsTitres.has(t)) candidatsTitres.set(t, []); candidatsTitres.get(t).push(e); };
for (const e of lot) {
  pousser(e.name, e);
  if (aliasCures[e.name] && aliasCures[e.name] !== e.name) pousser(aliasCures[e.name], e);
  const rn = e.attributes?.roman_name;
  if (rn && norm(rn) !== norm(e.name)) pousser(rn, e);
}
console.log(`  ${candidatsTitres.size} titres distincts à sonder pour ${lot.length} fiches`);
const pages = await wikitextes(HOTE, [...candidatsTitres.keys()]);

const parFiche = new Map();
for (const e of lot) parFiche.set(e.id, { nom: e.name, slug: e.slug, type: e.type, voies: [] });
for (const [titre, fiches] of candidatsTitres) {
  const p = pages.get(titre);
  if (!p) continue;
  for (const e of fiches) {
    const voie = titre === e.name ? 'nom' : (aliasCures[e.name] === titre ? 'alias-cures' : 'roman_name');
    parFiche.get(e.id).voies.push({ voie, titreDemande: titre, titreRendu: p.titre, fragment: p.fragment ?? null });
  }
}

let parNom = 0, parCure = 0, parRoman = 0, aucune = 0, fragmentSeul = 0;
const introuvables = [];
const sauveesParAlias = [];
for (const e of lot) {
  const v = parFiche.get(e.id).voies.filter((x) => !x.fragment);
  const frag = parFiche.get(e.id).voies.filter((x) => x.fragment);
  if (!v.length) {
    if (frag.length) { fragmentSeul++; continue; }
    aucune++; introuvables.push({ nom: e.name, slug: e.slug, type: e.type }); continue;
  }
  if (v.some((x) => x.voie === 'nom')) { parNom++; continue; }
  if (v.some((x) => x.voie === 'alias-cures')) { parCure++; sauveesParAlias.push(`${e.name} → « ${v[0].titreRendu} » (alias-cures)`); continue; }
  parRoman++; sauveesParAlias.push(`${e.name} → « ${v[0].titreRendu} » (roman_name)`);
}
console.log(`\n=== VERSANT SOURCE, MESURÉ ===`);
console.log(`  page trouvée sous NOTRE NOM tel quel      : ${parNom} / ${lot.length}`);
console.log(`  trouvée seulement via data/alias-cures    : ${parCure}`);
console.log(`  trouvée seulement via roman_name          : ${parRoman}`);
console.log(`  seulement une redirection vers SECTION    : ${fragmentSeul} (refusée : la page atteinte parle d'autre chose)`);
console.log(`  AUCUNE page, aucun des trois titres       : ${aucune}`);
if (sauveesParAlias.length) console.log(`  exemples de fiches que seul l'alias rend cherchables :\n    ` + sauveesParAlias.slice(0, 12).join('\n    '));
if (introuvables.length) console.log(`  exemples d'introuvables : ` + introuvables.slice(0, 12).map((x) => `${x.nom} (${x.type})`).join(' · '));

const sortie = path.join(ROOT, `data/audits/isolees-op-sonde-source-${HORODATE}.json`);
fs.writeFileSync(sortie, JSON.stringify({
  chantier: 'sonde préalable — versant SOURCE des isolées One Piece', quand: new Date().toISOString(),
  ecritEnBase: false, hote: HOTE,
  mesure: { fiches: entries.length, aretes: rels.length, isolees: isolees.length, parUnivers, lotUnivers: lot.length, parType },
  aliasCuresDisponibles: Object.keys(aliasCures).length, isoleesCouvertesParCure: couvertsParCure, avecRomanName: avecRoman,
  versantSource: { parNom, parCure, parRoman, fragmentSeul, aucune },
  introuvables,
  detail: [...parFiche.values()],
}, null, 1));
console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);
