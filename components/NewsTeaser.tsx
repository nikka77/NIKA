'use client';
import Link from 'next/link';
import FadeIn from './FadeIn';

const NEWS = [
  { cat: 'Automobile', catStyle: { background: 'rgba(0,148,212,0.08)', color: '#005A96' }, title: 'ZFE Nice : ce qui change pour les automobilistes dès 2026', time: 'Il y a 2h', votes: 47 },
  { cat: 'Alimentation', catStyle: { background: 'rgba(212,160,23,0.1)', color: '#704800' }, title: 'Marché de la Libération fête ses 80 ans ce week-end', time: 'Il y a 5h', votes: 23 },
  { cat: 'Local', catStyle: { background: 'rgba(14,168,120,0.08)', color: '#085A38' }, title: 'Nouveau POI créé : terrain de basket rénové à l\'Ariane', time: 'Il y a 1j', votes: 12 },
];

export default function NewsTeaser() {
  return (
    <div id="news-teaser" className="sand-grain" style={{ background: 'var(--sand)', borderTop: '1px solid rgba(0,0,0,0.06)', padding: '4rem 1.4rem', position: 'relative' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <FadeIn>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.6rem' }}>
            <div>
              <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--tl2)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ display: 'block', width: 14, height: 1, background: 'var(--tl2)' }} />
                Domaine 09
              </p>
              <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px,6.5vw,62px)', fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.02em', lineHeight: 0.95, textTransform: 'uppercase', color: 'var(--tl)' }}>
                Dernières news
              </h2>
              <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--tl2)', lineHeight: 1.7, maxWidth: 480 }}>
                Journalistes indépendants + communauté NIKA. IA modère avant publication.
              </p>
            </div>
          </div>
        </FadeIn>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}
          className="max-md:grid-cols-1">
          {NEWS.map(({ cat, catStyle, title, time, votes }, i) => (
            <FadeIn key={cat} delay={i * 0.1}>
              <div className="news-card" style={{ background: '#fff', borderRadius: 5, border: '1px solid rgba(0,0,0,0.06)', padding: '1.1rem', cursor: 'pointer' }}>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 9px', borderRadius: 2, display: 'inline-block', marginBottom: '0.6rem', ...catStyle }}>
                  {cat}
                </span>
                <div style={{ fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 800, fontStyle: 'italic', color: 'var(--tl)', lineHeight: 1.2, marginBottom: '0.4rem' }}>
                  {title}
                </div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: '#8AAABB', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>{time}</span>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#C0D0D8', display: 'inline-block' }} />
                  <span>⬆ {votes}</span>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.4rem', flexWrap: 'wrap', gap: 8 }}>
          <Link href="/news" style={{ fontFamily: 'var(--fe)', fontSize: 12, fontWeight: 700, fontStyle: 'italic', letterSpacing: '0.07em', textTransform: 'uppercase', padding: '8px 18px', borderRadius: 3, border: '1px solid rgba(0,0,0,0.14)', color: 'var(--tl2)', transition: 'all 0.2s' }}>
            Toutes les news →
          </Link>
          <Link href="/news/new" style={{ fontFamily: 'var(--fe)', fontSize: 12, fontWeight: 700, fontStyle: 'italic', letterSpacing: '0.07em', textTransform: 'uppercase', padding: '8px 18px', borderRadius: 3, background: 'var(--bg3)', color: 'var(--sand)', transition: 'all 0.2s' }}>
            + Publier une info
          </Link>
        </div>
      </div>
    </div>
  );
}
