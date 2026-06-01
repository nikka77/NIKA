import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Politique Cookies — NIKA',
  description: 'Politique d\'utilisation des cookies sur NIKA. Cookies essentiels, analytiques et de préférence.',
};

const COOKIE_TYPES = [
  {
    name: 'Cookies essentiels',
    required: true,
    desc: 'Nécessaires au fonctionnement de la plateforme. Authentification, session, panier, préférences de base.',
    examples: ['Session utilisateur', 'Token d\'authentification', 'Préférences d\'affichage'],
  },
  {
    name: 'Cookies analytiques',
    required: false,
    desc: 'Nous aident à comprendre comment vous utilisez NIKA pour améliorer votre expérience. Données anonymisées.',
    examples: ['Pages visitées', 'Durée de session', 'Fonctionnalités utilisées'],
  },
  {
    name: 'Cookies de performance',
    required: false,
    desc: 'Optimisent le chargement des pages et la fluidité de l\'interface.',
    examples: ['Cache navigateur', 'Ressources statiques', 'CDN tokens'],
  },
];

export default function CookiesPage() {
  return (
    <main style={{ padding: 'clamp(3rem,7vw,5rem) 1.4rem clamp(3rem,7vw,5rem)', maxWidth: 760, margin: '0 auto' }}>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: '0.6rem' }}>Légal</p>
      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,5vw,56px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, marginBottom: '1rem' }}>
        Politique Cookies
      </h1>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '3rem' }}>
        Dernière mise à jour : janvier 2025
      </p>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.8rem' }}>Qu&apos;est-ce qu&apos;un cookie ?</h2>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.8 }}>
          Un cookie est un petit fichier texte déposé sur votre appareil lors de votre visite sur NIKA. Il permet à la plateforme de mémoriser vos préférences, de maintenir votre session active et d&apos;améliorer votre expérience.
        </p>
      </section>

      {COOKIE_TYPES.map(({ name, required, desc, examples }) => (
        <section key={name} style={{ marginBottom: '2rem', background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1.4rem 1.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.6rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontFamily: 'var(--fe)', fontSize: 17, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', margin: 0 }}>{name}</h3>
            <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, background: required ? 'rgba(14,168,120,0.12)' : 'rgba(0,148,212,0.1)', border: `1px solid ${required ? 'rgba(14,168,120,0.3)' : 'rgba(0,148,212,0.25)'}`, color: required ? 'var(--teal)' : 'var(--az)' }}>
              {required ? 'Obligatoire' : 'Optionnel'}
            </span>
          </div>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.6, marginBottom: '0.8rem' }}>{desc}</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {examples.map(ex => (
              <span key={ex} style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', background: 'var(--bg3)', border: '1px solid var(--bd)', borderRadius: 4, padding: '2px 8px' }}>{ex}</span>
            ))}
          </div>
        </section>
      ))}

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.8rem' }}>Gérer vos préférences</h2>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.8 }}>
          Vous pouvez configurer votre navigateur pour refuser les cookies. Notez que la désactivation des cookies essentiels empêchera la connexion à votre compte NIKA.
        </p>
      </section>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid var(--bd)' }}>
        <Link href="/confidentialite" style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--az)', textDecoration: 'underline', textDecorationColor: 'rgba(0,148,212,0.3)' }}>Politique de confidentialité</Link>
        <Link href="/mentions-legales" style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--az)', textDecoration: 'underline', textDecorationColor: 'rgba(0,148,212,0.3)' }}>Mentions légales</Link>
        <Link href="/contact" style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--az)', textDecoration: 'underline', textDecorationColor: 'rgba(0,148,212,0.3)' }}>Contact</Link>
      </div>
    </main>
  );
}
