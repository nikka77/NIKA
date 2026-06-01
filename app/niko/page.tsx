import type { Metadata } from 'next';
import NikoChat from './NikoChat';

export const metadata: Metadata = {
  title: 'NIKO — Agent IA Côte d\'Azur | NIKA',
  description: 'NIKO, votre assistant IA pour VTC, livraison, courses à Nice, Antibes et Cannes. Disponible 24h/24, réponse instantanée.',
  keywords: ['vtc nice', 'livraison nice', 'courses à domicile côte d\'azur', 'assistant ia nice', 'niko nika'],
};

export default function NikoPage() {
  return <NikoChat />;
}
