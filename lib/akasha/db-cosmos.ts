// lib/akasha/db-cosmos.ts — données de la carte du multivers Dragon Ball.
// Planètes illustrées (Higgsfield i2i sur réf canon) + les 12 univers de Dragon Ball Super.
// Positions en % du cadre (16:10) — cluster par « royaume » : Au-delà, Univers 7, Univers 6.

export type CosmosRealm = 'univers-7' | 'univers-6' | 'au-dela';

export type CosmosPerson = { slug: string; name: string };

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
  clip: boolean;       // true = clip circulaire (false pour Beerus dont l'arbre dépasse, déjà détouré)
  note: string;        // accroche NIKA (fiche)
  status: string;      // statut canon (Intacte / Détruite…)
  gravity?: string;    // gravité si canon
  people: CosmosPerson[]; // habitants notables (slugs vérifiés → fiches registre)
};

export const DB_REALM_META: Record<CosmosRealm, { label: string; color: string }> = {
  'univers-7': { label: 'Univers 7', color: '#F0A93B' },
  'univers-6': { label: 'Univers 6', color: '#5BC8E8' },
  'au-dela': { label: 'Au-delà', color: '#C79BF0' },
};

export const DB_PLANETS: CosmosPlanet[] = [
  // ── Au-delà (royaume céleste / des morts) ──
  { slug: 'king-kai-planet', name: 'Planète du Roi Kaïō', realm: 'au-dela', realmLabel: 'Au-delà', img: '/images/akasha/db/planets/king-kai-planet.webp', glow: '#F4D03F', x: 19, y: 20, r: 3.6, clip: true, status: 'Détruite (Cell)', gravity: '10× Terre', note: "Minuscule astre au bout du Serpentin, où Goku s'entraîne sous une gravité décuplée.", people: [{ slug: 'north-kaio', name: 'Roi Kaïō' }, { slug: 'gregory', name: 'Gregory' }, { slug: 'bubbles', name: 'Bubbles' }] },
  { slug: 'grand-kai-planet', name: 'Planète du Grand Kaïō', realm: 'au-dela', realmLabel: 'Au-delà', img: '/images/akasha/db/planets/grand-kai-planet.webp', glow: '#5FD08A', x: 44, y: 13, r: 5, clip: true, status: 'Intacte', note: "Paradis de l'Autre Monde où les plus grands guerriers défunts s'entraînent.", people: [{ slug: 'dai-kaio', name: 'Grand Kaïō' }, { slug: 'pikkon', name: 'Pikkon' }, { slug: 'olibu', name: 'Olibu' }] },
  { slug: 'sacred-world-of-the-kai', name: 'Monde Sacré des Kaïō', realm: 'au-dela', realmLabel: 'Au-delà', img: '/images/akasha/db/planets/sacred-world-of-the-kai.webp', glow: '#C79BF0', x: 67, y: 17, r: 5.4, clip: true, status: 'Intacte', note: 'Royaume céleste des Kaïō Shin, gardiens de la création et de la Terre Z.', people: [{ slug: 'higashi-no-kaioshin', name: 'Kaïō Shin (Shin)' }, { slug: 'kibito', name: 'Kibito' }, { slug: 'rou-kaioshin', name: 'Vieux Kaïō Shin' }, { slug: 'dai-kaioshin', name: 'Grand Kaïō Shin' }] },

  // ── Univers 6 (jumeau, à part) ──
  { slug: 'sadala', name: 'Planète Sadala', realm: 'univers-6', realmLabel: 'Univers 6', img: '/images/akasha/db/planets/sadala.webp', glow: '#5BC8E8', x: 87, y: 33, r: 6, clip: true, status: 'Intacte', note: "Berceau ancestral des Saïyens de l'Univers 6 — jamais détruite, contrairement à Vegeta.", people: [{ slug: 'cabba', name: 'Cabba' }, { slug: 'caulifla', name: 'Caulifla' }, { slug: 'kale', name: 'Kale' }, { slug: 'renso', name: 'Renso' }] },

  // ── Univers 7 (notre univers) ──
  { slug: 'earth', name: 'Terre', realm: 'univers-7', realmLabel: 'Univers 7', img: '/images/akasha/db/planets/earth.webp', glow: '#4EA8E0', x: 13, y: 54, r: 6.6, clip: true, status: 'Restaurée', note: "Berceau de Son Goku et théâtre de presque tous les combats de la saga.", people: [{ slug: 'son-goku', name: 'Son Goku' }, { slug: 'son-gohan', name: 'Son Gohan' }, { slug: 'krillin', name: 'Krillin' }, { slug: 'piccolo', name: 'Piccolo' }, { slug: 'bulma', name: 'Bulma' }] },
  { slug: 'namek', name: 'Planète Namek', realm: 'univers-7', realmLabel: 'Univers 7', img: '/images/akasha/db/planets/namek.webp', glow: '#3FBF7F', x: 33, y: 45, r: 6, clip: true, status: 'Détruite (Freezer)', note: 'Monde vert des Namekiens, patrie des Dragon Balls originelles et de Piccolo.', people: [{ slug: 'piccolo', name: 'Piccolo' }, { slug: 'dende', name: 'Dende' }, { slug: 'nail', name: 'Nail' }] },
  { slug: 'vegeta-planete', name: 'Planète Vegeta', realm: 'univers-7', realmLabel: 'Univers 7', img: '/images/akasha/db/planets/vegeta-planete.webp', glow: '#E0563B', x: 27, y: 78, r: 6, clip: true, status: 'Détruite (Freezer)', gravity: '10× Terre', note: "Planète d'origine des Saïyens, pulvérisée par Freezer.", people: [{ slug: 'vegeta', name: 'Vegeta' }, { slug: 'king-vegeta', name: 'Roi Vegeta' }, { slug: 'nappa', name: 'Nappa' }, { slug: 'bardock', name: 'Bardock' }, { slug: 'raditz', name: 'Raditz' }] },
  { slug: 'beerus-planet', name: 'Monde de Beerus', realm: 'univers-7', realmLabel: 'Univers 7', img: '/images/akasha/db/planets/beerus-planet.webp', glow: '#B37BE8', x: 51, y: 45, r: 5, clip: false, status: 'Intacte', note: "Demeure divine de Beerus, Dieu de la Destruction de l'Univers 7.", people: [{ slug: 'beerus', name: 'Beerus' }, { slug: 'whis', name: 'Whis' }] },
  { slug: 'yardrat', name: 'Yardrat', realm: 'univers-7', realmLabel: 'Univers 7', img: '/images/akasha/db/planets/yardrat.webp', glow: '#E0A24E', x: 48, y: 77, r: 5.4, clip: true, status: 'Intacte', note: 'Monde des Yardrats, où Goku apprit la Téléportation.', people: [{ slug: 'son-goku', name: 'Son Goku' }] },
  { slug: 'new-namek', name: 'Nouveau Namek', realm: 'univers-7', realmLabel: 'Univers 7', img: '/images/akasha/db/planets/new-namek.webp', glow: '#3FBF7F', x: 67, y: 52, r: 5.5, clip: true, status: 'Intacte', note: 'Nouveau foyer des Namekiens après la destruction de Namek.', people: [{ slug: 'dende', name: 'Dende' }, { slug: 'nail', name: 'Nail' }] },
  { slug: 'vampa', name: 'Vampa', realm: 'univers-7', realmLabel: 'Univers 7', img: '/images/akasha/db/planets/vampa.webp', glow: '#E0563B', x: 71, y: 80, r: 5.5, clip: true, status: 'Intacte', note: 'Planète hostile où Broly fut exilé, grouillante de créatures géantes.', people: [{ slug: 'broly', name: 'Broly' }, { slug: 'paragus', name: 'Paragus' }] },
  { slug: 'cereal', name: 'Planète Cereal', realm: 'univers-7', realmLabel: 'Univers 7', img: '/images/akasha/db/planets/cereal.webp', glow: '#E0A24E', x: 88, y: 68, r: 6, clip: true, status: 'Intacte', note: 'Monde désertique des Cerealiens, patrie de Granolah le survivant.', people: [{ slug: 'granolah', name: 'Granolah' }] },
];

export type CosmosUniverse = {
  num: number;
  slug: string;
  name: string;
  god: string;
  godSlug: string | null;
  angel: string;
  angelSlug: string | null;
  kai: string;
  twin: number;
  top: 'vainqueur' | 'restauré' | 'exempt';
  rarity: 'legendary' | 'epic' | 'rare';
  desc: string;
};

export const DB_UNIVERSES: CosmosUniverse[] = [
  { num: 1, slug: 'univers-1', name: '', god: 'Iwan', godSlug: null, angel: 'Awamo', angelSlug: 'awamo', kai: 'Anato', twin: 12, top: 'exempt', rarity: 'epic', desc: "Univers au niveau mortel très élevé, exempté du Tournoi du Pouvoir avec son jumeau." },
  { num: 2, slug: 'univers-2', name: "Univers de l'Amour", god: 'Heles', godSlug: 'helles', angel: 'Sour', angelSlug: 'sour', kai: 'Pell', twin: 11, top: 'restauré', rarity: 'epic', desc: "Univers gouverné par la belle Heles, patrie des Kamikaze Fireballs (Ribrianne). Éliminé au Tournoi du Pouvoir, puis restauré." },
  { num: 3, slug: 'univers-3', name: '', god: 'Mule', godSlug: 'mosco', angel: 'Camparri', angelSlug: 'campari', kai: 'Ea', twin: 10, top: 'restauré', rarity: 'rare', desc: "Univers tourné vers la technologie et les guerriers-machines. Éliminé puis restauré." },
  { num: 4, slug: 'univers-4', name: '', god: 'Quitela', godSlug: 'quitela', angel: 'Cognac', angelSlug: 'cognac', kai: 'Cae', twin: 9, top: 'restauré', rarity: 'rare', desc: "Univers dirigé par le fourbe Quitela ; ses guerriers usent de ruse et d'invisibilité. Éliminé puis restauré." },
  { num: 5, slug: 'univers-5', name: '', god: 'Arack', godSlug: 'arack', angel: 'Cukatail', angelSlug: 'cukatail', kai: 'Ogma', twin: 8, top: 'exempt', rarity: 'rare', desc: "Univers au haut niveau mortel, exempté du Tournoi du Pouvoir." },
  { num: 6, slug: 'univers-6', name: '', god: 'Champa', godSlug: 'champa', angel: 'Vados', angelSlug: 'vados', kai: 'Fuwa', twin: 7, top: 'restauré', rarity: 'legendary', desc: "Univers jumeau du 7, gouverné par Champa (frère de Beerus). Abrite des Saïyens (Cabba, Caulifla, Kale), la Planète Sadala et Namek." },
  { num: 7, slug: 'univers-7', name: '', god: 'Beerus', godSlug: 'beerus', angel: 'Whis', angelSlug: 'whis', kai: 'Shin', twin: 6, top: 'vainqueur', rarity: 'legendary', desc: "Notre univers : celui de Goku, de la Terre, de Namek et de Freezer. Vainqueur du Tournoi du Pouvoir grâce à Android 17." },
  { num: 8, slug: 'univers-8', name: '', god: 'Liquiir', godSlug: 'liquiir', angel: 'Korn', angelSlug: 'korn', kai: 'Ill', twin: 5, top: 'exempt', rarity: 'rare', desc: "Univers au haut niveau mortel, exempté du Tournoi du Pouvoir." },
  { num: 9, slug: 'univers-9', name: '', god: 'Sidra', godSlug: 'sidra', angel: 'Mojito', angelSlug: 'mojito', kai: 'Roh', twin: 4, top: 'restauré', rarity: 'rare', desc: "Univers du Trio de Dangers (Bergamo et ses frères). Premier éliminé au Tournoi du Pouvoir, puis restauré." },
  { num: 10, slug: 'univers-10', name: '', god: 'Rumsshi', godSlug: 'rumsshi', angel: 'Kusu', angelSlug: null, kai: 'Gowasu', twin: 3, top: 'restauré', rarity: 'epic', desc: "Univers du Kaïō Shin Gowasu, dont l'apprenti Zamasu bascula dans la folie. Éliminé puis restauré." },
  { num: 11, slug: 'univers-11', name: '', god: 'Belmod', godSlug: 'vermoud', angel: 'Marcarita', angelSlug: 'marcarita', kai: 'Khai', twin: 2, top: 'restauré', rarity: 'legendary', desc: "Univers des Pride Troopers, héros justiciers menés par Jiren, Toppo et Dyspo. Finaliste redoutable du Tournoi, puis restauré." },
  { num: 12, slug: 'univers-12', name: '', god: 'Geene', godSlug: 'geene', angel: 'Martinu', angelSlug: 'martinu', kai: 'Agu', twin: 1, top: 'exempt', rarity: 'epic', desc: "Univers au plus haut niveau mortel du multivers, exempté du Tournoi du Pouvoir." },
];

export const DB_TOP_META: Record<CosmosUniverse['top'], { label: string; color: string }> = {
  vainqueur: { label: 'Vainqueur du Tournoi', color: '#F4D03F' },
  restauré: { label: 'Restauré', color: '#5FD08A' },
  exempt: { label: 'Exempté', color: '#8FA0B5' },
};
