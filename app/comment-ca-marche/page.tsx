import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Comment ça marche — NIKA' };

const STEPS_CLIENT = [
  { n: '01', title: 'Crée ton compte', desc: 'Inscription gratuite en 30 secondes. Google ou email. Tu choisis ton pseudo et c\'est parti.', icon: '👤' },
  { n: '02', title: 'Explore le local', desc: 'Parcours les 9 domaines NIKA ou utilise la carte interactive pour trouver ce dont tu as besoin près de toi.', icon: '🗺️' },
  { n: '03', title: 'Commande & profite', desc: 'Commande directement depuis l\'app, utilise tes crédits NIKA, et gagne de l\'XP à chaque achat.', icon: '🛒' },
  { n: '04', title: 'Monte en niveau', desc: 'Chaque action te rapporte de l\'XP. De "Inconnu" à "Légende", débloques des avantages exclusifs.', icon: '⭐' },
];

const STEPS_PRO = [
  { n: '01', title: 'Inscris ton activité', desc: 'Choisis ton domaine, renseigne ton établissement. Simple, rapide, gratuit.', icon: '🏪' },
  { n: '02', title: 'Vérification NIKA', desc: 'L\'équipe NIKA vérifie ton dossier sous 48h. Tu obtiens le badge "Certifié NIKA".', icon: '✓' },
  { n: '03', title: 'Gère par SMS', desc: 'Mets à jour ton stock, tes horaires, lance des Flash Deals — tout par SMS ou depuis ton espace pro.', icon: '📱' },
  { n: '04', title: 'Reçois des commandes', desc: 'Les clients locaux te trouvent, commandent, laissent des avis. Tu développes ta clientèle locale.', icon: '💰' },
];

export default function CommentCaMarchePage() {
  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px,5vw,64px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, marginBottom: '0.5rem' }}>
        Comment ça marche ?
      </h1>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td2)', marginBottom: '3.5rem', lineHeight: 1.6, maxWidth: 500 }}>
        NIKA connecte les habitants de la Côte d&apos;Azur avec les meilleurs professionnels locaux.
      </p>

      {/* Pour les clients */}
      <div style={{ marginBottom: '4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.8rem' }}>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--az)', background: 'rgba(0,148,212,0.08)', border: '1px solid rgba(0,148,212,0.2)', borderRadius: 20, padding: '4px 12px' }}>Pour les clients</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }} className="max-md:grid-cols-2 max-sm:grid-cols-1">
          {STEPS_CLIENT.map(step => (
            <div key={step.n} style={{ background: 'var(--bg2)', border: '1px solid rgba(0,148,212,0.15)', borderRadius: 12, padding: '1.6rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--az)' }} />
              <div style={{ fontFamily: 'var(--fn)', fontSize: 36, color: 'rgba(0,148,212,0.15)', lineHeight: 1, marginBottom: '0.8rem' }}>{step.n}</div>
              <div style={{ fontSize: 28, marginBottom: '0.5rem' }}>{step.icon}</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: 'var(--td)', marginBottom: '0.5rem' }}>{step.title}</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', lineHeight: 1.6 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pour les pros */}
      <div style={{ marginBottom: '4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.8rem' }}>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.2)', borderRadius: 20, padding: '4px 12px' }}>Pour les professionnels</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }} className="max-md:grid-cols-2 max-sm:grid-cols-1">
          {STEPS_PRO.map(step => (
            <div key={step.n} style={{ background: 'var(--bg2)', border: '1px solid rgba(212,160,23,0.15)', borderRadius: 12, padding: '1.6rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--gold)' }} />
              <div style={{ fontFamily: 'var(--fn)', fontSize: 36, color: 'rgba(212,160,23,0.15)', lineHeight: 1, marginBottom: '0.8rem' }}>{step.n}</div>
              <div style={{ fontSize: 28, marginBottom: '0.5rem' }}>{step.icon}</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: 'var(--td)', marginBottom: '0.5rem' }}>{step.title}</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', lineHeight: 1.6 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 14, padding: '2rem', marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 24, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.5rem' }}>Ce qui rend NIKA unique</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.2rem' }} className="max-sm:grid-cols-1">
          {[
            { icon: '📱', title: 'Gestion par SMS', desc: 'Les pros mettent à jour leur profil par SMS — sans app, sans PC.' },
            { icon: '⚡', title: 'Flash Deals', desc: 'Offres limitées en temps réel. Jusqu\'à -50% chez les pros locaux.' },
            { icon: '🏷️', title: 'Cartes NFC', desc: '20 types de cartes physiques. Scanne et accède instantanément.' },
            { icon: '⭐', title: 'Système XP', desc: '10 niveaux, des récompenses exclusives. Deviens une Légende locale.' },
            { icon: '💰', title: 'Crédits NIKA', desc: 'Économise sur chaque commande. Utilisables dans tous les domaines.' },
            { icon: '🗺️', title: 'Carte locale', desc: 'Tous les POIs et pros sur une carte interactive. Découvre ton quartier.' },
          ].map(f => (
            <div key={f.title} style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 22, flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)', marginBottom: '0.2rem' }}>{f.title}</div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/inscription" style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '13px 28px', borderRadius: 6, background: 'var(--az)', color: '#fff', textDecoration: 'none' }}>
          Créer mon compte →
        </Link>
        <Link href="/pro/inscription" style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '13px 28px', borderRadius: 6, background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.3)', color: 'var(--gold)', textDecoration: 'none' }}>
          Inscrire mon activité →
        </Link>
      </div>
    </main>
  );
}
