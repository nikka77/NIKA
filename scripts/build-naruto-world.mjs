// scripts/build-naruto-world.mjs — extrait les formes de pays du SVG canon (public/images/akasha/naruto/world-map.svg)
// et génère lib/akasha/naruto-world.ts (fond + hotspots pays + villages). Ordre des paths verts confirmé (Node ↔ browser).
import fs from 'node:fs';

const SVG = 'public/images/akasha/naruto/world-map.svg';
let svg = fs.readFileSync(SVG, 'utf8');

// 1) S'assurer d'un viewBox (le SVG Inkscape n'en a pas → l'ajouter pour scaler proprement).
if (!/viewBox=/.test(svg.slice(0, 800))) {
  svg = svg.replace(/<svg\b/, '<svg viewBox="0 0 1500 882"');
  fs.writeFileSync(SVG, svg);
  console.log('✓ viewBox ajouté au SVG');
}

// 2) Paths de terre (#a7cc95) en ordre document.
const green = [...svg.matchAll(/<path\b[^>]*?\bd="([^"]+)"[^>]*?>/gs)].map((m) => m[0]).filter((t) => /a7cc95/i.test(t))
  .map((t) => (t.match(/\bd="([^"]+)"/) || [])[1]);
console.log('paths verts:', green.length);

// 3) Mapping index→pays (identifié via getBBox navigateur). Eau = archipel (plusieurs îles).
const COUNTRIES = [
  { key: 'fire', land: 'Pays du Feu', kanji: '火', village: 'Konohagakure', villageName: 'Konoha', emblem: 'konoha', color: '#c0492b', cx: 693, cy: 646, idx: [35] },
  { key: 'wind', land: 'Pays du Vent', kanji: '風', village: 'Sunagakure', villageName: 'Suna', emblem: 'suna', color: '#c8a24a', cx: 241, cy: 669, idx: [21] },
  { key: 'earth', land: 'Pays de la Terre', kanji: '土', village: 'Iwagakure', villageName: 'Iwa', emblem: 'iwa', color: '#8a6a3a', cx: 271, cy: 240, idx: [33] },
  { key: 'lightning', land: 'Pays de la Foudre', kanji: '雷', village: 'Kumogakure', villageName: 'Kumo', emblem: 'kumo', color: '#c9a227', cx: 1089, cy: 196, idx: [30] },
  { key: 'water', land: "Pays de l'Eau", kanji: '水', village: 'Kirigakure', villageName: 'Kiri', emblem: 'kiri', color: '#3a86b0', cx: 1150, cy: 470, idx: [26, 28, 29, 19, 31, 13, 20] },
];

const out = COUNTRIES.map((c) => ({
  key: c.key, land: c.land, kanji: c.kanji, village: c.village, villageName: c.villageName, emblem: c.emblem,
  color: c.color, cx: c.cx, cy: c.cy,
  shapes: c.idx.map((i) => green[i]).filter(Boolean),
}));

// 4) Villages mineurs à ninjas (cliquables → page village). Positions = marqueurs réels du SVG.
const VILLAGES = [
  { key: 'otogakure', village: 'Otogakure', name: 'Oto', land: 'Pays du Son', emblem: 'oto', x: 693, y: 388, great: false },
  { key: 'amegakure', village: 'Amegakure', name: 'Ame', land: 'Pays de la Pluie', emblem: 'ame', x: 411, y: 548, great: false },
];

// 5) Repères lore (villages/lieux sans données ninja) — label au survol, non cliquables.
// Positions = marqueurs SVG réels, identifiés par emblème/kanji (zoom du SVG).
const LANDMARKS = [
  { key: 'ishigakure', name: 'Ishi', full: 'Ishigakure', land: 'Pays de la Pierre', x: 287, y: 509 },   // kanji 石
  { key: 'kusagakure', name: 'Kusa', full: 'Kusagakure', land: "Pays de l'Herbe", x: 523, y: 354 },      // près du pont Kannabi
  { key: 'takigakure', name: 'Taki', full: 'Takigakure', land: 'Pays de la Cascade', x: 760, y: 392 },
  { key: 'shimogakure', name: 'Shimo', full: 'Shimogakure', land: 'Pays du Givre', x: 838, y: 357 },     // kanji 霜
  { key: 'uzushiogakure', name: 'Uzushio', full: 'Uzushiogakure', land: 'Pays des Tourbillons', x: 951, y: 630 }, // spirale 元・渦
  { key: 'tanigakure', name: 'Tani', full: 'Tanigakure', land: 'Pays de la Rivière', x: 521, y: 719 },   // 谷川
  { key: 'tanzaku', name: 'Tanzaku', full: 'Ville de Tanzaku', land: 'Pays du Feu', x: 591, y: 589 },    // 短冊街
];

const banner = `// lib/akasha/naruto-world.ts — carte du monde shinobi : fond SVG canon + hotspots pays/villages.
// Généré par scripts/build-naruto-world.mjs à partir de public/images/akasha/naruto/world-map.svg.
// viewBox 0 0 1500 882. Clic pays/village → registre filtré par \`village\`.
export const NARUTO_MAP = { w: 1500, h: 882, bg: '/images/akasha/naruto/world-map.svg' } as const;
export interface NwCountry { key: string; land: string; kanji: string; village: string; villageName: string; emblem: string; color: string; cx: number; cy: number; shapes: string[] }
export interface NwVillage { key: string; village: string; name: string; land: string; emblem: string; x: number; y: number; great: boolean }
export interface NwLandmark { key: string; name: string; full: string; land: string; x: number; y: number }
export const NW_COUNTRIES: NwCountry[] = ${JSON.stringify(out, null, 1)};
export const NW_VILLAGES: NwVillage[] = ${JSON.stringify(VILLAGES, null, 1)};
export const NW_LANDMARKS: NwLandmark[] = ${JSON.stringify(LANDMARKS, null, 1)};
`;
fs.writeFileSync('lib/akasha/naruto-world.ts', banner);
console.log('✓ lib/akasha/naruto-world.ts —', out.map((c) => `${c.villageName}:${c.shapes.length}sh`).join(' '));
