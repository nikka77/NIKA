// scripts/akasha-simule-comblement.mjs — CHANTIER 2, étape 2 : DIMENSIONNER avant d'écrire.
// Simule la grappe « Autres liens » telle qu'elle sera rendue sur CharacterZone et
// OrganizationZone (mêmes filtres que le code à venir), et AUDITE LE SENS sur un échantillon :
// pour 20 arêtes tirées dans les poches comblées, on imprime la phrase que le lecteur lira, dans
// LES DEUX SENS, pour vérifier qu'aucune n'affirme le contraire du canon (leçon du 08/08).
// Lecture seule, paginée. Aucune écriture.
import { clientSite } from '../lib/ops/db.mjs';
import { libelle, RELATION_LABELS, RELATION_LABELS_ENTRANT, RELATIONS_REFLEXIVES } from '../lib/akasha/relation-labels.ts';

const db = clientSite();
const PAGE = 1000;
async function pagine(table, cols) {
  const out = [];
  for (let d = 0; ; d += PAGE) {
    const { data, error } = await db.from(table).select(cols).order('id', { ascending: true }).range(d, d + PAGE - 1);
    if (error) throw new Error(`${table} @${d} : ${error.message}`);
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

const entries = await pagine('akasha_entries', 'id, slug, name, type, universe, category:attributes->>category');
const rels = await pagine('akasha_relations', 'id, relation, from_entry, to_entry');
const parId = new Map(entries.map((e) => [e.id, e]));

// ── 0. Couverture du dictionnaire : une nature sans libellé retomberait sur son nom brut ──
const natures = [...new Set(rels.map((r) => r.relation))].sort();
console.log('=== 0. COUVERTURE DES DEUX DICTIONNAIRES ===');
for (const n of natures) {
  const s = RELATION_LABELS[n];
  const e = RELATIONS_REFLEXIVES.has(n) ? `${RELATION_LABELS[n]} (réflexive)` : RELATION_LABELS_ENTRANT[n];
  console.log(`  ${n.padEnd(18)} sortant « ${String(s ?? '⚠ BRUT').padEnd(28)} »  entrant « ${e ?? '⚠ RETOMBE SUR LE SORTANT'} »`);
}

// ── 1. Ce que CharacterZone rend DÉJÀ (copie exacte du code actuel) ──
const CZ_OUT = new Set(['maitrise', 'famille', 'allie', 'mentor', 'eleve', 'ennemi', 'rival', 'appartient', 'habite', 'exerce']);
const CZ_IN = new Set(['famille', 'mentor', 'eleve', 'allie', 'ennemi', 'rival']);

// ── 2. Simulation : la grappe « Autres liens » par fiche ──
const parFiche = new Map(); // id -> [{label, nom, sens}]
const ajoute = (id, x) => { const l = parFiche.get(id) ?? []; l.push(x); parFiche.set(id, l); };

for (const r of rels) {
  const f = parId.get(r.from_entry), t = parId.get(r.to_entry);
  if (!f || !t) continue;
  // Fiche SOURCE
  if (f.type === 'character' && !CZ_OUT.has(r.relation)) ajoute(f.id, { label: libelle(r.relation, false), nom: t.name, sens: '→', rel: r.relation, autre: t });
  if (f.type === 'status') ajoute(f.id, { label: libelle(r.relation, false), nom: t.name, sens: '→', rel: r.relation, autre: t });
  // Fiche CIBLE
  if (t.type === 'character' && !CZ_IN.has(r.relation)) ajoute(t.id, { label: libelle(r.relation, true), nom: f.name, sens: '←', rel: r.relation, autre: f });
  if (t.type === 'status' && !(r.relation === 'appartient' && (f.type === 'character' || f.type === 'artifact'))) {
    ajoute(t.id, { label: libelle(r.relation, true), nom: f.name, sens: '←', rel: r.relation, autre: f });
  }
}

// Dédup par (label, nom) — même règle qu'EntityZone (l.227).
for (const [id, l] of parFiche) {
  parFiche.set(id, l.filter((x, i, tab) => tab.findIndex((y) => y.nom === x.nom && y.label === x.label) === i));
}

const parTypeFiche = new Map();
for (const [id, l] of parFiche) {
  const e = parId.get(id);
  const g = parTypeFiche.get(e.type) ?? { fiches: 0, chips: 0, max: 0, maxSlug: '', au12: 0, seuil: [] };
  g.fiches++; g.chips += l.length;
  if (l.length > g.max) { g.max = l.length; g.maxSlug = e.slug; }
  if (l.length > 12) g.au12++;
  g.seuil.push(l.length);
  parTypeFiche.set(e.type, g);
}

console.log('\n=== 1. VOLUME DE LA GRAPPE « Autres liens » (simulation) ===');
for (const [t, g] of parTypeFiche) {
  const med = g.seuil.sort((a, b) => a - b)[Math.floor(g.seuil.length / 2)];
  console.log(`  ${t.padEnd(10)} ${String(g.fiches).padStart(4)} fiches gagnent la grappe · ${g.chips} chips · médiane ${med} · max ${g.max} (${g.maxSlug}) · ${g.au12} fiches au-delà de 12`);
}

// ── 3. AUDIT DU SENS sur 20 cas — un par couple (nature, sens) le plus peuplé ──
console.log('\n=== 2. AUDIT DU SENS — 20 cas, la phrase que le lecteur lira ===');
const poches = new Map();
for (const [id, l] of parFiche) {
  for (const x of l) {
    const k = `${x.rel}|${x.sens}`;
    if (!poches.has(k)) poches.set(k, []);
    poches.get(k).push({ fiche: parId.get(id), ...x });
  }
}
const tri = [...poches].sort((a, b) => b[1].length - a[1].length);
let i = 0;
for (const [k, ex] of tri) {
  if (i >= 20) break;
  const [rel, sens] = k.split('|');
  const c = ex[0];
  const reflexive = RELATIONS_REFLEXIVES.has(rel) ? ' [RÉFLEXIVE]' : '';
  console.log(`  ${String(++i).padStart(2)}. ${String(ex.length).padStart(5)}×  ${rel} ${sens}${reflexive}`);
  console.log(`      sur « ${c.fiche.name} » (${c.fiche.type}) on lira :  « ${c.label} · ${c.nom} »`);
  console.log(`      l'arête en base dit :  ${sens === '→' ? `${c.fiche.name} --${rel}--> ${c.nom}` : `${c.nom} --${rel}--> ${c.fiche.name}`}`);
}

// ── 4. Le plafond silencieux de la grappe Appartenances (slice(0,12) sans « + N ») ──
console.log('\n=== 3. Plafond SILENCIEUX de la grappe Appartenances (CharacterZone l.152) ===');
let coupees = 0, maxApp = 0, maxSlug = '';
const perso = new Map();
for (const r of rels) {
  const f = parId.get(r.from_entry), t = parId.get(r.to_entry);
  if (f?.type !== 'character' || !['appartient', 'habite', 'exerce'].includes(r.relation)) continue;
  const l = perso.get(f.id) ?? new Set(); l.add(t.name); perso.set(f.id, l);
}
for (const [id, s] of perso) { if (s.size > 12) { coupees++; if (s.size > maxApp) { maxApp = s.size; maxSlug = parId.get(id).slug; } } }
console.log(`  ${coupees} fiches personnage dépassent 12 appartenances liées (max ${maxApp}, ${maxSlug}) — coupées SANS un mot.`);
