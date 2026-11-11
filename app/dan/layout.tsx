// app/dan/layout.tsx — polices des cartes phygitales (Chakra Petch + Manrope), chargées
// uniquement sous /dan via next/font : rien n'est ajouté au reste du site.
import type { Metadata } from 'next';
import { Chakra_Petch, Manrope } from 'next/font/google';

const chakra = Chakra_Petch({ weight: ['500', '600', '700'], subsets: ['latin'], variable: '--font-chakra', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

// Les cartes portent des infos personnelles (ID card du fondateur) : on les ouvre par le tap
// NFC ou par lien, mais on ne les donne pas aux moteurs de recherche.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function DanLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${chakra.variable} ${manrope.variable}`}>{children}</div>;
}
