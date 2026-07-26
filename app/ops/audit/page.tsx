// app/ops/audit/page.tsx — audit à l'aveugle du juge automatique (LOCALE UNIQUEMENT).
// Même verrou que /ops : hôte local obligatoire (+ OPS_SECRET hors dev).
import { notFound } from 'next/navigation';
import { opsAllowed } from '@/lib/ops/guard';
import AuditPanel from './AuditPanel';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'NIKA OPS — audit', robots: { index: false, follow: false } };

export default async function AuditPage() {
  if (!(await opsAllowed())) notFound();
  return <AuditPanel />;
}
