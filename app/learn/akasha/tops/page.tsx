// app/learn/akasha/tops/page.tsx — LES RECORDS (Refonte L7) : classements cross-univers data-driven.
// Popularité (favorites), primes One Piece (bounty parsé), colosses (height_cm). Le ki DB est stocké
// formaté (« 60.000.000 ») donc non trié numériquement — exclu volontairement.
import type { Metadata } from 'next';
import Link from 'next/link';
import { listTopByAttr, listBounties } from '@/lib/akasha/queries';
import Leaderboard, { type LeaderRow } from '@/components/akasha/Leaderboard';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Les Records — classements AKASHA | NIKA LEARN',
  description: 'Les classements du registre AKASHA : personnages les plus populaires, plus grosses primes de One Piece, les colosses. Tout data-driven, tous univers confondus.',
};

const fmt = (n: number) => n.toLocaleString('fr-FR');

export default async function TopsPage() {
  const [pop, bounties, tall, small] = await Promise.all([
    listTopByAttr('favorites', { limit: 15 }),
    listBounties(15),
    listTopByAttr('height_cm', { limit: 10 }),
    // Les plus petits : on prend un lot et on inverse (pas de tri asc simple sur JSONB numérique fiable ici).
    listTopByAttr('height_cm', { limit: 200 }),
  ]);

  const popRows: LeaderRow[] = pop.map((e) => ({ ...e, value: `★ ${fmt(e.metric)}` }));
  const bountyRows: LeaderRow[] = bounties.map((e) => ({ ...e, value: `${fmt(e.bountyValue)} ฿` }));
  const tallRows: LeaderRow[] = tall.map((e) => ({ ...e, value: `${e.metric} cm` }));
  const smallRows: LeaderRow[] = small
    .filter((e) => e.metric >= 30)
    .sort((a, b) => a.metric - b.metric)
    .slice(0, 8)
    .map((e) => ({ ...e, value: `${e.metric} cm` }));

  return (
    <main>
      <div style={{ background: 'linear-gradient(180deg, #1A1206 0%, #D4A01722 45%, var(--bg) 100%)', borderBottom: '1px solid var(--bd)', padding: 'clamp(2rem,5vw,3.4rem) 1.4rem 1.6rem' }}>
        <div style={{ maxWidth: 1050, margin: '0 auto' }}>
          <Link href="/learn/akasha" style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)', textDecoration: 'none' }}>← Registre AKASHA</Link>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#D4A017', margin: '1rem 0 0.5rem' }}>🏆 Le musée des records</div>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(40px,8vw,76px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, margin: 0 }}>Les Records</h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 'clamp(13px,1.5vw,15px)', color: 'var(--td2)', maxWidth: 540, lineHeight: 1.6, margin: '0.9rem 0 0' }}>
            Les classements du registre, tous univers confondus — popularité, primes, gabarits. Générés depuis les données, mis à jour en continu.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1050, margin: '0 auto', padding: 'clamp(1.4rem,3vw,2.2rem) 1.4rem clamp(3rem,7vw,5rem)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2.4rem', alignItems: 'start' }}>
        <Leaderboard title="Les plus populaires" icon="⭐" accent="#E8623A" rows={popRows} />
        <Leaderboard title="Les plus grosses primes" icon="🏴‍☠️" accent="#D4A017" rows={bountyRows} />
        <Leaderboard title="Les colosses" icon="📏" accent="#0094D4" rows={tallRows} />
        <Leaderboard title="Les plus petits" icon="🐤" accent="#0EA878" rows={smallRows} />
      </div>
    </main>
  );
}
