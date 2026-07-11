// scripts/akasha-op-places.mjs — ajoute les 144 îles + 37 POI d'op-world-map.json comme entités `place`
// One Piece dans data/akasha-universes.json, en dédupliquant par nom normalisé contre les lieux existants.
// Patche aussi data/akasha/op-world-map.json avec `entitySlug` par île/POI (pour le lien « fiche » de la carte).
// Usage : node scripts/akasha-op-places.mjs [--write]   (sans --write = rapport seul, ne modifie rien)
import fs from 'node:fs';

const WRITE = process.argv.includes('--write');
const UNI = 'data/akasha-universes.json';
const MAP = 'data/akasha/op-world-map.json';

const db = JSON.parse(fs.readFileSync(UNI, 'utf8'));
const world = JSON.parse(fs.readFileSync(MAP, 'utf8'));

// Normalisation de nom : minuscules, sans accents/ponctuation, sans préfixes géographiques courants.
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\([^)]*\)/g, ' ')
  .replace(/[’']/g, ' ')
  .replace(/\b(royaume|village|pays|ile|iles|archipel|mont|region|regions|kingdom|island|islands|town|de|des|du|d|le|la|les|l)\b/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ').trim();

// Alias manuels (noms EN existants ↔ noms FR/variantes op-maps).
const ALIAS = { 'gateau': 'whole cake', 'saveur': 'whole cake', 'erbaf': 'elbaf', 'water 7': 'water seven' };
const key = (s) => { const n = norm(s); return ALIAS[n] || n; };

// Index des lieux One Piece existants : nom normalisé → slug.
const existing = db.entries.filter((e) => e.universe === 'One Piece' && e.type === 'place');
const byName = new Map();
for (const e of existing) byName.set(key(e.name), e.slug);
const existingSlugs = new Set(db.entries.map((e) => e.slug));

const rarityOf = (isl) => {                          // enum valide : common/rare/epic/legendary
  if (typeof isl.area !== 'number') return 'common'; // POI
  if (isl.major && isl.area >= 30000) return 'epic';
  if (isl.major && isl.area >= 8000) return 'rare';
  return 'common';
};
const trimSummary = (d) => { const s = String(d || '').trim(); return s.length > 240 ? s.slice(0, 237).replace(/\s+\S*$/, '') + '…' : s; };

const items = [
  ...world.islands.map((i) => ({ ...i, kind: 'island' })),
  ...world.poi.map((p) => ({ ...p, kind: 'poi', area: undefined, major: false })),
];

let added = 0, matched = 0;
const report = { matches: [], news: [] };
const slugMap = {}; // op-id → entitySlug

for (const it of items) {
  const k = key(it.name);
  const hit = byName.get(k);
  if (hit) { matched++; slugMap[it.id] = hit; report.matches.push(`${it.name} → ${hit}`); continue; }
  // nouvelle entité : slug = op-id (dédup si déjà pris)
  let slug = it.id;
  while (existingSlugs.has(slug)) slug += '-op';
  existingSlugs.add(slug);
  byName.set(k, slug);
  slugMap[it.id] = slug;
  const entity = {
    slug, type: 'place', name: it.name, is_fiction: true, universe: 'One Piece',
    summary: trimSummary(it.description) || `${it.name} — lieu de ${it.region}.`,
    description: String(it.description || '').trim() || `${it.name} — lieu de ${it.region}.`,
    image_url: it.image || null,
    attributes: { region: it.region },
    rarity: rarityOf(it),
  };
  if (WRITE) db.entries.push(entity);
  added++;
  report.news.push(`${it.name} [${slug}] ${entity.rarity}`);
}

// Patch op-world-map.json avec entitySlug.
for (const i of world.islands) i.entitySlug = slugMap[i.id];
for (const p of world.poi) p.entitySlug = slugMap[p.id];

console.log(`Lieux op-maps: ${items.length} (144 îles + 37 POI)`);
console.log(`  ↳ matchés à un lieu existant: ${matched}`);
console.log(`  ↳ nouveaux ajoutés: ${added}`);
console.log(`  ↳ total OP places après: ${existing.length + added}`);
console.log('\n--- MATCHS (op-maps → slug existant) ---');
console.log(report.matches.join('\n'));
console.log(`\n--- NOUVEAUX (${report.news.length}) ---`);
console.log(report.news.slice(0, 40).join('\n') + (report.news.length > 40 ? `\n… +${report.news.length - 40}` : ''));

if (WRITE) {
  fs.writeFileSync(UNI, JSON.stringify(db, null, 2));
  fs.writeFileSync(MAP, JSON.stringify(world));
  console.log('\n✓ écrit: akasha-universes.json (+' + added + ') et op-world-map.json (entitySlug)');
} else {
  console.log('\n(rapport seul — relancer avec --write pour appliquer)');
}
