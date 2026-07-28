// scripts/lib/akasha-axes.mjs — axes de taxonomie par univers, en JS pour les agents.
// ⚠ MIROIR de lib/akasha/universe-taxonomy.ts (source de vérité côté site) : si tu ajoutes une
// valeur là-bas, reporte-la ici — les agents ne peuvent produire QUE ces valeurs (enum JSON Schema).
export const UNIVERSE_SLUG = {
  'Naruto': 'naruto',
  'One Piece': 'one-piece',
  'Dragon Ball': 'dragon-ball',
  'Bleach': 'bleach',
  'Hunter x Hunter': 'hunter-x-hunter',
  "JoJo's Bizarre Adventure": 'jojo',
  'Death Note': 'death-note',
  'Initial D': 'initial-d',
};

/** expert Ollama correspondant à un univers (fallback : modèle générique) */
export const expertFor = (universe) =>
  UNIVERSE_SLUG[universe] ? `ollama/akasha-${UNIVERSE_SLUG[universe]}` : 'ollama/gemma4:12b';

/** axes renseignables par les agents, par univers */
export const AXES = {
  'Naruto': {
    village: ['Konohagakure', 'Sunagakure', 'Kirigakure', 'Kumogakure', 'Iwagakure', 'Amegakure', 'Otogakure'],
    clan: ['Uchiha', 'Uzumaki', 'Senju', 'Hyūga', 'Nara', 'Akimichi', 'Yamanaka', 'Inuzuka', 'Ōtsutsuki'],
    rank: ['Academy Student', 'Genin', 'Chūnin', 'Tokubetsu Jōnin', 'Jōnin', 'Anbu', 'Kage'],
    // L20 (demande Dan) : dès que ~8 fiches porteront la même organisation, l'expert de
    // niche correspondant (« Expert Akatsuki ») naîtra tout seul au prochain scan.
    organization: ['Akatsuki', 'Taka', 'Kara', 'Root'],
  },
  'One Piece': {
    faction: ['Pirate', 'Marine', 'Gouvernement Mondial', 'Révolutionnaire', 'Civil'],
    crew: ['L’équipage du Chapeau de Paille', 'L’équipage de Big Mom', 'L’équipage aux Cent Bêtes',
      'L’équipage de Barbe Blanche', 'L’équipage de Don Quichotte', 'L’équipage du Heart', 'L’équipage des Pirates Roger'],
    fruit_type: ['Paramecia', 'Logia', 'Zoan', 'Zoan Antique', 'Zoan Mythique', 'Smile'],
  },
  'Dragon Ball': {
    race: ['Saiyan', 'Human', 'Namekian', 'Android', 'Majin', 'Frieza Race', 'Angel'],
    saga: ['Saga Saiyan', 'Saga Namek', 'Saga Cell', 'Saga Buu', 'Saga Super'],
  },
  'Bleach': {
    race: ['Shinigami', 'Hollow', 'Arrancar', 'Quincy', 'Humain', 'Fullbringer', 'Visored'],
    division: ['1ʳᵉ division', '2ᵉ division', '3ᵉ division', '4ᵉ division', '5ᵉ division', '6ᵉ division',
      '7ᵉ division', '8ᵉ division', '9ᵉ division', '10ᵉ division', '11ᵉ division', '12ᵉ division', '13ᵉ division'],
  },
  'Hunter x Hunter': {
    nen: ['Renforcement', 'Émission', 'Transformation', 'Matérialisation', 'Manipulation', 'Spécialisation'],
  },
  "JoJo's Bizarre Adventure": {
    partie: ['Partie 1-2', 'Partie 3', 'Partie 4', 'Partie 5', 'Partie 6', 'Partie 7', 'Partie 8'],
  },
  'Death Note': {
    camp: ['Kira', 'Cellule d’enquête', 'SPK', 'Wammy’s House', 'Yotsuba', 'Shinigami'],
  },
  'Initial D': {
    affiliation: ['Project D', 'Akagi RedSuns', 'Myogi NightKids', 'Akina SpeedStars', 'Impact Blue', 'Team Emperor'],
    col: ['Mont Akina', 'Mont Akagi', 'Mont Myōgi', 'Col d’Usui', 'Irohazaka'],
  },
};

/**
 * JSON Schema d'extraction d'attributs ('inconnu' = la source ne le dit pas).
 * Chaque axe exige une PREUVE : la citation de l'article qui justifie la valeur.
 * Sans ça (test du 25/07), le modèle attrape le terme le plus saillant de l'article
 * plutôt que le fait qui concerne l'entité — « L » (Death Note) devenait camp=Shinigami
 * parce que son article parle sans cesse des Shinigami. La preuve force l'ancrage
 * et donne au relecteur de quoi vérifier en un coup d'œil.
 */
export function axesSchema(universe) {
  const axes = AXES[universe];
  if (!axes) return null;
  const properties = {};
  const required = [];
  for (const [attr, values] of Object.entries(axes)) {
    properties[attr] = { type: 'string', enum: [...values, 'inconnu'] };
    properties[`${attr}_preuve`] = { type: 'string' };
    required.push(attr, `${attr}_preuve`);
  }
  return { type: 'object', properties, required, additionalProperties: false };
}

/**
 * Traces lexicales attendues dans la preuve pour chaque valeur (FR ↔ EN : les articles sont en anglais).
 * Sert au contrôle de cohérence : une preuve qui ne contient aucune de ces traces n'établit PAS la valeur.
 * Découvert le 25/07 : « L » (Death Note) classé camp=Shinigami avec une preuve qui dit « detective ».
 */
const TRACES = {
  'L’équipage du Chapeau de Paille': ['straw hat'],
  'L’équipage de Big Mom': ['big mom', 'charlotte'],
  'L’équipage aux Cent Bêtes': ['beasts pirates', 'kaidou', 'kaido'],
  'L’équipage de Barbe Blanche': ['whitebeard'],
  'L’équipage de Don Quichotte': ['donquixote'],
  'L’équipage du Heart': ['heart pirates'],
  'L’équipage des Pirates Roger': ['roger pirates'],
  'Gouvernement Mondial': ['world government'],
  'Révolutionnaire': ['revolutionary'],
  Civil: ['civilian'],
  Humain: ['human'],
  'Cellule d’enquête': ['detective', 'investigation', 'task force', 'police'],
  'Wammy’s House': ['wammy'],
  Human: ['human'],
  Namekian: ['namek'],
  Android: ['android', 'artificial human'],
  'Frieza Race': ['frieza', 'freeza'],
  Angel: ['angel'],
  'Academy Student': ['academy'],
  Kage: ['kage', 'hokage', 'kazekage', 'mizukage', 'raikage', 'tsuchikage'],
  // Le TYPE de fruit n'est presque jamais dans la même phrase que le fruit lui-même :
  // on se contente de la preuve qu'un fruit existe, le type reste à l'appréciation du relecteur.
  Paramecia: ['paramecia', 'no mi', 'devil fruit'],
  Logia: ['logia', 'no mi', 'devil fruit'],
  Zoan: ['zoan', 'no mi', 'devil fruit'],
  'Zoan Antique': ['ancient zoan', 'no mi', 'devil fruit'],
  'Zoan Mythique': ['mythical zoan', 'no mi', 'devil fruit'],
  Smile: ['smile', 'artificial'],
};

/**
 * Terme ANGLAIS d'une valeur de taxonomie, pour interroger une source anglophone.
 * Les articles Fandom sont en anglais : demander « L'équipage du Chapeau de Paille » à un
 * vérificateur qui lit « Straw Hat Pirates » produit un faux négatif (mesuré le 25/07 :
 * tous les Chapeaux de Paille notés 0,02-0,09 alors qu'ils sont exacts).
 */
export function termeAnglais(valeur) {
  const t = TRACES[valeur];
  return t?.length ? t[0].replace(/\b\w/g, (c) => c.toUpperCase()) : valeur;
}

/** Mots significatifs d'une valeur d'enum (fallback quand aucune trace n'est déclarée). */
const valueWords = (v) =>
  v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter((w) => w.length > 3 && !['equipage', 'division', 'saga', 'partie', 'mont'].includes(w));

/**
 * Contrôle de cohérence valeur ↔ preuve, en code (aucun appel modèle).
 * @returns {string[]} messages pour les attributs dont la preuve n'étaye pas la valeur.
 */
export function checkPreuves(result) {
  const { valeurs, preuves } = splitPreuves(result);
  const suspects = [];
  for (const [attr, v] of Object.entries(valeurs)) {
    if (!v || v === 'inconnu') continue;
    const p = (preuves[attr] ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    if (!p || p === 'aucune') { suspects.push(`${attr} : valeur « ${v} » sans preuve`); continue; }
    const traces = TRACES[v] ?? valueWords(v);
    if (traces.length && !traces.some((t) => p.includes(t)))
      suspects.push(`${attr} : la preuve n'étaye pas « ${v} »`);
  }
  return suspects;
}

/** Sépare valeurs et preuves d'un résultat d'extraction. */
export function splitPreuves(result) {
  const valeurs = {}, preuves = {};
  for (const [k, v] of Object.entries(result ?? {})) {
    if (k.endsWith('_preuve')) preuves[k.slice(0, -7)] = v;
    else valeurs[k] = v;
  }
  return { valeurs, preuves };
}
