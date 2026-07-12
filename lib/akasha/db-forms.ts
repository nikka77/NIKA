// lib/akasha/db-forms.ts — évolutions/transformations, fusions et artefacts par personnage.
// Injecté dans l'attribut `forms` des entités via scripts/akasha-db-forms.ts (cartes TCG).
// Les formes changent l'image, le niveau de puissance (approximatif) et les stats (boost cumulé,
// plafonné à 99) pour rester cohérent. img optionnelle → retombe sur l'image de base du perso.

export interface DbForm {
  name: string;
  img?: string;        // /images/akasha/db/forms/*.webp (sinon image de base)
  power: string;       // niveau de puissance approximatif (affiché comme nombre)
  boost: number;       // ajouté à chaque stat de base (plafond 99)
  aura?: string;       // couleur d'aura de la forme
}

const F = '/images/akasha/db/forms';

export const DB_FORMS: Record<string, DbForm[]> = {
  'son-goku': [
    { name: 'Base', power: '12 M', boost: 0 },
    { name: 'Kaïō-ken', img: `${F}/kaioken.webp`, power: '480 M', boost: 7, aura: '#E0563B' },
    { name: 'Super Saiyan', img: `${F}/ssj.webp`, power: '3 Md', boost: 15, aura: '#F4D03F' },
    { name: 'Super Saiyan 3', img: `${F}/ssj3.webp`, power: '24 Md', boost: 26, aura: '#F4D03F' },
    { name: 'Super Saiyan God', img: `${F}/ssg.webp`, power: '6 Bn', boost: 32, aura: '#E0563B' },
    { name: 'Super Saiyan Blue', img: `${F}/ssb.webp`, power: '12 Bn', boost: 37, aura: '#3FA9E0' },
    { name: 'Ultra Instinct', img: `${F}/ui-goku.webp`, power: '90 Bn', boost: 45, aura: '#CFE3F0' },
    { name: 'Super Saiyan 4', img: `${F}/ssj4.webp`, power: '30 Bn', boost: 41, aura: '#B03030' },
  ],
  'vegeta': [
    { name: 'Base', power: '11 M', boost: 0 },
    { name: 'Super Saiyan', power: '3 Md', boost: 15, aura: '#F4D03F' },
    { name: 'Majin Vegeta', power: '8 Md', boost: 28, aura: '#E056C1' },
    { name: 'Super Saiyan Blue', power: '12 Bn', boost: 37, aura: '#3FA9E0' },
    { name: 'Super Saiyan Blue Évolution', img: `${F}/ssb-evo.webp`, power: '30 Bn', boost: 41, aura: '#3FA9E0' },
    { name: 'Ultra Ego', img: `${F}/ultra-ego.webp`, power: '85 Bn', boost: 45, aura: '#B37BE8' },
  ],
  'son-gohan': [
    { name: 'Base', power: '9 M', boost: 0 },
    { name: 'Super Saiyan 2', img: `${F}/ssj2.webp`, power: '6 Md', boost: 24, aura: '#F4D03F' },
    { name: 'Gohan Ultime', img: `${F}/ultimate.webp`, power: '40 Md', boost: 34, aura: '#E0D24E' },
    { name: 'Gohan Beast', img: `${F}/beast.webp`, power: '95 Bn', boost: 46, aura: '#C0D8E8' },
  ],
  'freezer': [
    { name: 'Forme finale', power: '120 M', boost: 0 },
    { name: 'Golden Freezer', img: `${F}/golden-frieza.webp`, power: '12 Bn', boost: 32, aura: '#F4D03F' },
    { name: 'Black Freezer', img: `${F}/black-frieza.webp`, power: '900 Bn', boost: 62, aura: '#6A6A7A' },
  ],
  'cell': [
    { name: 'Cellule Parfaite', power: '5 Md', boost: 0 },
    { name: 'Super Parfaite', power: '15 Md', boost: 20, aura: '#7FB04F' },
  ],
  'majin-buu': [
    { name: 'Boubou (Gros)', power: '8 Md', boost: 0 },
    { name: 'Super Boubou', img: `${F}/super-buu.webp`, power: '30 Md', boost: 18, aura: '#E056C1' },
    { name: 'Boubou (Kid)', img: `${F}/kid-buu.webp`, power: '48 Md', boost: 27, aura: '#E883C1' },
  ],
  'broly': [
    { name: 'Base', power: '2 Md', boost: 0 },
    { name: 'Super Saiyan (Colère)', power: '10 Bn', boost: 26, aura: '#5FA85F' },
    { name: 'Super Saiyan Légendaire', img: `${F}/lssj.webp`, power: '60 Bn', boost: 43, aura: '#6FE05F' },
  ],
  'piccolo': [
    { name: 'Base', power: '3 M', boost: 0 },
    { name: 'Fusion (Nail & Kami)', power: '1 Md', boost: 16, aura: '#5FA85F' },
    { name: 'Piccolo Orange', img: `${F}/orange-piccolo.webp`, power: '50 Md', boost: 35, aura: '#E0A24E' },
  ],
  'gogeta': [
    { name: 'Base', img: `${F}/gogeta.webp`, power: '15 Md', boost: 0 },
    { name: 'Super Saiyan', power: '80 Md', boost: 22, aura: '#F4D03F' },
    { name: 'Super Saiyan Blue', power: '100 Bn', boost: 44, aura: '#3FA9E0' },
  ],
  'gotenks': [
    { name: 'Base', img: `${F}/gotenks.webp`, power: '20 Md', boost: 0 },
    { name: 'Super Saiyan', power: '40 Md', boost: 16, aura: '#F4D03F' },
    { name: 'Super Saiyan 3', power: '90 Md', boost: 30, aura: '#F4D03F' },
  ],
  'future-trunks': [
    { name: 'Base', power: '5 M', boost: 0 },
    { name: 'Super Saiyan', power: '2 Md', boost: 16, aura: '#F4D03F' },
    { name: 'Super Saiyan Colère', power: '18 Bn', boost: 35, aura: '#4E7FE0' },
  ],
};

// Fusions : type + personnages à la base de la fusion (→ fiches).
export const DB_FUSIONS: Record<string, { type: string; bases: { slug: string; name: string }[] }> = {
  'gogeta': { type: 'Fusion (Danse)', bases: [{ slug: 'son-goku', name: 'Son Goku' }, { slug: 'vegeta', name: 'Vegeta' }] },
  'gotenks': { type: 'Fusion (Danse)', bases: [{ slug: 'son-goten', name: 'Son Goten' }, { slug: 'trunks', name: 'Trunks' }] },
  'kefla': { type: 'Fusion Potara', bases: [{ slug: 'caulifla', name: 'Caulifla' }, { slug: 'kale', name: 'Kale' }] },
};

// Artefacts emblématiques par personnage (slugs d'entités artefact → fiches).
export const DB_CHAR_ARTIFACTS: Record<string, { slug: string; name: string }[]> = {
  'son-goku': [{ slug: 'baton-magique', name: 'Bâton Magique' }, { slug: 'kinto-un', name: 'Nuage Magique' }, { slug: 'dogi-ecole-tortue', name: 'Dogi Tortue' }],
  'future-trunks': [{ slug: 'epee-de-trunks', name: 'Épée de Trunks' }, { slug: 'machine-a-remonter-le-temps', name: 'Machine temporelle' }],
  'trunks': [{ slug: 'epee-de-trunks', name: 'Épée de Trunks' }],
  'son-gohan': [{ slug: 'z-epee', name: 'Z-Sword' }, { slug: 'dogi-ecole-tortue', name: 'Dogi Tortue' }],
  'vegeta': [{ slug: 'armure-saiyan', name: 'Armure Saiyan' }, { slug: 'scouter', name: 'Scouter' }],
  'piccolo': [{ slug: 'cape-turban-piccolo', name: 'Cape & turban' }, { slug: 'mafuba-flacon', name: 'Bidon du Mafûba' }],
  'freezer': [{ slug: 'scouter', name: 'Scouter' }],
  'kefla': [{ slug: 'potara', name: 'Potaras' }],
  'kibito-kai': [{ slug: 'potara', name: 'Potaras' }],
  'krillin': [{ slug: 'dogi-ecole-tortue', name: 'Dogi Tortue' }, { slug: 'senzu', name: 'Haricots Senzu' }],
  'bulma': [{ slug: 'radar-dragon', name: 'Radar du Dragon' }, { slug: 'capsule-hoi-poi', name: 'Capsule' }, { slug: 'machine-a-remonter-le-temps', name: 'Machine temporelle' }],
  'karin': [{ slug: 'senzu', name: 'Haricots Senzu' }, { slug: 'eau-ultra-divine', name: 'Eau Ultra Divine' }],
  'tapion': [{ slug: 'ocarina-de-tapion', name: 'Ocarina' }, { slug: 'epee-de-lespoir', name: "Épée de l'Espoir" }],
  'son-goku-jr': [{ slug: 'kinto-un', name: 'Nuage Magique' }, { slug: 'baton-magique', name: 'Bâton Magique' }],
};
