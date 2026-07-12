// scripts/build-db-roster.mjs — dataset du visualiseur Dragon Ball : les 436 persos avec image/race/saga/ki,
// + stats curées (data/akasha/db-stats.json si présent). Trié par popularité. → data/akasha/db-roster.json
import fs from 'node:fs';

const d = JSON.parse(fs.readFileSync('data/akasha-universes.json', 'utf8'));
const stats = fs.existsSync('data/akasha/db-stats.json') ? JSON.parse(fs.readFileSync('data/akasha/db-stats.json', 'utf8')) : {};

const chars = d.entries.filter((e) => e.universe === 'Dragon Ball' && e.type === 'character');
const fav = (c) => Number(c.attributes?.favorites) || 0;

const roster = chars
  .filter((c) => c.image_url)
  .sort((a, b) => fav(b) - fav(a))
  .map((c) => ({
    slug: c.slug, name: c.name, image: c.image_url,
    race: c.attributes?.race || null,
    saga: c.attributes?.saga || null,
    ki: c.attributes?.ki || null,
    rarity: c.rarity || 'common',
    fav: fav(c),
    stats: stats[c.slug] || null,
  }));

// Ordre canon des sagas (pour la frise).
const SAGAS = ['Saga Saiyan', 'Saga Namek', 'Saga Cell', 'Saga Buu', 'Saga Super'];
// Races présentes, ordonnées.
const RACE_ORDER = ['Saiyan', 'Namekian', 'Human', 'Frieza Race', 'Android', 'Majin', 'Angel'];
const races = RACE_ORDER.filter((r) => roster.some((c) => c.race === r));

const out = { count: roster.length, sagas: SAGAS, races, withStats: roster.filter((c) => c.stats).length, roster };
fs.writeFileSync('data/akasha/db-roster.json', JSON.stringify(out));
console.log(`✓ db-roster.json — ${roster.length} persos · ${races.length} races · stats: ${out.withStats}`);
