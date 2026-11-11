// app/dan/[matricule]/page.tsx — carte phygitale d'un membre du Réseau DAN.
// /dan/0 = le fondateur ; /dan/1 … /dan/9 = les chefs de pôle. C'est l'URL à écrire dans la
// puce NFC (ou le QR) de la carte physique. Les matricules de prestataires (63, 612…) sont
// déjà reconnus par lib/dan/matricule.ts ; leurs cartes viendront avec les inscriptions.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CartePhygitale from '@/components/dan/CartePhygitale';
import { CARTES, DIVISIONS, trouverCarte } from '@/lib/dan/cartes';
import { lireMatricule } from '@/lib/dan/matricule';

type Props = { params: Promise<{ matricule: string }> };

export function generateStaticParams() {
  return CARTES.map(c => ({ matricule: c.matricule }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { matricule } = await params;
  const carte = trouverCarte(matricule);
  if (!carte) return { title: 'Carte inconnue — Réseau DAN' };
  const div = carte.division ? DIVISIONS[carte.division] : null;
  return {
    title: div ? `#${matricule} ${div.nom} — Réseau DAN` : `DAN #0 — carte du fondateur`,
    description: div ? div.accroche : 'La carte phygitale du fondateur du Réseau DAN — Nice, Cannes, Monaco.',
  };
}

export default async function CarteDanPage({ params }: Props) {
  const { matricule } = await params;
  if (!lireMatricule(matricule)) notFound();
  const carte = trouverCarte(matricule);
  if (!carte) notFound();
  return <CartePhygitale carte={carte} />;
}
