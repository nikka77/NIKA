// scripts/akasha-apply-rewrites.mjs — applique les descriptions réécrites en voix NIKA
// (data/akasha/op-place-rewrites.json = { id: description }) à :
//   - data/akasha/op-world-map.json (fiches carte, les 181 lieux)
//   - data/akasha-universes.json (summary + description des entités NOUVELLES op-maps ;
//     les 31 lieux déjà curés gardent leur texte NIKA existant)
// Puis reseed manuel. Idempotent.
import fs from 'node:fs';

const rewrites = JSON.parse(fs.readFileSync('data/akasha/op-place-rewrites.json', 'utf8'));
const world = JSON.parse(fs.readFileSync('data/akasha/op-world-map.json', 'utf8'));
const db = JSON.parse(fs.readFileSync('data/akasha-universes.json', 'utf8'));
const entBySlug = new Map(db.entries.map((e) => [e.slug, e]));

let mapUpd = 0, entUpd = 0, entSkipCurated = 0, missing = 0;
const apply = (item) => {
  const nd = rewrites[item.id];
  if (!nd) { missing++; return; }
  const old = item.description;
  const ent = item.entitySlug && entBySlug.get(item.entitySlug);
  if (ent) {
    // entité nouvelle op-maps → sa description == prose op-maps d'origine ; sinon lieu curé → on garde
    if (ent.description === old) { ent.summary = nd; ent.description = nd; entUpd++; }
    else entSkipCurated++;
  }
  item.description = nd;
  mapUpd++;
};
for (const i of world.islands) apply(i);
for (const p of world.poi) apply(p);

fs.writeFileSync('data/akasha/op-world-map.json', JSON.stringify(world));
fs.writeFileSync('data/akasha-universes.json', JSON.stringify(db, null, 2));
console.log(JSON.stringify({ totalRewrites: Object.keys(rewrites).length, mapUpd, entUpd, entSkipCurated, missing }, null, 1));
