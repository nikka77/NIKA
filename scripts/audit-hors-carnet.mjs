// scripts/audit-hors-carnet.mjs — CE QUE PERSONNE N'A ENCORE REGARDÉ (10/08/2026).
//
// POURQUOI
// Cinq vagues ont fermé les trous listés dans tasks/akasha-backlog.md. Ce script ne remesure PAS
// ces lignes : il ouvre des angles qui n'y figurent pas — l'équilibre entre univers (un type de
// fiche complètement absent, un axe déclaré et vide), les doublons de CONTENU (deux fiches qui
// portent la même section mot pour mot), et les contradictions internes (une valeur d'axe qui
// n'existe nulle part, un attribut que le texte contredit).
//
// Il ne modifie RIEN. Trace : data/audits/hors-carnet-<ISO>.json
// Usage : node --env-file=.env.local scripts/audit-hors-carnet.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';
import { UNIVERSE_TAXONOMY } from '../lib/akasha/universe-taxonomy.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');

// PAGINER — un select nu s'arrête à 1000 lignes SANS erreur, et `.order('id')` n'est pas
// décoratif : sans lui, deux pages peuvent répéter des lignes et en oublier d'autres.
const page = async (table, sel) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(table).select(sel).order('id').range(d, d + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};

const entries = await page('akasha_entries', 'id, slug, name, type, universe, summary, image_url, attributes');
const secs = await page('akasha_sections', 'id, entry_id, idx, titre, texte');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');

const parId = new Map(entries.map((e) => [e.id, e]));
const univers = [...new Set(entries.map((e) => e.universe).filter(Boolean))].sort();
const types = [...new Set(entries.map((e) => e.type).filter(Boolean))].sort();

// ─────────────────────────────────────────────────────────────────────────────
// A. ÉQUILIBRE — la matrice univers × type, et les cases à ZÉRO.
// ─────────────────────────────────────────────────────────────────────────────
const matrice = {};
for (const u of univers) {
  matrice[u] = { _total: 0 };
  for (const t of types) matrice[u][t] = 0;
}
for (const e of entries) {
  if (!e.universe || !e.type) continue;
  matrice[e.universe][e.type] = (matrice[e.universe][e.type] ?? 0) + 1;
  matrice[e.universe]._total += 1;
}
const casesVides = [];
for (const u of univers) {
  for (const t of types) {
    if (matrice[u][t] === 0) casesVides.push({ universe: u, type: t, totalUnivers: matrice[u]._total });
  }
}

// Catégories (attributes.category) par univers — un « métier », un « lieu » peut exister en type
// mais pas en catégorie.
const categories = {};
for (const e of entries) {
  const c = e.attributes?.category;
  if (!e.universe || typeof c !== 'string' || !c.trim()) continue;
  categories[e.universe] ??= {};
  categories[e.universe][c] = (categories[e.universe][c] ?? 0) + 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// B. AXES DÉCLARÉS vs PEUPLÉS — une valeur curée que PERSONNE ne porte est une chip morte.
//    Mesure faite sur le corpus paginé, valeur par valeur, avec le compte exact.
// ─────────────────────────────────────────────────────────────────────────────
const axes = [];
for (const taxo of UNIVERSE_TAXONOMY) {
  const lot = entries.filter((e) => e.universe === taxo.name);
  for (const a of taxo.axes) {
    const compteParValeur = new Map();
    let porteurs = 0;
    for (const e of lot) {
      const v = e.attributes?.[a.attr];
      if (typeof v !== 'string' || !v.trim()) continue;
      porteurs += 1;
      compteParValeur.set(v, (compteParValeur.get(v) ?? 0) + 1);
    }
    const valeurs = a.values.map((v) => ({ v: v.v, l: v.l ?? v.v, n: compteParValeur.get(v.v) ?? 0 }));
    axes.push({
      universe: taxo.name, slug: taxo.slug, attr: a.attr, label: a.label,
      totalUnivers: lot.length, porteurs, tauxPorteurs: lot.length ? +(porteurs / lot.length * 100).toFixed(2) : 0,
      valeursDeclarees: a.values.length,
      valeursVides: valeurs.filter((x) => x.n === 0),
      valeurs,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// C. DOUBLONS DE CONTENU — deux fiches DIFFÉRENTES portant le même texte mot pour mot.
//    Trois populations : sections de dossier, descFr, summary.
// ─────────────────────────────────────────────────────────────────────────────
const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
const groupes = (rows, cle, val, minLen) => {
  const m = new Map();
  for (const r of rows) {
    const t = norm(val(r));
    if (t.length < minLen) continue;
    const arr = m.get(t) ?? [];
    arr.push(r);
    m.set(t, arr);
  }
  return [...m.entries()]
    .filter(([, arr]) => new Set(arr.map(cle)).size > 1)
    .map(([texte, arr]) => ({ texte: texte.slice(0, 240), longueur: texte.length, n: arr.length, membres: arr }))
    .sort((a, b) => b.n - a.n);
};

const sectionsDoublons = groupes(
  secs.map((s) => ({ ...s, _slug: parId.get(s.entry_id)?.slug ?? null, _nom: parId.get(s.entry_id)?.name ?? null, _u: parId.get(s.entry_id)?.universe ?? null })),
  (r) => r.entry_id, (r) => r.texte, 120,
).map((g) => ({ ...g, membres: g.membres.map((m) => ({ slug: m._slug, nom: m._nom, universe: m._u, titre: m.titre, idx: m.idx })) }));

const descFrDoublons = groupes(entries, (e) => e.id, (e) => e.attributes?.descFr, 120)
  .map((g) => ({ ...g, membres: g.membres.map((m) => ({ slug: m.slug, nom: m.name, universe: m.universe, type: m.type })) }));

const summaryDoublons = groupes(entries, (e) => e.id, (e) => e.summary, 60)
  .map((g) => ({ ...g, membres: g.membres.map((m) => ({ slug: m.slug, nom: m.name, universe: m.universe, type: m.type })) }));

// ─────────────────────────────────────────────────────────────────────────────
// D. SECTIONS ORPHELINES ET AUTRES RÉSIDUS DE TABLE FILLE.
// ─────────────────────────────────────────────────────────────────────────────
const secsOrphelines = secs.filter((s) => !parId.has(s.entry_id))
  .map((s) => ({ id: s.id, entry_id: s.entry_id, titre: s.titre }));
const relsOrphelines = rels.filter((r) => !parId.has(r.from_entry) || !parId.has(r.to_entry))
  .map((r) => ({ from: r.from_entry, to: r.to_entry, relation: r.relation, fromManquant: !parId.has(r.from_entry), toManquant: !parId.has(r.to_entry) }));

// ─────────────────────────────────────────────────────────────────────────────
// E. SLUGS — accents, doublons de nom, formes qui casseraient une route.
// ─────────────────────────────────────────────────────────────────────────────
const slugsFautifs = entries.filter((e) => /[^a-z0-9-]/.test(e.slug ?? ''))
  .map((e) => ({ slug: e.slug, nom: e.name, universe: e.universe }));
const slugsDoublons = (() => {
  const m = new Map();
  for (const e of entries) { const arr = m.get(e.slug) ?? []; arr.push(e.id); m.set(e.slug, arr); }
  return [...m.entries()].filter(([, a]) => a.length > 1).map(([s, a]) => ({ slug: s, n: a.length }));
})();

const rapport = {
  mesureLe: new Date().toISOString(),
  totaux: { fiches: entries.length, sections: secs.length, aretes: rels.length, univers: univers.length, types },
  A_equilibre: { matrice, casesVides, categories },
  B_axes: axes,
  C_doublonsContenu: {
    sections: { groupes: sectionsDoublons.length, fichesConcernees: new Set(sectionsDoublons.flatMap((g) => g.membres.map((m) => m.slug))).size, detail: sectionsDoublons.slice(0, 60) },
    descFr: { groupes: descFrDoublons.length, fichesConcernees: new Set(descFrDoublons.flatMap((g) => g.membres.map((m) => m.slug))).size, detail: descFrDoublons.slice(0, 60) },
    summary: { groupes: summaryDoublons.length, fichesConcernees: new Set(summaryDoublons.flatMap((g) => g.membres.map((m) => m.slug))).size, detail: summaryDoublons.slice(0, 60) },
  },
  D_orphelins: { sections: secsOrphelines.length, sectionsDetail: secsOrphelines.slice(0, 40), aretes: relsOrphelines.length, aretesDetail: relsOrphelines.slice(0, 40) },
  E_slugs: { fautifs: slugsFautifs, doublons: slugsDoublons },
};

const dest = path.join(ROOT, 'data/audits', `hors-carnet-${STAMP}.json`);
fs.writeFileSync(dest, JSON.stringify(rapport, null, 2));

console.log(`fiches=${entries.length} sections=${secs.length} aretes=${rels.length}`);
console.log(`cases univers×type à ZÉRO : ${casesVides.length}`);
console.log(`axes déclarés : ${axes.length} — dont à moins de 5 % de porteurs : ${axes.filter((a) => a.tauxPorteurs < 5).length}`);
console.log(`valeurs curées à ZÉRO porteur : ${axes.reduce((n, a) => n + a.valeursVides.length, 0)} sur ${axes.reduce((n, a) => n + a.valeursDeclarees, 0)}`);
console.log(`doublons sections : ${sectionsDoublons.length} groupes / ${rapport.C_doublonsContenu.sections.fichesConcernees} fiches`);
console.log(`doublons descFr   : ${descFrDoublons.length} groupes / ${rapport.C_doublonsContenu.descFr.fichesConcernees} fiches`);
console.log(`doublons summary  : ${summaryDoublons.length} groupes / ${rapport.C_doublonsContenu.summary.fichesConcernees} fiches`);
console.log(`orphelins : ${secsOrphelines.length} sections, ${relsOrphelines.length} arêtes`);
console.log(`slugs fautifs : ${slugsFautifs.length} · slugs en double : ${slugsDoublons.length}`);
console.log(`trace → ${dest}`);
