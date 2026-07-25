// app/ops/page.tsx — NIKA OPS : console de pilotage des agents (LOCALE UNIQUEMENT).
// Kanban des tâches : file pgmq → résultats en attente → approuvés / rejetés.
// Verrou dans lib/ops/guard.ts : hôte local obligatoire (+ OPS_SECRET hors dev).
import { notFound } from 'next/navigation';
import { opsAllowed } from '@/lib/ops/guard';
import OpsBoard from './OpsBoard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'NIKA OPS', robots: { index: false, follow: false } };

export default async function OpsPage() {
  if (!(await opsAllowed())) notFound();
  return <OpsBoard />;
}
