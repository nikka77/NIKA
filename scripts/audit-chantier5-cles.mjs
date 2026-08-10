// scripts/audit-chantier5-cles.mjs — CHANTIER 5 : recensement des clés de `attributes`,
// des natures d'arêtes et des colonnes, depuis l'INSTANTANÉ local (aucune requête, aucune écriture).
// Usage : node scripts/audit-chantier5-cles.mjs <instantané.json> <sortie.json>
import fs from 'node:fs';

const snap = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const sortie = process.argv[3];
const { entries, rels, secs, colonnes } = snap;

const peuplee = (v) => {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true; // nombre / booléen : présent = peuplé (false compte comme une valeur portée)
};

// ── 1. clés de attributes ────────────────────────────────────────────────
const cles = new Map(); // cle -> { fiches, peuplees, types:Set, parType:{}, parUnivers:{}, exemples:[] }
for (const e of entries) {
  const a = e.attributes && typeof e.attributes === 'object' ? e.attributes : {};
  for (const [k, v] of Object.entries(a)) {
    if (!cles.has(k)) cles.set(k, { cle: k, fiches: 0, peuplees: 0, formes: new Set(), parType: {}, parUnivers: {}, exemples: [] });
    const c = cles.get(k);
    c.fiches += 1;
    if (peuplee(v)) c.peuplees += 1;
    c.formes.add(Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);
    c.parType[e.type] = (c.parType[e.type] ?? 0) + 1;
    const u = e.universe ?? '(sans univers)';
    c.parUnivers[u] = (c.parUnivers[u] ?? 0) + 1;
    if (c.exemples.length < 3 && peuplee(v)) {
      const s = typeof v === 'string' ? v.slice(0, 90) : JSON.stringify(v).slice(0, 90);
      c.exemples.push({ slug: e.slug, valeur: s });
    }
  }
}
const clesListe = [...cles.values()]
  .map((c) => ({ ...c, formes: [...c.formes].sort() }))
  .sort((a, b) => b.peuplees - a.peuplees || b.fiches - a.fiches);

// ── 2. colonnes de akasha_entries : remplissage réel ──────────────────────
const colStats = {};
for (const col of colonnes.akasha_entries) {
  let n = 0;
  for (const e of entries) if (peuplee(e[col])) n += 1;
  colStats[col] = { peuplees: n, vides: entries.length - n };
}
// idem sections & relations
const colSecStats = {};
for (const col of colonnes.akasha_sections) {
  let n = 0;
  for (const s of secs) if (peuplee(s[col])) n += 1;
  colSecStats[col] = { peuplees: n, vides: secs.length - n };
}
const colRelStats = {};
for (const col of colonnes.akasha_relations) {
  let n = 0;
  for (const r of rels) if (peuplee(r[col])) n += 1;
  colRelStats[col] = { peuplees: n, vides: rels.length - n };
}
// valeurs distinctes de `source` sur les sections
const srcSec = {};
for (const s of secs) { const k = s.source ?? '(null)'; srcSec[k] = (srcSec[k] ?? 0) + 1; }
// rarity distincte
const rarites = {};
for (const e of entries) { const k = e.rarity ?? '(null)'; rarites[k] = (rarites[k] ?? 0) + 1; }
// is_fiction
const fiction = {};
for (const e of entries) { const k = String(e.is_fiction); fiction[k] = (fiction[k] ?? 0) + 1; }

// ── 3. natures d'arêtes ──────────────────────────────────────────────────
const byId = new Map(entries.map((e) => [e.id, e]));
const natures = new Map();
let orphelines = 0;
for (const r of rels) {
  const src = byId.get(r.from_entry);
  const dst = byId.get(r.to_entry);
  if (!src || !dst) { orphelines += 1; continue; }
  if (!natures.has(r.relation)) natures.set(r.relation, { relation: r.relation, total: 0, sortantParType: {}, entrantParType: {}, paires: {}, exemples: [] });
  const n = natures.get(r.relation);
  n.total += 1;
  n.sortantParType[src.type] = (n.sortantParType[src.type] ?? 0) + 1; // type de la fiche qui PART
  n.entrantParType[dst.type] = (n.entrantParType[dst.type] ?? 0) + 1; // type de la fiche qui REÇOIT
  const p = `${src.type}→${dst.type}`;
  n.paires[p] = (n.paires[p] ?? 0) + 1;
  if (n.exemples.length < 2) n.exemples.push(`${src.slug} (${src.type}) → ${dst.slug} (${dst.type})`);
}
const naturesListe = [...natures.values()].sort((a, b) => b.total - a.total);

// ── 4. fiches par type + par gabarit de rendu ────────────────────────────
// Le routage réel : app/learn/akasha/[slug]/page.tsx
//   character → CharacterZone ; status → OrganizationZone ;
//   (power|skill) && attributes.category === 'Attaque' → gabarit Attaque ; sinon EntityZone.
const gabarit = (e) => {
  if (e.type === 'character') return 'CharacterZone';
  if (e.type === 'status') return 'OrganizationZone';
  const cat = e.attributes && typeof e.attributes.category === 'string' ? e.attributes.category : null;
  if ((e.type === 'power' || e.type === 'skill') && cat === 'Attaque') return 'gabarit Attaque';
  return 'EntityZone';
};
const parGabarit = {};
const parType = {};
for (const e of entries) {
  const g = gabarit(e);
  parGabarit[g] = (parGabarit[g] ?? 0) + 1;
  parType[e.type] = (parType[e.type] ?? 0) + 1;
  const k = `${g} · ${e.type}`;
  parGabarit[k] = (parGabarit[k] ?? 0) + 1;
}

// ── 5. arêtes par gabarit du porteur, par nature et par SENS ─────────────
// « Combien de fiches de gabarit G portent au moins une arête de nature N dans le sens S ? »
const parGabaritNatureSens = {}; // `${gabarit}|${relation}|${sens}` -> Set de slugs
const add = (g, rel, sens, slug) => {
  const k = `${g}|${rel}|${sens}`;
  (parGabaritNatureSens[k] ??= new Set()).add(slug);
};
for (const r of rels) {
  const src = byId.get(r.from_entry);
  const dst = byId.get(r.to_entry);
  if (!src || !dst) continue;
  add(gabarit(src), r.relation, 'sortant', src.slug);
  add(gabarit(dst), r.relation, 'entrant', dst.slug);
}
const gns = Object.entries(parGabaritNatureSens)
  .map(([k, v]) => { const [g, rel, sens] = k.split('|'); return { gabarit: g, relation: rel, sens, fiches: v.size }; })
  .sort((a, b) => b.fiches - a.fiches);

fs.writeFileSync(sortie, JSON.stringify({
  quand: new Date().toISOString(),
  instantane: process.argv[2],
  socle: { fiches: entries.length, aretes: rels.length, sections: secs.length, aretesOrphelines: orphelines },
  colonnes,
  colonnesRemplissage: { akasha_entries: colStats, akasha_relations: colRelStats, akasha_sections: colSecStats },
  sectionsSource: srcSec,
  rarites,
  is_fiction: fiction,
  parType,
  parGabarit,
  clesAttributes: clesListe,
  naturesAretes: naturesListe,
  gabaritNatureSens: gns,
}, null, 1));
console.log(`clés distinctes: ${clesListe.length} · natures d'arêtes: ${naturesListe.length} · arêtes orphelines: ${orphelines}`);
console.log(`écrit → ${sortie}`);
