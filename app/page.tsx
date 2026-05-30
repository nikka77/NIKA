import type { Metadata } from 'next';
import Hero from '@/components/Hero';
import StatsBar from '@/components/StatsBar';
import TokenSection from '@/components/TokenSection';
import FlashDeals from '@/components/FlashDeals';
import Onboarding from '@/components/Onboarding';
import DomainsCarousel from '@/components/DomainsCarousel';
import MapSection from '@/components/MapSection';
import Gamification from '@/components/Gamification';
import NewsTeaser from '@/components/NewsTeaser';
import AccessCTA from '@/components/AccessCTA';

export const metadata: Metadata = {
  title: 'NIKA — La super-app de la Côte d\'Azur',
  description: 'VTC, restaurants, logements insolites, bateaux, artisans — tout ce qui compte à Nice, Antibes et Cannes en une seule app. Agent IA NIKO disponible 24h/24.',
  keywords: ['nice app', 'vtc nice', 'restaurant nice', 'logement insolite côte d\'azur', 'agent ia nice', 'super-app méditerranée'],
};

export default function Home() {
  return (
    <main>
      <Hero />
      <StatsBar />
      <TokenSection />
      <FlashDeals />
      <Onboarding />
      <DomainsCarousel />
      <MapSection />
      <Gamification />
      <NewsTeaser />
      <AccessCTA />
    </main>
  );
}
