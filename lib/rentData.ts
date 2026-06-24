// lib/rentData.ts — Données RENT (module in-hero) : location de matériel entre particuliers.
// Catégories alignées sur app/rent/page.tsx (sport/bricolage/photo/camping/materiel/vehicule).
// Données réalistes Côte d'Azur.

export type RentCat = 'sport' | 'bricolage' | 'photo' | 'camping' | 'materiel' | 'vehicule';
export const RENT_CATS: { key: RentCat; label: string; emoji: string }[] = [
  { key: 'sport', label: 'Sport & Loisirs', emoji: '⛷️' },
  { key: 'bricolage', label: 'Bricolage', emoji: '🔧' },
  { key: 'photo', label: 'Photo & Vidéo', emoji: '📸' },
  { key: 'camping', label: 'Camping', emoji: '🏕️' },
  { key: 'materiel', label: 'Matériel event', emoji: '🎪' },
  { key: 'vehicule', label: 'Véhicules', emoji: '🚐' },
];
export const rentCatMeta = (k: string) => RENT_CATS.find(c => c.key === k) ?? RENT_CATS[0];

export type Gear = { id: string; title: string; cat: RentCat; price: number; owner: string; rating: number; reviews: number; dist: number; emoji: string };
const G = (id: string, title: string, cat: RentCat, price: number, owner: string, rating: number, reviews: number, dist: number, emoji: string): Gear =>
  ({ id, title, cat, price, owner, rating, reviews, dist, emoji });
export const GEAR: Gear[] = [
  G('g1', 'Paddle gonflable', 'sport', 18, 'Marco P.', 4.8, 41, 0.8, '🏄'),
  G('g2', 'VTT électrique', 'sport', 35, 'Léa M.', 4.9, 63, 1.2, '🚵'),
  G('g3', 'Ski + chaussures', 'sport', 28, 'Max D.', 4.8, 29, 5.0, '⛷️'),
  G('g4', 'Perceuse Bosch', 'bricolage', 12, 'Thomas G.', 4.7, 52, 2.1, '🔩'),
  G('g5', 'Ponceuse excentrique', 'bricolage', 10, 'Julie R.', 4.6, 18, 2.4, '🪚'),
  G('g6', 'Reflex Canon R6', 'photo', 40, 'Sofia R.', 5.0, 37, 1.9, '📷'),
  G('g7', 'Drone DJI Mini', 'photo', 45, 'Inès B.', 4.9, 44, 3.0, '🚁'),
  G('g8', 'Tente 4 places', 'camping', 22, 'Hugo L.', 4.6, 26, 1.5, '⛺'),
  G('g9', 'Glacière électrique', 'camping', 14, 'Nina K.', 4.7, 22, 1.1, '🧊'),
  G('g10', 'Sono 2×500 W', 'materiel', 60, 'Camille D.', 4.8, 31, 2.8, '🔊'),
  G('g11', 'Van aménagé', 'vehicule', 95, 'Yanis K.', 4.9, 19, 4.2, '🚐'),
  G('g12', 'Remorque bagagère', 'vehicule', 30, 'Karim S.', 4.7, 15, 3.5, '🛻'),
];
export const GEAR_PRICE_MIN = Math.min(...GEAR.map(g => g.price));
export const GEAR_PRICE_MAX = Math.max(...GEAR.map(g => g.price));
