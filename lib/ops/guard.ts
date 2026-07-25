// lib/ops/guard.ts — verrou de la console OPS.
// /ops pilote des agents qui écrivent en base : elle ne doit JAMAIS être atteignable en ligne.
// Double verrou : (1) hôte local uniquement, (2) OPS_SECRET obligatoire hors développement.
import { headers } from 'next/headers';

export async function opsAllowed(): Promise<boolean> {
  const h = await headers();
  const host = (h.get('host') ?? '').split(':')[0];
  const local = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  if (!local) return false;
  if (process.env.NODE_ENV === 'development') return true;
  return Boolean(process.env.OPS_SECRET) && h.get('x-ops-secret') === process.env.OPS_SECRET;
}
