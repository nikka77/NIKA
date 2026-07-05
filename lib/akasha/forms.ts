// lib/akasha/forms.ts — normalisation PARTAGÉE des formes d'un personnage.
// RÈGLE UNIQUE : une forme est affichable si elle porte AU MOINS un visuel — `url` (image anime 16:9)
// OU `idle` (sprite pixel). Les stars multi-univers n'ont QUE des sprites. Utilisé par CharacterView,
// CharacterCard ET CharacterDossier : un filtre divergent désynchronise `sel` (mauvais vitals affichés).
export interface CharacterForm {
  label?: string;
  url?: string;
  idle?: string;
  caption?: string;
  [k: string]: unknown;
}

export function normalizeForms(attributes: Record<string, unknown>): CharacterForm[] {
  const raw = Array.isArray(attributes.forms) ? (attributes.forms as CharacterForm[]) : [];
  return raw.filter((f) => f && (typeof f.url === 'string' || typeof f.idle === 'string'));
}
