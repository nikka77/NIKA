// scripts/akasha-db-cure.mjs — nettoie les données Dragon Ball : retire l'espagnol résiduel (descRaw),
// ajoute les artefacts manquants (data/akasha/db-artifacts.json) et les persos manquants
// (data/akasha/db-missing-chars.json si présent, généré par le workflow). Idempotent. Usage : [--write]
import fs from 'node:fs';

const WRITE = process.argv.includes('--write');
const d = JSON.parse(fs.readFileSync('data/akasha-universes.json', 'utf8'));
const bySlug = new Map(d.entries.map((e) => [e.slug, e]));
const mk = (slug, type, name, summary, rarity, attributes) =>
  ({ slug, type, name, is_fiction: true, universe: 'Dragon Ball', summary, description: summary, image_url: null, attributes, rarity });

// 1) Nettoyage espagnol : retire descRaw des lieux DB s'il est en espagnol (non affiché mais sale).
const ES = /ñ|\b(planeta|guerrero|habitado|conocido|técnica|mundo|contra|villano|batalla|habitantes)\b/i;
let cleaned = 0;
for (const e of d.entries) {
  if (e.universe === 'Dragon Ball' && e.attributes?.descRaw && ES.test(e.attributes.descRaw)) {
    if (WRITE) delete e.attributes.descRaw;
    cleaned++;
  }
}

// 2) Artefacts manquants.
let addedArt = 0;
const arts = JSON.parse(fs.readFileSync('data/akasha/db-artifacts.json', 'utf8')).artifacts;
for (const a of arts) {
  if (bySlug.has(a.slug)) continue;
  const e = mk(a.slug, 'artifact', a.name, a.desc, a.rarity, { category: 'Relique' });
  if (WRITE) d.entries.push(e); bySlug.set(a.slug, e); addedArt++;
}

// 3) Persos manquants (si le workflow a produit le fichier).
let addedChar = 0; const stats = {};
if (fs.existsSync('data/akasha/db-missing-chars.json')) {
  const chars = JSON.parse(fs.readFileSync('data/akasha/db-missing-chars.json', 'utf8'));
  for (const c of chars) {
    let slug = c.slug;
    if (bySlug.has(slug)) continue;
    const attrs = { category: 'Personnage' };
    if (c.race && c.race !== 'none') attrs.race = c.race;
    if (c.saga && c.saga !== 'none') attrs.saga = c.saga;
    if (c.power) attrs.powerLevel = c.power;
    const e = mk(slug, 'character', c.name, c.description, c.rarity, attrs);
    if (WRITE) d.entries.push(e); bySlug.set(slug, e); addedChar++;
    stats[slug] = { power: c.power, force: c.force, ki: c.ki, vitesse: c.vitesse, technique: c.technique, resistance: c.resistance };
  }
  // Fusionne leurs stats dans db-stats.json (pour le visualiseur, si image ajoutée plus tard).
  if (WRITE && Object.keys(stats).length) {
    const sp = 'data/akasha/db-stats.json';
    const cur = fs.existsSync(sp) ? JSON.parse(fs.readFileSync(sp, 'utf8')) : {};
    fs.writeFileSync(sp, JSON.stringify({ ...cur, ...stats }, null, 1));
  }
}

if (WRITE) fs.writeFileSync('data/akasha-universes.json', JSON.stringify(d, null, 2));
const dbArt = d.entries.filter((e) => e.universe === 'Dragon Ball' && e.type === 'artifact').length;
const dbChar = d.entries.filter((e) => e.universe === 'Dragon Ball' && e.type === 'character').length;
console.log(JSON.stringify({ descRaw_nettoyes: cleaned, artefacts_ajoutes: addedArt, persos_ajoutes: addedChar, total_artefacts_DB: dbArt, total_persos_DB: dbChar, mode: WRITE ? 'WRITE' : 'dry-run' }, null, 1));
