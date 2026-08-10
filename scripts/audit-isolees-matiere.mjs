// scripts/audit-isolees-matiere.mjs — QUELLE MATIÈRE EXISTE DÉJÀ POUR SORTIR LES FICHES ISOLÉES ?
//
// POURQUOI (10/08/2026)
// 951 fiches n'ont aucune arête : leur canal ne montre rien, la navigation s'arrête. Avant d'écrire
// la moindre arête, ce script mesure ce que la base sait DÉJÀ dire d'elles — axes d'attributs dont
// la valeur est le `name` d'une autre fiche du MÊME univers, `family[]`, techniques citées.
//
// Il ne modifie RIEN. Il écrit une trace horodatée dans data/audits/.
// Usage : node --env-file=.env.local scripts/audit-isolees-matiere.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();

/** Pagination obligatoire : PostgREST plafonne à 1 000 lignes SANS erreur (leçon du 01/08). */
const page = async (table, sel) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(table).select(sel).range(d, d + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  console.log(`  ${table} : ${out.length} lignes`);
  return out;
};

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

console.log('→ lecture (paginée)…');
const entries = await page('akasha_entries', 'id, slug, name, type, universe, attributes');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');

const parId = new Map(entries.map((e) => [e.id, e]));
const degre = new Map();
for (const r of rels) {
  degre.set(r.from_entry, (degre.get(r.from_entry) ?? 0) + 1);
  degre.set(r.to_entry, (degre.get(r.to_entry) ?? 0) + 1);
}
const isolees = entries.filter((e) => !(degre.get(e.id) ?? 0));
console.log(`\n${isolees.length} fiches isolées sur ${entries.length}`);

/* ── 1. Quels axes portent les fiches isolées, et combien de fois ? ───────────────────────── */
const axesIsolees = new Map();   // axe → { total, parUnivers }
const typesIsolees = new Map();
for (const e of isolees) {
  typesIsolees.set(`${e.universe} · ${e.type}`, (typesIsolees.get(`${e.universe} · ${e.type}`) ?? 0) + 1);
  for (const [k, v] of Object.entries(e.attributes ?? {})) {
    if (typeof v === 'string' && v.trim() && v !== 'inconnu' && v.length < 80) {
      if (!axesIsolees.has(k)) axesIsolees.set(k, { total: 0, univers: new Map() });
      const a = axesIsolees.get(k);
      a.total++; a.univers.set(e.universe, (a.univers.get(e.universe) ?? 0) + 1);
    } else if (Array.isArray(v) && v.length) {
      const k2 = `${k}[]`;
      if (!axesIsolees.has(k2)) axesIsolees.set(k2, { total: 0, univers: new Map() });
      const a = axesIsolees.get(k2);
      a.total++; a.univers.set(e.universe, (a.univers.get(e.universe) ?? 0) + 1);
    }
  }
}

/* ── 2. Index de résolution PAR UNIVERS (jamais inter-univers). ───────────────────────────── */
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
const resoudre = (univers, valeur, typeAttendu) => {
  const cle = norm(valeur);
  if (!cle) return { cible: null, motif: 'valeur vide' };
  const t = index.get(univers)?.get(cle);
  if (!t) return { cible: null, motif: 'aucune fiche de ce nom' };
  if (t.candidats.length === 1) return { cible: t.candidats[0], motif: 'unique' };
  const f = typeAttendu ? t.candidats.filter((c) => c.type === typeAttendu) : [];
  if (f.length === 1) return { cible: f[0], motif: `homonyme départagé par type=${typeAttendu}` };
  return { cible: null, motif: `homonyme irréductible (${t.candidats.map((c) => c.type).join('/')})` };
};

/* ── 3. QUELLE NATURE ? On ne la choisit pas, on la LIT dans le graphe existant.
   Pour chaque axe, on regarde les arêtes déjà posées entre une fiche portant cet axe et la fiche
   qui porte ce nom : la nature majoritaire est celle du précédent, pas celle de notre goût. ── */
const AXES_CANDIDATS = ['village', 'clan', 'organization', 'equipe', 'division', 'rank', 'generation',
  'faction', 'crew', 'fruit_type', 'meito_grade', 'race', 'saga', 'monde', 'nen', 'partie',
  'affiliation', 'col', 'camp', 'category', 'element', 'region', 'material', 'discipline', 'occupation'];

const areteExistante = new Map();   // "from|to" → [relations]
for (const r of rels) {
  const c = `${r.from_entry}|${r.to_entry}`;
  if (!areteExistante.has(c)) areteExistante.set(c, []);
  areteExistante.get(c).push(r.relation);
}

const precedents = {};   // axe → { nature → n }
for (const e of entries) {
  for (const axe of AXES_CANDIDATS) {
    const v = e.attributes?.[axe];
    if (typeof v !== 'string' || !v.trim() || v === 'inconnu') continue;
    const { cible } = resoudre(e.universe, v, null);
    if (!cible || cible.id === e.id) continue;
    const nats = areteExistante.get(`${e.id}|${cible.id}`);
    if (!nats) continue;
    precedents[axe] ??= {};
    for (const n of nats) precedents[axe][n] = (precedents[axe][n] ?? 0) + 1;
  }
}

/* ── 4. Combien d'isolées un axe donné sortirait-il ? (résolution à blanc) ─────────────────── */
const gainParAxe = {};
const echecsParAxe = {};
const exemples = {};
for (const e of isolees) {
  for (const axe of AXES_CANDIDATS) {
    const v = e.attributes?.[axe];
    if (typeof v !== 'string' || !v.trim() || v === 'inconnu') continue;
    const { cible, motif } = resoudre(e.universe, v, null);
    if (!cible || cible.id === e.id) {
      echecsParAxe[axe] ??= {};
      echecsParAxe[axe][motif] = (echecsParAxe[axe][motif] ?? 0) + 1;
      continue;
    }
    gainParAxe[axe] ??= new Set();
    gainParAxe[axe].add(e.id);
    exemples[axe] ??= [];
    if (exemples[axe].length < 5) exemples[axe].push(`${e.universe} · ${e.name}(${e.type}) --[${axe}=${v}]--> ${cible.name}(${cible.type})`);
  }
  // family[]
  if (Array.isArray(e.attributes?.family)) {
    for (const m of e.attributes.family) {
      const { cible } = resoudre(e.universe, m?.slug, 'character');
      const c2 = cible ?? resoudre(e.universe, m?.name, 'character').cible;
      if (!c2 || c2.id === e.id) { echecsParAxe.family ??= {}; echecsParAxe.family.nonResolu = (echecsParAxe.family.nonResolu ?? 0) + 1; continue; }
      gainParAxe.family ??= new Set(); gainParAxe.family.add(e.id);
      exemples.family ??= [];
      if (exemples.family.length < 5) exemples.family.push(`${e.universe} · ${e.name} --[family ${m?.rel}]--> ${c2.name}`);
    }
  }
  // jutsu / techniques citées par nom
  for (const champ of ['jutsu', 'techniques', 'abilities', 'attaques']) {
    const liste = e.attributes?.[champ];
    if (!Array.isArray(liste)) continue;
    for (const it of liste) {
      const nom = typeof it === 'string' ? it : (it?.name ?? it?.nom);
      const { cible } = resoudre(e.universe, nom, 'power');
      const c2 = cible ?? resoudre(e.universe, nom, 'skill').cible;
      if (!c2 || c2.id === e.id) { echecsParAxe[champ] ??= {}; echecsParAxe[champ].nonResolu = (echecsParAxe[champ].nonResolu ?? 0) + 1; continue; }
      gainParAxe[champ] ??= new Set(); gainParAxe[champ].add(e.id);
      exemples[champ] ??= [];
      if (exemples[champ].length < 5) exemples[champ].push(`${e.universe} · ${e.name} --[${champ}]--> ${c2.name}(${c2.type})`);
    }
  }
}

const tri = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
console.log('\n=== TYPES DES ISOLÉES ===');
for (const [k, v] of tri(Object.fromEntries(typesIsolees)).slice(0, 20)) console.log(`  ${k.padEnd(38)} ${v}`);

console.log('\n=== AXES PORTÉS PAR LES ISOLÉES (bruts) ===');
for (const [k, v] of [...axesIsolees].sort((a, b) => b[1].total - a[1].total).slice(0, 30))
  console.log(`  ${k.padEnd(20)} ${String(v.total).padStart(4)}   ${[...v.univers].map(([u, n]) => `${u}:${n}`).join(' ')}`);

console.log('\n=== NATURE DÉJÀ EN USAGE POUR CET AXE (précédents mesurés) ===');
for (const [axe, nats] of Object.entries(precedents))
  console.log(`  ${axe.padEnd(16)} ${tri(nats).map(([n, c]) => `${n}=${c}`).join(' · ')}`);

console.log('\n=== ISOLÉES QUE CHAQUE AXE SORTIRAIT ===');
for (const [axe, s] of Object.entries(gainParAxe).sort((a, b) => b[1].size - a[1].size)) {
  console.log(`  ${axe.padEnd(16)} ${String(s.size).padStart(4)} fiches   échecs: ${tri(echecsParAxe[axe] ?? {}).slice(0, 3).map(([m, c]) => `${m}=${c}`).join(' · ')}`);
  for (const x of exemples[axe] ?? []) console.log(`        · ${x}`);
}

const couverture = new Set();
for (const s of Object.values(gainParAxe)) for (const id of s) couverture.add(id);
console.log(`\n>>> Isolées sortables par extraction structurée : ${couverture.size} / ${isolees.length}`);

const rapport = {
  chantier: 'matière disponible pour les fiches isolées', quand: new Date().toISOString(),
  total: entries.length, aretes: rels.length, isolees: isolees.length,
  typesIsolees: Object.fromEntries(tri(Object.fromEntries(typesIsolees))),
  axesPortes: Object.fromEntries([...axesIsolees].map(([k, v]) => [k, { total: v.total, univers: Object.fromEntries(v.univers) }])),
  naturesPrecedentes: precedents,
  gainParAxe: Object.fromEntries(Object.entries(gainParAxe).map(([k, v]) => [k, v.size])),
  echecsParAxe, exemples,
  couvertureTotale: couverture.size,
  restantApres: isolees.length - couverture.size,
};
const sortie = path.join(ROOT, `data/audits/isolees-matiere-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(sortie, JSON.stringify(rapport, null, 1));
console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);
