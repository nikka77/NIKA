// lib/akasha/flavor.ts — extraits « flavor text » depuis les descriptions VF canon (descFr).
// Les descFr commencent souvent par des champs fiche (« Taille : 172 cm Affiliation : … ») avant la
// prose : on saute ces segments techniques pour offrir une VRAIE phrase narrative sur les cartes.

/** Découpe en phrases et écarte les segments « fiche technique » (Clé : valeur, listes de champs). */
function sentences(text: string): string[] {
  return text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])\s+/);
}
/** Une phrase est de la PROSE si elle est assez longue, ne commence pas par « Clé : », contient un
 *  verbe narratif courant, et n'est pas saturée de « : » (signature des blocs de champs). */
const NARRATIVE = /\b(est|était|fut|furent|sont|devient|devint|deviendra|vit|vivait|incarne|dirige|dirigeait|appartient|appartenait|combat|combattit|possède|possédait|porte|portait|reste|demeure|sert|servait|travaille|naquit|grandit|rejoint|rejoignit|mène|menait|règne|protège|apparaît|apparut|débute|surnommé|connu|considéré)\b/i;
function isProse(s: string): boolean {
  if (s.length < 40) return false;
  if (/^[\w'’À-ÿ ()\-\/.]{1,32}\s*:/.test(s)) return false;   // commence par « Clé : »
  const colons = (s.match(/:/g) || []).length;
  if (colons >= 2 || (colons === 1 && !NARRATIVE.test(s))) return false;
  return NARRATIVE.test(s) || s.length >= 90;
}
/** Vrai début de prose : première phrase narrative après les champs de fiche. */
function firstProse(text: string): string | null {
  const parts = sentences(text);
  for (let i = 0; i < parts.length; i++) {
    if (isProse(parts[i])) return parts.slice(i).join(' ');
  }
  return null;
}

/** Première phrase narrative de la bio VF, bornée (pour cartes / extraits). null si pas de prose. */
export function flavorText(descFr: string | null | undefined, max = 150): string | null {
  if (!descFr || descFr.trim().length < 30) return null;
  const prose = firstProse(descFr);
  if (!prose) return null;
  return clamp(sentences(prose)[0] ?? prose, max);
}

/** Extrait plus long (intro de fiche, méta description SEO). null si pas de prose. */
export function flavorExcerpt(descFr: string | null | undefined, max = 155): string | null {
  if (!descFr || descFr.trim().length < 30) return null;
  const prose = firstProse(descFr);
  return prose ? clamp(prose, max) : null;
}

function clamp(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 18)).trimEnd() + '…';
}
