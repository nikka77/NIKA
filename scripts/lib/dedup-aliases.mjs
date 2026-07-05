// scripts/lib/dedup-aliases.mjs — doublons de personnages PARTIELS/surnoms confirmés à la main
// (la clé canonique exacte ne les voit pas car les jeux de tokens diffèrent). Paires [slugA, slugB]
// du MÊME personnage. Vérifiés un par un (on écarte les homonymes de personnages mineurs distincts).
export const DEDUP_ALIASES = [
  // Bleach
  ['ulquiorra', 'ulquiorra-cifer'],
  ['grimmjow', 'grimmjow-jaegerjaquez'],
  ['ashido-kanou', 'kanou'],
  ['genryusai-yamamoto', 'shigekuni-yamamoto-genryuusai'],
  // JoJo
  ['speedwagon', 'robert-e-o-speedwagon'],
  ['caesar-zeppeli', 'caesar-anthonio-zeppeli'],
  // Hunter x Hunter
  ['feitan', 'feitan-portor'],
  // One Piece
  ['stussy', 'stussy-buckingham'],
  ['basil-hawkins', 'basil-one-piece'],
  ['barbe-blanche', 'newgate-edward'],
  ['compo-charlotte', 'compo'],
  // Romanisations uu/ū (repliées seulement par alias, pas par la clé auto — évite shiin≠shin).
  ['shuichi-aizawa', 'shuuichi-aizawa'],
  ['yuichi-tachibana', 'yuuichi-tachibana'],
  ['shuu', 'mr-shu'],
];
