// lib/azurData.ts — Données AZUR (module in-hero) : Mer & Bateaux.
// 3 catégories : Bateau (location) · Sorties (excursions en mer) · Sports nautiques.
// Données réalistes Côte d'Azur. Aucune vraie enseigne de marque.

export type BoatKind = 'semi-rigide' | 'sans-permis' | 'voilier' | 'catamaran' | 'yacht';
export const BOAT_KINDS: { key: BoatKind; label: string; emoji: string }[] = [
  { key: 'semi-rigide', label: 'Semi-rigide', emoji: '🚤' },
  { key: 'sans-permis', label: 'Sans permis', emoji: '🛶' },
  { key: 'voilier', label: 'Voilier', emoji: '⛵' },
  { key: 'catamaran', label: 'Catamaran', emoji: '🛥️' },
  { key: 'yacht', label: 'Yacht', emoji: '🛳️' },
];
export const boatKindMeta = (k: string) => BOAT_KINDS.find(b => b.key === k) ?? BOAT_KINDS[0];
export type Skipper = 'avec' | 'sans' | 'option';
export type Boat = { id: string; name: string; kind: BoatKind; seats: number; skipper: Skipper; price: number; port: string };
const B = (id: string, name: string, kind: BoatKind, seats: number, skipper: Skipper, price: number, port: string): Boat =>
  ({ id, name, kind, seats, skipper, price, port });
export const BOATS: Boat[] = [
  B('b1', 'Quicksilver 475', 'sans-permis', 5, 'sans', 180, 'Villefranche'),
  B('b2', 'Zodiac Medline', 'semi-rigide', 8, 'option', 320, 'Nice'),
  B('b3', 'Bénéteau Flyer 8', 'semi-rigide', 10, 'option', 450, 'Cannes'),
  B('b4', 'Sun Odyssey 410', 'voilier', 6, 'avec', 590, 'Antibes'),
  B('b5', 'Lagoon 42', 'catamaran', 12, 'avec', 980, 'Mandelieu'),
  B('b6', 'Princess V50', 'yacht', 12, 'avec', 2400, 'Golfe-Juan'),
];
export const BOAT_PRICE_MIN = Math.min(...BOATS.map(b => b.price));
export const BOAT_PRICE_MAX = Math.max(...BOATS.map(b => b.price));

export type Excursion = { id: string; name: string; departure: string; duration: string; price: number; emoji: string; tag?: string };
const E = (id: string, name: string, departure: string, duration: string, price: number, emoji: string, tag?: string): Excursion =>
  ({ id, name, departure, duration, price, emoji, tag });
export const EXCURSIONS: Excursion[] = [
  E('e1', 'Îles de Lérins', 'Cannes', 'Demi-journée', 45, '🏝️', 'Best-seller'),
  E('e2', 'Calanques de l’Estérel', 'Mandelieu', 'Demi-journée', 55, '🪨'),
  E('e3', 'Coucher de soleil & champagne', 'Antibes', '2 h', 65, '🌇', 'Romantique'),
  E('e4', 'Observation des dauphins', 'Cannes', '3 h', 75, '🐬', 'Famille'),
  E('e5', 'Monaco & Cap-Ferrat', 'Nice', 'Journée', 95, '🏙️'),
  E('e6', 'Saint-Tropez en bateau', 'Cannes', 'Journée', 120, '⛵', 'Iconique'),
];

export type Sport = { id: string; name: string; price: number; unit: string; emoji: string };
const S = (id: string, name: string, price: number, unit: string, emoji: string): Sport => ({ id, name, price, unit, emoji });
export const SPORTS: Sport[] = [
  S('w1', 'Jet-ski', 90, '30 min', '🌊'),
  S('w2', 'Paddle', 20, 'heure', '🏄'),
  S('w3', 'Plongée — baptême', 70, 'séance', '🤿'),
  S('w4', 'Flyboard', 80, '20 min', '🚀'),
  S('w5', 'Bouée tractée', 35, 'tour', '🛟'),
  S('w6', 'Parachute ascensionnel', 60, 'vol', '🪂'),
];
