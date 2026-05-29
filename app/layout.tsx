import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Loader from '@/components/Loader';
import MapOverlay, { FloatMapBtn } from '@/components/MapOverlay';

export const metadata: Metadata = {
  title: 'NIKA — Explore. Joue. Vis. | Côte d\'Azur',
  description: 'Restaurants, dépanneurs, logements insolites, bateaux, services locaux — tout ce qui compte sur la Côte d\'Azur, au même endroit.',
  keywords: ['Nice', 'Côte d\'Azur', 'logement insolite', 'VTC', 'dépannage', 'bateau'],
  openGraph: {
    title: 'NIKA — Explore. Joue. Vis.',
    description: 'Le companion app de la vraie vie sur la Côte d\'Azur.',
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
