import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TOOLS — Outils pratiques Côte d\'Azur | NIKA',
  description: 'La boîte à outils NIKA : convertisseur de devises, météo et marées, parkings en temps réel, numéros utiles, trafic A8, qualité de l\'eau de baignade. Tout pour vivre la Côte d\'Azur.',
  keywords: ['météo marées nice', 'parking temps réel côte d\'azur', 'numéros urgence nice', 'trafic a8', 'qualité eau baignade'],
};

const ACCENT = '#12B8CC';

const TOOLS: { icon: string; label: string; desc: string; href?: string }[] = [
  { icon: '🚚', label: 'Livraison', desc: 'Kit livreur, équipe, colis & avis express', href: '/tools/livraison' },
  { icon: '💱', label: 'Convertisseur', desc: 'Taux du jour, € ⇄ devises', href: '/tools/convertisseur' },
  { icon: '🌊', label: 'Météo & marées', desc: 'Mer, vent et horaires de marée', href: '/tools/meteo' },
  { icon: '🅿️', label: 'Parkings', desc: 'Places libres en temps réel' },
  { icon: '🆘', label: 'Numéros utiles', desc: 'Urgences & services de la Côte', href: '/tools/numeros' },
  { icon: '🚦', label: 'Trafic A8', desc: 'État des routes en direct' },
  { icon: '🏖️', label: 'Qualité de l\'eau', desc: 'Baignade & Pavillon Bleu' },
  { icon: '☀️', label: 'UV & pollens', desc: 'L\'indice du jour, heure par heure' },
  { icon: '🗣️', label: 'Traduction', desc: 'FR ⇄ EN / IT en un tap' },
];

export default function ToolsPage() {
  return (
    <main>
      {/* ── HERO ── */}
      <div style={{
        background: 'linear-gradient(180deg, #04181C 0%, #07252B 58%, var(--bg) 100%)',
        borderBottom: '1px solid var(--bd)',
        padding: 'clamp(3rem,7vw,5.5rem) 1.4rem 3rem',
        position: 'relative', overflow: 'hidden',
      }}>
        <div aria-hidden style={{ position: 'absolute', top: -90, right: -60, width: 280, height: 280, borderRadius: '50%', background: `radial-gradient(circle, ${ACCENT}33, transparent 70%)`, filter: 'blur(8px)' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT, marginBottom: '1rem' }}>
            🧰 NIKA TOOLS — Domaine 10
          </div>
          <h1 style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(2.2rem,6vw,3.6rem)', lineHeight: 1.02, letterSpacing: '0.01em', textTransform: 'uppercase', color: 'var(--td)', margin: 0, maxWidth: 760 }}>
            La boîte à outils<br />de la Côte d&rsquo;Azur
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 'clamp(0.95rem,2vw,1.1rem)', color: 'var(--td2)', marginTop: '1.1rem', maxWidth: 540, lineHeight: 1.55 }}>
            Tous les utilitaires du quotidien réunis au même endroit — météo de la mer, parkings, taux de change, numéros d&rsquo;urgence. Pratique, local, instantané.
          </p>
        </div>
      </div>

      {/* ── GRILLE D'OUTILS ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(2rem,5vw,3.5rem) 1.4rem 5rem' }}>
        <div className="g-3" style={{ gap: '1rem' }}>
          {TOOLS.map(t => {
            const live = !!t.href;
            const cardStyle: React.CSSProperties = {
              position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.55rem',
              padding: '1.25rem', borderRadius: 16,
              border: `1px solid ${live ? ACCENT + '99' : 'var(--bd2)'}`,
              background: live ? `linear-gradient(160deg, ${ACCENT}24, ${ACCENT}08)` : 'linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
              boxShadow: live ? `0 8px 28px ${ACCENT}22` : 'none', textDecoration: 'none',
            };
            const inner = (
              <>
                <span style={{ fontSize: 30 }} aria-hidden>{t.icon}</span>
                <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: '1.15rem', textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--td)' }}>{t.label}</span>
                <span style={{ fontFamily: 'var(--fo)', fontSize: '0.85rem', color: 'var(--td2)', lineHeight: 1.4 }}>{t.desc}</span>
                <span style={{ alignSelf: 'flex-start', marginTop: '0.35rem', fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: ACCENT, background: `${ACCENT}1c`, border: `1px solid ${ACCENT}55`, borderRadius: 20, padding: '3px 9px' }}>{live ? 'Ouvrir →' : 'Bientôt'}</span>
              </>
            );
            return live
              ? <Link key={t.label} href={t.href!} style={cardStyle}>{inner}</Link>
              : <div key={t.label} style={cardStyle}>{inner}</div>;
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <Link href="/" style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase', color: ACCENT, display: 'inline-flex', alignItems: 'center', gap: 6 }}>← Retour à l&rsquo;accueil</Link>
        </div>
      </section>
    </main>
  );
}
