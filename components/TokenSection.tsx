import FadeIn from './FadeIn';

export default function TokenSection() {
  return (
    <div id="token" style={{
      background: 'var(--bg2)', borderTop: '1px solid var(--bd)',
      padding: '5rem 1.4rem',
      backgroundImage: 'radial-gradient(ellipse 50% 60% at 80% 50%,rgba(212,160,23,0.05) 0%,transparent 60%)',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', gap: '3rem', alignItems: 'center' }}
        className="g-2 max-md:grid-cols-1">

        <FadeIn>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ display: 'block', width: 14, height: 1, background: 'currentColor' }} />
            Économie NIKA
          </p>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px,6.5vw,62px)', fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.02em', lineHeight: 0.95, textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.7rem' }}>
            La monnaie <span style={{ color: 'var(--gold2)' }}>NIKA</span>
          </h2>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.7, maxWidth: 480, marginBottom: '1.2rem' }}>
            Pas une crypto — une monnaie de plateforme intégrée. Achetez des crédits, stackez pour des avantages exclusifs dans l&apos;écosystème.
          </p>

          <ul style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: '1.2rem' }}>
            {[
              { icon: '💳', title: 'Achat simple', desc: 'Wallet lié à ton profil. Achat via carte bancaire, sans friction.' },
              { icon: '🔒', title: 'Staking & avantages', desc: 'X NIKA stackés = location sans caution, VTC prioritaire, accès early.' },
              { icon: '⛓️', title: 'ERC-20 · Base network', desc: 'Crédits centralisés phase 1 → migration on-chain transparente phase 2.' },
            ].map(({ icon, title, desc }) => (
              <li key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '11px 13px', borderRadius: 4, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bd)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 3, background: 'rgba(212,160,23,0.07)', border: '1px solid rgba(212,160,23,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                  {icon}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td)', marginBottom: 2 }}>{title}</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td2)', lineHeight: 1.5 }}>{desc}</div>
                </div>
              </li>
            ))}
          </ul>

          <button style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '13px 30px', borderRadius: 3, background: 'var(--gold)', color: '#fff', boxShadow: '0 0 28px rgba(212,160,23,0.18)', transition: 'all 0.25s' }}>
            En savoir plus sur $NIKA
          </button>
        </FadeIn>

        {/* Coin NIKA 3D */}
        <FadeIn delay={0.3}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 240, perspective: 900 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: -40, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,160,23,0.18) 0%, transparent 65%)' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/token/nika-coin.webp" alt="Coin NIKA — monnaie de plateforme" width={190} height={190} className="nika-coin" style={{ position: 'relative', display: 'block' }} />
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
