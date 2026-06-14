import type { Metadata, Viewport } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import MapOverlay, { FloatMapBtn } from '@/components/MapOverlay';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'NIKA — Explore. Joue. Vis. | Côte d\'Azur',
  description: 'La super-app de la Côte d\'Azur : VTC, restaurants, logements insolites, bateaux, services locaux et agent IA NIKO. Nice, Antibes, Cannes.',
  keywords: ['nice app', 'côte d\'azur app', 'vtc nice', 'logement insolite nice', 'bateau cannes', 'super-app méditerranée'],
  openGraph: {
    title: 'NIKA — La super-app de la Côte d\'Azur',
    description: 'VTC, food, logements insolites, bateaux. L\'essentiel de la Côte d\'Azur en une seule app.',
    type: 'website',
  },
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'NIKA' },
};

export const viewport: Viewport = {
  themeColor: '#050C17',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" style={{ scrollBehavior: 'smooth' }}>
      <body>
        <Nav />
        {children}
        <Footer />
        <MapOverlay />
        <FloatMapBtn />
        <BottomNav />
      </body>
    </html>
  );
}
