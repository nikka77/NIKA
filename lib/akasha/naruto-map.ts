// lib/akasha/naruto-map.ts — modèle de données de la carte interactive du continent shinobi.
// Géographie inspirée de la carte canon (positions relatives) — dessin 100 % maison (aucun asset tiers).
// Consommé par components/akasha/hub/ShinobiMap (client) via HubSignature.
// viewBox de référence : 1000 × 640. Ocean = fond ; les régions sont teintées par-dessus la texture.

export const MAP = { w: 1000, h: 640 } as const;

// Silhouette continentale UNIQUE (masse principale Terre+Vent+Feu+mineurs, reliée à la péninsule Foudre au NE).
// Le Pays de l'Eau est un archipel séparé (ISLANDS). Terrain clippé à CONTINENT ∪ ISLANDS.
export const CONTINENT =
  'M96,164 C120,120 150,104 186,110 C214,90 250,94 276,110 C316,88 362,94 398,108 ' +
  'C452,90 512,98 556,114 C598,106 632,126 654,170 C666,150 688,142 702,154 ' +
  'C728,86 814,66 892,94 C948,112 972,170 944,226 C910,270 846,278 800,256 ' +
  'C762,238 728,242 708,264 C692,288 674,302 662,332 C678,374 672,434 646,488 ' +
  'C616,542 556,568 496,568 C430,568 372,586 316,594 C246,608 156,608 108,568 ' +
  'C62,530 56,468 66,412 C58,364 54,260 68,208 C74,188 82,176 96,164 Z';

export const ISLANDS: string[] = [
  'M814,336 C858,320 902,326 928,360 C956,394 958,442 940,478 C920,516 876,528 838,520 C800,512 774,482 772,442 C770,398 782,356 814,336 Z',
  'M758,302 C788,292 808,310 800,334 C793,356 768,360 754,348 C743,338 742,314 758,302 Z',
  'M906,300 C936,296 950,320 939,340 C930,357 906,354 897,339 C889,326 891,306 906,300 Z',
  'M676,440 C702,432 722,448 714,468 C707,486 681,488 670,472 C662,460 662,450 676,440 Z', // Uzushio
];

// Glyphes cartographiques dessinés à la main, par biome (coordonnées viewBox).
export const MOUNTAINS: [number, number, number][] = [
  [135, 232, 1.15], [172, 214, 0.9], [206, 244, 1.05], [156, 288, 0.85], [232, 210, 0.8],
  [548, 150, 0.85], [592, 168, 0.7], // monts du nord (Son/Givre)
];
export const TREES: [number, number][] = [
  [430, 452], [468, 500], [520, 470], [402, 486], [560, 436], [452, 540], [500, 512], [412, 428],
];
export const DUNES: [number, number][] = [[128, 522], [186, 558], [108, 470], [156, 500]];

export interface MapRegion {
  key: string;
  label: string;       // nom FR du pays
  kanji: string;       // kanji du pays
  tint: string;        // teinte de la zone (par-dessus la texture terrain)
  path: string;        // silhouette SVG de la région
  lx: number; ly: number; // ancrage du kanji/label
}

export type VillageTier = 'great' | 'minor';
export interface MapVillage {
  key: string;         // slug village (= entité place + blason emblems/{key.replace('gakure','')}.webp)
  emblem: string;      // clé blason (konoha, suna, …) pour <VillageEmblem slug>
  name: string;        // nom court FR (Konoha…)
  fullName: string;    // nom complet (Konohagakure)
  land: string;        // pays
  tier: VillageTier;
  canon: 'manga' | 'anime' | 'novel';
  note?: string;       // accroche lore (villages sans data)
  x: number; y: number;
}

export interface MapLandmark { key: string; name: string; x: number; y: number; }

// ── Régions (silhouettes stylisées, à raffiner visuellement) ────────────────
export const REGIONS: MapRegion[] = [
  { key: 'earth', label: 'Pays de la Terre', kanji: '土', tint: '#8a6a3a',
    path: 'M70,90 C150,60 240,70 270,120 C300,170 260,240 230,300 C200,340 120,340 90,300 C55,255 45,140 70,90 Z', lx: 210, ly: 110 },
  { key: 'wind', label: 'Pays du Vent', kanji: '風', tint: '#c8a24a',
    path: 'M80,350 C170,320 300,330 330,400 C355,470 300,560 210,590 C120,610 70,560 65,480 C62,420 60,375 80,350 Z', lx: 255, ly: 545 },
  { key: 'fire', label: 'Pays du Feu', kanji: '火', tint: '#c0492b',
    path: 'M350,240 C450,200 560,220 610,290 C650,350 640,450 580,520 C520,575 420,570 375,510 C330,450 320,330 350,240 Z', lx: 560, ly: 500 },
  { key: 'lightning', label: 'Pays de la Foudre', kanji: '雷', tint: '#c9a227',
    path: 'M730,80 C820,55 940,70 960,140 C975,200 940,255 875,270 C810,285 745,255 725,200 C710,155 705,105 730,80 Z', lx: 760, ly: 225 },
  { key: 'water', label: "Pays de l'Eau", kanji: '水', tint: '#3a86b0',
    path: 'M812,332 C876,314 946,340 958,404 C966,462 922,520 858,522 C806,522 772,486 770,436 C769,392 778,344 812,332 Z', lx: 864, ly: 500 },
  // Pays mineurs (petites zones)
  { key: 'sound', label: 'Pays du Son', kanji: '音', tint: '#7b5cf0',
    path: 'M430,120 C490,105 545,120 548,165 C550,205 510,225 470,222 C430,220 415,180 430,120 Z', lx: 440, ly: 138 },
  { key: 'rain', label: 'Pays de la Pluie', kanji: '雨', tint: '#5a88b0',
    path: 'M290,300 C340,288 372,305 372,342 C372,378 338,392 305,388 C275,384 268,340 290,300 Z', lx: 300, ly: 314 },
];

// ── Villages ────────────────────────────────────────────────────────────────
export const VILLAGES: MapVillage[] = [
  // 5 grandes nations + Oto/Ame = nos 7 villages data-backed
  { key: 'konohagakure', emblem: 'konoha', name: 'Konoha', fullName: 'Konohagakure', land: 'Pays du Feu', tier: 'great', canon: 'manga', x: 478, y: 408 },
  { key: 'sunagakure', emblem: 'suna', name: 'Suna', fullName: 'Sunagakure', land: 'Pays du Vent', tier: 'great', canon: 'manga', x: 178, y: 470 },
  { key: 'kumogakure', emblem: 'kumo', name: 'Kumo', fullName: 'Kumogakure', land: 'Pays de la Foudre', tier: 'great', canon: 'manga', x: 852, y: 158 },
  { key: 'kirigakure', emblem: 'kiri', name: 'Kiri', fullName: 'Kirigakure', land: "Pays de l'Eau", tier: 'great', canon: 'manga', x: 868, y: 438 },
  { key: 'iwagakure', emblem: 'iwa', name: 'Iwa', fullName: 'Iwagakure', land: 'Pays de la Terre', tier: 'great', canon: 'manga', x: 158, y: 188 },
  { key: 'otogakure', emblem: 'oto', name: 'Oto', fullName: 'Otogakure', land: 'Pays du Son', tier: 'great', canon: 'manga', x: 486, y: 168 },
  { key: 'amegakure', emblem: 'ame', name: 'Ame', fullName: 'Amegakure', land: 'Pays de la Pluie', tier: 'great', canon: 'manga', x: 320, y: 344 },
  // Villages mineurs canon (sans data / sans blason dédié → marqueurs lore)
  { key: 'takigakure', emblem: '', name: 'Taki', fullName: 'Takigakure', land: 'Pays de la Cascade', tier: 'minor', canon: 'manga', note: 'Village caché de la Cascade — patrie de Fū, jinchūriki de Chōmei.', x: 402, y: 258 },
  { key: 'kusagakure', emblem: '', name: 'Kusa', fullName: 'Kusagakure', land: "Pays de l'Herbe", tier: 'minor', canon: 'manga', note: "Village caché de l'Herbe — près du pont Kannabi.", x: 336, y: 262 },
  { key: 'yugakure', emblem: '', name: 'Yu', fullName: 'Yugakure', land: 'Pays des Sources chaudes', tier: 'minor', canon: 'manga', note: 'Village caché des Sources — devenu station thermale ; berceau de Hidan.', x: 642, y: 300 },
  { key: 'shimogakure', emblem: '', name: 'Shimo', fullName: 'Shimogakure', land: 'Pays du Givre', tier: 'minor', canon: 'manga', note: 'Village caché du Givre, au nord du Pays du Feu.', x: 610, y: 200 },
  { key: 'uzushiogakure', emblem: '', name: 'Uzushio', fullName: 'Uzushiogakure', land: 'Pays des Tourbillons', tier: 'minor', canon: 'manga', note: 'Village caché des Tourbillons, détruit — berceau du clan Uzumaki et de ses sceaux.', x: 690, y: 452 },
];

// ── Repères géographiques ────────────────────────────────────────────────────
export const LANDMARKS: MapLandmark[] = [
  { key: 'valley-of-end', name: 'Vallée de la Fin', x: 388, y: 306 },
  { key: 'tenchi-bridge', name: 'Pont Tenchi', x: 300, y: 238 },
  { key: 'genbu', name: 'Genbu (Tortue-île)', x: 952, y: 258 },
  { key: 'mountains-graveyard', name: 'Cimetière des Monts', x: 560, y: 120 },
];
