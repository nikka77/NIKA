// lib/akasha/universe-taxonomy.ts — la TAXONOMIE CANON de chaque univers AKASHA.
// Chaque univers est organisé selon SA logique (villages Naruto, équipages OP, divisions
// Bleach, parties JoJo…) : les hubs `/learn/akasha/u/[slug]` et les filtres du registre
// se génèrent depuis cette config — ajouter un axe = quelques lignes ici, zéro composant.

export interface AxisValue {
  /** Valeur BRUTE stockée dans attributes (eq strict côté PostgREST). */
  v: string;
  /** Libellé FR affiché (défaut : la valeur brute). */
  l?: string;
}

export interface UniverseAxis {
  /** Clé JSONB dans attributes (village, crew, partie…). */
  attr: string;
  label: string;
  icon: string;
  /** Valeurs canon, dans l'ordre d'affichage curé. */
  values: AxisValue[];
}

export interface UniverseTaxonomy {
  /** Nom exact en base (colonne universe). */
  name: string;
  /** Slug d'URL du hub (/learn/akasha/u/<slug>). */
  slug: string;
  kanji: string;
  tagline: string;
  /** Axes de navigation canon de CET univers. */
  axes: UniverseAxis[];
  /** Pages piliers (fiches bespoke/évolutives) mises en avant sur le hub. */
  piliers: string[];
}

export const UNIVERSE_TAXONOMY: UniverseTaxonomy[] = [
  {
    name: 'Naruto',
    slug: 'naruto',
    kanji: 'ナルト',
    tagline: 'Villages cachés, clans et ninjutsu — le monde shinobi.',
    axes: [
      {
        attr: 'village', label: 'Villages', icon: '🏯',
        values: [
          { v: 'Konohagakure' }, { v: 'Sunagakure' }, { v: 'Kirigakure' },
          { v: 'Kumogakure' }, { v: 'Iwagakure' }, { v: 'Amegakure' }, { v: 'Otogakure' },
        ],
      },
      {
        attr: 'clan', label: 'Clans', icon: '⛩️',
        values: [
          { v: 'Uchiha' }, { v: 'Uzumaki' }, { v: 'Senju' }, { v: 'Hyūga' }, { v: 'Nara' },
          { v: 'Akimichi' }, { v: 'Yamanaka' }, { v: 'Inuzuka' }, { v: 'Ōtsutsuki' },
        ],
      },
      {
        attr: 'rank', label: 'Rangs ninja', icon: '🎖️',
        values: [
          { v: 'Academy Student', l: 'Élève de l’Académie' }, { v: 'Genin' }, { v: 'Chūnin' },
          { v: 'Tokubetsu Jōnin', l: 'Jōnin spécial' }, { v: 'Jōnin' }, { v: 'Anbu' }, { v: 'Kage' },
        ],
      },
      {
        attr: 'generation', label: 'Générations', icon: '🧬',
        values: [
          { v: 'Fondateurs' }, { v: 'Sannin' }, { v: 'Génération de Kakashi' },
          { v: 'Konoha 11' }, { v: 'Nouvelle ère' },
        ],
      },
    ],
    piliers: ['naruto-uzumaki', 'konohagakure', 'sharingan', 'rasengan', 'clan-uchiha', 'samehada', 'ninja-medical'],
  },
  {
    name: 'One Piece',
    slug: 'one-piece',
    kanji: 'ワンピース',
    tagline: 'Équipages, primes et Fruits du Démon — la course au trésor.',
    axes: [
      {
        attr: 'faction', label: 'Factions', icon: '⚖️',
        values: [
          { v: 'Pirate', l: 'Pirates' }, { v: 'Marine' }, { v: 'Gouvernement Mondial' },
          { v: 'Révolutionnaire', l: 'Révolutionnaires' }, { v: 'Civil', l: 'Civils' },
        ],
      },
      {
        attr: 'crew', label: 'Équipages', icon: '🏴‍☠️',
        values: [
          { v: 'L’équipage du Chapeau de Paille', l: 'Chapeau de Paille' },
          { v: 'L’équipage de Big Mom', l: 'Big Mom' },
          { v: 'L’équipage aux Cent Bêtes', l: 'Cent Bêtes (Kaido)' },
          { v: 'L’équipage de Barbe Blanche', l: 'Barbe Blanche' },
          { v: 'L’équipage de Don Quichotte', l: 'Don Quichotte' },
          { v: 'L’équipage des Pirates Roger', l: 'Pirates de Roger' },
        ],
      },
    ],
    piliers: ['grand-line', 'one-piece-tresor', 'thousand-sunny', 'chapeau-de-paille'],
  },
  {
    name: 'Dragon Ball',
    slug: 'dragon-ball',
    kanji: 'ドラゴンボール',
    tagline: 'Races guerrières, transformations et sagas — la quête des sept boules.',
    axes: [
      {
        attr: 'race', label: 'Races', icon: '🧬',
        values: [
          { v: 'Saiyan', l: 'Saiyans' }, { v: 'Human', l: 'Humains' }, { v: 'Namekian', l: 'Nameks' },
          { v: 'Android', l: 'Androïdes' }, { v: 'Majin' }, { v: 'Frieza Race', l: 'Race de Freezer' },
          { v: 'Angel', l: 'Anges' },
        ],
      },
      {
        attr: 'saga', label: 'Sagas', icon: '📖',
        values: [
          { v: 'Saga Saiyan' }, { v: 'Saga Namek' }, { v: 'Saga Cell' },
          { v: 'Saga Buu' }, { v: 'Saga Super' },
        ],
      },
    ],
    piliers: ['super-saiyan', 'ultra-instinct', 'dragon-balls', 'kamehameha'],
  },
  {
    name: 'Bleach',
    slug: 'bleach',
    kanji: 'ブリーチ',
    tagline: 'Shinigami, Hollows et zanpakutō — la guerre des âmes.',
    axes: [
      {
        attr: 'race', label: 'Races spirituelles', icon: '👻',
        values: [
          { v: 'Shinigami' }, { v: 'Hollow' }, { v: 'Arrancar' }, { v: 'Quincy' },
          { v: 'Humain', l: 'Humains' }, { v: 'Fullbringer' }, { v: 'Visored' },
        ],
      },
      {
        attr: 'division', label: 'Gotei 13', icon: '⚔️',
        values: [
          { v: '1ʳᵉ division' }, { v: '2ᵉ division' }, { v: '3ᵉ division' }, { v: '4ᵉ division' },
          { v: '5ᵉ division' }, { v: '6ᵉ division' }, { v: '7ᵉ division' }, { v: '8ᵉ division' },
          { v: '9ᵉ division' }, { v: '10ᵉ division' }, { v: '11ᵉ division' }, { v: '12ᵉ division' },
          { v: '13ᵉ division' },
        ],
      },
    ],
    piliers: ['soul-society', 'zanpakuto', 'gotei-13', 'hogyoku'],
  },
  {
    name: 'Hunter x Hunter',
    slug: 'hunter-x-hunter',
    kanji: 'ハンター',
    tagline: 'Nen, chasseurs et épreuves mortelles.',
    axes: [
      {
        attr: 'nen', label: 'Types de Nen', icon: '💠',
        values: [
          { v: 'Renforcement' }, { v: 'Émission' }, { v: 'Transformation' },
          { v: 'Matérialisation' }, { v: 'Manipulation' }, { v: 'Spécialisation' },
        ],
      },
    ],
    piliers: ['nen', 'brigade-fantome', 'association-hunters', 'zoldyck'],
  },
  {
    name: "JoJo's Bizarre Adventure",
    slug: 'jojo',
    kanji: 'ジョジョ',
    tagline: 'Une lignée, des Stands et un siècle de bizarrerie.',
    axes: [
      {
        attr: 'partie', label: 'Parties', icon: '🎭',
        values: [
          { v: 'Partie 1-2', l: '1-2 · Origines (Hamon)' },
          { v: 'Partie 3', l: '3 · Stardust Crusaders' },
          { v: 'Partie 4', l: '4 · Diamond is Unbreakable' },
          { v: 'Partie 5', l: '5 · Golden Wind' },
          { v: 'Partie 6', l: '6 · Stone Ocean' },
        ],
      },
    ],
    piliers: ['joestar', 'stand', 'masque-de-pierre', 'fleche-du-stand'],
  },
  {
    name: 'Initial D',
    slug: 'initial-d',
    kanji: 'イニシャルＤ',
    tagline: 'Cols, écuries et duels nocturnes — la légende du drift.',
    axes: [
      {
        attr: 'affiliation', label: 'Écuries', icon: '🏁',
        values: [
          { v: 'Project D' }, { v: 'Akagi RedSuns' }, { v: 'Myogi NightKids' },
          { v: 'Akina SpeedStars' }, { v: 'Impact Blue' }, { v: 'Team Emperor' },
        ],
      },
      {
        attr: 'col', label: 'Cols', icon: '⛰️',
        values: [
          { v: 'Mont Akina' }, { v: 'Mont Akagi' }, { v: 'Mont Myōgi' },
          { v: 'Col d’Usui' }, { v: 'Irohazaka' },
        ],
      },
    ],
    piliers: ['ae86-trueno', 'project-d', 'drift', 'mont-akina'],
  },
  {
    name: 'Death Note',
    slug: 'death-note',
    kanji: 'デスノート',
    tagline: 'Un cahier, deux génies, un duel à mort.',
    axes: [
      {
        attr: 'camp', label: 'Camps', icon: '♟️',
        values: [
          { v: 'Kira', l: 'Kira & alliés' }, { v: 'Cellule d’enquête', l: 'L & la cellule d’enquête' },
          { v: 'SPK' }, { v: 'Wammy’s House' }, { v: 'Yotsuba' }, { v: 'Shinigami' },
        ],
      },
    ],
    piliers: ['cahier-de-la-mort', 'kira', 'dieu-de-la-mort', 'spk'],
  },
];

const BY_SLUG = new Map(UNIVERSE_TAXONOMY.map((u) => [u.slug, u]));
const BY_NAME = new Map(UNIVERSE_TAXONOMY.map((u) => [u.name, u]));

export function taxonomyBySlug(slug: string): UniverseTaxonomy | undefined {
  return BY_SLUG.get(slug);
}
export function taxonomyByName(name: string): UniverseTaxonomy | undefined {
  return BY_NAME.get(name);
}
/** Slug du hub d'un univers (nom en base) — undefined si pas de hub (ex. Histoire / réel). */
export function universeHubSlug(name: string | null | undefined): string | undefined {
  return name ? BY_NAME.get(name)?.slug : undefined;
}

/** Clés d'attributs autorisées dans le filtre générique du registre (?attr=…&val=…).
 *  Garde-fou : on ne laisse pas sonder des clés JSONB arbitraires via l'URL. */
export const ALLOWED_FILTER_ATTRS: ReadonlySet<string> = new Set(
  UNIVERSE_TAXONOMY.flatMap((u) => u.axes.map((a) => a.attr)),
);

/** Libellé FR d'une valeur d'axe (retombe sur la valeur brute). */
export function axisValueLabel(universe: string, attr: string, value: string): string {
  const ax = BY_NAME.get(universe)?.axes.find((a) => a.attr === attr);
  return ax?.values.find((x) => x.v === value)?.l ?? value;
}
