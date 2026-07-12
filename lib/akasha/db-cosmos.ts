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


// ── GALERIE DES MONDES : toutes les planètes illustrées (i2i + text2img), groupées par région ──
export type CosmosGalleryItem = { slug: string; name: string; region: string; img: string };
export const DB_GALLERY: CosmosGalleryItem[] = [
  {"slug":"alpha-planete","name":"Alpha","region":"Univers 7","img":"/images/akasha/db/planets/alpha-planete.webp"},
  {"slug":"arlia","name":"Arlia","region":"Univers 7","img":"/images/akasha/db/planets/arlia.webp"},
  {"slug":"babari","name":"Babari","region":"Univers 10","img":"https://dragonball-api.com/planetas/Planeta_Babari.webp"},
  {"slug":"batapi","name":"Batapi","region":"Univers 7","img":"/images/akasha/db/planets/batapi.webp"},
  {"slug":"beehay","name":"Beehay","region":"Univers 7","img":"/images/akasha/db/planets/beehay.webp"},
  {"slug":"big-gete-star","name":"Big Gete Star","region":"Univers 7","img":"/images/akasha/db/planets/big-gete-star.webp"},
  {"slug":"makyo-star","name":"Étoile Makyo","region":"Univers 7","img":"/images/akasha/db/planets/makyo-star.webp"},
  {"slug":"fake-namek","name":"Faux Namek","region":"Univers 7","img":"/images/akasha/db/planets/fake-namek.webp"},
  {"slug":"frieza-448","name":"Freezer n°448","region":"Univers 7","img":"/images/akasha/db/planets/frieza-448.webp"},
  {"slug":"frieza-79","name":"Freezer n°79","region":"Univers 7","img":"/images/akasha/db/planets/frieza-79.webp"},
  {"slug":"gelbo","name":"Gelbo","region":"Univers 7","img":"/images/akasha/db/planets/gelbo.webp"},
  {"slug":"hera-planete","name":"Héra","region":"Univers 7","img":"/images/akasha/db/planets/hera-planete.webp"},
  {"slug":"imecka","name":"Imecka","region":"Univers 7","img":"/images/akasha/db/planets/imecka.webp"},
  {"slug":"jung","name":"Jung","region":"Univers 7","img":"/images/akasha/db/planets/jung.webp"},
  {"slug":"jupiter","name":"Jupiter","region":"Univers 7","img":"/images/akasha/db/planets/jupiter.webp"},
  {"slug":"kanassa","name":"Kanassa","region":"Univers 7","img":"https://dragonball-api.com/planetas/800px-PlanetKannasa.webp"},
  {"slug":"konats","name":"Konats","region":"Univers 7","img":"/images/akasha/db/planets/konats.webp"},
  {"slug":"luud","name":"Luud","region":"Univers 7","img":"/images/akasha/db/planets/luud.webp"},
  {"slug":"m-2","name":"M-2","region":"Univers 7","img":"/images/akasha/db/planets/m-2.webp"},
  {"slug":"mars","name":"Mars","region":"Univers 7","img":"/images/akasha/db/planets/mars.webp"},
  {"slug":"meat","name":"Meat","region":"Univers 7","img":"/images/akasha/db/planets/meat.webp"},
  {"slug":"metamor","name":"Metamor","region":"Univers 7","img":"/images/akasha/db/planets/metamor.webp"},
  {"slug":"arak-planet","name":"Monde d'Arak","region":"Univers 5","img":"/images/akasha/db/planets/arak-planet.webp"},
  {"slug":"beerus-planet","name":"Monde de Beerus","region":"Univers 7","img":"/images/akasha/db/planets/beerus-planet.webp"},
  {"slug":"belmod-planet","name":"Monde de Belmod","region":"Univers 11","img":"/images/akasha/db/planets/belmod-planet.webp"},
  {"slug":"sacred-world-of-the-kai","name":"Monde Sacré des Kaïō","region":"Autre Monde","img":"/images/akasha/db/planets/sacred-world-of-the-kai.webp"},
  {"slug":"monmaasu","name":"Monmaasu","region":"Univers 7","img":"/images/akasha/db/planets/monmaasu.webp"},
  {"slug":"new-namek","name":"Nouveau Namek","region":"Univers 7","img":"/images/akasha/db/planets/new-namek.webp"},
  {"slug":"new-vegeta","name":"Nouvelle Vegeta","region":"Univers 7","img":"/images/akasha/db/planets/new-vegeta.webp"},
  {"slug":"heaven","name":"Paradis","region":"Autre Monde","img":"/images/akasha/db/planets/heaven.webp"},
  {"slug":"pital","name":"Pital","region":"Univers 7","img":"/images/akasha/db/planets/pital.webp"},
  {"slug":"ankoku","name":"Planète Ankoku","region":"Univers 7","img":"/images/akasha/db/planets/ankoku.webp"},
  {"slug":"cereal","name":"Planète Cereal","region":"Univers 7","img":"/images/akasha/db/planets/cereal.webp"},
  {"slug":"cretaceous","name":"Planète Cretaceous","region":"Univers 7","img":"/images/akasha/db/planets/cretaceous.webp"},
  {"slug":"grand-kai-planet","name":"Planète du Grand Kaïō","region":"Autre Monde","img":"/images/akasha/db/planets/grand-kai-planet.webp"},
  {"slug":"king-cold-planet","name":"Planète du Roi Cold","region":"Univers 7","img":"/images/akasha/db/planets/king-cold-planet.webp"},
  {"slug":"king-kai-planet","name":"Planète du Roi Kaïō","region":"Autre Monde","img":"/images/akasha/db/planets/king-kai-planet.webp"},
  {"slug":"namek","name":"Planète Namek","region":"Univers 7","img":"/images/akasha/db/planets/namek.webp"},
  {"slug":"prison-planet","name":"Planète Prison","region":"Multivers","img":"/images/akasha/db/planets/prison-planet.webp"},
  {"slug":"sadala","name":"Planète Sadala","region":"Univers 6","img":"/images/akasha/db/planets/sadala.webp"},
  {"slug":"nameless-planet","name":"Planète Sans Nom","region":"Multivers","img":"/images/akasha/db/planets/nameless-planet.webp"},
  {"slug":"dark-planet","name":"Planète Sombre","region":"Univers 7","img":"/images/akasha/db/planets/dark-planet.webp"},
  {"slug":"vegeta-planete","name":"Planète Vegeta","region":"Univers 7","img":"/images/akasha/db/planets/vegeta-planete.webp"},
  {"slug":"polaris","name":"Polaris","region":"Univers 7","img":"/images/akasha/db/planets/polaris.webp"},
  {"slug":"demon-realm","name":"Royaume des Démons","region":"Royaume des Démons","img":"/images/akasha/db/planets/demon-realm.webp"},
  {"slug":"rudeeze","name":"Rudeeze","region":"Univers 7","img":"/images/akasha/db/planets/rudeeze.webp"},
  {"slug":"shamo","name":"Shamo","region":"Univers 7","img":"/images/akasha/db/planets/shamo.webp"},
  {"slug":"tech-tech","name":"Tech-Tech","region":"Univers 7","img":"/images/akasha/db/planets/tech-tech.webp"},
  {"slug":"earth","name":"Terre","region":"Univers 7","img":"/images/akasha/db/planets/earth.webp"},
  {"slug":"tigere","name":"Tigere","region":"Univers 7","img":"/images/akasha/db/planets/tigere.webp"},
  {"slug":"vampa","name":"Vampa","region":"Univers 7","img":"/images/akasha/db/planets/vampa.webp"},
  {"slug":"yardrat","name":"Yardrat","region":"Univers 7","img":"/images/akasha/db/planets/yardrat.webp"},
  {"slug":"zoon","name":"Zoon","region":"Univers 7","img":"/images/akasha/db/planets/zoon.webp"},
];

// ── HIÉRARCHIE DIVINE : Zeno → Grand Prêtre → Anges → Dieux → Kaïō Shin → Kaïō ──
export type CosmosDeity = { slug: string; name: string; img: string | null };
export type CosmosTier = { label: string; desc: string; color: string; members: CosmosDeity[] };
export const DB_HIERARCHY: CosmosTier[] = [
  { label: "Roi de Tout", desc: "Zeno règne au sommet absolu du multivers.", color: "#F4D03F", members: [
    {"slug":"zenou","name":"Zeno","img":"https://cdn.myanimelist.net/images/characters/8/307928.webp?s=1749faa17e24c374f5f2b4d8f5302134"},
  ] },
  { label: "Grand Prêtre", desc: "Le Daishinkan, bras droit de Zeno et père des Anges.", color: "#E8E0C0", members: [
    {"slug":"daishinkan","name":"Grand Prêtre","img":"https://cdn.myanimelist.net/images/characters/7/340119.webp?s=b0536e16ad61f4b2503785ab10d800da"},
  ] },
  { label: "Anges", desc: "Guides et professeurs des Dieux de la Destruction.", color: "#5BC8E8", members: [
    {"slug":"whis","name":"Whis","img":"https://dragonball-api.com/characters/Whis_DBS_Broly_Artwork.webp"},
    {"slug":"vados","name":"Vados","img":"https://cdn.myanimelist.net/images/characters/6/295131.webp?s=8bd588405230248d3b34a00958613e74"},
    {"slug":"marcarita","name":"Marcarita","img":"https://cdn.myanimelist.net/images/characters/7/359281.webp?s=971f3315ea86de22f67335cb681e3300"},
    {"slug":"mojito","name":"Mojito","img":"https://cdn.myanimelist.net/images/characters/13/359282.webp?s=bef1dcc1f5d8f53d7d8a3bbe7f7c7d88"},
    {"slug":"cognac","name":"Cognac","img":"https://cdn.myanimelist.net/images/characters/7/357369.webp?s=8b0869134d169429412e50ca368f4704"},
    {"slug":"sour","name":"Sour","img":"https://cdn.myanimelist.net/images/characters/14/357374.webp?s=a0f4a60f67f3dcda4dabee173baac1e9"},
    {"slug":"awamo","name":"Awamo","img":"https://cdn.myanimelist.net/images/characters/10/357379.webp?s=4e6fb94eaebd27b612cefb6003835888"},
    {"slug":"campari","name":"Campari","img":"https://cdn.myanimelist.net/images/characters/9/357380.webp?s=c6b3e34c3b2ea5fbd6b0e6ad7087e5b2"},
    {"slug":"cukatail","name":"Cukatail","img":"https://cdn.myanimelist.net/images/characters/11/357368.webp?s=fada9f83dc26e44e0fd6b4b619d95c5b"},
    {"slug":"korn","name":"Korn","img":"https://cdn.myanimelist.net/images/characters/10/357367.webp?s=55560e6f34e553a8ad893ddbb47aec84"},
    {"slug":"martinu","name":"Martinu","img":"https://cdn.myanimelist.net/images/characters/11/357383.webp?s=d1516cad7d20e84c075e3f2999293702"},
  ] },
  { label: "Dieux de la Destruction", desc: "Un par univers : ils détruisent pour équilibrer la création.", color: "#C77DFF", members: [
    {"slug":"beerus","name":"Beerus","img":"https://cdn.myanimelist.net/images/characters/12/348954.webp?s=5c7dbf7b62688a6bb8aea54b8596ad12"},
    {"slug":"champa","name":"Champa","img":"https://cdn.myanimelist.net/images/characters/9/302850.webp?s=d4b88b96a4101748e57a8a4e6da902c1"},
    {"slug":"vermoud","name":"Belmod","img":"https://cdn.myanimelist.net/images/characters/5/327666.webp?s=3b1ebccf191c5633a5d9729aca280f02"},
    {"slug":"quitela","name":"Quitela","img":"https://cdn.myanimelist.net/images/characters/9/359027.webp?s=946fc9a462e6f2f455f36f465f246d6a"},
    {"slug":"sidra","name":"Sidra","img":"https://cdn.myanimelist.net/images/characters/5/359059.webp?s=5543bc34f624ea96500f7075e808ee3b"},
    {"slug":"rumsshi","name":"Rumsshi","img":"https://cdn.myanimelist.net/images/characters/5/359004.webp?s=bf36829bf8a656b4298db584770812d6"},
    {"slug":"helles","name":"Heles","img":"https://cdn.myanimelist.net/images/characters/2/325434.webp?s=6b001290d97b8f50c163036e239034bd"},
    {"slug":"mosco","name":"Mule","img":"https://cdn.myanimelist.net/images/characters/3/357381.webp?s=5ced7a7ae823e80e4dea1079d2ddc150"},
    {"slug":"arack","name":"Arack","img":"https://cdn.myanimelist.net/images/characters/15/357388.webp?s=bf6ff7edca3f6fb36f94eea464a57656"},
    {"slug":"liquiir","name":"Liquiir","img":"https://cdn.myanimelist.net/images/characters/12/359278.webp?s=e8518deda5fcdc9616c298149ff5f5f9"},
    {"slug":"geene","name":"Geene","img":"https://cdn.myanimelist.net/images/characters/8/357384.webp?s=5e809a63589de2b4cafc32470f464532"},
  ] },
  { label: "Kaïō Shin", desc: "Les dieux de la création, contrepoids des Dieux de la Destruction.", color: "#E88FD0", members: [
    {"slug":"dai-kaioshin","name":"Grand Kaïō Shin","img":"https://cdn.myanimelist.net/images/characters/2/113186.webp?s=602aa561554a4587483c32bcd02e1ad6"},
    {"slug":"higashi-no-kaioshin","name":"Kaïō Shin de l Est","img":"https://cdn.myanimelist.net/images/characters/3/32340.webp?s=eca0a0e023cdfc81f2866ab1e473240a"},
    {"slug":"rou-kaioshin","name":"Vieux Kaïō Shin","img":"https://cdn.myanimelist.net/images/characters/10/366264.webp?s=fa4556a93da9d6373d2edb8b93e60590"},
    {"slug":"gowasu","name":"Gowasu","img":"https://cdn.myanimelist.net/images/characters/12/311076.webp?s=6ecb65c66b32f26c94ef185aca333c79"},
  ] },
  { label: "Grand Kaïō & les Kaïō", desc: "Divinités du monde mortel, gardiennes des galaxies.", color: "#5FD08A", members: [
    {"slug":"dai-kaio","name":"Grand Kaïō","img":"https://cdn.myanimelist.net/images/characters/11/113182.webp?s=dd56e359ac9fd497883e6fe140ae4352"},
    {"slug":"north-kaio","name":"Kaïō du Nord","img":"https://cdn.myanimelist.net/images/characters/7/53213.webp?s=b82983f5d6f8417bf3e309d121b64d5a"},
    {"slug":"east-kaio","name":"Kaïō de l Est","img":"https://cdn.myanimelist.net/images/characters/16/113184.webp?s=44c3b54867986b4f3c5d3271da30ab7d"},
    {"slug":"west-kaio","name":"Kaïō de l Ouest","img":"https://cdn.myanimelist.net/images/characters/3/113183.webp?s=cdfbda4bd4ee4aeb2ca9669b20672341"},
    {"slug":"south-kaio","name":"Kaïō du Sud","img":"https://cdn.myanimelist.net/images/characters/3/113185.webp?s=a3f06759d2274e9e0ef4811d66500a09"},
  ] },
];
