import type { Metadata } from 'next';
import Link from 'next/link';
import { DOMAINS } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Espace Partenaire — NIKA Pro',
  description: 'Référencez votre commerce sur NIKA. Touchez les locaux et les visiteurs de la Côte d\'Azur. Flash deals, commandes, avis vérifiés.',
};

const AVANTAGES = [
  { icon: '⚡', title: 'Flash Deals', desc: 'Créez des offres limitées et vendez vos invendus en quelques secondes.' },
  { icon: '📦', title: 'Commandes directes', desc: 'Recevez des commandes click & collect ou livraison sans commission excessive.' },
  { icon: '⭐', title: 'Avis vérifiés IA', desc: 'NIKA Score : avis filtrés par IA, fraude éliminée. Votre réputation protégée.' },
  { icon: '🗺️', title: 'Carte interactive', desc: 'Présence sur la carte NIKA visible par tous les utilisateurs de la zone.' },
  { icon: '📊', title: 'Dashboard analytics', desc: 'Stats temps réel : vues, clics, conversions, chiffre d\'affaires.' },
  { icon: '🎯', title: 'Ciblage local', desc: 'Touchez précisément les habitants et visiteurs de votre quartier.' },
];

const PLANS = [
  {
    name: 'Starter',
    price: 'Gratuit',
    period: '',
    color: 'var(--td3)',
    features: ['Fiche commerce', '5 Flash Deals / mois', 'Avis vérifiés', 'Carte interactive'],
    cta: 'Démarrer gratuitement',
    href: '/pro/inscription',
  },
  {
    name: 'Pro',
    price: '49€',
    period: '/ mois',
    color: '#0094D4',
    features: ['Tout Starter', 'Flash Deals illimités', 'Commandes directes', 'Dashboard analytics', 'Badge Pro vérifié', 'Support prioritaire'],
    cta: 'Passer Pro',
    href: '/pro/inscription?plan=pro',
    highlight: true,
  },
  {
    name: 'Business',
    price: '149€',
    period: '/ mois',
    color: 'var(--gold2)',
    features: ['Tout Pro', 'Multi-établissements', 'API commandes', 'Intégration POS', 'Account manager dédié'],
    cta: 'Nous contacter',
    href: '/contact?sujet=business',
  },
];

export default function ProPage() {
  return (
    <main style={{ paddingBottom: '5rem' }}>
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--bg)', borderBottom: '1px solid var(--bd)', padding: 'clamp(3rem,8vw,6rem) 1.4rem' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,148,212,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,148,212,0.04) 1px,transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative' }}>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ display: 'block', width: 14, height: 1, background: 'currentColor' }} />
            Espace Partenaire
          </p>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(40px,8vw,90px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, marginBottom: '1.2rem' }}>
            Rejoins<br />NIKA Pro
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td2)', lineHeight: 1.7, maxWidth: 560, marginBottom: '2rem' }}>
            Référencez votre commerce et touchez des milliers de locaux et visiteurs sur la Côte d&apos;Azur. Flash deals, commandes directes, avis vérifiés par IA.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/pro/inscription" style={{
              fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 900, fontStyle: 'italic',
              padding: '0.75rem 2rem', borderRadius: 6,
              background: '#0094D4', color: '#fff',
              textDecoration: 'none', letterSpacing: '0.04em',
            }}>
              Référencer mon commerce →
            </Link>
            <Link href="/pro/dashboard" style={{
              fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600,
              padding: '0.75rem 1.5rem', borderRadius: 6,
              border: '1px solid var(--bd)', color: 'var(--td2)',
              textDecoration: 'none',
            }}>
              Accéder à mon espace
            </Link>
          </div>
        </div>
      </div>

      {/* ── STATS ─────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--bd)', padding: '1.6rem 1.4rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'space-around' }}>
          {[
            { val: '312', label: 'Commerces référencés' },
            { val: '48', label: 'Pros vérifiés' },
            { val: '9', label: 'Domaines actifs' },
            { val: '4.8★', label: 'Satisfaction partenaires' },
          ].map(({ val, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--fe)', fontSize: 28, fontWeight: 900, fontStyle: 'italic', color: '#0094D4', lineHeight: 1 }}>{val}</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DOMAINES ─────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--bd)', padding: 'clamp(2rem,4vw,3rem) 1.4rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: '1rem' }}>
            9 domaines disponibles
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {DOMAINS.map(d => (
              <Link key={d.slug} href={`/pro/inscription?domain=${d.slug}`} style={{
                fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
                padding: '5px 12px', borderRadius: 20,
                background: `${d.color}10`, border: `1px solid ${d.color}30`,
                color: d.color, textDecoration: 'none',
                letterSpacing: '0.05em',
              }}>
                {d.icon} {d.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── AVANTAGES ────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--bd)', padding: 'clamp(2.5rem,5vw,4rem) 1.4rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,4vw,42px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '2rem' }}>
            Ce que tu gagnes
          </h2>
          <div style={{ gap: '1rem' }} className="g-3 max-sm:grid-cols-1">
            {AVANTAGES.map(({ icon, title, desc }) => (
              <div key={title} style={{ background: 'var(--bg3)', border: '1px solid var(--bd)', borderRadius: 6, padding: '1.2rem' }}>
                <span style={{ fontSize: 28, display: 'block', marginBottom: '0.6rem' }}>{icon}</span>
                <div style={{ fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.4rem' }}>{title}</div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PLANS ────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg)', padding: 'clamp(2.5rem,5vw,4rem) 1.4rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,4vw,42px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.5rem' }}>
            Tarifs
          </h2>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '2rem' }}>
            Sans engagement. Changez de plan à tout moment.
          </p>
          <div style={{ gap: '1rem' }} className="g-3 max-sm:grid-cols-1">
            {PLANS.map(({ name, price, period, color, features, cta, href, highlight }) => (
              <div key={name} style={{
                background: highlight ? 'linear-gradient(160deg,#071828,#0A1E30)' : 'var(--bg3)',
                border: `1px solid ${highlight ? 'rgba(0,148,212,0.35)' : 'var(--bd)'}`,
                borderRadius: 8, padding: '1.5rem',
                display: 'flex', flexDirection: 'column', gap: '1rem',
                position: 'relative',
              }}>
                {highlight && (
                  <div style={{ position: 'absolute', top: -1, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#0094D4,transparent)', borderRadius: '8px 8px 0 0' }} />
                )}
                <div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color, marginBottom: '0.3rem' }}>{name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontFamily: 'var(--fe)', fontSize: 32, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)' }}>{price}</span>
                    {period && <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>{period}</span>}
                  </div>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                  {features.map(f => (
                    <li key={f} style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--teal)', flexShrink: 0, marginTop: 1 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={href} style={{
                  fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 900, fontStyle: 'italic',
                  display: 'block', textAlign: 'center',
                  padding: '0.6rem 1rem', borderRadius: 5,
                  background: highlight ? '#0094D4' : 'transparent',
                  border: highlight ? 'none' : '1px solid var(--bd)',
                  color: highlight ? '#fff' : 'var(--td2)',
                  textDecoration: 'none', letterSpacing: '0.04em',
                }}>
                  {cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
