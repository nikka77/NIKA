// lib/servData.ts — Données SERV (module in-hero) : services à domicile / pros locaux.
// Catégories alignées sur app/serv/page.tsx. Données réalistes Côte d'Azur. Aucune vraie enseigne nationale.

export type ServCat = 'plomberie' | 'electricite' | 'menage' | 'jardinage' | 'demenagement' | 'informatique' | 'serrurerie' | 'peinture';
export const SERV_CATS: { key: ServCat; label: string; emoji: string }[] = [
  { key: 'plomberie', label: 'Plomberie', emoji: '🚿' },
  { key: 'electricite', label: 'Électricité', emoji: '⚡' },
  { key: 'menage', label: 'Ménage', emoji: '🧹' },
  { key: 'jardinage', label: 'Jardinage', emoji: '🌿' },
  { key: 'demenagement', label: 'Déménagement', emoji: '📦' },
  { key: 'informatique', label: 'Informatique', emoji: '💻' },
  { key: 'serrurerie', label: 'Serrurerie', emoji: '🔑' },
  { key: 'peinture', label: 'Peinture', emoji: '🎨' },
];
export const servCatMeta = (k: string) => SERV_CATS.find(c => c.key === k) ?? SERV_CATS[0];
export const SERV_ZONES = ['Nice', 'Cannes', 'Antibes', 'Menton', 'Grasse', 'Cagnes'];

export type Pro = { id: string; name: string; cat: ServCat; rating: number; reviews: number; dist: number; price: number; urgent: boolean; verified: boolean };
const P = (id: string, name: string, cat: ServCat, rating: number, reviews: number, dist: number, price: number, urgent = false, verified = false): Pro =>
  ({ id, name, cat, rating, reviews, dist, price, urgent, verified });
export const PROS: Pro[] = [
  P('p1', 'SOS Plomberie 06', 'plomberie', 4.8, 212, 2.1, 55, true, true),
  P('p2', 'Plomberie du Port', 'plomberie', 4.7, 138, 3.4, 48),
  P('p3', 'Élec Riviera', 'electricite', 4.9, 176, 1.8, 60, true, true),
  P('p4', 'Watt Azur', 'electricite', 4.6, 92, 4.0, 52),
  P('p5', 'Nice Net Services', 'menage', 4.8, 340, 1.2, 28, false, true),
  P('p6', 'Ménage Éclat', 'menage', 4.7, 121, 2.6, 25, true),
  P('p7', 'Jardins d’Azur', 'jardinage', 4.9, 98, 3.1, 38, false, true),
  P('p8', 'Vert Méditerranée', 'jardinage', 4.6, 64, 5.2, 35),
  P('p9', 'Déménie Express', 'demenagement', 4.7, 154, 2.9, 45, true, true),
  P('p10', 'InfoDépann’ 06', 'informatique', 4.8, 87, 1.5, 50, true),
  P('p11', 'Serrurier Express 06', 'serrurerie', 4.9, 203, 1.0, 65, true, true),
  P('p12', 'Clé Minute Azur', 'serrurerie', 4.5, 71, 3.8, 58, true),
  P('p13', 'Cap Couleur Peinture', 'peinture', 4.8, 59, 4.3, 40, false, true),
  P('p14', 'Déco Riviera', 'peinture', 4.6, 44, 2.2, 42),
];
export const PRO_PRICE_MIN = Math.min(...PROS.map(p => p.price));
export const PRO_PRICE_MAX = Math.max(...PROS.map(p => p.price));
