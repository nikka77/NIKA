// app/learn/akasha/tops/page.tsx — LES RECORDS (Refonte L7) : classements cross-univers data-driven.
// Popularité (favorites), primes One Piece (bounty parsé), âges (age parsé — a remplacé height_cm,
// tombé à 0 fiche au 05/08). Le ki DB est stocké formaté (« 60.000.000 ») donc non trié
// numériquement — exclu volontairement.
import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/site';
import { listTopByAttr, listBounties, listAges } from '@/lib/akasha/queries';
import Leaderboard, { type LeaderRow } from '@/components/akasha/Leaderboard';

export const revalidate = 3600;

// Voir le commentaire de app/learn/akasha/wanted/page.tsx : sans bloc `openGraph`, Next hérite en
// entier de celui du layout racine et la carte de partage vendait « NIKA — La super-app de la Côte
// d'Azur ». Mesuré en demandant la page le 10/08/2026.
const OG_TITRE = 'Les Records — classements AKASHA';
const DESCRIPTION = 'Les classements du registre AKASHA : personnages les plus populaires, plus grosses primes de One Piece, doyens et benjamins. Tout data-driven, tous univers confondus.';

export const metadata: Metadata = {
  title: 'Les Records — classements AKASHA | NIKA LEARN',
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/learn/akasha/tops` },
  openGraph: {
    title: OG_TITRE, description: DESCRIPTION, url: `${SITE_URL}/learn/akasha/tops`,
    siteName: 'AKASHA — le registre', locale: 'fr_FR', type: 'website',
  },
  twitter: { card: 'summary_large_image', title: OG_TITRE, description: DESCRIPTION },
};

const fmt = (n: number) => n.toLocaleString('fr-FR');

export default async function TopsPage() {
  const [pop, bounties, ages] = await Promise.all([
    listTopByAttr('favorites', { limit: 15 }),
    listBounties(15),
    listAges(),   // déjà triés par âge décroissant — un seul fetch pour les deux classements
  ]);

  const popRows: LeaderRow[] = pop.map((e) => ({ ...e, value: `★ ${fmt(e.metric)}` }));
  const bountyRows: LeaderRow[] = bounties.map((e) => ({ ...e, value: `${fmt(e.bountyValue)} ฿` }));
  const oldRows: LeaderRow[] = ages.slice(0, 10).map((e) => ({ ...e, value: `${fmt(e.ageValue)} ans` }));
  const youngRows: LeaderRow[] = [...ages]
    .sort((a, b) => a.ageValue - b.ageValue)
    .slice(0, 8)
    .map((e) => ({ ...e, value: `${e.ageValue} an${e.ageValue > 1 ? 's' : ''}` }));

  return (
    <main>
      <div style={{ background: 'linear-gradient(180deg, #1A1206 0%, #D4A01722 45%, var(--bg) 100%)', borderBottom: '1px solid var(--bd)', padding: 'clamp(2rem,5vw,3.4rem) 1.4rem 1.6rem' }}>
        <div style={{ maxWidth: 1050, margin: '0 auto' }}>
          <Link href="/learn/akasha" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 24, padding: '4px 2px', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)', textDecoration: 'none' }}>← Registre AKASHA</Link>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#D4A017', margin: '1rem 0 0.5rem' }}>🏆 Le musée des records</div>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(40px,8vw,76px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, margin: 0 }}>Les Records</h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 'clamp(13px,1.5vw,15px)', color: 'var(--td2)', maxWidth: 540, lineHeight: 1.6, margin: '0.9rem 0 0' }}>
            Les classements du registre, tous univers confondus — popularité, primes, âges. Générés depuis les données, mis à jour en continu.
          </p>
        </div>
      </div>

      <div className="g-auto-300" style={{ maxWidth: 1050, margin: '0 auto', padding: 'clamp(1.4rem,3vw,2.2rem) 1.4rem clamp(3rem,7vw,5rem)', gap: '2.4rem', alignItems: 'start' }}>
        <Leaderboard title="Les plus populaires" icon="⭐" accent="#E8623A" rows={popRows} />
        <Leaderboard title="Les plus grosses primes" icon="🏴‍☠️" accent="#D4A017" rows={bountyRows} />
        <Leaderboard title="Les doyens" icon="🦉" accent="#0094D4" rows={oldRows} />
        <Leaderboard title="Les benjamins" icon="🐤" accent="#0EA878" rows={youngRows} />
      </div>
    </main>
  );
}
