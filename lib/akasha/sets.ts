// lib/akasha/sets.ts — SETS À COMPLÉTER (Refonte L5 « La boucle du collectionneur »).
// Un set = une liste FINIE et canon de slugs à collectionner (l'album les affiche en classeur
// Panini : possédée → carte, manquante → dos de carte « ??? »). Config pure, zéro requête ici.
// ⚠ Slugs = ceux du graphe (romanisation MAL pour les persos de masse, FR pour les curés).

export interface AkashaSet {
  id: string;
  title: string;
  icon: string;
  universe: string;
  /** Teinte du set (défaut : couleur d'univers). */
  tint?: string;
  slugs: string[];
}

export const AKASHA_SETS: AkashaSet[] = [
  // ── Naruto ──
  {
    id: 'equipe-7', title: 'Équipe 7', icon: '🍥', universe: 'Naruto',
    slugs: ['naruto-uzumaki', 'sasuke-uchiha', 'sakura-haruno', 'kakashi-hatake', 'sai', 'yamato'],
  },
  {
    id: 'sannin', title: 'Les Trois Sannin', icon: '🐸', universe: 'Naruto',
    slugs: ['jiraiya', 'tsunade', 'orochimaru'],
  },
  {
    id: 'akatsuki', title: 'Akatsuki', icon: '☁️', universe: 'Naruto',
    slugs: ['itachi-uchiha', 'kisame-hoshigaki', 'deidara', 'sasori', 'hidan', 'kakuzu', 'konan', 'nagato', 'obito-uchiha', 'black-zetsu'],
  },
  {
    id: 'hokage', title: 'Les Hokage', icon: '🏯', universe: 'Naruto',
    slugs: ['hashirama-senju', 'tobirama-senju', 'hiruzen-sarutobi', 'minato-namikaze', 'tsunade', 'kakashi-hatake', 'naruto-uzumaki'],
  },
  // ── One Piece ──
  {
    id: 'mugiwara', title: 'L’Équipage du Chapeau de Paille', icon: '👒', universe: 'One Piece',
    slugs: ['monkey-d-luffy', 'roronoa-zoro', 'nami', 'usopp', 'sanji', 'tony-tony-chopper', 'nico-robin', 'franky', 'brook', 'jinbe'],
  },
  {
    id: 'yonko', title: 'Les Empereurs', icon: '👑', universe: 'One Piece',
    slugs: ['shanks', 'barbe-blanche', 'kaidou', 'linlin-charlotte', 'teach-marshall-d'],
  },
  {
    id: 'supernovae', title: 'La Pire Génération', icon: '💀', universe: 'One Piece',
    slugs: ['monkey-d-luffy', 'roronoa-zoro', 'trafalgar-law', 'kid-eustass', 'killer', 'basil-hawkins', 'drake-x', 'apoo-scratchmen', 'bonney-jewelry', 'bege-capone', 'urouge'],
  },
  {
    id: 'admirals', title: 'Les Amiraux', icon: '⚓', universe: 'One Piece',
    slugs: ['sakazuki', 'borsalino', 'kuzan', 'isshou', 'aramaki'],
  },
  // ── Dragon Ball ──
  {
    id: 'guerriers-z', title: 'Les Guerriers Z', icon: '🐉', universe: 'Dragon Ball',
    slugs: ['son-goku', 'vegeta', 'son-gohan', 'piccolo', 'krillin', 'ten-shin-han', 'yamcha', 'trunks', 'son-goten', 'majin-buu'],
  },
  {
    id: 'freezer-force', title: 'L’Empire de Freezer', icon: '❄️', universe: 'Dragon Ball',
    slugs: ['freeza', 'zarbon', 'dodoria', 'ginyu', 'burter', 'jeice', 'recoome', 'guldo'],
  },
  {
    id: 'androides', title: 'Les Androïdes', icon: '🤖', universe: 'Dragon Ball',
    slugs: ['jinzouningen-16-gou', 'jinzouningen-17-gou', 'jinzouningen-18-gou', 'jinzouningen-19-gou', 'cell', 'dr-gero'],
  },
  // ── Bleach ──
  {
    id: 'gotei-capitaines', title: 'Capitaines du Gotei 13', icon: '⚔️', universe: 'Bleach',
    slugs: ['genryusai-yamamoto', 'soi-fon', 'gin-ichimaru', 'retsu-unohana', 'sosuke-aizen', 'byakuya-kuchiki', 'sajin-komamura', 'shunsui-kyoraku', 'kaname-tousen', 'toshiro-hitsugaya', 'kenpachi-zaraki', 'mayuri-kurotsuchi', 'jushiro-ukitake'],
  },
  {
    id: 'espada', title: 'L’Espada', icon: '🦴', universe: 'Bleach',
    slugs: ['coyote-starrk', 'baraggan-louisenbairn', 'tier-harribel', 'ulquiorra', 'nnoitra-gilga', 'grimmjow', 'zommari-leroux', 'szayel-aporro-grantz', 'aaroniero-arruruerie', 'yammy-llargo'],
  },
  {
    id: 'karakura', title: 'La bande de Karakura', icon: '🏫', universe: 'Bleach',
    slugs: ['ichigo-kurosaki', 'rukia-kuchiki', 'orihime-inoue', 'yasutora-sado', 'uryu-ishida', 'kisuke-urahara', 'yoruichi-shihoin'],
  },
  // ── Hunter x Hunter ──
  {
    id: 'hunter-heros', title: 'Les 4 de l’examen Hunter', icon: '🎣', universe: 'Hunter x Hunter',
    slugs: ['gon-freecss', 'killua-zoldyck', 'kurapika', 'leorio'],
  },
  {
    id: 'brigade-fantome', title: 'La Brigade Fantôme', icon: '🕷️', universe: 'Hunter x Hunter',
    slugs: ['chrollo-lucilfer', 'feitan', 'machi-komachine', 'nobunaga-hazama', 'phinks-magkav', 'shalnark-ryuseih', 'shizuku-murasaki', 'uvogin', 'franklin-bordeaux', 'pakunoda'],
  },
  // ── JoJo ──
  {
    id: 'joestar', title: 'La lignée Joestar', icon: 'ゴ', universe: "JoJo's Bizarre Adventure",
    slugs: ['jonathan-joestar', 'joseph-joestar', 'jotaro-kujo', 'josuke-higashikata', 'giorno-giovanna', 'jolyne-cujoh'],
  },
  {
    id: 'stardust-crusaders', title: 'Les Croisés de la Poussière d’Étoile', icon: '🌟', universe: "JoJo's Bizarre Adventure",
    slugs: ['jotaro-kujo', 'joseph-joestar', 'muhammad-avdol', 'noriaki-kakyoin', 'jean-pierre-polnareff', 'iggy'],
  },
  // ── Death Note ──
  {
    id: 'kira-enquete', title: 'L’affaire Kira', icon: '📓', universe: 'Death Note',
    slugs: ['light-yagami', 'l-lawliet', 'misa-amane', 'ryuk', 'rem', 'near', 'mello', 'soichiro-yagami'],
  },
  {
    id: 'task-force', title: 'La Task Force japonaise', icon: '🕵️', universe: 'Death Note',
    slugs: ['touta-matsuda', 'shuichi-aizawa', 'hirokazu-ukita', 'kanzo-mogi', 'hideki-ide'],
  },
  {
    id: 'shinigami', title: 'Les Shinigami', icon: '💀', universe: 'Death Note',
    slugs: ['ryuk', 'rem', 'armonia-justin-beyondormason', 'shidoh', 'jealous', 'gook'],
  },
  {
    id: 'wammys-house', title: 'Les héritiers de Wammy’s House', icon: '🏠', universe: 'Death Note',
    slugs: ['near', 'mello', 'mail-jeevas', 'roger-ruvie', 'watari'],
  },
  // ── Initial D ──
  {
    id: 'akina-speedstars', title: 'Les pilotes du Mont Akina', icon: '🏁', universe: 'Initial D',
    slugs: ['takumi-fujiwara', 'bunta-fujiwara', 'itsuki-takeuchi', 'koichiro-iketani', 'keisuke-takahashi', 'ryosuke-takahashi'],
  },
  {
    id: 'redsuns', title: 'Les RedSuns du Mont Akagi', icon: '🌅', universe: 'Initial D',
    slugs: ['keisuke-takahashi', 'kyoichi-sudo', 'takeshi-nakazato'],
  },
  {
    id: 'duo-fc-sud', title: 'Le duo du FC Sud', icon: '🌸', universe: 'Initial D',
    slugs: ['mako-sato', 'sayuki'],
  },
];
