import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Support — NIKA',
  description: 'Aide et support NIKA. FAQ, contact support, résolution de problèmes. Réponse sous 24h.',
};

const TOPICS = [
  {
    icon: '🔐',
    title: 'Compte & Connexion',
    questions: [
      { q: 'Je n\'arrive pas à me connecter', a: 'Utilisez "Mot de passe oublié" sur la page de connexion. Vérifiez votre dossier spam.' },
      { q: 'Comment supprimer mon compte ?', a: 'Envoyez une demande via le formulaire de contact en sélectionnant "Demande RGPD".' },
    ],
  },
  {
    icon: '📦',
    title: 'Commandes',
    questions: [
      { q: 'Ma commande est en retard', a: 'Contactez le prestataire directement via l\'app ou écrivez à support@nika.app avec votre numéro de commande.' },
      { q: 'Comment annuler une commande ?', a: 'Les annulations sont possibles dans les 5 minutes suivant la commande depuis votre dashboard.' },
    ],
  },
  {
    icon: '🏡',
    title: 'STAY — Logements',
    questions: [
      { q: 'Comment réserver un logement WOW ?', a: 'Cliquez sur "Réserver via NIKA" sur la page du logement. Pour les réservations directes, un formulaire de contact sera envoyé au propriétaire.' },
      { q: 'Je n\'ai pas reçu de confirmation', a: 'Vérifiez vos spams. Pour les logements directs, la confirmation arrive sous 24–48h.' },
    ],
  },
  {
    icon: '⭐',
    title: 'Avis & Gamification',
    questions: [
      { q: 'Mon avis a été supprimé', a: 'Notre IA modère les avis suspects. Si vous pensez à une erreur, contactez le support.' },
      { q: 'Mes XP n\'ont pas été crédités', a: 'Les XP sont crédités dans les minutes suivant l\'action. En cas de bug, contactez le support.' },
    ],
  },
];

export default function SupportPage() {
  return (
    <main style={{ paddingBottom: '5rem' }}>
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--bd)', padding: 'clamp(3rem,7vw,5rem) 1.4rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: '0.6rem' }}>Aide</p>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(36px,7vw,80px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, marginBottom: '1rem' }}>
            Support
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td2)', lineHeight: 1.7, maxWidth: 480, marginBottom: '1.5rem' }}>
            Trouvez la réponse à votre question ou contactez notre équipe. Réponse garantie sous 24h.
          </p>
          <Link href="/contact" style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 900, fontStyle: 'italic', padding: '0.7rem 1.8rem', borderRadius: 6, background: 'var(--az)', color: '#fff', textDecoration: 'none', display: 'inline-block' }}>
            Contacter le support →
          </Link>
        </div>
      </div>

      {/* FAQ Topics */}
      <div style={{ background: 'var(--bg2)', padding: 'clamp(2rem,4vw,3.5rem) 1.4rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {TOPICS.map(({ icon, title, questions }) => (
            <div key={title}>
              <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(18px,2.5vw,26px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>{icon}</span> {title}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {questions.map(({ q, a }) => (
                  <div key={q} style={{ background: 'var(--bg3)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1rem 1.2rem' }}>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)', marginBottom: '0.4rem' }}>{q}</div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.5 }}>{a}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact fallback */}
      <div style={{ padding: '2rem 1.4rem', textAlign: 'center', borderTop: '1px solid var(--bd)' }}>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '0.8rem' }}>
          Vous n&apos;avez pas trouvé la réponse ?
        </p>
        <Link href="/contact" style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--az)', textDecoration: 'underline', textDecorationColor: 'rgba(0,148,212,0.3)' }}>
          Écrire à support@nika.app →
        </Link>
      </div>
    </main>
  );
}
