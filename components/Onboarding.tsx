import FadeIn from './FadeIn';

const STEPS = [
  { n: '01', icon: '👤', title: 'Crée ton profil', desc: 'Inscription en 1 min, wallet NIKA automatiquement créé.' },
  { n: '02', icon: '🗺️', title: 'Explore la carte', desc: 'Tous les spots de Nice en temps réel. Filtre par domaine.' },
  { n: '03', icon: '⚡', title: "Gagne de l'XP", desc: 'Avis, commande, POI créé, news validée — tout compte.' },
  { n: '04', icon: '🔓', title: 'Débloque des avantages', desc: 'Niveaux NIKA, token, caution waiver, offres exclusives.' },
];

export default function Onboarding() {
  return (
    <div id="onboarding" className="sand-grain" style={{
      background: 'var(--sand)', borderTop: '1px solid rgba(0,0,0,0.06)',
      padding: '4rem 1.4rem', position: 'relative',
    }}>
      <FadeIn>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--tl2)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ display: 'block', width: 14, height: 1, background: 'currentColor' }} />
            Comment ça marche
          </p>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px,6.5vw,62px)', fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.02em', lineHeight: 0.95, textTransform: 'uppercase', color: 'var(--tl)', marginBottom: '0.7rem' }}>
            En 4 étapes
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'rgba(0,0,0,0.07)', marginTop: '1.8rem', borderRadius: 6, overflow: 'hidden' }}
            className="max-md:grid-cols-2">
            {STEPS.map((step, i) => (
              <div key={i} style={{ background: 'var(--sand)', padding: '1.4rem 1.1rem', position: 'relative' }}>
                <div style={{ fontFamily: 'var(--fe)', fontSize: 40, fontWeight: 900, fontStyle: 'italic', color: 'rgba(14,31,58,0.07)', lineHeight: 1, marginBottom: '0.2rem' }}>
                  {step.n}
                </div>
                <span style={{ fontSize: 22, marginBottom: '0.5rem', display: 'block' }}>{step.icon}</span>
                <div style={{ fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 800, fontStyle: 'italic', color: 'var(--tl)', marginBottom: '0.25rem' }}>
                  {step.title}
                </div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--tl2)', lineHeight: 1.5 }}>
                  {step.desc}
                </div>
                {i < 3 && (
                  <div style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,0,0,0.18)', fontSize: 16, zIndex: 1 }}
                    className="max-md:hidden">›</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
