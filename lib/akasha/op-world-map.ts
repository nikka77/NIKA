// lib/akasha/op-world-map.ts — dataset de la carte du monde One Piece (géométrie + faits canon).
// Source : op-maps.com (extrait 2026-07-11), retraité par scripts/build-op-map-data.mjs.
// Espace pixel commun [x,y] (y vers le bas) : îles, formes, POI, routes de membres, territoires Yonko.
import data from '@/data/akasha/op-world-map.json';

export interface OpwFirst { saga?: string; chapter?: number; episode?: number }
export interface OpwIsland {
  id: string; name: string; x: number; y: number; region: string;
  shape: [number, number][] | null; area: number; major: boolean;
  firstAppearance: OpwFirst | null; visitedBy: string[]; arcs: string[]; description: string; image: string | null;
}
export interface OpwPoi { id: string; name: string; x: number; y: number; region: string; visitedBy: string[]; description: string; image: string | null }
export interface OpwRoute { id: string; character: string; crew: string; color: string; description: string; path: [number, number][] }
export interface OpwYonko { id: string; name: string; yonko: string; color: string; description: string; shapes: [number, number][][] }
export interface OpWorld {
  meta: Record<string, string>;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  counts: Record<string, number>;
  islands: OpwIsland[]; poi: OpwPoi[]; routes: OpwRoute[]; yonko: OpwYonko[];
}

export const OP_WORLD = data as unknown as OpWorld;

// Teinte des terres par région (mer canon).
export const OPW_REGION_TINT: Record<string, string> = {
  'East Blue': '#7FB3D5',
  'West Blue': '#7DCEA0',
  'North Blue': '#C39BD3',
  'South Blue': '#F0B27A',
  'Paradise': '#F7DC6F',
  'New World': '#E59866',
  'Grand Line': '#F5CBA7',
  'Red Line': '#CD6155',
  'Calm Belt': '#85929E',
};

// Libellé court par route (pour les puces de calque).
export const OPW_ROUTE_LABEL: Record<string, string> = {
  'straw-hat-crew': 'Équipage', 'luffy-route': 'Luffy', 'zoro-route': 'Zoro', 'nami-route': 'Nami',
  'usopp-route': 'Usopp', 'sanji-route': 'Sanji', 'chopper-route': 'Chopper', 'robin-route': 'Robin',
  'franky-route': 'Franky', 'brook-route': 'Brook', 'jinbe-route': 'Jinbe',
  'going-merry-route': 'Merry', 'thousand-sunny-route': 'Sunny',
};
