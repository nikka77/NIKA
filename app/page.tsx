import type { Metadata } from 'next';
import Hero from '@/components/home/Hero';
import TokenSection from '@/components/TokenSection';
import FlashDeals from '@/components/FlashDeals';
import Onboarding from '@/components/Onboarding';
import DomainsCarousel from '@/components/DomainsCarousel';
import MapSection from '@/components/MapSection';
import Gamification from '@/components/Gamification';
import NewsTeaser from '@/components/NewsTeaser';
import AccessCTA from '@/components/AccessCTA';
import LiveActivity from '@/components/LiveActivity';
import FadeIn from '@/components/FadeIn';
import { getFoodPros, getFeaturedEstablishments } from '@/lib/food';

export const metadata: Metadata = {
  title: 'NIKA — La super-app de la Côte d\'Azur',
  description: 'VTC, restaurants, logements insolites, bateaux, artisans — tout ce qui compte à Nice, Antibes et Cannes en une seule app. Agent IA NIKO disponible 24h/24.',
  keywords: ['nice app', 'vtc nice', 'restaurant nice', 'logement insolite côte d\'azur', 'agent ia nice', 'super-app méditerranée'],
};

export default async function Home() {
  // Widget « accès rapide » du hero : enseignes mises en avant (sponsorisé / populaire / favori).
  const [foodPros, nightPros] = await Promise.all([getFoodPros(), getFeaturedEstablishments()]);
  return (
    <main>
      <Hero foodPros={foodPros} nightPros={nightPros} />
      <LiveActivity />
      <FadeIn><TokenSection /></FadeIn>
      <FadeIn><FlashDeals /></FadeIn>
      <FadeIn><Onboarding /></FadeIn>
      <FadeIn><DomainsCarousel /></FadeIn>
      <FadeIn><MapSection /></FadeIn>
      <Gamification />
      <FadeIn><NewsTeaser /></FadeIn>
      <FadeIn><AccessCTA /></FadeIn>
    </main>
  );
}
