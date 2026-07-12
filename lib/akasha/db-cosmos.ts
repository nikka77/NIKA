// lib/akasha/db-cosmos.ts — données de la carte du multivers Dragon Ball.
// Planètes illustrées (Higgsfield i2i sur réf canon) + les 12 univers de Dragon Ball Super.
// Positions en % du cadre (16:10) — cluster par « royaume » : Au-delà, Univers 7, Univers 6.

export type CosmosRealm = 'univers-7' | 'univers-6' | 'au-dela';

export type CosmosPlanet = {
  slug: string;        // slug de l'entité AKASHA (→ /learn/akasha/[slug])
  name: string;
  realm: CosmosRealm;
  realmLabel: string;
  img: string;
  glow: string;        // couleur du halo
  x: number;           // centre X en % du cadre
  y: number;           // centre Y en % du cadre
  r: number;           // rayon en % de la LARGEUR du cadre
  clip: boolean;       // true = clip circulaire (false pour Beerus dont l'arbre dépasse)
  note: string;        // accroche NIKA (fiche)
};

export const DB_REALM_META: Record<CosmosRealm, { label: string; color: string }> = {
  'univers-7': { label: 'Univers 7', color: '#F0A93B' },
  'univers-6': { label: 'Univers 6', color: '#5BC8E8' },
  'au-dela': { label: 'Au-delà', color: '#C79BF0' },
};

export const DB_PLANETS: CosmosPlanet[] = [
  // ── Au-delà (royaume céleste / des morts) ──
  { slug: 'king-kai-planet', name: 'Planète du Roi Kaïō', realm: 'au-dela', realmLabel: 'Au-delà', img: '/images/akasha/db/planets/king-kai-planet.webp', glow: '#F4D03F', x: 19, y: 20, r: 3.6, clip: true, note: "Minuscule astre au bout du Serpentin, où Goku s'entraîne sous une gravité décuplée." },
  { slug: 'grand-kai-planet', name: 'Planète du Grand Kaïō', realm: 'au-dela', realmLabel: 'Au-delà', img: '/images/akasha/db/planets/grand-kai-planet.webp', glow: '#5FD08A', x: 44, y: 13, r: 5, clip: true, note: "Paradis de l'Autre Monde où les plus grands guerriers défunts s'entraînent." },
  { slug: 'sacred-world-of-the-kai', name: 'Monde Sacré des Kaïō', realm: 'au-dela', realmLabel: 'Au-delà', img: '/images/akasha/db/planets/sacred-world-of-the-kai.webp', glow: '#C79BF0', x: 67, y: 17, r: 5.4, clip: true, note: 'Royaume céleste des Kaïō Shin, gardiens de la création et de la Terre Z.' },

  // ── Univers 6 (jumeau, à part) ──
  { slug: 'sadala', name: 'Planète Sadala', realm: 'univers-6', realmLabel: 'Univers 6', img: '/images/akasha/db/planets/sadala.webp', glow: '#5BC8E8', x: 87, y: 33, r: 6, clip: true, note: "Berceau ancestral des Saïyens de l'Univers 6 — jamais détruite, contrairement à Vegeta." },

  // ── Univers 7 (notre univers) ──
  { slug: 'earth', name: 'Terre', realm: 'univers-7', realmLabel: 'Univers 7', img: '/images/akasha/db/planets/earth.webp', glow: '#4EA8E0', x: 13, y: 54, r: 6.6, clip: true, note: "Berceau de Son Goku et théâtre de presque tous les combats de la saga." },
  { slug: 'namek', name: 'Planète Namek', realm: 'univers-7', realmLabel: 'Univers 7', img: '/images/akasha/db/planets/namek.webp', glow: '#3FBF7F', x: 33, y: 45, r: 6, clip: true, note: 'Monde vert des Namekiens, patrie des Dragon Balls originelles et de Piccolo.' },
  { slug: 'vegeta-planete', name: 'Planète Vegeta', realm: 'univers-7', realmLabel: 'Univers 7', img: '/images/akasha/db/planets/vegeta-planete.webp', glow: '#E0563B', x: 27, y: 78, r: 6, clip: true, note: "Planète d'origine des Saïyens, pulvérisée par Freezer." },
  { slug: 'beerus-planet', name: 'Monde de Beerus', realm: 'univers-7', realmLabel: 'Univers 7', img: '/images/akasha/db/planets/beerus-planet.webp', glow: '#B37BE8', x: 51, y: 45, r: 4.6, clip: false, note: "Demeure divine de Beerus, Dieu de la Destruction de l'Univers 7." },
  { slug: 'yardrat', name: 'Yardrat', realm: 'univers-7', realmLabel: 'Univers 7', img: '/images/akasha/db/planets/yardrat.webp', glow: '#E0A24E', x: 48, y: 77, r: 5.4, clip: true, note: 'Monde des Yardrats, où Goku apprit la Téléportation.' },
  { slug: 'new-namek', name: 'Nouveau Namek', realm: 'univers-7', realmLabel: 'Univers 7', img: '/images/akasha/db/planets/new-namek.webp', glow: '#3FBF7F', x: 67, y: 52, r: 5.5, clip: true, note: 'Nouveau foyer des Namekiens après la destruction de Namek.' },
  { slug: 'vampa', name: 'Vampa', realm: 'univers-7', realmLabel: 'Univers 7', img: '/images/akasha/db/planets/vampa.webp', glow: '#E0563B', x: 71, y: 80, r: 5.5, clip: true, note: 'Planète hostile où Broly fut exilé, grouillante de créatures géantes.' },
  { slug: 'cereal', name: 'Planète Cereal', realm: 'univers-7', realmLabel: 'Univers 7', img: '/images/akasha/db/planets/cereal.webp', glow: '#E0A24E', x: 88, y: 68, r: 6, clip: true, note: 'Monde désertique des Cerealiens, patrie de Granolah le survivant.' },
];

export type CosmosUniverse = {
  num: number;
  slug: string;
  name: string;
  god: string;
  angel: string;
  kai: string;
  twin: number;
  top: 'vainqueur' | 'restauré' | 'exempt';
  rarity: 'legendary' | 'epic' | 'rare';
  desc: string;
};

export const DB_UNIVERSES: CosmosUniverse[] = [
  { num: 1, slug: 'univers-1', name: '', god: 'Iwan', angel: 'Awamo', kai: 'Anato', twin: 12, top: 'exempt', rarity: 'epic', desc: "Univers au niveau mortel très élevé, exempté du Tournoi du Pouvoir avec son jumeau." },
  { num: 2, slug: 'univers-2', name: "Univers de l'Amour", god: 'Heles', angel: 'Sour', kai: 'Pell', twin: 11, top: 'restauré', rarity: 'epic', desc: "Univers gouverné par la belle Heles, patrie des Kamikaze Fireballs (Ribrianne). Éliminé au Tournoi du Pouvoir, puis restauré." },
  { num: 3, slug: 'univers-3', name: '', god: 'Mule', angel: 'Camparri', kai: 'Ea', twin: 10, top: 'restauré', rarity: 'rare', desc: "Univers tourné vers la technologie et les guerriers-machines. Éliminé puis restauré." },
  { num: 4, slug: 'univers-4', name: '', god: 'Quitela', angel: 'Cognac', kai: 'Cae', twin: 9, top: 'restauré', rarity: 'rare', desc: "Univers dirigé par le fourbe Quitela ; ses guerriers usent de ruse et d'invisibilité. Éliminé puis restauré." },
  { num: 5, slug: 'univers-5', name: '', god: 'Arack', angel: 'Cukatail', kai: 'Ogma', twin: 8, top: 'exempt', rarity: 'rare', desc: "Univers au haut niveau mortel, exempté du Tournoi du Pouvoir." },
  { num: 6, slug: 'univers-6', name: '', god: 'Champa', angel: 'Vados', kai: 'Fuwa', twin: 7, top: 'restauré', rarity: 'legendary', desc: "Univers jumeau du 7, gouverné par Champa (frère de Beerus). Abrite des Saïyens (Cabba, Caulifla, Kale), la Planète Sadala et Namek." },
  { num: 7, slug: 'univers-7', name: '', god: 'Beerus', angel: 'Whis', kai: 'Shin', twin: 6, top: 'vainqueur', rarity: 'legendary', desc: "Notre univers : celui de Goku, de la Terre, de Namek et de Freezer. Vainqueur du Tournoi du Pouvoir grâce à Android 17." },
  { num: 8, slug: 'univers-8', name: '', god: 'Liquiir', angel: 'Korn', kai: 'Ill', twin: 5, top: 'exempt', rarity: 'rare', desc: "Univers au haut niveau mortel, exempté du Tournoi du Pouvoir." },
  { num: 9, slug: 'univers-9', name: '', god: 'Sidra', angel: 'Mojito', kai: 'Roh', twin: 4, top: 'restauré', rarity: 'rare', desc: "Univers du Trio de Dangers (Bergamo et ses frères). Premier éliminé au Tournoi du Pouvoir, puis restauré." },
  { num: 10, slug: 'univers-10', name: '', god: 'Rumsshi', angel: 'Kusu', kai: 'Gowasu', twin: 3, top: 'restauré', rarity: 'epic', desc: "Univers du Kaïō Shin Gowasu, dont l'apprenti Zamasu bascula dans la folie. Éliminé puis restauré." },
  { num: 11, slug: 'univers-11', name: '', god: 'Belmod', angel: 'Marcarita', kai: 'Khai', twin: 2, top: 'restauré', rarity: 'legendary', desc: "Univers des Pride Troopers, héros justiciers menés par Jiren, Toppo et Dyspo. Finaliste redoutable du Tournoi, puis restauré." },
  { num: 12, slug: 'univers-12', name: '', god: 'Geene', angel: 'Martinu', kai: 'Agu', twin: 1, top: 'exempt', rarity: 'epic', desc: "Univers au plus haut niveau mortel du multivers, exempté du Tournoi du Pouvoir." },
];

export const DB_TOP_META: Record<CosmosUniverse['top'], { label: string; color: string }> = {
  vainqueur: { label: 'Vainqueur du Tournoi', color: '#F4D03F' },
  restauré: { label: 'Restauré', color: '#5FD08A' },
  exempt: { label: 'Exempté', color: '#8FA0B5' },
};
