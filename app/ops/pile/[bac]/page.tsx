// app/ops/pile/[bac]/page.tsx — une page par bac (relire, douteuses, écartées, approuvées,
// rejetées). Même garde que la console : ces piles portent le travail non publié.
import { notFound } from 'next/navigation';
import { opsAllowed } from '@/lib/ops/guard';
import PileClient from '../PileClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'NIKA OPS — pile', robots: { index: false, follow: false } };

export default async function PilePage({ params }: { params: Promise<{ bac: string }> }) {
  if (!(await opsAllowed())) notFound();
  const { bac } = await params;
  return <PileClient bac={bac} />;
}
