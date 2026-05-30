import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Loader from '@/components/Loader';
import MapOverlay, { FloatMapBtn } from '@/components/MapOverlay';

export const metadata: Metadata = {
  title: 'NIKA — Explore. Joue. Vis. | Côte d\'Azur',
  description: 'La super-app de la Côte d\'Azur : VTC, restaurants, logements insolites, bateaux, services locaux et agent IA NIKO. Nice, Antibes, Cannes.',
  keywords: ['nice app', 'côte d\'azur app', 'vtc nice', 'logement insolite nice', 'bateau cannes', 'super-app méditerranée'],
  openGraph: {
    title: 'NIKA — La super-app de la Côte d\'Azur',
    description: 'VTC, food, logements insolites, bateaux. L\'essentiel de la Côte d\'Azur en une seule app.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" style={{ scrollBehavior: 'smooth' }}>
      <body>
        <Loader />
        <Nav />
        {children}
        <Footer />
        <MapOverlay />
        <FloatMapBtn />
      </body>
    </html>
  );
}
