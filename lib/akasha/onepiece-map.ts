// lib/akasha/onepiece-map.ts — modèle de la carte du monde One Piece + parcours de l'équipage.
// Géographie canon stylisée (Red Line verticale, Grand Line = le parcours, moitiés Paradise / Nouveau Monde,
// East Blue, Calm Belts) — dessin 100 % maison, inspiré de la structure du monde (aucun asset tiers).
// Consommé par components/akasha/hub/OnePieceMap (client).

export const OP_MAP = { w: 1000, h: 600 } as const;

// Bande de la Red Line (continent-muraille) — verticale au centre, croisée par le parcours à l'Île des Hommes-Poissons.
export const RED_LINE = 'M470,0 C486,120 458,240 486,300 C458,360 486,480 470,600 L560,600 C544,480 570,360 544,300 C570,240 544,120 560,0 Z';

export type OpZone = 'east-blue' | 'paradise' | 'redline' | 'new-world';

export interface OpStop {
  slug: string;      // entité place → /learn/akasha/{slug}
  name: string;      // nom court FR
  x: number; y: number;
  zone: OpZone;
  note?: string;     // accroche (départ / arrivée / ciel…)
}

// Parcours canonique des Chapeaux de Paille, du départ (East Blue) à la fin (Laugh Tale).
export const OP_ROUTE: OpStop[] = [
  { slug: 'foosha', name: 'Fushia', x: 62, y: 250, zone: 'east-blue', note: 'Départ — le village de Luffy' },
  { slug: 'loguetown-lieu', name: 'Loguetown', x: 150, y: 335, zone: 'east-blue', note: 'La ville de Roger' },
  { slug: 'reverse-mountain-lieu', name: 'Reverse Mountain', x: 222, y: 300, zone: 'paradise', note: "Entrée de Grand Line" },
  { slug: 'whisky-peak', name: 'Whisky Peak', x: 272, y: 224, zone: 'paradise' },
  { slug: 'little-garden-lieu', name: 'Little Garden', x: 296, y: 372, zone: 'paradise' },
  { slug: 'drum-island', name: 'Drum', x: 336, y: 168, zone: 'paradise' },
  { slug: 'alabasta-lieu', name: 'Alabasta', x: 366, y: 430, zone: 'paradise' },
  { slug: 'jaya', name: 'Jaya', x: 404, y: 296, zone: 'paradise' },
  { slug: 'skypiea-lieu', name: 'Skypiea', x: 416, y: 120, zone: 'paradise', note: 'Île céleste' },
  { slug: 'water-seven-lieu', name: 'Water Seven', x: 440, y: 404, zone: 'paradise' },
  { slug: 'enies-lobby-lieu', name: 'Enies Lobby', x: 452, y: 292, zone: 'paradise' },
  { slug: 'thriller-bark-lieu', name: 'Thriller Bark', x: 436, y: 486, zone: 'paradise' },
  { slug: 'sabaody', name: 'Sabaody', x: 470, y: 236, zone: 'paradise', note: 'La séparation' },
  { slug: 'fishman-island', name: 'Île des Hommes-Poissons', x: 515, y: 476, zone: 'redline', note: 'Sous la Red Line' },
  { slug: 'punk-hazard-lieu', name: 'Punk Hazard', x: 588, y: 322, zone: 'new-world' },
  { slug: 'dressrosa-lieu', name: 'Dressrosa', x: 646, y: 424, zone: 'new-world' },
  { slug: 'zou', name: 'Zou', x: 694, y: 250, zone: 'new-world' },
  { slug: 'whole-cake-island', name: 'Whole Cake', x: 744, y: 384, zone: 'new-world' },
  { slug: 'wano', name: 'Pays de Wano', x: 802, y: 218, zone: 'new-world' },
  { slug: 'egghead', name: 'Egghead', x: 862, y: 360, zone: 'new-world' },
  { slug: 'elbaf', name: 'Elbaf', x: 906, y: 244, zone: 'new-world', note: 'Prochaine escale' },
  { slug: 'laugh-tale', name: 'Laugh Tale', x: 952, y: 316, zone: 'new-world', note: 'Le One Piece' },
];

// Repères de zone (labels flottants).
export const OP_ZONES = [
  { label: 'East Blue', x: 92, y: 178, size: 15, color: '#7FB2D8' },
  { label: 'PARADISE', x: 330, y: 60, size: 20, color: '#6FA8CF' },
  { label: 'NOUVEAU MONDE', x: 720, y: 58, size: 20, color: '#C99A5B' },
  { label: 'Calm Belt', x: 300, y: 560, size: 12, color: '#5A7A6A' },
] as const;
