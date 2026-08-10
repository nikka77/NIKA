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
  /** Genre grammatical du LIBELLÉ, pour les phrases générées (« Tous les villages » / « Toutes
   *  les organisations »). Déclaré plutôt que deviné : une heuristique sur la terminaison se
   *  trompait dans les deux sens le 08/08 — « Tous les races », « Toutes les villages ». Le
   *  français ne se déduit pas d'un suffixe, et un champ oublié se voit à la relecture alors
   *  qu'une règle fausse passe inaperçue. Défaut : masculin. */
  genre?: 'm' | 'f';
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
          // 08/08 (LOT 3d) : 8e valeur, oubliée du curatif initial. Fiche `takigakure` déjà en
          // base (type place), 1 personnage porte déjà l'attribut (Kakuzu) — mesuré avant d'agir
          // (data/audits/lot3d-corrections-trace.json). Pas de typo « Konohagure » trouvée nulle
          // part dans le corpus (slug, nom, ni valeur d'attribut village) : ce volet était déjà sain.
          { v: 'Takigakure', l: 'Taki', tint: '#3F8E7A', badge: '💧' },
        ],
      },
      {
        attr: 'clan', label: 'Clans', icon: '⛩️',
        values: [
          { v: 'Uchiha' }, { v: 'Uzumaki' }, { v: 'Senju' }, { v: 'Hyūga' }, { v: 'Nara' },
          { v: 'Akimichi' }, { v: 'Yamanaka' }, { v: 'Inuzuka' }, { v: 'Ōtsutsuki' },
          // 08/08 — CURATION DES AXES SALES : 36 clans canon promus depuis le masquage LOT 3b,
          // chacun vérifié contre naruto.fandom.com (data/audits/curation-axes-sales.json). L'axe
          // est désormais 100% curé (45/45 valeurs distinctes, 228/228 fiches) → retiré de
          // DIRTY_AXES plus bas.
          { v: 'Funato' }, { v: 'Kamizuru' }, { v: 'Tsuchigumo' }, { v: 'Fūma (Land of Sound)' },
          { v: 'Aburame' }, { v: 'Kagetsu Family' }, { v: 'Kazekage' }, { v: 'Sarutobi' },
          { v: 'Izuno' }, { v: 'Kurama' }, { v: 'Shirogane' }, { v: 'Hōzuki' }, { v: 'Iburi' },
          { v: 'Fūma' }, { v: 'Shiin' }, { v: 'Hoshigaki' }, { v: 'Tenrō' }, { v: 'Yuki' },
          { v: 'Wagarashi Family' }, { v: 'Kaguya' }, { v: 'Wasabi Family' }, { v: 'Chinoike' },
          { v: 'Amagiri' }, { v: 'Lee', l: 'Clan Lee' }, { v: 'Ryū', l: 'Clan Ryū' },
          { v: 'Karatachi Family' }, { v: 'Yoimura' }, { v: 'Rinha' }, { v: 'Hatake' },
          { v: 'Onikuma' }, { v: "Jūgo's", l: 'Clan de Jūgo' }, { v: 'Yotsuki' },
          { v: 'Hirasaka' }, { v: 'Shimura' }, { v: 'Kedōin' }, { v: "Yota's", l: 'Clan de Yota' },
        ],
      },
      {
        // Valeurs alignées sur scripts/lib/akasha-axes.mjs (vocabulaire des agents : Root, pas
        // « Racine (Anbu) »).
        // AXE PROPRE DEPUIS LE 10/08/2026. Il portait 124 valeurs et restait masqué : une seule clé
        // y rangeait trois natures étrangères — l'Akatsuki (38 fiches) et « Team 40 » (3 fiches) ne
        // répondent pas à la même question. Les escouades sont parties dans `equipe`, les unités de
        // la Quatrième Guerre dans `division` (scripts/ops-scinder-axe-organization.mjs, trace :
        // data/audits/scission-organization-trace.json — 250 fiches déplacées, aucune supprimée).
        // Ne restent ici que des organisations au sens propre : permanentes, on y adhère.
        attr: 'organization', label: 'Organisations', genre: 'f', icon: '☁️',
        values: [
          { v: 'Akatsuki', tint: '#C0392B', badge: '☁️' },
          { v: 'Taka', tint: '#6E5A8E', badge: '🦅' },
          { v: 'Kara', tint: '#7A8394', badge: '⚙️' },
          { v: 'Root', l: 'Racine', tint: '#5B6D5B', badge: '🌱' },
          { v: 'Sound Four', l: 'Quatuor du Son', tint: '#8E44AD', badge: '🎵' },
          { v: 'Sept Épéistes de la Brume', tint: '#5A88B0', badge: '🗡️' },
          { v: 'Nouveaux Sept Épéistes de la Brume', tint: '#5A88B0', badge: '🗡️' },
          { v: 'Douze Ninjas Gardiens', tint: '#B8912F', badge: '🛡️' },
          { v: 'Police militaire de Konoha', l: 'Police de Konoha', tint: '#4A5A7A', badge: '🚔' },
          { v: "Akagi Gang" },
          { v: "Analysis Team" },
          { v: "Byakuya Gang" },
          { v: "Communications Team" },
          { v: "Enlightened Ones" },
          { v: "Fire Temple" },
          { v: "Gatō Company" },
          { v: "Ghost Army" },
          { v: "Haido's Knights" },
          { v: "Hokage Guard Platoon" },
          { v: "Jako's Gang" },
          { v: "Janin" },
          { v: "Konoha Barrier Team" },
          { v: "Konoha Council" },
          { v: "Konoha Cryptanalysis Team" },
          { v: "Konoha Orphanage" },
          { v: "Konoha Special Mission Platoon" },
          { v: "Konoha Torture and Interrogation Force" },
          { v: "Kumo Barrier Team" },
          { v: "Kumo Council" },
          { v: "Kumo Spectators" },
          { v: "Kurosuki Family" },
          { v: "Leaf's Anbu" },
          { v: "Lightning Group" },
          { v: "Magaki Group" },
          { v: "Moya Triad" },
          { v: "Mujina Bandits" },
          { v: "Scientific Ninja Weapons Team" },
          { v: "Shinobazu" },
          { v: "Suna Council" },
          { v: "Wandering Ninja Clan" },
          { v: "Watari Ninja" },
        ],
      },
      {
        // ÉQUIPES (10/08/2026) — sorties de `organization` : une escouade de trois genin sous un
        // chef n'est pas une institution, et 73 d'entre elles noyaient l'Akatsuki dans le même rail.
        attr: 'equipe', label: 'Équipes', genre: 'f', icon: '🤝',
        values: [
          { v: "A–B Combo" },
          { v: "Daimyō Protection Squad" },
          { v: "Demon Brothers" },
          { v: "Dotō's Three-Man-Team" },
          { v: "Eight-Tails Subduing Team" },
          { v: "Escort Unit" },
          { v: "Exploding-Till-You-Eat" },
          { v: "Four Celestial Symbols Men" },
          { v: "Four Ninja Animal Warriors" },
          { v: "Furido's 4-Man Team" },
          { v: "Gang of Four" },
          { v: "Gold and Silver Brothers" },
          { v: "Haze Quadruplets" },
          { v: "Hiruko's Team" },
          { v: "Honoured Siblings" },
          { v: "Infiltration and Reconnaissance Party" },
          { v: "Ino–Shika–Chō" },
          { v: "Legendary Stupid Brothers" },
          { v: "Sealing Team" },
          { v: "Shirogane Three" },
          { v: "Team 10" },
          { v: "Team 15" },
          { v: "Team 2" },
          { v: "Team 25" },
          { v: "Team 40" },
          { v: "Team 5" },
          { v: "Team 7" },
          { v: "Team 8" },
          { v: "Team Ajisai" },
          { v: "Team Ameno" },
          { v: "Team Bandō" },
          { v: "Team Chōza" },
          { v: "Team Dosu" },
          { v: "Team Ebisu" },
          { v: "Team Fū" },
          { v: "Team Ganryū" },
          { v: "Team Goji" },
          { v: "Team Guren" },
          { v: "Team Hiruzen" },
          { v: "Team Jiraiya" },
          { v: "Team Kabuto" },
          { v: "Team Kajika" },
          { v: "Team Kakashi" },
          { v: "Team Kazami" },
          { v: "Team Komugi" },
          { v: "Team Matsuri" },
          { v: "Team Minato" },
          { v: "Team Oboro" },
          { v: "Team Orochimaru" },
          { v: "Team Ro" },
          { v: "Team Sajin" },
          { v: "Team Samui" },
          { v: "Team Saya" },
          { v: "Team Shibire" },
          { v: "Team Shigure" },
          { v: "Team Shinki" },
          { v: "Team Shira" },
          { v: "Team Suien" },
          { v: "Team Tobirama" },
          { v: "Team Yurui" },
          { v: "Three Brothers" },
          { v: "Three Ryūdōin Brothers" },
          { v: "Three Sand Siblings" },
          { v: "Three Senka Brothers" },
          { v: "Two Great Sage Toads" },
        ],
      },
      {
        // DIVISIONS DE LA QUATRIÈME GUERRE (10/08/2026) — elles n'existent que pendant le conflit
        // et mêlent tous les villages : c'est ce qui les distingue d'un corps permanent, pas leur
        // taille. Homonymie assumée avec l'axe `division` de Bleach : les axes sont par univers.
        attr: 'division', label: 'Divisions de la Guerre', genre: 'f', icon: '⚔️',
        values: [
          { v: "Allied Mothers Force" },
          { v: "Corps médical" },
          { v: "Counter-Terrorism Division" },
          { v: "Cypher Division" },
          { v: "Explosion Corps" },
          { v: "Fifth Division" },
          { v: "First Division" },
          { v: "Force Shinobi Alliée" },
          { v: "Fourth Division" },
          { v: "Impure World Reincarnation Allied Forces" },
          { v: "Intelligence Division" },
          { v: "Logistical Support and Medical Division" },
          { v: "Second Division" },
          { v: "Sensor Division" },
          { v: "Surprise Attack Division" },
          { v: "Surprise Attack and Diversion Platoon" },
          { v: "Third Division" },
          { v: "Twenty Platoons" },
        ],
      },
      {
        attr: 'rank', label: 'Rangs ninja', icon: '🎖️',
        values: [
          { v: 'Academy Student', l: 'Élève de l’Académie' }, { v: 'Genin' }, { v: 'Chūnin' },
          { v: 'Tokubetsu Jōnin', l: 'Jōnin spécial' }, { v: 'Jōnin' },
          // 10/08 — CHANTIER 4 (valeurs hors liste) : grade CANON qui manquait, pas du bruit.
          // « Head Ninja (忍頭 Shinobigashira) is a position in the shinobi system of Kumogakure.
          //   It is a rank between jōnin and Kage, and unique to its own village. »
          // https://naruto.fandom.com/wiki/Head_Ninja — Category:Ninja Ranks. D'où sa place ICI,
          // entre Jōnin et Kage : l'ordre vient de la phrase source, pas d'un choix d'affichage.
          // La surface bespoke /u/naruto/rangs continue de le tenir hors de son échelle, et c'est
          // juste : elle rend la voie de promotion de KONOHA, or ce grade est propre à Kumo.
          { v: 'Head Ninja', l: 'Chef des ninjas (Kumo)' },
          { v: 'Anbu' }, { v: 'Kage' },
        ],
      },
      {
        attr: 'generation', label: 'Générations', genre: 'f', icon: '🧬',
        values: [
          { v: 'Fondateurs' }, { v: 'Sannin' }, { v: 'Génération de Kakashi' },
          { v: 'Konoha 11', tint: '#3FA35C', badge: '🍃' }, { v: 'Nouvelle ère' },
        ],
      },
    ],
    // NB : le pilier du clan Uchiha est la fiche `uchiha` (« Clan Uchiha ») — `clan-uchiha` n'existe pas en base.
    piliers: ['naruto-uzumaki', 'konohagakure', 'sharingan', 'rasengan', 'uchiha', 'samehada', 'ninja-medical'],
    // LOT 4a : échelle des rangs (route en dur /u/naruto/rangs, même mécanique que le CTA « Most
    // Wanted » ci-dessous pour One Piece) — surface bespoke, pas une page d'axe générique.
    extras: [{ href: '/learn/akasha/u/naruto/rangs', label: 'L’échelle des rangs', icon: '🎖️' }],
  },
  {
    name: 'One Piece',
    slug: 'one-piece',
    kanji: 'ワンピース',
    tagline: 'Équipages, primes et Fruits du Démon — la course au trésor.',
    axes: [
      {
        attr: 'faction', label: 'Factions', genre: 'f', icon: '⚖️',
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
          // 08/08 — CURATION DES AXES SALES : 22 équipages promus depuis le masquage LOT 3b, dont
          // « L’équipage de Macro » (créé par un renommage — « L’équipage des Maquereaux » ne
          // correspondait à aucune source, mistraduction probable de Macro/Maquereau) et
          // « L’équipage des Pirates du Soleil » (fondateur Tiger Fisher réintégré, il portait la
          // même valeur fautive). Le reste (Marine, Cipher Pol, alliances de plusieurs équipages…)
          // documenté comme bruit hors axe dans data/audits/curation-axes-sales.json, PAS promu.
          { v: 'L’équipage de Barbe Noire' }, { v: 'L’équipage du Roux' },
          { v: 'Faux équipage du Chapeau de Paille' },
          { v: 'L’équipage des Nouveaux Hommes-Poissons' }, { v: 'L’équipage du Lion d’Or' },
          { v: 'L’équipage de Thriller Bark' }, { v: 'L’équipage des Pirates Kuja' },
          { v: 'L’équipage du Fire Tank' }, { v: 'L’équipage de Kid' }, { v: 'L’équipage de Foxy' },
          { v: 'L’équipage du Chat Noir' }, { v: 'L’équipage d’Arlong' }, { v: 'L’équipage du Bluejam' },
          { v: 'L’équipage de Krieg' }, { v: 'L’équipage des Pirates du Soleil' },
          { v: 'L’équipage de Caribou' }, { v: 'L’équipage des Pirates Volants' },
          { v: 'L’équipage des Pirates Rocks' }, { v: 'L’équipage des Moines Dépravés' },
          { v: 'L’équipage de Buggy' }, { v: 'L’équipage du Rumbar' }, { v: 'L’équipage de Macro' },
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
    // 08/08/2026 : 'chapeau-de-paille' fusionné dans 'l-equipage-du-chapeau-de-paille'
    // (doublet de conteneurs, cf. data/audits/doublets-conteneurs-trace.json) — slug survivant
    // gardé ici car 3x plus riche (123 arêtes contre 10) et déjà référencé en dur ailleurs
    // (app/learn/akasha/u/[slug]/page.tsx:106).
    piliers: ['grand-line', 'one-piece-tresor', 'thousand-sunny', 'l-equipage-du-chapeau-de-paille'],
    extras: [{ href: '/learn/akasha/wanted', label: 'Most Wanted — le classement des primes', icon: '🏴‍☠️' }],
  },
  {
    name: 'Dragon Ball',
    slug: 'dragon-ball',
    kanji: 'ドラゴンボール',
    tagline: 'Races guerrières, transformations et sagas — la quête des sept boules.',
    axes: [
      {
        attr: 'race', label: 'Races', genre: 'f', icon: '🧬',
        values: [
          { v: 'Saiyan', l: 'Saiyans' }, { v: 'Human', l: 'Humains' }, { v: 'Namekian', l: 'Nameks' },
          { v: 'Android', l: 'Androïdes' }, { v: 'Majin' }, { v: 'Frieza Race', l: 'Race de Freezer' },
          { v: 'Angel', l: 'Anges' },
          // 10/08 — CHANTIER 4 : deux races canon qui manquaient, chacune vérifiée sur une page
          // Category:Races bâtie sur {{Race Infobox2}}, et confirmée par l'infobox du personnage.
          // · « Machine Mutants (マシン ミュータント) are a race of artificial beings introduced in
          //   Dragon Ball GT. » https://dragonball.fandom.com/wiki/Machine_Mutant (Giru : |Race= [[Machine Mutant]])
          // · « Glind (グリンド人), also known as Core People (芯人 Shin-jin), are a race of beings […]
          //   the true race all Kai and Supreme Kai come from. » https://dragonball.fandom.com/wiki/Glind
          //   (Shin / Higashi no Kaiōshin : |Race = [[Glind]]). Nom relevé dans Dragon Ball Daima ép. 3 —
          //   à ne PAS prendre pour une coquille de mining, c'est le nom moderne des Shinjin.
          { v: 'Machine Mutant', l: 'Machine Mutants' },
          { v: 'Glind', l: 'Glinds (race des Kaiōshin)' },
        ],
      },
      {
        attr: 'saga', label: 'Sagas', genre: 'f', icon: '📖',
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
        attr: 'race', label: 'Races spirituelles', genre: 'f', icon: '👻',
        values: [
          { v: 'Shinigami' }, { v: 'Hollow' }, { v: 'Arrancar' }, { v: 'Quincy' },
          { v: 'Humain', l: 'Humains' }, { v: 'Fullbringer' }, { v: 'Visored' },
          // 10/08 — CHANTIER 4 : trois races canon qui manquaient. Toutes trois portent sur le wiki
          // le {{Bleach Wiki:Racial Groups Template}} et Category:Races, exactement comme les sept
          // ci-dessus, et l'infobox de chaque fiche concernée le confirme (| race = [[…]]).
          // · « Souls (魂魄 Konpaku) are spiritual beings that reside in the Rukongai area of Soul
          //   Society and the spirits of dead humans in the World of the Living. »
          //   https://bleach.fandom.com/wiki/Soul — DISTINCT de « Humain » : le wiki sépare le vivant
          //   du défunt. Hisana Kuchiki, Ganju et Kūkaku Shiba.
          // · « Modified Souls (改造魂魄 Kaizō Konpaku) […] are artificial souls designed to enhance
          //   regular Human physiology. » https://bleach.fandom.com/wiki/Modified_Soul — Ririn, Noba, Nozomi.
          // · « A Zanpakutō Spirit (斬魄刀の本体) is the spirit embodiment of a Zanpakutō. »
          //   https://bleach.fandom.com/wiki/Zanpakutō_Spirit — Katen Kyōkotsu ; la page de l'ESPRIT,
          //   à ne pas confondre avec celle du sabre ni avec Shunsui Kyōraku, vers qui la recherche
          //   nue redirige (piège de désambiguïsation vérifié).
          { v: 'Soul', l: 'Âmes' },
          { v: 'Modified Soul', l: 'Âmes modifiées' },
          { v: 'Zanpakutō Spirit', l: 'Esprits de Zanpakutō' },
        ],
      },
      {
        // LES QUATRE MONDES (LOT 3d, 08/08). Décision de Dan : Bleach ne s'organise pas autour du
        // seul cercle du Gotei mais de ses QUATRE MONDES. L'axe est peuplé depuis les arêtes
        // `habite`, pas déclaré à la main — 173 personnages sur 292 en portent un. Wandenreich
        // n'en compte que 3 : c'est le canon (l'empire Quincy n'apparaît qu'en dernier arc et
        // presque personne n'y « habite »), pas un trou de curation — on le montre tel quel
        // plutôt que de gonfler la valeur pour faire joli.
        // Libellé SANS article : il est réemployé dans des phrases générées (« Tous les mondes
        // “Soul Society” de l'univers Bleach ») où « Les quatre mondes » donnait « Tous les les
        // quatre mondes ». Un libellé est un NOM, pas une phrase.
        attr: 'monde', label: 'Mondes', icon: '🌍',
        values: [
          { v: 'Soul Society' }, { v: 'Terre · Karakura' },
          { v: 'Hueco Mundo' }, { v: 'Wandenreich' },
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
        attr: 'partie', label: 'Parties', genre: 'f', icon: '🎭',
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
    // LOT 4b : arbre généalogique (route en dur /u/jojo/arbre, même mécanique que « rangs » pour
    // Naruto ci-dessus) — surface bespoke, pas une page d'axe générique.
    extras: [{ href: '/learn/akasha/u/jojo/arbre', label: 'L’arbre Joestar', icon: '🌳' }],
  },
  {
    name: 'Initial D',
    slug: 'initial-d',
    kanji: 'イニシャルＤ',
    tagline: 'Cols, écuries et duels nocturnes — la légende du drift.',
    axes: [
      {
        attr: 'affiliation', label: 'Écuries', genre: 'f', icon: '🏁',
        // 08/08 : « Akagi RedSuns » dé-curée de ce filtre — 0 fiche ne porte ce SCALAIRE (page
        // d'axe fantôme), alors que la fiche groupe « redsuns » existe et porte bien 4 arêtes
        // `appartient` (Ryosuke, Keisuke, Kenta Nakamura, Hiroshi Fumihiro) : ces 4 pilotes sont
        // modélisés en affiliation ACTUELLE unique (Project D) et le filtre ne lit que ce champ
        // scalaire, pas le graphe de relations. Rien n'est perdu : la page /redsuns et ses 4
        // arêtes restent intactes. Réouvrir seulement si le modèle passe au multi-affiliation ou
        // si le filtre apprend à lire les relations. Voir data/audits/petits-univers.json.
        values: [
          { v: 'Project D' }, { v: 'Myogi NightKids' },
          { v: 'Akina SpeedStars' }, { v: 'Impact Blue' }, { v: 'Team Emperor' },
          // Équipe canon des frères Takahashi. Elle vivait dans le miroir des agents et nulle part
          // ici : produisible par l'usine, filtrable par personne (constaté le 10/08).
          { v: 'Akagi RedSuns' },
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

// ─── Identité visuelle du hub (dégradé signature, motif de fond canon) ───
export interface HubVisual {
  /** Dégradé bi-teinte du hero (2-3 stops CSS). */
  heroGradient: string;
  /** Motif SVG de fond (data-URI) évoquant l'univers — teinté à faible opacité derrière le hero. */
  bgPattern: string;
  /** Signature bespoke rendue par le hub (composant dédié). */
  signature?: 'villages' | 'bounties' | 'powerscale' | 'gotei' | 'nen' | 'jojo' | 'passes' | 'kiraduel';
  /** Carte-monde plein cadre montée EN TÊTE du hub (lot 3a — plus de if slug === dans la page). */
  map?: 'op-world' | 'db-cosmos';
}

// Petit motif SVG répétable encodé data-URI (currentColor via une couleur passée à la volée dans le hub).
const svg = (inner: string, size = 60) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>${inner}</svg>`)}")`;

export const HUB_VISUAL: Record<string, HubVisual> = {
  naruto: {
    heroGradient: 'linear-gradient(160deg, #2A1206 0%, #E8623A22 42%, var(--bg) 100%)',
    bgPattern: svg("<circle cx='30' cy='30' r='10' fill='none' stroke='%23E8623A' stroke-width='2'/><circle cx='30' cy='30' r='2.5' fill='%23E8623A'/><circle cx='30' cy='16' r='2' fill='%23E8623A'/>"),
    signature: 'villages',
  },
  'one-piece': {
    heroGradient: 'linear-gradient(160deg, #06182E 0%, #D63C3C22 45%, var(--bg) 100%)',
    bgPattern: svg("<path d='M0 40 q15 -12 30 0 t30 0' fill='none' stroke='%23D63C3C' stroke-width='2'/><path d='M0 52 q15 -12 30 0 t30 0' fill='none' stroke='%23D63C3C' stroke-width='1.5'/>"),
    signature: 'bounties',
    map: 'op-world',
  },
  'dragon-ball': {
    heroGradient: 'linear-gradient(160deg, #2A1C02 0%, #F2A93B22 42%, var(--bg) 100%)',
    bgPattern: svg("<circle cx='30' cy='30' r='13' fill='none' stroke='%23F2A93B' stroke-width='2'/><path d='M30 22 l2.4 4.9 5.4 .8-3.9 3.8 .9 5.4-4.8-2.5-4.8 2.5 .9-5.4-3.9-3.8 5.4-.8z' fill='%23F2A93B'/>"),
    signature: 'powerscale',
    map: 'db-cosmos',
  },
  bleach: {
    heroGradient: 'linear-gradient(160deg, #0A1420 0%, #5A88B022 45%, var(--bg) 100%)',
    bgPattern: svg("<path d='M30 8 L38 30 L30 52 L22 30 Z' fill='none' stroke='%235A88B0' stroke-width='1.6'/>"),
    signature: 'gotei',
  },
  'hunter-x-hunter': {
    heroGradient: 'linear-gradient(160deg, #06220F 0%, #3FA35C22 45%, var(--bg) 100%)',
    bgPattern: svg("<polygon points='30,10 47,20 47,40 30,50 13,40 13,20' fill='none' stroke='%233FA35C' stroke-width='1.6'/>"),
    signature: 'nen',
  },
  jojo: {
    heroGradient: 'linear-gradient(160deg, #1A0A2A 0%, #8E44AD22 45%, var(--bg) 100%)',
    bgPattern: svg("<circle cx='18' cy='18' r='5' fill='%238E44AD'/><circle cx='42' cy='42' r='5' fill='%238E44AD'/><circle cx='42' cy='18' r='3' fill='%238E44AD'/><circle cx='18' cy='42' r='3' fill='%238E44AD'/>"),
    signature: 'jojo',
  },
  'initial-d': {
    heroGradient: 'linear-gradient(160deg, #061826 0%, #0094D422 45%, var(--bg) 100%)',
    bgPattern: svg("<path d='M8 40 L52 20 M8 48 L52 28' stroke='%230094D4' stroke-width='2' stroke-dasharray='6 5'/>"),
    signature: 'passes',
  },
  'death-note': {
    heroGradient: 'linear-gradient(160deg, #14141A 0%, #8A8F9822 45%, var(--bg) 100%)',
    bgPattern: svg("<path d='M0 15 H60 M0 30 H60 M0 45 H60' stroke='%238A8F98' stroke-width='1'/><path d='M14 0 V60' stroke='%23D63C3C' stroke-width='1'/>"),
    signature: 'kiraduel',
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

/** Axes « sales » (LOT 3b, 08/08/2026) — masquage silencieux (chip + pré-génération), jamais un
 *  blocage de route (la clé reste déclarée dans `axes`, le fallback ISR répond quand même).
 *
 *  CURATION DU 08/08/2026 (data/audits/curation-axes-sales.json) — deux des trois retirés :
 *  · `clan` Naruto : 100% curé (45/45 valeurs, 228/228 fiches) — RETIRÉ. Les 39 valeurs sales
 *    d'alors étaient TOUTES des clans canon réels (vérifiés contre naruto.fandom.com), juste
 *    absents de la liste ; zéro bruit.
 *  · `crew` One Piece : 76,3% curé (273/358 fiches) — RETIRÉ. Les 12 valeurs encore hors liste
 *    (Marine, Cipher Pol, alliances de plusieurs équipages, un journal…) sont réelles mais
 *    structurellement PAS des équipages — documentées comme bruit, jamais promues ni supprimées.
 *  · `organization` Naruto : 27,5% curé (129/469 fiches) — RESTE SALE. Le champ mélange, sous une
 *    seule clé JSONB, des catégories de nature différente (organisations permanentes — le sens
 *    visé par la liste curée — vs ~72 équipes genin éphémères, 9 divisions de guerre temporaires,
 *    familles, gangs locaux…). Un renommage ne répare pas un problème de modèle de données ; voir
 *    l'audit pour le détail et la recommandation (scinder l'extraction, pas cette liste). */
const DIRTY_AXES: ReadonlySet<string> = new Set([]);

/** Un axe (univers + attribut) est-il trop sale pour être PROPOSÉ (chip, pré-génération) ?
 *  N'affecte jamais la résolution de route elle-même — voir le commentaire de `DIRTY_AXES`. */
export function isDirtyAxis(universe: string, attr: string): boolean {
  return DIRTY_AXES.has(`${universe}:${attr}`);
}

/** Libellé FR d'une valeur d'axe (retombe sur la valeur brute). */
export function axisValueLabel(universe: string, attr: string, value: string): string {
  const ax = BY_NAME.get(universe)?.axes.find((a) => a.attr === attr);
  return ax?.values.find((x) => x.v === value)?.l ?? value;
}

/** Libellé FR d'un AXE (« village » → « Villages ») — FilterBar, breadcrumb (retombe sur l'attr brut). */
export function axisLabel(universe: string, attr: string): string | null {
  return BY_NAME.get(universe)?.axes.find((a) => a.attr === attr)?.label ?? null;
}
