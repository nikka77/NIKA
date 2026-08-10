// scripts/audit-aretes-manquantes.mjs — LES ARÊTES QUE LA BASE SAIT DÉJÀ, MAIS N'A PAS POSÉES.
//
// POURQUOI (10/08/2026)
// Le premier audit (isolees-matiere) ne regardait que les fiches isolées elles-mêmes : 5 sur 951
// portent un axe résoluble. Mais une isolée se sauve AUSSI par une arête ENTRANTE — un personnage
// non isolé dont `origin` désigne une île isolée, dont `fruit` désigne un fruit isolé. D'où ce
// second audit, qui balaie TOUT le corpus et pas seulement les isolées.
//
// Deux principes :
//  · La NATURE d'une arête n'est pas choisie, elle est LUE dans le graphe existant : pour chaque
//    axe on compte les natures déjà employées entre une fiche et la cible que son axe désigne.
//  · Résolution par nom EXACT après normalisation, dans le MÊME univers, jamais ailleurs
//    (les 5 arêtes inter-univers purgées le 05/08 venaient d'un index à plat).
//
// Ne modifie RIEN. Trace horodatée dans data/audits/.
// Usage : node --env-file=.env.local scripts/audit-aretes-manquantes.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  console.log(`  ${t} : ${out.length} lignes`);
  return out;
};
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

console.log('→ lecture (paginée)…');
const entries = await page('akasha_entries', 'id, slug, name, type, universe, attributes');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');

const degre = new Map();
for (const r of rels) {
  degre.set(r.from_entry, (degre.get(r.from_entry) ?? 0) + 1);
  degre.set(r.to_entry, (degre.get(r.to_entry) ?? 0) + 1);
}
const estIsolee = (id) => !(degre.get(id) ?? 0);
const isolees = entries.filter((e) => estIsolee(e.id));

/* Index de résolution PAR UNIVERS, trois passes de priorité : name > roman_name > slug. */
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
const litiges = new Map();
const resoudre = (univers, valeur, typeAttendu) => {
  const cle = norm(valeur);
  if (!cle) return null;
  const t = index.get(univers)?.get(cle);
  if (!t) return null;
  if (t.candidats.length === 1) return t.candidats[0];
  const f = typeAttendu ? t.candidats.filter((c) => c.type === typeAttendu) : [];
  if (f.length === 1) return f[0];
  litiges.set(`${univers} · ${valeur}`, t.candidats.map((c) => `${c.name}(${c.type})`).join(' vs '));
  return null;
};

/* Champs à sonder. `type` = forme attendue ; `cible` sert UNIQUEMENT à départager les homonymes. */
const CHAMPS_TEXTE = ['village', 'clan', 'organization', 'equipe', 'division', 'rank', 'generation',
  'faction', 'crew', 'fruit_type', 'meito_grade', 'race', 'saga', 'monde', 'nen', 'partie',
  'col', 'camp', 'category', 'element', 'region', 'material', 'discipline', 'occupation',
  'origin', 'fruit', 'sector', 'scope', 'blade_type', 'boat_class', 'status', 'personality',
  'affiliation', 'villageSlug', 'clanSlug'];
const CHAMPS_LISTE = ['affiliation', 'team', 'tools', 'abilities', 'signature', 'natureType',
  'kekkeiGenkai', 'classification', 'titles', 'occupation', 'quotes'];

const valeursDe = (attrs, champ) => {
  const v = attrs?.[champ];
  if (typeof v === 'string') return v === 'inconnu' ? [] : [v];
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : (x?.name ?? x?.nom ?? null))).filter(Boolean);
  return [];
};

/* ── 1. PRÉCÉDENTS : quelle nature le graphe emploie-t-il DÉJÀ pour chaque champ ? ─────────── */
const areteExistante = new Map();
for (const r of rels) {
  const c = `${r.from_entry}|${r.to_entry}`;
  if (!areteExistante.has(c)) areteExistante.set(c, new Set());
  areteExistante.get(c).add(r.relation);
}
const precedents = {};
const tousChamps = [...new Set([...CHAMPS_TEXTE, ...CHAMPS_LISTE])];
for (const e of entries) {
  for (const champ of tousChamps) {
    for (const v of valeursDe(e.attributes, champ)) {
      const cible = resoudre(e.universe, v, null);
      if (!cible || cible.id === e.id) continue;
      const nats = areteExistante.get(`${e.id}|${cible.id}`);
      if (!nats) continue;
      precedents[champ] ??= {};
      for (const n of nats) precedents[champ][n] = (precedents[champ][n] ?? 0) + 1;
    }
  }
}
// family[] a son propre précédent : la nature 'famille'.
let famillePosees = 0, familleTotal = 0;
for (const e of entries) {
  for (const m of (Array.isArray(e.attributes?.family) ? e.attributes.family : [])) {
    const cible = resoudre(e.universe, m?.slug, 'character') ?? resoudre(e.universe, m?.name, 'character');
    if (!cible || cible.id === e.id) continue;
    familleTotal++;
    if (areteExistante.get(`${e.id}|${cible.id}`)) famillePosees++;
  }
}

/* ── 2. ARÊTES RÉSOLUBLES ET ABSENTES, et ce qu'elles sauveraient ────────────────────────── */
const bilan = {};
const exemples = {};
for (const champ of tousChamps) {
  let resolubles = 0, dejaLa = 0, manquantes = 0;
  const sauve = new Set();
  for (const e of entries) {
    for (const v of valeursDe(e.attributes, champ)) {
      const cible = resoudre(e.universe, v, null);
      if (!cible || cible.id === e.id) continue;
      resolubles++;
      if (areteExistante.has(`${e.id}|${cible.id}`)) { dejaLa++; continue; }
      manquantes++;
      if (estIsolee(e.id)) sauve.add(e.id);
      if (estIsolee(cible.id)) sauve.add(cible.id);
      exemples[champ] ??= [];
      if (exemples[champ].length < 6) exemples[champ].push(`${e.universe} · ${e.name}(${e.type}) --[${champ}=${v}]--> ${cible.name}(${cible.type})${estIsolee(cible.id) ? ' ⟵ISOLÉE' : ''}${estIsolee(e.id) ? ' ⟵SOURCE ISOLÉE' : ''}`);
    }
  }
  if (resolubles) bilan[champ] = { resolubles, dejaLa, manquantes, isoleesSauvees: sauve.size, sauveIds: [...sauve] };
}
bilan.family = (() => {
  const sauve = new Set();
  let manquantes = 0;
  for (const e of entries) {
    for (const m of (Array.isArray(e.attributes?.family) ? e.attributes.family : [])) {
      const cible = resoudre(e.universe, m?.slug, 'character') ?? resoudre(e.universe, m?.name, 'character');
      if (!cible || cible.id === e.id) continue;
      if (areteExistante.has(`${e.id}|${cible.id}`)) continue;
      manquantes++;
      if (estIsolee(e.id)) sauve.add(e.id);
      if (estIsolee(cible.id)) sauve.add(cible.id);
    }
  }
  return { resolubles: familleTotal, dejaLa: famillePosees, manquantes, isoleesSauvees: sauve.size, sauveIds: [...sauve] };
})();

const tri = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
console.log('\n=== NATURE DÉJÀ EN USAGE (précédents mesurés dans le graphe) ===');
for (const [c, n] of Object.entries(precedents)) console.log(`  ${c.padEnd(16)} ${tri(n).map(([k, v]) => `${k}=${v}`).join(' · ')}`);

console.log('\n=== ARÊTES RÉSOLUBLES / DÉJÀ POSÉES / MANQUANTES  →  ISOLÉES SAUVÉES ===');
for (const [c, b] of Object.entries(bilan).sort((a, b2) => b2[1].isoleesSauvees - a[1].isoleesSauvees)) {
  console.log(`  ${c.padEnd(16)} ${String(b.resolubles).padStart(5)} / ${String(b.dejaLa).padStart(5)} / ${String(b.manquantes).padStart(5)}   →  ${b.isoleesSauvees}`);
  for (const x of exemples[c] ?? []) console.log(`        · ${x}`);
}

const union = new Set();
for (const b of Object.values(bilan)) for (const id of b.sauveIds) union.add(id);
console.log(`\n>>> ISOLÉES SAUVABLES AU TOTAL : ${union.size} / ${isolees.length}`);
if (litiges.size) {
  console.log(`\n⚠ ${litiges.size} valeurs abandonnées (homonymes non départagés). 8 premiers :`);
  for (const [v, q] of [...litiges].slice(0, 8)) console.log(`    ${v} → ${q}`);
}

const sortie = path.join(ROOT, `data/audits/aretes-manquantes-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(sortie, JSON.stringify({
  quand: new Date().toISOString(), total: entries.length, aretes: rels.length, isolees: isolees.length,
  precedents, bilan: Object.fromEntries(Object.entries(bilan).map(([k, v]) => [k, { ...v, sauveIds: undefined }])),
  exemples, isoleesSauvablesTotal: union.size, litiges: Object.fromEntries(litiges),
}, null, 1));
console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);
