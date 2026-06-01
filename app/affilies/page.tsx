import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Programme Affiliés — NIKA',
  description: 'Rejoignez le programme d\'affiliation NIKA. Gagnez des commissions en recommandant des partenaires et logements WOW.',
};

const TIERS = [
  {
    name: 'Ambassadeur',
    commission: '5%',
    desc: 'Sur chaque réservation STAY générée via votre lien',
    color: '#0094D4',
    features: ['Lien de suivi unique', 'Dashboard temps réel', 'Paiement mensuel'],
  },
  {
    name: 'Partenaire',
    commission: '8%',
    desc: 'Dès 10 réservations / mois',
    color: 'var(--gold2)',
    features: ['Tout Ambassadeur', 'Commission sur FOOD & AUTO', 'Support dédié', 'Badge partenaire'],
    highlight: true,
  },
  {
    name: 'Influenceur',
    commission: '12%',
    desc: 'Programme sur mesure pour créateurs de contenu',
    color: 'var(--teal)',
    features: ['Commission maximale', 'Accès exclusifs presse', 'Kits visuels NIKA', 'Co-création contenu'],
  },
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Inscription gratuite', desc: 'Créez votre compte affilié en 2 minutes.' },
  { step: '2', title: 'Obtenez votre lien', desc: 'Lien de tracking unique pour chaque offre NIKA.' },
  { step: '3', title: 'Partagez', desc: 'Blog, réseaux, newsletter — partagez à votre audience.' },
  { step: '4', title: 'Encaissez', desc: 'Commissions versées chaque mois via virement ou wallet NIKA.' },
];

export default function AffiliesPage() {
  return (
    <main style={{ paddingBottom: '5rem' }}>
      {/* Hero */}
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--bd)', padding: 'clamp(3rem,8vw,5rem) 1.4rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: '0.6rem' }}>Programme</p>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(36px,7vw,80px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, marginBottom: '1rem' }}>
            Affiliés
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td2)', lineHeight: 1.7, maxWidth: 520, marginBottom: '1.5rem' }}>
            Recommandez NIKA et gagnez des commissions sur chaque réservation, commande ou inscription générée via votre lien.
          </p>
          <Link href="/contact?sujet=affiliation" style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 900, fontStyle: 'italic', padding: '0.7rem 1.8rem', borderRadius: 6, background: 'var(--az)', color: '#fff', textDecoration: 'none', display: 'inline-block' }}>
            Rejoindre le programme →
          </Link>
        </div>
      </div>

      {/* Comment ça marche */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--bd)', padding: 'clamp(2rem,4vw,3rem) 1.4rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(20px,3vw,32px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.5rem' }}>
            Comment ça marche
          </h2>
          <div style={{ gap: '1rem' }} className="g-4 max-sm:grid-cols-2">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} style={{ background: 'var(--bg3)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1.2rem', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--fn)', fontSize: 28, color: 'var(--az)', marginBottom: '0.5rem' }}>{step}</div>
                <div style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.3rem' }}>{title}</div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', lineHeight: 1.4 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tiers */}
      <div style={{ background: 'var(--bg)', padding: 'clamp(2rem,4vw,3rem) 1.4rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(20px,3vw,32px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.5rem' }}>
            Niveaux de commission
          </h2>
          <div style={{ gap: '1rem' }} className="g-3 max-sm:grid-cols-1">
            {TIERS.map(({ name, commission, desc, color, features, highlight }) => (
              <div key={name} style={{ background: highlight ? 'linear-gradient(160deg,#0D1828,#0F1F30)' : 'var(--bg2)', border: `1px solid ${highlight ? 'rgba(212,160,23,0.3)' : 'var(--bd)'}`, borderRadius: 8, padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color, marginBottom: '0.3rem' }}>{name}</div>
                  <div style={{ fontFamily: 'var(--fe)', fontSize: 36, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', lineHeight: 1 }}>{commission}</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: 2 }}>{desc}</div>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {features.map(f => (
                    <li key={f} style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', display: 'flex', gap: 7 }}>
                      <span style={{ color: 'var(--teal)', flexShrink: 0 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginTop: '1.5rem', textAlign: 'center' }}>
            Programme en beta — <Link href="/contact?sujet=affiliation" style={{ color: 'var(--az)', textDecoration: 'underline', textDecorationColor: 'rgba(0,148,212,0.3)' }}>inscrivez-vous pour être notifié du lancement</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
