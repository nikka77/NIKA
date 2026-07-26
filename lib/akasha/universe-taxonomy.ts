// lib/akasha/universe-taxonomy.ts — la TAXONOMIE CANON de chaque univers AKASHA.
// Chaque univers est organisé selon SA logique (villages Naruto, équipages OP, divisions
// Bleach, parties JoJo…) : les hubs `/learn/akasha/u/[slug]` et les filtres du registre
// se génèrent depuis cette config — ajouter un axe = quelques lignes ici, zéro composant.

export interface AxisValue {
  /** Valeur BRUTE stockée dans attributes (eq strict côté PostgREST). */
  v: string;
  /** Libellé FR affiché (défaut : la valeur brute). */
  l?: string;
  /** Teinte hex propre à la valeur (chip colorée : bleu Konoha, rouge Suna…). Défaut = couleur d'univers. */
  tint?: string;
  /** Emoji/badge préfixant le libellé de la chip. */
  badge?: string;
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
  /** Pages spéciales de l'univers (ex. Most Wanted OP), affichées en CTA sur le hub. */
  extras?: { href: string; label: string; icon: string }[];
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
          { v: 'Konohagakure', l: 'Konoha', tint: '#3FA35C', badge: '🍃' },
          { v: 'Sunagakure', l: 'Suna', tint: '#E0A83A', badge: '🏜️' },
          { v: 'Kirigakure', l: 'Kiri', tint: '#5A88B0', badge: '🌊' },
          { v: 'Kumogakure', l: 'Kumo', tint: '#8A8F98', badge: '⚡' },
          { v: 'Iwagakure', l: 'Iwa', tint: '#B07A3A', badge: '🪨' },
          { v: 'Amegakure', l: 'Ame', tint: '#5C6B8A', badge: '🌧️' },
          { v: 'Otogakure', l: 'Oto', tint: '#8E44AD', badge: '🎵' },
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
          { v: 'L’équipage du Heart', l: 'Heart (Law)' },
          { v: 'L’équipage des Pirates Roger', l: 'Pirates de Roger' },
        ],
      },
      {
        attr: 'fruit_type', label: 'Types de Fruit du Démon', icon: '🍎',
        values: [
          { v: 'Paramecia', tint: '#C0455E', badge: '🌀' },
          { v: 'Logia', tint: '#E0762A', badge: '🔥' },
          { v: 'Zoan', tint: '#6B8E3D', badge: '🐾' },
          { v: 'Zoan Antique', l: 'Zoan Antique', tint: '#8A6D3B', badge: '🦕' },
          { v: 'Zoan Mythique', l: 'Zoan Mythique', tint: '#B8912F', badge: '🐉' },
          { v: 'Smile', l: 'SMILE (artificiel)', tint: '#8E7CC3', badge: '😀' },
        ],
      },
      {
        attr: 'meito_grade', label: 'Grades de sabre (Meito)', icon: '⚔️',
        values: [
          { v: 'Saijo Ô Wazamono', l: 'Saijō Ō Wazamono (12 Suprêmes)', tint: '#C9A227', badge: '👑' },
          { v: 'Ô Wazamono', l: 'Ō Wazamono (21 Grandes)', tint: '#9AA0A6', badge: '🥈' },
          { v: 'Ryo Wazamono', l: 'Ryō Wazamono (50 Bonnes)', tint: '#8A6D3B', badge: '🥉' },
        ],
      },
    ],
    piliers: ['grand-line', 'one-piece-tresor', 'thousand-sunny', 'chapeau-de-paille'],
    extras: [{ href: '/learn/akasha/wanted', label: 'Most Wanted — le classement des primes', icon: '🏴‍☠️' }],
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
          { v: 'Partie 7', l: '7 · Steel Ball Run' },
          { v: 'Partie 8', l: '8 · JoJolion' },
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

// ─── Identité visuelle du hub (dégradé signature, motif de fond canon, rangs de collectionneur) ───
export interface HubVisual {
  /** Dégradé bi-teinte du hero (2-3 stops CSS). */
  heroGradient: string;
  /** Motif SVG de fond (data-URI) évoquant l'univers — teinté à faible opacité derrière le hero. */
  bgPattern: string;
  /** Signature bespoke rendue par le hub (composant dédié). */
  signature?: 'villages' | 'bounties' | 'powerscale' | 'gotei' | 'nen' | 'jojo' | 'passes' | 'kiraduel';
  /** Carte-monde plein cadre montée EN TÊTE du hub (lot 3a — plus de if slug === dans la page). */
  map?: 'op-world' | 'db-cosmos';
  /** Rangs de collectionneur (du plus bas au plus haut) déblocables selon le % de complétion. */
  ranks: string[];
}

// Petit motif SVG répétable encodé data-URI (currentColor via une couleur passée à la volée dans le hub).
const svg = (inner: string, size = 60) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>${inner}</svg>`)}")`;

export const HUB_VISUAL: Record<string, HubVisual> = {
  naruto: {
    heroGradient: 'linear-gradient(160deg, #2A1206 0%, #E8623A22 42%, var(--bg) 100%)',
    bgPattern: svg("<circle cx='30' cy='30' r='10' fill='none' stroke='%23E8623A' stroke-width='2'/><circle cx='30' cy='30' r='2.5' fill='%23E8623A'/><circle cx='30' cy='16' r='2' fill='%23E8623A'/>"),
    signature: 'villages',
    ranks: ['Académie', 'Genin', 'Chūnin', 'Jōnin', 'Anbu', 'Kage'],
  },
  'one-piece': {
    heroGradient: 'linear-gradient(160deg, #06182E 0%, #D63C3C22 45%, var(--bg) 100%)',
    bgPattern: svg("<path d='M0 40 q15 -12 30 0 t30 0' fill='none' stroke='%23D63C3C' stroke-width='2'/><path d='M0 52 q15 -12 30 0 t30 0' fill='none' stroke='%23D63C3C' stroke-width='1.5'/>"),
    signature: 'bounties',
    map: 'op-world',
    ranks: ['Mousse', 'Pirate', 'Supernova', 'Corsaire', 'Yonko', 'Roi des Pirates'],
  },
  'dragon-ball': {
    heroGradient: 'linear-gradient(160deg, #2A1C02 0%, #F2A93B22 42%, var(--bg) 100%)',
    bgPattern: svg("<circle cx='30' cy='30' r='13' fill='none' stroke='%23F2A93B' stroke-width='2'/><path d='M30 22 l2.4 4.9 5.4 .8-3.9 3.8 .9 5.4-4.8-2.5-4.8 2.5 .9-5.4-3.9-3.8 5.4-.8z' fill='%23F2A93B'/>"),
    signature: 'powerscale',
    map: 'db-cosmos',
    ranks: ['Terrien', 'Combattant', 'Guerrier Z', 'Super Saiyan', 'Dieu', 'Ultra Instinct'],
  },
  bleach: {
    heroGradient: 'linear-gradient(160deg, #0A1420 0%, #5A88B022 45%, var(--bg) 100%)',
    bgPattern: svg("<path d='M30 8 L38 30 L30 52 L22 30 Z' fill='none' stroke='%235A88B0' stroke-width='1.6'/>"),
    signature: 'gotei',
    ranks: ['Âme errante', 'Recrue', 'Siège', 'Lieutenant', 'Capitaine', 'Capitaine-Commandant'],
  },
  'hunter-x-hunter': {
    heroGradient: 'linear-gradient(160deg, #06220F 0%, #3FA35C22 45%, var(--bg) 100%)',
    bgPattern: svg("<polygon points='30,10 47,20 47,40 30,50 13,40 13,20' fill='none' stroke='%233FA35C' stroke-width='1.6'/>"),
    signature: 'nen',
    ranks: ['Novice', 'Apprenti Nen', 'Hunter', 'Nen-utilisateur', 'Maître', 'Zodiaque'],
  },
  jojo: {
    heroGradient: 'linear-gradient(160deg, #1A0A2A 0%, #8E44AD22 45%, var(--bg) 100%)',
    bgPattern: svg("<circle cx='18' cy='18' r='5' fill='%238E44AD'/><circle cx='42' cy='42' r='5' fill='%238E44AD'/><circle cx='42' cy='18' r='3' fill='%238E44AD'/><circle cx='18' cy='42' r='3' fill='%238E44AD'/>"),
    signature: 'jojo',
    ranks: ['Passant', 'Utilisateur', 'JoBro', 'Stand User', 'Requiem', 'Joestar'],
  },
  'initial-d': {
    heroGradient: 'linear-gradient(160deg, #061826 0%, #0094D422 45%, var(--bg) 100%)',
    bgPattern: svg("<path d='M8 40 L52 20 M8 48 L52 28' stroke='%230094D4' stroke-width='2' stroke-dasharray='6 5'/>"),
    signature: 'passes',
    ranks: ['Débutant', 'Amateur', 'Pilote de col', 'As local', 'Légende', 'Fantôme d’Akina'],
  },
  'death-note': {
    heroGradient: 'linear-gradient(160deg, #14141A 0%, #8A8F9822 45%, var(--bg) 100%)',
    bgPattern: svg("<path d='M0 15 H60 M0 30 H60 M0 45 H60' stroke='%238A8F98' stroke-width='1'/><path d='M14 0 V60' stroke='%23D63C3C' stroke-width='1'/>"),
    signature: 'kiraduel',
    ranks: ['Civil', 'Suspect', 'Enquêteur', 'Détective', 'L', 'Dieu du Nouveau Monde'],
  },
};

export function hubVisual(slug: string): HubVisual | undefined {
  return HUB_VISUAL[slug];
}

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

/** Libellé FR d'un AXE (« village » → « Villages ») — FilterBar, breadcrumb (retombe sur l'attr brut). */
export function axisLabel(universe: string, attr: string): string | null {
  return BY_NAME.get(universe)?.axes.find((a) => a.attr === attr)?.label ?? null;
}
