import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Notre histoire — NIKA',
  description: 'NIKA est né à Nice. Découvrez l\'histoire de la super-app Côte d\'Azur, notre vision et notre équipe.',
};

const MILESTONES = [
  { year: '2023', title: 'L\'idée', desc: 'NIKA naît à Nice d\'un constat simple : il n\'existe pas d\'app tout-en-un pensée pour les habitants de la Côte d\'Azur.' },
  { year: '2024', title: 'Le prototype', desc: '9 domaines, un agent IA, une carte interactive. Premier prototype avec 12 commerces partenaires à Nice.' },
  { year: '2025', title: 'Le lancement', desc: 'Ouverture publique. Module STAY WOW — 57 logements extraordinaires dans le monde entier. Arrivée de NIKO.' },
  { year: '2026', title: 'L\'expansion', desc: 'Token $NIKA, NFC phygital, extension Antibes et Cannes. Le companion app de la vraie vie.' },
];

const VALUES = [
  { icon: '🌊', title: 'Local d\'abord', desc: 'Nice, Antibes, Cannes — conçu par des gens de la Côte pour les gens de la Côte.' },
  { icon: '🤝', title: 'Transparence', desc: 'Avis vérifiés par IA, prix affichés sans surprise, commissions visibles.' },
  { icon: '🚀', title: 'Technologie humaine', desc: 'NIKO est un agent IA mais reste un outil au service des humains, pas l\'inverse.' },
  { icon: '🌍', title: 'Pensé global', desc: 'Nice d\'abord, le monde ensuite. STAY WOW prouve qu\'on peut rêver grand depuis la Méditerranée.' },
];

export default function AboutPage() {
  return (
    <main style={{ paddingBottom: '5rem' }}>
      {/* Hero */}
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--bd)', padding: 'clamp(3rem,8vw,6rem) 1.4rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: '0.6rem' }}>
            Notre histoire
          </p>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(40px,8vw,90px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, marginBottom: '1.2rem' }}>
            NIKA
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 16, color: 'var(--td2)', lineHeight: 1.8, maxWidth: 560 }}>
            Le companion app de la vraie vie. Né à Nice, pensé pour la Côte d&apos;Azur, ouvert sur le monde.
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--bd)', padding: 'clamp(2.5rem,5vw,4rem) 1.4rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(22px,3vw,36px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '2rem' }}>
            La chronologie
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {MILESTONES.map(({ year, title, desc }, i) => (
              <div key={year} style={{ display: 'flex', gap: '1.5rem', paddingBottom: i < MILESTONES.length - 1 ? '2rem' : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, flexShrink: 0 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--az)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fn)', fontSize: 13, letterSpacing: '0.06em', color: '#fff', flexShrink: 0 }}>{year.slice(2)}</div>
                  {i < MILESTONES.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--bd)', marginTop: 8 }} />}
                </div>
                <div style={{ paddingTop: 10 }}>
                  <div style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.3rem' }}>{year} — {title}</div>
                  <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Values */}
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--bd)', padding: 'clamp(2.5rem,5vw,4rem) 1.4rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(22px,3vw,36px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '2rem' }}>
            Nos valeurs
          </h2>
          <div style={{ gap: '1rem' }} className="g-2 max-sm:grid-cols-1">
            {VALUES.map(({ icon, title, desc }) => (
              <div key={title} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1.3rem' }}>
                <span style={{ fontSize: 28, display: 'block', marginBottom: '0.6rem' }}>{icon}</span>
                <div style={{ fontFamily: 'var(--fe)', fontSize: 16, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.4rem' }}>{title}</div>
                <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', lineHeight: 1.5, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: 'clamp(2.5rem,5vw,4rem) 1.4rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td3)', marginBottom: '1.5rem' }}>Rejoignez l&apos;aventure NIKA</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/pro/inscription" style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 900, fontStyle: 'italic', padding: '0.7rem 1.8rem', borderRadius: 6, background: 'var(--az)', color: '#fff', textDecoration: 'none' }}>
            Devenir partenaire →
          </Link>
          <Link href="/contact" style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, padding: '0.7rem 1.5rem', borderRadius: 6, border: '1px solid var(--bd)', color: 'var(--td2)', textDecoration: 'none' }}>
            Nous contacter
          </Link>
        </div>
      </div>
    </main>
  );
}
