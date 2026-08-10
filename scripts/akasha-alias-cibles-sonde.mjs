// scripts/akasha-alias-cibles-sonde.mjs — SONDE : les cibles que la résolution ne trouve pas
// EXISTENT-ELLES chez nous sous un nom français ?
//
// La vague 3 (isolees-html) a laissé 28 liens « aucune fiche Naruto nommée « X » ». Le mur n'est
// pas l'absence de fiche : c'est que la résolution cherche par ÉGALITÉ de nom normalisé, et que
// notre registre nomme en français (« Créature invoquée » pour « Summon »).
//
// Cette sonde N'ÉCRIT RIEN EN BASE. Elle mesure, pour chaque titre orphelin :
//   · resolutionDirecte : name / roman_name / slug normalisés (ce que fait la vague 3)
//   · aliasCure         : data/alias-cures.json contient-il DÉJÀ la paire (sens notre nom → wiki)
//   · parenthese        : une fiche porte-t-elle ce terme entre parenthèses dans son nom
//   · prosePar          : une fiche cite-t-elle « (Terme anglais) » dans sa PROSE (summary/descFr)
//                          — leçon du 10/08 : jamais un dump de attributes.
//
// Usage : node --env-file=.env.local scripts/akasha-alias-cibles-sonde.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';
import { norm } from './audit-isolees-fandom.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const HORODATE = new Date().toISOString().replace(/[:.]/g, '-');
const UNIVERS = 'Naruto';

const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;   // un select nu s'arrête à 1000 SANS erreur
  }
  console.log(`  ${t} : ${out.length} lignes`);
  return out;
};

console.log('→ lecture paginée de la base…');
const entries = await page('akasha_entries', 'id, slug, name, type, universe, summary, attributes');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');

const degre = new Set();
for (const r of rels) { degre.add(r.from_entry); degre.add(r.to_entry); }
const isolees = entries.filter((e) => !degre.has(e.id));
const parUniv = {};
for (const e of isolees) parUniv[e.universe] = (parUniv[e.universe] ?? 0) + 1;

console.log(`\nMESURE : ${entries.length} fiches · ${rels.length} arêtes · ${isolees.length} isolées`);
console.log(`  isolées par univers : ${Object.entries(parUniv).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' · ')}`);

/* ═══ Index de résolution, jumeau exact de celui de akasha-isolees-html.mjs ═══════════════════ */
const index = new Map();
const cleParPasse = (e, p) => (p === 0 ? e.name : p === 1 ? e.attributes?.roman_name : e.slug);
for (let passe = 0; passe < 3; passe++) {
  for (const e of entries) {
    const cle = norm(cleParPasse(e, passe));
    if (!cle) continue;
    if (!index.has(e.universe)) index.set(e.universe, new Map());
    const m = index.get(e.universe);
    const deja = m.get(cle);
    if (!deja) { m.set(cle, { passe, candidats: [e] }); continue; }
    if (deja.passe !== passe) continue;
    if (!deja.candidats.some((c) => c.id === e.id)) deja.candidats.push(e);
  }
}
const resoudre = (univers, valeur) => {
  const cle = norm(valeur);
  if (!cle) return null;
  const t = index.get(univers)?.get(cle);
  if (!t) return null;
  return t.candidats.length === 1 ? t.candidats[0] : null;
};

/* ═══ Le gisement : tout titre orphelin relevé par la vague 3 (trace + explore) ═══════════════ */
const TITRES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/audits/_alias-cibles-gisement.json'), 'utf8'));

/* ═══ Prose seulement (leçon 10/08 : jamais JSON.stringify(attributes)) ══════════════════════ */
const prose = (e) => [e.summary, e.attributes?.descFr,
  ...(Array.isArray(e.attributes?.sections) ? e.attributes.sections.map((s) => `${s?.title ?? ''} ${s?.body ?? ''}`) : [])]
  .filter(Boolean).join('\n');

const aliasCures = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/alias-cures.json'), 'utf8'));
const inverseCure = new Map();          // titre wiki normalisé → [nos noms]
for (const [notre, titre] of Object.entries(aliasCures[UNIVERS] ?? {})) {
  const k = norm(titre);
  if (!inverseCure.has(k)) inverseCure.set(k, []);
  inverseCure.get(k).push(notre);
}

const lotUnivers = entries.filter((e) => e.universe === UNIVERS);
const resultats = [];
for (const t of TITRES) {
  const directe = resoudre(UNIVERS, t.titre);
  const curesNoms = inverseCure.get(norm(t.titre)) ?? [];
  const curesFiches = curesNoms.map((n) => resoudre(UNIVERS, n)).filter(Boolean);

  // Parenthèse : « Libération de la Foudre (Raiton) » — on ne teste QUE l'égalité du contenu.
  const parenthese = lotUnivers.filter((e) => {
    const m = /\(([^()]+)\)\s*$/.exec(e.name ?? '');
    return m && norm(m[1]) === norm(t.titre);
  });

  // Prose : la fiche cite-t-elle le terme anglais entre parenthèses ? Motif strict.
  const rx = new RegExp(`\\(\\s*${t.titre.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*[);,]`, 'i');
  const prosePar = lotUnivers.filter((e) => rx.test(prose(e)));

  resultats.push({
    titre: t.titre, champ: t.champ, liens: t.liens,
    resolutionDirecte: directe ? `${directe.name} (${directe.slug})` : null,
    aliasCure: curesNoms.length ? curesNoms.map((n, i) => `${n} → ${curesFiches[i] ? curesFiches[i].slug : 'PAS DE FICHE'}`) : null,
    parenthese: parenthese.map((e) => `${e.name} (${e.slug}, ${e.type})`),
    prosePar: prosePar.slice(0, 5).map((e) => `${e.name} (${e.slug}, ${e.type})`),
  });
}

console.log('\n=== LES CIBLES ORPHELINES, VUES DEPUIS LA BASE ===');
for (const r of resultats) {
  const etat = r.resolutionDirecte ? 'RÉSOLUE'
    : r.aliasCure ? 'ALIAS DÉJÀ CURÉ'
      : r.parenthese.length ? 'parenthèse'
        : r.prosePar.length ? 'prose' : '— rien';
  console.log(`\n· « ${r.titre} » (${r.champ}, ${r.liens} liens) → ${etat}`);
  if (r.resolutionDirecte) console.log(`    directe : ${r.resolutionDirecte}`);
  if (r.aliasCure) console.log(`    alias-cures : ${r.aliasCure.join(' · ')}`);
  if (r.parenthese.length) console.log(`    parenthèse : ${r.parenthese.join(' · ')}`);
  if (r.prosePar.length) console.log(`    prose      : ${r.prosePar.join(' · ')}`);
}

const sortie = path.join(ROOT, `data/audits/alias-cibles-sonde-${HORODATE}.json`);
fs.writeFileSync(sortie, JSON.stringify({
  chantier: 'sonde : les cibles orphelines existent-elles sous un nom français ?',
  quand: new Date().toISOString(), ecritEnBase: false,
  mesure: { fiches: entries.length, aretes: rels.length, isolees: isolees.length, parUnivers: parUniv },
  resultats,
}, null, 1));
console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);
