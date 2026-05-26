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
