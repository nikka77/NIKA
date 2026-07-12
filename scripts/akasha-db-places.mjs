// scripts/akasha-db-places.mjs — remplace les lieux DB espagnols par les planètes FR curées
// (data/akasha/db-planets.json) + ajoute les 12 univers (data/akasha/db-universes.json).
// Merge propre : collisions de slug → maj ; anciens espagnols superseded → retirés ; qq-uns gardés/renommés.
// Usage : node scripts/akasha-db-places.mjs [--write]
import fs from 'node:fs';

const WRITE = process.argv.includes('--write');
const d = JSON.parse(fs.readFileSync('data/akasha-universes.json', 'utf8'));
const planets = JSON.parse(fs.readFileSync('data/akasha/db-planets.json', 'utf8')).planets;
const universes = JSON.parse(fs.readFileSync('data/akasha/db-universes.json', 'utf8')).universes;

// Corrige les 4 planètes rangées par défaut en « Univers 7 » alors qu'elles sont ailleurs.
const REGION_FIX = { 'arak-planet': 'Univers 5', 'babari': 'Univers 10', 'belmod-planet': 'Univers 11', 'dorakiya': 'Univers 11' };
for (const p of planets) if (REGION_FIX[p.slug]) p.region = REGION_FIX[p.slug];

// Anciens lieux espagnols supplantés par une planète FR (à retirer).
const SUPERSEDED = new Set(['tierra', 'planete-vegeta', 'vegeta-dragon-ball', 'freezer-no-79', 'monmar', 'kaio-del-norte',
  'makyo', 'tsufur-universo-6', 'desconocido', 'planeta-de-bills', 'planeta-del-gran-kaio', 'planeta-sagrado',
  'nucleo-del-mundo', 'nuevo-planeta-tsufrui', 'universo-11']);
// Anciens gardés mais renommés en FR.
const RENAME = {
  'otro-mundo': { name: 'Autre Monde', region: 'Autre Monde', summary: "Le royaume des morts et des divinités : l'au-delà de Dragon Ball, où résident les Kaïō et le Grand Kaïō." },
  'templo-movil-del-rey-de-todo': { name: 'Palais de Zeno', region: 'Multivers', summary: "Le palais flottant de Zeno, roi de tout, d'où il règne sur les douze univers." },
};

const mk = (slug, name, summary, rarity, attributes) =>
  ({ slug, type: 'place', name, is_fiction: true, universe: 'Dragon Ball', summary, description: summary, image_url: null, attributes, rarity });

const bySlug = new Map(d.entries.map((e) => [e.slug, e]));
let updated = 0, added = 0, removed = 0, renamed = 0;

// 1) Retirer les superseded (+ noter leurs entrées pour nettoyer les relations).
const removedSlugs = new Set();
for (const s of SUPERSEDED) if (bySlug.has(s)) { removedSlugs.add(s); removed++; }
// 2) Renommer les gardés.
for (const [s, patch] of Object.entries(RENAME)) {
  const e = bySlug.get(s);
  if (e) { e.name = patch.name; e.summary = patch.summary; e.description = patch.summary; e.attributes = { ...(e.attributes || {}), region: patch.region, category: 'Lieu' }; renamed++; }
}
// 3) Planètes : maj si le slug existe (collision place FR), sinon ajout (suffixe si collision non-place).
for (const p of planets) {
  let slug = p.slug;
  const ex = bySlug.get(slug);
  const attrs = { region: p.region, category: 'Planète' };
  if (ex && ex.universe === 'Dragon Ball' && ex.type === 'place') {
    ex.name = p.name; ex.summary = p.description; ex.description = p.description; ex.attributes = { ...(ex.attributes || {}), ...attrs }; ex.rarity = p.rarity;
    updated++;
  } else {
    if (ex) slug = `${slug}-planete`;
    if (!bySlug.has(slug)) { const e = mk(slug, p.name, p.description, p.rarity, attrs); if (WRITE) d.entries.push(e); bySlug.set(slug, e); added++; }
  }
}
// 4) Univers (12) comme entités lieu.
for (const u of universes) {
  const slug = `univers-${u.num}`;
  const name = u.name ? `Univers ${u.num} — ${u.name}` : `Univers ${u.num}`;
  const attrs = { region: 'Univers', category: 'Univers', god: u.god, angel: u.angel, kai: u.kai, twin: `Univers ${u.twin}` };
  const ex = bySlug.get(slug);
  if (ex) { ex.name = name; ex.summary = u.desc; ex.description = u.desc; ex.attributes = { ...(ex.attributes || {}), ...attrs }; ex.rarity = u.rarity; updated++; }
  else { const e = mk(slug, name, u.desc, u.rarity, attrs); if (WRITE) d.entries.push(e); bySlug.set(slug, e); added++; }
}

// 5) Appliquer suppressions + nettoyer relations.
if (WRITE) {
  const removedIds = new Set(d.entries.filter((e) => removedSlugs.has(e.slug)).map((e) => e.id).filter(Boolean));
  d.entries = d.entries.filter((e) => !removedSlugs.has(e.slug));
  d.relations = (d.relations || []).filter((r) => !removedIds.has(r.from) && !removedIds.has(r.to));
  fs.writeFileSync('data/akasha-universes.json', JSON.stringify(d, null, 2));
}

const dbPlaces = d.entries.filter((e) => e.universe === 'Dragon Ball' && e.type === 'place').length - (WRITE ? 0 : 0);
console.log(JSON.stringify({ planets: planets.length, universes: universes.length, updated, added, renamed, removed, superseded_a_retirer: [...removedSlugs].join(', ') }, null, 1));
console.log('lieux DB après (approx):', WRITE ? d.entries.filter((e) => e.universe === 'Dragon Ball' && e.type === 'place').length : '(dry-run — relancer --write)');
