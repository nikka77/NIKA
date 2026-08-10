// scripts/akasha-meta-simulation.mjs — CHANTIER 4, étape 3 : SIMULER le correctif avant de l'écrire.
// Question : si, faute de descFr en prose, on complète le repli `summary` par les faits que la
// fiche porte DÉJÀ et que sa page AFFICHE DÉJÀ (arêtes maîtrise/appartient/habite/exerce, puis
// attributs), combien de descriptions dupliquées deviennent distinctes ? Et combien restent ?
// LECTURE SEULE (relit deux traces). Trace horodatée en sortie.
import { readFileSync, writeFileSync } from 'node:fs';

const desambig = JSON.parse(readFileSync(process.argv[2], 'utf8'));

function normal(s) {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function empreinte(desc, name) {
  const d = normal(desc), n = normal(name);
  return (n ? d.split(n).join(' ') : d).replace(/\s+/g, ' ').trim();
}

/** Les faits que la fiche porte ET que sa page affiche déjà. Aucun n'est inventé : chacun est une
 *  ligne d'`akasha_relations` ou une clé d'`attributes`. On rend AUSSI la phrase-preuve. */
const LABEL_OUT = { appartient: 'Appartient à', habite: 'Réside à', exerce: 'Exerce', possede: 'Possède', maitrise: 'Maîtrise' };
// VARIANTES comparées (on choisit sur le chiffre, pas sur le goût) :
//   A = relations + n'importe quel attribut          (première version)
//   B = relations SEULES
//   C = relations + attributs INTRINSÈQUES seulement (ni `role` ni `category` : ce sont des
//       étiquettes taxonomiques que le type de la fiche dit déjà, et la variante A les a vues
//       produire « … Personnage secondaire. » sur des fiches Dragon Ball sans casser l'égalité)
const VARIANTE = process.env.VAR ?? 'A';
const ATTR_A = ['category', 'element', 'material', 'race', 'role', 'occupation', 'discipline', 'rank', 'village', 'crew', 'faction', 'origin', 'region', 'partie', 'fruit_type', 'boat_class'];
const ATTR_C = ['element', 'material', 'discipline', 'fruit_type', 'crew', 'village', 'faction', 'rank', 'occupation', 'origin', 'region', 'boat_class', 'partie'];

function faits(m) {
  const out = [];
  const noms = (arr) => [...new Set(arr.map((x) => x.name).filter(Boolean))];

  const maitres = noms((m.in ?? []).filter((r) => r.relation === 'maitrise'));
  if (maitres.length && (m.type === 'power' || m.type === 'skill')) {
    out.push({ txt: `Maîtrisée par ${maitres.slice(0, 2).join(' et ')}`, preuve: `akasha_relations: maitrise → ${m.slug}` });
  }
  for (const rel of ['appartient', 'habite', 'exerce']) {
    const n = noms((m.out ?? []).filter((r) => r.relation === rel));
    if (n.length) { out.push({ txt: `${LABEL_OUT[rel]} ${n.slice(0, 2).join(' et ')}`, preuve: `akasha_relations: ${m.slug} → ${rel}` }); break; }
  }
  if (VARIANTE !== 'B' && !out.length) {
    for (const k of (VARIANTE === 'C' ? ATTR_C : ATTR_A)) {
      const v = m.attrs?.[k];
      if (typeof v === 'string' && v.trim().length > 1) { out.push({ txt: v.trim(), preuve: `attributes.${k}` }); break; }
    }
  }
  return out;
}

function clamp(s, max) {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 18)).trimEnd() + '…';
}

const lignes = [];
for (const g of desambig.groupes) {
  for (const m of g.membres) {
    // description ACTUELLE reconstituée : `${name} — ${summary}` ou le descFr non-prose (= summary)
    const base = `${m.name} — ${m.summary ?? ''}`.trim();
    const f = faits(m);
    const suffixe = f.map((x) => x.txt).join('. ');
    const corps = base.replace(/[\s.·—-]+$/, '');
    const nouvelle = clamp(suffixe ? `${corps}. ${suffixe.replace(/\.+$/, '')}.` : `${corps}.`, 165);
    lignes.push({ slug: m.slug, name: m.name, type: m.type, universe: m.universe, emp_avant: g.emp,
      nouvelle, emp_apres: empreinte(nouvelle, m.name), preuves: f.map((x) => x.preuve), suffixe });
  }
}

const cnt = new Map();
for (const l of lignes) cnt.set(l.emp_apres, (cnt.get(l.emp_apres) ?? 0) + 1);
const restants = lignes.filter((l) => cnt.get(l.emp_apres) > 1);
const groupesRestants = [...new Set(restants.map((l) => l.emp_apres))];

const resume = {
  quand: new Date().toISOString(),
  entree: process.argv[2],
  variante: VARIANTE,
  fiches_simulees: lignes.length,
  avec_suffixe: lignes.filter((l) => l.suffixe).length,
  sans_aucun_fait: lignes.filter((l) => !l.suffixe).length,
  encore_dupliquees_apres: restants.length,
  groupes_restants: groupesRestants.length,
  gain: lignes.length - restants.length,
  echantillon_20: lignes.slice(0, 200).filter((_, i) => i % 10 === 0).slice(0, 20)
    .map((l) => ({ slug: l.slug, nouvelle: l.nouvelle, preuves: l.preuves })),
  restants_top: groupesRestants.slice(0, 8).map((e) => ({ emp: e, n: cnt.get(e), ex: restants.filter((l) => l.emp_apres === e)[0]?.nouvelle })),
};
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const p = `data/audits/meta-partage-simulation-${VARIANTE}-${stamp}.json`;
writeFileSync(p, JSON.stringify({ ...resume, lignes }, null, 2));
console.log(JSON.stringify(resume, null, 2));
console.log('\nTRACE →', p);
