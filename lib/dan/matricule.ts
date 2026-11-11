// lib/dan/matricule.ts — numérotation du Réseau DAN (sans séparateur).
//
//   0        → le fondateur (Profil 0)
//   1 … 9    → les neuf chefs de pôle (un par division)
//   D + rang → un prestataire : le chiffre de sa division collé à son ordre d'arrivée.
//              Le 3e réparateur (division 6) est le 63, le 12e devient le 612.
//
// Le premier chiffre suffit donc toujours à retrouver la division, et le reste est le rang.

export type DivisionNum = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type Matricule =
  | { kind: 'fondateur'; code: '0' }
  | { kind: 'chef'; code: string; division: DivisionNum }
  | { kind: 'prestataire'; code: string; division: DivisionNum; rang: number };

/** Lit un matricule ("0", "6", "63", "612"…). Renvoie null s'il est mal formé. */
export function lireMatricule(brut: string): Matricule | null {
  const code = String(brut ?? '').trim();
  if (code === '0') return { kind: 'fondateur', code: '0' };
  // Pas de zéro en tête (« 06 » n'existe pas), chiffres uniquement, longueur raisonnable.
  if (!/^[1-9][0-9]{0,6}$/.test(code)) return null;
  const division = Number(code[0]) as DivisionNum;
  if (code.length === 1) return { kind: 'chef', code, division };
  const reste = code.slice(1);
  // « 60 », « 601 » : un rang ne commence jamais par 0.
  if (reste.startsWith('0')) return null;
  return { kind: 'prestataire', code, division, rang: Number(reste) };
}

/** Compose le matricule d'un prestataire : division 6, rang 12 → "612". */
export function composerMatricule(division: DivisionNum, rang: number): string {
  if (!Number.isInteger(division) || division < 1 || division > 9) throw new RangeError(`division invalide : ${division}`);
  if (!Number.isInteger(rang) || rang < 1) throw new RangeError(`rang invalide : ${rang}`);
  return `${division}${rang}`;
}
