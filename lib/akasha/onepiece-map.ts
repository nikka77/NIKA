// lib/akasha/onepiece-map.ts — modèle de la carte du monde One Piece (détaillée) + parcours de l'équipage.
// Structure canon « équirectangulaire » : Grand Line = équateur horizontal ; Red Line = méridien vertical
// (bande centrale + bords qui s'enroulent) ; 4 Blues en quadrants ; Calm Belts de part et d'autre.
// Deux croisements Red Line : Reverse Mountain (bord = entrée) et Mariejoa/Île des Hommes-Poissons (centre).
// Dessin 100 % maison (formes d'îles procédurales), inspiré de la structure de op-maps.com — aucun asset tiers.

export const OP_MAP = { w: 1400, h: 860 } as const;

// Bande équatoriale de la Grand Line (le couloir de navigation).
export const GRAND_LINE = { y0: 360, y1: 500 } as const;
// Calm Belts (mers sans vent, repaires de Rois des Mers) de part et d'autre.
export const CALM_BELTS = [{ y0: 320, y1: 360 }, { y0: 500, y1: 540 }] as const;

// Red Line — méridien : grande bande centrale (avec le canal de l'Île des Hommes-Poissons) + fins bords qui s'enroulent.
export const RED_LINE_CENTER =
  'M636,0 C664,150 620,300 636,352 L636,352 C620,392 620,468 636,508 C620,640 668,760 640,860 ' +
  'L788,860 C760,760 806,640 792,508 C808,468 808,392 792,352 C808,300 764,150 792,0 Z';
// Canal vertical clair (Île des Hommes-Poissons) traversant la Red Line au centre.
export const FISHMAN_CHANNEL = { x0: 690, x1: 738, y0: 352, y1: 508 };
export const RED_LINE_EDGES = ['M0,0 L34,0 C22,300 22,560 0,860 Z', 'M1400,0 L1366,0 C1378,300 1378,560 1400,860 Z'];

// Reverse Mountain — bassin circulaire au bord (entrée de la Grand Line), 4 rivières venues des Blues.
export const REVERSE_MTN = { x: 60, y: 430, r: 30 };
export const REVERSE_RIVERS = [[60, 430, 120, 120], [60, 430, 120, 740], [60, 430, 320, 210], [60, 430, 320, 650]] as const;

export const OP_ZONES = [
  { label: 'PARADISE', x: 360, y: 210, size: 26, color: '#6FA8CF', italic: true },
  { label: 'NOUVEAU MONDE', x: 1040, y: 210, size: 26, color: '#C99A5B', italic: true },
  { label: 'East Blue', x: 210, y: 96, size: 17, color: '#8FC0E2' },
  { label: 'North Blue', x: 200, y: 730, size: 16, color: '#8FC0E2' },
  { label: 'West Blue', x: 1070, y: 96, size: 16, color: '#8FC0E2' },
  { label: 'South Blue', x: 1090, y: 745, size: 16, color: '#8FC0E2' },
  { label: 'Calm Belt', x: 380, y: 336, size: 12, color: '#5C7E6E' },
  { label: 'Calm Belt', x: 380, y: 526, size: 12, color: '#5C7E6E' },
] as const;

export type OpZoneKey = 'east-blue' | 'north-blue' | 'west-blue' | 'south-blue' | 'paradise' | 'new-world' | 'redline';
export interface OpIsland {
  name: string;
  x: number; y: number; r: number;
  zone: OpZoneKey;
  seed: number;          // graine → forme d'île déterministe
  slug?: string;         // entité place → /learn/akasha/{slug}
  sky?: boolean;         // île céleste (Skypiea) — dessinée sur un nuage
  route?: number;        // rang dans le parcours de l'équipage (sinon île de décor)
  note?: string;
  lbl?: 'up' | 'down';   // placement du label
}

// ~48 îles positionnées (parcours + décor). `route` = ordre de voyage des Chapeaux de Paille.
export const OP_ISLANDS: OpIsland[] = [
  // ── East Blue (quadrant haut-gauche) ──
  { name: 'Fushia', slug: 'foosha', x: 120, y: 130, r: 15, zone: 'east-blue', seed: 3, route: 1, note: 'Départ — village de Luffy', lbl: 'up' },
  { name: 'Shells Town', slug: 'shells-town', x: 205, y: 108, r: 12, zone: 'east-blue', seed: 7, lbl: 'up' },
  { name: 'Orange', slug: 'orange-town', x: 285, y: 150, r: 11, zone: 'east-blue', seed: 11, lbl: 'up' },
  { name: 'Syrup', slug: 'syrup-village', x: 350, y: 118, r: 12, zone: 'east-blue', seed: 5, lbl: 'up' },
  { name: 'Baratie', slug: 'baratie-lieu', x: 250, y: 205, r: 10, zone: 'east-blue', seed: 13, lbl: 'down' },
  { name: 'Cocoyasi', slug: 'cocoyasi', x: 330, y: 235, r: 13, zone: 'east-blue', seed: 17, note: 'Arlong Park', lbl: 'down' },
  { name: 'Loguetown', slug: 'loguetown-lieu', x: 180, y: 268, r: 14, zone: 'east-blue', seed: 19, route: 2, note: 'Ville de Roger', lbl: 'down' },
  { name: 'Îles Gecko', x: 415, y: 175, r: 11, zone: 'east-blue', seed: 23, lbl: 'up' },
  // ── Reverse Mountain → Grand Line (Paradise) ──
  { name: 'Whisky Peak', slug: 'whisky-peak', x: 170, y: 452, r: 12, zone: 'paradise', seed: 29, route: 4, lbl: 'down' },
  { name: 'Little Garden', slug: 'little-garden-lieu', x: 240, y: 400, r: 14, zone: 'paradise', seed: 31, route: 5, lbl: 'up' },
  { name: 'Drum', slug: 'drum-island', x: 300, y: 462, r: 14, zone: 'paradise', seed: 37, route: 6, note: 'Royaume de Sakura', lbl: 'down' },
  { name: 'Alabasta', slug: 'alabasta-lieu', x: 372, y: 405, r: 20, zone: 'paradise', seed: 41, route: 7, note: 'Royaume désertique', lbl: 'up' },
  { name: 'Jaya', slug: 'jaya', x: 448, y: 470, r: 13, zone: 'paradise', seed: 43, route: 8, note: 'Mock Town', lbl: 'down' },
  { name: 'Skypiea', slug: 'skypiea-lieu', x: 470, y: 300, r: 16, zone: 'paradise', seed: 47, sky: true, route: 9, note: 'Île céleste', lbl: 'up' },
  { name: 'Long Ring', x: 520, y: 452, r: 11, zone: 'paradise', seed: 53, lbl: 'down' },
  { name: 'Water Seven', slug: 'water-seven-lieu', x: 500, y: 402, r: 16, zone: 'paradise', seed: 59, route: 10, note: 'Cité de l’eau', lbl: 'up' },
  { name: 'Enies Lobby', slug: 'enies-lobby-lieu', x: 566, y: 430, r: 13, zone: 'paradise', seed: 61, route: 11, note: 'Île judiciaire', lbl: 'up' },
  { name: 'Thriller Bark', slug: 'thriller-bark-lieu', x: 540, y: 486, r: 14, zone: 'paradise', seed: 67, route: 12, lbl: 'down' },
  { name: 'Sabaody', slug: 'sabaody', x: 628, y: 400, r: 15, zone: 'paradise', seed: 71, route: 13, note: 'La séparation', lbl: 'up' },
  { name: 'Amazon Lily', slug: 'amazon-lily', x: 612, y: 300, r: 13, zone: 'paradise', seed: 73, note: 'Île des Kuja' },
  { name: 'Marineford', slug: 'marineford', x: 648, y: 250, r: 14, zone: 'paradise', seed: 79, note: 'QG de la Marine', lbl: 'up' },
  { name: 'Impel Down', slug: 'impel-down-lieu', x: 648, y: 560, r: 12, zone: 'paradise', seed: 83, note: 'Grande prison', lbl: 'down' },
  // ── Red Line (centre) ──
  { name: 'Mariejois', slug: 'mary-geoise', x: 714, y: 150, r: 15, zone: 'redline', seed: 89, note: 'Terre Sainte', lbl: 'up' },
  { name: 'Île des Hommes-Poissons', slug: 'fishman-island', x: 714, y: 590, r: 16, zone: 'redline', seed: 97, route: 14, note: 'Sous la Red Line', lbl: 'down' },
  // ── New World (quadrant droit) ──
  { name: 'Punk Hazard', slug: 'punk-hazard-lieu', x: 820, y: 420, r: 14, zone: 'new-world', seed: 101, route: 15, note: 'Feu & glace', lbl: 'up' },
  { name: 'Dressrosa', slug: 'dressrosa-lieu', x: 900, y: 468, r: 17, zone: 'new-world', seed: 103, route: 16, lbl: 'down' },
  { name: 'Green Bit', x: 878, y: 400, r: 9, zone: 'new-world', seed: 107, lbl: 'up' },
  { name: 'Zou', slug: 'zou', x: 980, y: 402, r: 16, zone: 'new-world', seed: 109, route: 17, note: 'Dos d’éléphant', lbl: 'up' },
  { name: 'Whole Cake', slug: 'whole-cake-island', x: 1050, y: 470, r: 17, zone: 'new-world', seed: 113, route: 18, note: 'Totto Land', lbl: 'down' },
  { name: 'Wano', slug: 'wano', x: 1140, y: 405, r: 19, zone: 'new-world', seed: 127, route: 19, note: 'Pays des samouraïs', lbl: 'up' },
  { name: 'Onigashima', slug: 'onigashima', x: 1140, y: 335, r: 11, zone: 'new-world', seed: 131, note: 'Repaire de Kaido', lbl: 'up' },
  { name: 'Egghead', slug: 'egghead', x: 1218, y: 462, r: 15, zone: 'new-world', seed: 137, route: 20, note: 'Île du futur', lbl: 'down' },
  { name: 'Elbaf', slug: 'elbaf', x: 1280, y: 402, r: 16, zone: 'new-world', seed: 139, route: 21, note: 'Terre des géants', lbl: 'up' },
  { name: 'Laugh Tale', slug: 'laugh-tale', x: 1330, y: 452, r: 15, zone: 'new-world', seed: 149, route: 22, note: 'Le One Piece', lbl: 'down' },
  { name: 'God Valley', slug: 'god-valley', x: 1150, y: 560, r: 11, zone: 'new-world', seed: 151, note: 'Île disparue', lbl: 'down' },
  // ── Blues (décor) ──
  { name: 'Ohara', slug: 'ohara-lieu', x: 1020, y: 130, r: 13, zone: 'west-blue', seed: 157, note: 'Île des archéologues', lbl: 'up' },
  { name: 'Germa', x: 1110, y: 175, r: 11, zone: 'west-blue', seed: 163, lbl: 'down' },
  { name: 'Baltigo', slug: 'baltigo', x: 250, y: 700, r: 12, zone: 'north-blue', seed: 167, note: 'QG révolutionnaire', lbl: 'down' },
  { name: 'Loadstar', x: 90, y: 620, r: 11, zone: 'north-blue', seed: 173 },
  { name: 'Torino', x: 1080, y: 700, r: 12, zone: 'south-blue', seed: 179, lbl: 'down' },
  { name: 'Karate', x: 1230, y: 690, r: 9, zone: 'south-blue', seed: 181 },
  { name: 'Lvneel', x: 340, y: 700, r: 9, zone: 'north-blue', seed: 191 },
];
