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
    // 08/08 : synchronisé sur lib/akasha/universe-taxonomy.ts après la curation des axes sales
    // (data/audits/curation-axes-sales.json) — l'axe `clan` est désormais 100% curé (45 valeurs).
    clan: ['Uchiha', 'Uzumaki', 'Senju', 'Hyūga', 'Nara', 'Akimichi', 'Yamanaka', 'Inuzuka', 'Ōtsutsuki',
      // ⚠ « Fūma » (générique) et « Fūma (Land of Sound) » sont DEUX clans canon distincts — ne jamais fusionner.
      'Funato', 'Kamizuru', 'Tsuchigumo', 'Fūma (Land of Sound)', 'Aburame', 'Kagetsu Family', 'Kazekage',
      'Sarutobi', 'Izuno', 'Kurama', 'Shirogane', 'Hōzuki', 'Iburi', 'Fūma', 'Shiin', 'Hoshigaki', 'Tenrō',
      'Yuki', 'Wagarashi Family', 'Kaguya', 'Wasabi Family', 'Chinoike', 'Amagiri', 'Lee', 'Ryū',
      'Karatachi Family', 'Yoimura', 'Rinha', 'Hatake', 'Onikuma', "Jūgo's", 'Yotsuki', 'Hirasaka',
      'Shimura', 'Kedōin', "Yota's"],
    rank: ['Academy Student', 'Genin', 'Chūnin', 'Tokubetsu Jōnin', 'Jōnin', 'Anbu', 'Kage'],
    // L20 (demande Dan) : dès que ~8 fiches porteront la même organisation, l'expert de
    // niche correspondant (« Expert Akatsuki ») naîtra tout seul au prochain scan.
    // 08/08 : complété aux 10 valeurs de lib/akasha/universe-taxonomy.ts (5 manquaient déjà avant
    // ce chantier — trouvé en resynchronisant le miroir) + « Nouveaux Sept Épéistes de la Brume »
    // (curation des axes sales). L'axe reste SALE dans son ensemble (voir DIRTY_AXES et l'audit) :
    // ce miroir ne fait que suivre la liste curée, il ne prétend pas que l'axe est propre.
    // 10/08 : l'axe a été SCINDÉ par nature (scripts/ops-scinder-axe-organization.mjs). Une escouade
    // n'est pas une institution : `equipe` et `division` sont deux clés à part entière, et les
    // agents doivent pouvoir les produire — sinon l'usine réécrirait tout dans `organization`.
    organization: [
      'Akagi Gang', 'Akatsuki', 'Analysis Team', 'Byakuya Gang', 'Communications Team', 'Douze Ninjas Gardiens',
      'Enlightened Ones', 'Fire Temple', 'Gatō Company', 'Ghost Army', "Haido's Knights", 'Hokage Guard Platoon',
      "Jako's Gang", 'Janin', 'Kara', 'Konoha Barrier Team', 'Konoha Council', 'Konoha Cryptanalysis Team',
      'Konoha Orphanage', 'Konoha Special Mission Platoon', 'Konoha Torture and Interrogation Force',
      'Kumo Barrier Team', 'Kumo Council', 'Kumo Spectators', 'Kurosuki Family', "Leaf's Anbu", 'Lightning Group',
      'Magaki Group', 'Moya Triad', 'Mujina Bandits', 'Nouveaux Sept Épéistes de la Brume',
      'Police militaire de Konoha', 'Root', 'Scientific Ninja Weapons Team', 'Sept Épéistes de la Brume',
      'Shinobazu', 'Sound Four', 'Suna Council', 'Wandering Ninja Clan', 'Watari Ninja'
    ],
    equipe: [
      'A–B Combo', 'Daimyō Protection Squad', 'Demon Brothers', "Dotō's Three-Man-Team",
      'Eight-Tails Subduing Team', 'Escort Unit', 'Exploding-Till-You-Eat', 'Four Celestial Symbols Men',
      'Four Ninja Animal Warriors', "Furido's 4-Man Team", 'Gang of Four', 'Gold and Silver Brothers',
      'Haze Quadruplets', "Hiruko's Team", 'Honoured Siblings', 'Infiltration and Reconnaissance Party',
      'Ino–Shika–Chō', 'Konoha 11', 'Legendary Stupid Brothers', 'Sealing Team', 'Shirogane Three', 'Team 10',
      'Team 15', 'Team 2', 'Team 25', 'Team 40', 'Team 5', 'Team 7', 'Team 8', 'Team Ajisai', 'Team Ameno',
      'Team Bandō', 'Team Chōza', 'Team Dosu', 'Team Ebisu', 'Team Fū', 'Team Ganryū', 'Team Goji', 'Team Guren',
      'Team Hiruzen', 'Team Jiraiya', 'Team Kabuto', 'Team Kajika', 'Team Kakashi', 'Team Kazami', 'Team Komugi',
      'Team Matsuri', 'Team Minato', 'Team Oboro', 'Team Orochimaru', 'Team Ro', 'Team Sajin', 'Team Samui',
      'Team Saya', 'Team Shibire', 'Team Shigure', 'Team Shinki', 'Team Shira', 'Team Suien', 'Team Tobirama',
      'Team Yurui', 'Three Brothers', 'Three Ryūdōin Brothers', 'Three Sand Siblings', 'Three Senka Brothers',
      'Two Great Sage Toads'
    ],
    division: [
      'Allied Mothers Force', 'Corps médical', 'Counter-Terrorism Division', 'Cypher Division', 'Explosion Corps',
      'Fifth Division', 'First Division', 'Force Shinobi Alliée', 'Fourth Division',
      'Impure World Reincarnation Allied Forces', 'Intelligence Division',
      'Logistical Support and Medical Division', 'Second Division', 'Sensor Division', 'Surprise Attack Division',
      'Surprise Attack and Diversion Platoon', 'Third Division', 'Twenty Platoons'
    ],
  },
  'One Piece': {
    faction: ['Pirate', 'Marine', 'Gouvernement Mondial', 'Révolutionnaire', 'Civil'],
    // 08/08 : synchronisé sur lib/akasha/universe-taxonomy.ts après la curation des axes sales
    // (data/audits/curation-axes-sales.json) — « L’équipage des Maquereaux » retiré (mistraduction,
    // scindé en Macro / Pirates du Soleil), 22 valeurs ajoutées, l'axe passe à 76,3% curé
    // (273 fiches sur 358 — chiffre remesuré le 09/08, le 76,8 % d'origine était une coquille).
    crew: ['L’équipage du Chapeau de Paille', 'L’équipage de Big Mom', 'L’équipage aux Cent Bêtes',
      'L’équipage de Barbe Blanche', 'L’équipage de Don Quichotte', 'L’équipage du Heart', 'L’équipage des Pirates Roger',
      'L’équipage de Barbe Noire', 'L’équipage du Roux', 'L’équipage du Lion d’Or', 'L’équipage de Krieg',
      'L’équipage de Thriller Bark', 'L’équipage des Pirates Kuja', 'Faux équipage du Chapeau de Paille',
      'L’équipage des Nouveaux Hommes-Poissons', 'L’équipage du Fire Tank', 'L’équipage de Kid',
      'L’équipage de Foxy', 'L’équipage du Chat Noir', 'L’équipage d’Arlong', 'L’équipage du Bluejam',
      'L’équipage des Pirates du Soleil', 'L’équipage de Caribou', 'L’équipage des Pirates Volants',
      'L’équipage des Pirates Rocks', 'L’équipage des Moines Dépravés', 'L’équipage de Buggy',
      'L’équipage du Rumbar', 'L’équipage de Macro'],
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
