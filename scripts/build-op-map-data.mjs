// scripts/build-op-map-data.mjs — transforme le dump op-maps (data/akasha/op-maps-raw.json)
// en dataset carte prêt pour le composant : data/akasha/op-world-map.json
// Géométrie + faits canon (noms, régions, first appearance, visitedBy, arcs). Pas les URLs d'images.
import fs from 'node:fs';

const raw = JSON.parse(fs.readFileSync('data/akasha/op-maps-raw.json', 'utf8'));

const bbox = (sh) => {
  if (!sh || !sh.length) return null;
  let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
  for (const [x, y] of sh) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); }
  return { w: b - a, h: d - c, area: (b - a) * (d - c) };
};
const crew = 'Pirates du Chapeau de paille';
const isMajor = (i) => {
  const bb = bbox(i.shape);
  const area = bb ? bb.area : 0;
  const visitedByCrew = Array.isArray(i.visitedBy) && i.visitedBy.some((v) => v === crew || /Luffy|Zoro|Nami|Usopp|Sanji|Chopper|Robin|Franky|Brook|Jinbe/.test(v));
  return area >= 1500 || visitedByCrew;
};

let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
const acc = (x, y) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };

const islands = raw.islands.map((i) => {
  const [x, y] = i.coordinates;
  acc(x, y);
  if (i.shape) for (const [sx, sy] of i.shape) acc(sx, sy);
  const bb = bbox(i.shape);
  return {
    id: i.id, name: i.name, x, y, region: i.region,
    shape: i.shape || null,
    area: bb ? Math.round(bb.area) : 0,
    major: isMajor(i),
    firstAppearance: i.firstAppearance || null,
    visitedBy: i.visitedBy || [],
    arcs: i.arcs || [],
    description: i.description || '',
    image: i.image || null,
  };
});

const poi = raw.poi.map((p) => {
  const [x, y] = p.coordinates;
  acc(x, y);
  return { id: p.id, name: p.name, x, y, region: p.region, visitedBy: p.visitedBy || [], description: p.description || '', image: p.image || null };
});

const routes = raw.routes.map((r) => ({
  id: r.id, character: r.character, crew: r.crew, color: r.color,
  description: r.description || '',
  path: (r.path || []).map(([x, y]) => { acc(x, y); return [x, y]; }),
}));

const yonko = raw.yonko.map((y) => ({
  id: y.id, name: y.name, yonko: y.yonko, color: y.color,
  description: y.description || '',
  shapes: (y.shapes || []).map((poly) => poly.map(([x, yy]) => { acc(x, yy); return [x, yy]; })),
}));

const out = {
  meta: { source: 'op-maps.com', extracted: '2026-07-11', space: 'x/y pixel grid, y downward' },
  bounds: { minX: Math.floor(minX), minY: Math.floor(minY), maxX: Math.ceil(maxX), maxY: Math.ceil(maxY) },
  counts: { islands: islands.length, poi: poi.length, routes: routes.length, yonko: yonko.length, majors: islands.filter((i) => i.major).length },
  islands, poi, routes, yonko,
};

fs.writeFileSync('data/akasha/op-world-map.json', JSON.stringify(out));
console.log('✓ data/akasha/op-world-map.json écrit');
console.log('  bounds', JSON.stringify(out.bounds));
console.log('  counts', JSON.stringify(out.counts));
console.log('  routes', routes.map((r) => `${r.character}(${r.path.length}pts)`).join(', '));
console.log('  yonko', yonko.map((y) => `${y.yonko}(${y.shapes.length})`).join(', '));
