// lib/akasha/db-roster.ts — roster du visualiseur Dragon Ball (généré par scripts/build-db-roster.mjs).
import data from '@/data/akasha/db-roster.json';

export interface DbStats { power: string; force: number; ki: number; vitesse: number; technique: number; resistance: number }
export interface DbChar {
  slug: string; name: string; image: string;
  race: string | null; saga: string | null; ki: string | null;
  rarity: string; fav: number; stats: DbStats | null;
}
export interface DbRoster { count: number; sagas: string[]; races: string[]; withStats: number; roster: DbChar[] }

export const DB_ROSTER = data as unknown as DbRoster;

// Libellés courts + emoji des races (onglets).
export const DB_RACE_META: Record<string, { label: string; emoji: string }> = {
  'Saiyan': { label: 'Saiyan', emoji: '🐒' },
  'Namekian': { label: 'Namek', emoji: '🟢' },
  'Human': { label: 'Humain', emoji: '🧍' },
  'Frieza Race': { label: 'Race de Freezer', emoji: '❄️' },
  'Android': { label: 'Cyborg', emoji: '🤖' },
  'Majin': { label: 'Majin', emoji: '🫧' },
  'Angel': { label: 'Ange', emoji: '😇' },
};

// Frise des sagas : libellé court + couleur.
export const DB_SAGA_META: Record<string, { label: string; color: string }> = {
  'Saga Saiyan': { label: 'Saiyan', color: '#E8613C' },
  'Saga Namek': { label: 'Namek', color: '#5FA85F' },
  'Saga Cell': { label: 'Cell', color: '#7FB04F' },
  'Saga Buu': { label: 'Buu', color: '#E056C1' },
  'Saga Super': { label: 'Super', color: '#3FA9E0' },
};

export const DB_STAT_AXES: { key: keyof DbStats; label: string }[] = [
  { key: 'force', label: 'Force' },
  { key: 'ki', label: 'Ki' },
  { key: 'vitesse', label: 'Vitesse' },
  { key: 'technique', label: 'Technique' },
  { key: 'resistance', label: 'Résistance' },
];
