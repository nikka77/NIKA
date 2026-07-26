// scripts/lib/akasha-roles.mjs — les RÔLES d'agents et leur adaptation par univers.
// Architecture à deux couches : la couche MODÈLE (expert d'univers, akasha-naruto…) ne change
// jamais ; un rôle est une spécialité (types d'entrées + angle rédactionnel) qui s'exécute SUR
// l'expert de l'univers. Le « nombre d'agents » d'un univers = les rôles pour lesquels il a des
// données (inventaire du 26/07 : 606 techniques, 54 artefacts, 12 lieux, 29 statuts/professions —
// aucun « organization » ni « arc » en base : ces rôles n'existeront que quand leurs données existeront).
export const ROLES = {
  fiche_technique: {
    nom: 'Archiviste des techniques',
    role: 'Rédige la fiche française des techniques (jutsu, transformations, attaques) depuis la page canon',
    types: ['power', 'skill'],
    angle: {
      'Naruto': 'un jutsu du monde shinobi — précise si l’article les donne : nature du chakra, rang, utilisateurs notables, effets et limites',
      'Dragon Ball': 'une technique de combat — précise si l’article les donne : créateur, utilisateurs notables, effets, apparitions marquantes',
      'Bleach': 'une capacité (kidō, zanpakutō, technique) — précise si l’article les donne : utilisateur, incantation, effets',
      default: 'une technique — fonctionnement, utilisateurs notables, moments marquants',
    },
  },
  fiche_artefact: {
    nom: 'Conservateur des artefacts',
    role: 'Rédige la fiche française des armes et objets notables depuis la page canon',
    types: ['artifact'],
    angle: {
      'One Piece': 'une arme ou un objet du monde de One Piece (sabre Meitō, arme, objet légendaire) — précise si l’article les donne : grade, porteurs successifs, histoire',
      'Naruto': 'un outil ou une arme ninja — précise si l’article les donne : usage, porteurs, origine',
      default: 'un objet notable — nature, possesseurs, rôle dans l’intrigue',
    },
  },
  fiche_lieu: {
    nom: 'Cartographe',
    role: 'Rédige la fiche française des lieux (villages, villes, mondes) depuis la page canon',
    types: ['place'],
    angle: {
      'Naruto': 'un lieu du monde shinobi (village caché, pays) — précise si l’article les donne : pays, dirigeant, clans ou forces qui y résident',
      'Bleach': 'un lieu de l’univers de Bleach (Soul Society, monde réel, Hueco Mundo) — précise si l’article les donne : qui y vit, son rôle dans l’intrigue',
      default: 'un lieu — géographie, habitants notables, rôle dans l’intrigue',
    },
  },
  // Les clans et organisations vivent sous le type `status` (constat du 26/07 : « Clan Uchiha »,
  // « Gotei 13 ») : ce rôle est donc AUSSI l'expert clans/organisations demandé par Dan.
  fiche_lexique: {
    nom: 'Lexicographe',
    role: 'Rédige rangs, statuts, clans et organisations depuis la page canon',
    types: ['profession', 'status'],
    angle: {
      'Naruto': 'un rang, un statut, un clan ou une organisation du monde shinobi (Hokage, jinchūriki, clan Uchiha, Akatsuki…) — précise si l’article les donne : nature, membres ou porteurs notables, rôle dans l’intrigue',
      'Bleach': 'un statut ou une organisation de l’univers de Bleach (Vizard, Gotei 13…) — précise si l’article les donne : définition, membres notables, rôle dans l’intrigue',
      default: 'un terme, un clan ou une organisation de l’univers — définition, membres notables, rôle dans l’intrigue',
    },
  },
};

/** Angle rédactionnel d'un rôle pour un univers donné. */
export const angleFor = (roleKey, universe) =>
  ROLES[roleKey]?.angle[universe] ?? ROLES[roleKey]?.angle.default;

/** Tous les types d'entrée couverts par un rôle. */
export const typesFor = (roleKey) => ROLES[roleKey]?.types ?? [];
