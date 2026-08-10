// scripts/resumes-creux-sonder.mjs — SONDE (lecture seule) des résumés de remplissage.
//
// POURQUOI : le carnet annonce 420 résumés creux dont 410 en Dragon Ball, repérés par la forme
// /^(personnage|lieu|objet|technique) (secondaire|mineur|de l'univers)…/. Avant d'écrire quoi que
// ce soit, il faut : (1) recompter, (2) voir si le motif du carnet rate des formes voisines,
// (3) mesurer combien de ces fiches ont un `descFr` qui porte VRAIMENT de la matière.
//
// N'écrit rien en base. Sort un JSON dans le scratchpad.
// Usage : node --env-file=.env.local scripts/resumes-creux-sonder.mjs <fichier-sortie>
import fs from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';

const db = clientSite();
const sortie = process.argv[2];
if (!sortie) throw new Error('chemin de sortie requis');

// PAGINATION OBLIGATOIRE : un select nu s'arrête à 1000 lignes sans erreur (leçon payée 3 fois).
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

const entries = await page('akasha_entries', 'id, slug, name, type, universe, summary, description, attributes');
console.log(`lues : ${entries.length} fiches`);

const MOTIF_CARNET = /^(personnage|lieu|objet|technique)\s+(secondaire|mineur|de l'univers)[^.]{0,60}\.?$/i;

// Un résumé qui ne dit rien de propre : il se contente de nommer le TYPE et l'ŒUVRE.
// On le reconnaît à sa forme, pas à une liste recopiée.
const univers = [...new Set(entries.map((e) => e.universe).filter(Boolean))];
const echapUnivers = univers.map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const MOTIF_LARGE = new RegExp(
  `^(personnage|personnage secondaire|personnage mineur|lieu|objet|technique|arme|organisation|groupe|créature|entité)` +
  `[^.]{0,80}?\\b(${echapUnivers})\\b[^.]{0,60}\\.?$`, 'i',
);

const creuxCarnet = entries.filter((e) => MOTIF_CARNET.test(String(e.summary ?? '').trim()));
const creuxLarge = entries.filter((e) => MOTIF_LARGE.test(String(e.summary ?? '').trim()));

// Regroupement des résumés courts par forme, pour voir ce que les motifs ratent.
const courts = entries.filter((e) => {
  const s = String(e.summary ?? '').trim();
  return s && s.length <= 110;
});
const formes = new Map();
for (const e of courts) {
  const cle = String(e.summary).trim().toLowerCase()
    .replace(/\s+/g, ' ');
  formes.set(cle, (formes.get(cle) ?? 0) + 1);
}
const formesRepetees = [...formes.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]);

const matiere = (t) => {
  const s = String(t ?? '').replace(/\s+/g, ' ').trim();
  return { len: s.length, txt: s };
};

const detail = (lot) => lot.map((e) => ({
  id: e.id, slug: e.slug, name: e.name, type: e.type, universe: e.universe,
  summary: e.summary,
  descriptionNonVide: Boolean(String(e.description ?? '').trim()),
  descriptionEgaleSummary: String(e.description ?? '').trim() === String(e.summary ?? '').trim() && Boolean(String(e.description ?? '').trim()),
  descFrLen: matiere(e.attributes?.descFr).len,
  bioLen: matiere(e.attributes?.bio).len,
}));

const rapport = {
  chantier: 'sonde résumés de remplissage (lecture seule)',
  quand: new Date().toISOString(),
  totalFiches: entries.length,
  motifCarnet: { regex: String(MOTIF_CARNET), n: creuxCarnet.length },
  motifLarge: { regex: String(MOTIF_LARGE), n: creuxLarge.length },
  parUniversCarnet: Object.fromEntries(
    Object.entries(creuxCarnet.reduce((a, e) => ((a[e.universe] = (a[e.universe] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]),
  ),
  parUniversLarge: Object.fromEntries(
    Object.entries(creuxLarge.reduce((a, e) => ((a[e.universe] = (a[e.universe] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]),
  ),
  // Matière disponible sur les fiches du motif du carnet.
  matiereCarnet: {
    avecDescFr80plus: creuxCarnet.filter((e) => matiere(e.attributes?.descFr).len >= 80).length,
    avecDescFr200plus: creuxCarnet.filter((e) => matiere(e.attributes?.descFr).len >= 200).length,
    sansDescFr: creuxCarnet.filter((e) => !matiere(e.attributes?.descFr).len).length,
    descFrCourt: creuxCarnet.filter((e) => { const l = matiere(e.attributes?.descFr).len; return l > 0 && l < 80; }).length,
    avecDescriptionNonVide: creuxCarnet.filter((e) => String(e.description ?? '').trim()).length,
  },
  formesRepetees: formesRepetees.slice(0, 60).map(([txt, n]) => ({ n, txt })),
  fiches: detail(creuxLarge),
};

fs.writeFileSync(sortie, JSON.stringify(rapport, null, 1));
console.log(`motif carnet : ${creuxCarnet.length} · motif large : ${creuxLarge.length}`);
console.log('par univers (carnet) :', rapport.parUniversCarnet);
console.log('par univers (large) :', rapport.parUniversLarge);
console.log('matière :', rapport.matiereCarnet);
console.log(`trace : ${sortie}`);
