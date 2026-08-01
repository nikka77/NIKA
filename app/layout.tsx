import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, Exo_2, Outfit } from 'next/font/google';
import './globals.css';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import HorsOps from '@/components/HorsOps';
import MapOverlay, { FloatMapBtn } from '@/components/MapOverlay';
import BottomNav from '@/components/BottomNav';
import ScrollProgress from '@/components/ScrollProgress';
import LiquidGlassRuntime from '@/components/LiquidGlassRuntime';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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

// next/font : auto-hébergé, préchargé, sans @import bloquant le rendu (cf. globals.css).
const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas', display: 'swap' });
const exo2 = Exo_2({ subsets: ['latin'], variable: '--font-exo2', display: 'swap' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${bebas.variable} ${exo2.variable} ${outfit.variable}`} style={{ scrollBehavior: 'smooth' }}>
      <body>
        <ScrollProgress />
        <Nav />
        {children}
        <HorsOps><Footer /></HorsOps>
        <MapOverlay />
        <FloatMapBtn />
        <BottomNav />
        <LiquidGlassRuntime />
      </body>
    </html>
  );
}
