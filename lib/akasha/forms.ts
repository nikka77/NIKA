// lib/akasha/forms.ts — normalisation PARTAGÉE des formes d'un personnage.
// RÈGLE UNIQUE (décision Dan 06/08) : une forme SANS visuel est désormais LÉGITIME — la curation
// purement données (label/âge/arc/stats) doit rester visible. Le front la rend en tuile stylisée
// (initiale du label sur dégradé d'accent) dans ArcFrieze et le portrait de CharacterZone ; CardArt
// a déjà son repli icône. On ne jette plus que les entrées non-objet. Utilisé par CharacterZone,
// CharacterCard ET DragonBallCards : un filtre divergent désynchronise `sel` (mauvais vitals affichés).
export interface CharacterForm {
  label?: string;
  url?: string;
  idle?: string;
  caption?: string;
  [k: string]: unknown;
}

export function normalizeForms(attributes: Record<string, unknown>): CharacterForm[] {
  const raw = Array.isArray(attributes.forms) ? (attributes.forms as CharacterForm[]) : [];
  return raw.filter((f): f is CharacterForm => !!f && typeof f === 'object');
}
