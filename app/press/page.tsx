import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Presse — NIKA',
  description: 'Kit presse NIKA, logos, visuels et contacts médias. Super-app Côte d\'Azur.',
};

const PRESS_ITEMS = [
  { outlet: 'Nice-Matin', date: 'Bientôt', title: 'NIKA, la super-app qui veut révolutionner la Côte d\'Azur', type: 'À venir' },
  { outlet: 'TechCrunch FR', date: 'Bientôt', title: 'L\'app niçoise qui challenge Airbnb avec des logements insolites', type: 'À venir' },
  { outlet: 'Forbes France', date: 'Bientôt', title: 'NIKA, le token $NIKA et la gamification de la vie locale', type: 'À venir' },
];

const ASSETS = [
  { name: 'Logo NIKA (SVG, PNG)', desc: 'Versions blanc/noir, fond transparent, variantes couleur', icon: '🎨' },
  { name: 'Screenshots produit', desc: 'App iOS/Android, desktop — haute résolution', icon: '📱' },
  { name: 'Dossier de presse PDF', desc: 'Présentation complète, chiffres clés, équipe fondatrice', icon: '📄' },
  { name: 'Brand guidelines', desc: 'Typographies, couleurs, règles d\'usage de la marque', icon: '📐' },
];

export default function PressPage() {
  return (
    <main style={{ paddingBottom: '5rem' }}>
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--bd)', padding: 'clamp(3rem,8vw,5rem) 1.4rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: '0.6rem' }}>Médias & Presse</p>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(36px,7vw,80px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, marginBottom: '1.2rem' }}>
            Presse
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td2)', lineHeight: 1.7, maxWidth: 520, marginBottom: '1.5rem' }}>
            Kit de presse, visuels et contact journalistes. Réponse sous 4h pour toute demande media.
          </p>
          <Link href="/contact?sujet=presse" style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 900, fontStyle: 'italic', padding: '0.7rem 1.8rem', borderRadius: 6, background: 'var(--az)', color: '#fff', textDecoration: 'none', display: 'inline-block' }}>
            Contact presse →
          </Link>
        </div>
      </div>

      {/* Press assets */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--bd)', padding: 'clamp(2rem,4vw,3rem) 1.4rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(20px,3vw,32px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.5rem' }}>
            Assets disponibles
          </h2>
          <div style={{ gap: '0.8rem' }} className="g-2 max-sm:grid-cols-1">
            {ASSETS.map(({ name, desc, icon }) => (
              <div key={name} style={{ background: 'var(--bg3)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1.2rem', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)', marginBottom: '0.2rem' }}>{name}</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', lineHeight: 1.4 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginTop: '1.2rem' }}>
            Kit presse disponible sur demande — <Link href="/contact?sujet=presse" style={{ color: 'var(--az)', textDecoration: 'underline' }}>contact presse</Link>
          </p>
        </div>
      </div>

      {/* Coverage */}
      <div style={{ background: 'var(--bg)', padding: 'clamp(2rem,4vw,3rem) 1.4rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(20px,3vw,32px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.5rem' }}>
            Revue de presse
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {PRESS_ITEMS.map(({ outlet, date, title, type }) => (
              <div key={outlet} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: 'var(--az)', letterSpacing: '0.06em' }}>{outlet}</span>
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', background: 'rgba(0,148,212,0.08)', border: '1px solid rgba(0,148,212,0.15)', borderRadius: 20, padding: '1px 7px' }}>{type}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.4 }}>{title}</div>
                </div>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', flexShrink: 0 }}>{date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
