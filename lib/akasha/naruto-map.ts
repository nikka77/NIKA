// lib/akasha/naruto-map.ts — modèle de données de la carte interactive du continent shinobi.
// Géographie inspirée de la carte canon (positions relatives) — dessin 100 % maison (aucun asset tiers).
// Consommé par components/akasha/hub/ShinobiMap (client) via HubSignature.
// viewBox de référence : 1000 × 640. Ocean = fond ; les régions sont teintées par-dessus la texture.

export const MAP = { w: 1000, h: 640 } as const;

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
    path: 'M800,330 C880,310 960,335 965,410 C968,480 915,545 850,545 C795,545 760,495 760,435 C760,385 765,345 800,330 Z', lx: 812, ly: 505 },
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
