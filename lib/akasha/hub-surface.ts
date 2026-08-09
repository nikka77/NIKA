// lib/akasha/hub-surface.ts — QUELLE PORTE D'ENTRÉE MONTE EN TÊTE D'UN HUB D'UNIVERS (LOT 7).
//
// Chaque hub s'ouvre sur une surface plein cadre : la carte de Grand Line, le cosmos Dragon Ball,
// la carte des villages, la roue du Nen, l'échelle des primes… Huit univers, huit gestes bespoke,
// tous déclarés dans HUB_VISUAL. Un NEUVIÈME univers n'a rien de tout ça le jour de son arrivée —
// et jusqu'ici il n'ouvrait sur rien : le hub commençait directement par la barre de recherche.
//
// Ce module choisit la porte, et il la choisit par CAPACITÉ, jamais par nom d'univers. On ne lui
// passe pas un slug ; on lui passe ce que l'univers POSSÈDE (une carte déclarée, une signature
// déclarée, des axes peuplés). Un `if (slug === 'naruto')` de plus dans la page était exactement
// la dette que le lot 3a avait payée pour la sortir.
//
// LE REPLI, « la grille du monde » : à défaut de géographie curée, l'axe le mieux peuplé fait la
// porte. Il en dit déjà beaucoup — pour Death Note ce serait les camps, pour un shōnen sportif les
// équipes. C'est un repli, pas une consolation : il donne au 9ᵉ univers la même invitation à
// cliquer que les huit autres, le jour même de son arrivée.
//
// Le test du 9ᵉ univers (hub-surface.test.ts) tient en une phrase : ajouter une entrée dans
// UNIVERSE_TAXONOMY doit suffire. Aucun composant à écrire, aucune branche à ajouter ici.

/** Les seules valeurs que la page sait monter — miroir de HubVisual, gardé étroit exprès. */
export type HubMap = 'op-world' | 'db-cosmos';
export type HubSignature = 'villages' | 'bounties' | 'powerscale' | 'gotei' | 'nen' | 'jojo' | 'passes' | 'kiraduel';

export type HubSurface =
  | { kind: 'map'; map: HubMap }
  | { kind: 'signature'; signature: HubSignature }
  | { kind: 'world-grid'; attr: string; label: string; valeurs: number; fiches: number };

/** Ce qu'un axe expose au choix de la porte — volontairement PLUS PAUVRE que l'AxisView du hub :
 *  ce module n'a pas à connaître les teintes, les badges ni les icônes. */
export interface SurfaceAxis {
  attr: string;
  label: string;
  chips: { count: number }[];
}

/** Une grille de moins de quatre cases n'est pas une grille, c'est une liste déguisée : elle
 *  n'offre pas le coup d'œil qui justifie une surface plein cadre. Mesuré sur les axes réels des
 *  huit univers — en dessous de 4 valeurs, aucun axe ne remplit une rangée. */
export const WORLD_GRID_MIN_VALEURS = 4;
/** Et une grille qui ne couvre qu'une poignée de fiches ment sur la taille du monde qu'elle ouvre. */
export const WORLD_GRID_MIN_FICHES = 12;

/** Les portes d'un hub, dans l'ordre de rendu. Vide = le hub s'ouvre directement sur sa recherche
 *  (cas d'un univers encore trop maigre : mieux vaut rien qu'une grille de trois cases). */
export function deriveHubSurfaces(input: {
  map?: HubMap;
  signature?: HubSignature;
  axes: SurfaceAxis[];
}): HubSurface[] {
  const surfaces: HubSurface[] = [];
  if (input.map) surfaces.push({ kind: 'map', map: input.map });
  if (input.signature) surfaces.push({ kind: 'signature', signature: input.signature });
  // Le repli ne s'ajoute JAMAIS à un geste bespoke : deux portes plein cadre l'une sur l'autre,
  // c'est une porte de moins, pas une de plus.
  if (surfaces.length) return surfaces;

  const candidat = [...input.axes]
    .map((a) => ({ axe: a, valeurs: a.chips.length, fiches: a.chips.reduce((n, c) => n + c.count, 0) }))
    .filter((x) => x.valeurs >= WORLD_GRID_MIN_VALEURS && x.fiches >= WORLD_GRID_MIN_FICHES)
    // Le mieux peuplé d'abord ; à égalité de fiches, celui qui offre le plus de cases à cliquer.
    .sort((a, b) => b.fiches - a.fiches || b.valeurs - a.valeurs)[0];
  if (!candidat) return [];

  return [{
    kind: 'world-grid',
    attr: candidat.axe.attr,
    label: candidat.axe.label,
    valeurs: candidat.valeurs,
    fiches: candidat.fiches,
  }];
}

/** L'axe consommé par la porte ne se répète pas en rail plus bas (même règle que SIGNATURE_ATTRS
 *  pour les signatures bespoke — la page dédoublonne, elle ne redit pas). */
export function attrsConsommesParLaPorte(surfaces: HubSurface[]): string[] {
  return surfaces.flatMap((s) => (s.kind === 'world-grid' ? [s.attr] : []));
}
