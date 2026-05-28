import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Conditions Générales d\'Utilisation — NIKA' };

export default function CguPage() {
  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '0.5rem' }}>
        CGU
      </h1>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginBottom: '3rem' }}>Conditions Générales d&apos;Utilisation — Version 1.0 · Mai 2026</p>

      {[
        {
          title: '1. Objet',
          content: 'NIKA est une super-application locale dédiée à la Côte d\'Azur, permettant aux utilisateurs de découvrir, commander et interagir avec des professionnels locaux certifiés. Les présentes CGU régissent l\'utilisation de la plateforme NIKA accessible via l\'application mobile et le site web.'
        },
        {
          title: '2. Accès à la plateforme',
          content: 'L\'accès à NIKA est ouvert à toute personne physique majeure ou mineure avec autorisation parentale. L\'inscription est gratuite pour les utilisateurs. Les professionnels peuvent s\'inscrire via le parcours pro et sont soumis à une vérification par l\'équipe NIKA avant activation.'
        },
        {
          title: '3. Compte utilisateur',
          content: 'Chaque utilisateur est responsable de la confidentialité de ses identifiants. En cas de compromission suspectée, l\'utilisateur doit immédiatement informer NIKA via le formulaire de contact. NIKA ne pourra être tenu responsable des pertes consécutives à une utilisation non autorisée.'
        },
        {
          title: '4. Crédits NIKA',
          content: 'Les crédits NIKA sont une monnaie virtuelle utilisable exclusivement sur la plateforme. Ils peuvent être achetés en euros ou gagnés via le système de points d\'expérience (XP). Les crédits ne sont pas remboursables en espèces et n\'ont pas de valeur monétaire légale.'
        },
        {
          title: '5. Commandes & Paiements',
          content: 'Les commandes passées via NIKA sont des contrats entre l\'utilisateur et le professionnel. NIKA agit en tant qu\'intermédiaire technique. Le paiement en ligne est sécurisé via Stripe. Les litiges doivent être résolus directement entre les parties ou via le service client NIKA.'
        },
        {
          title: '6. Contenu utilisateur',
          content: 'Les utilisateurs peuvent publier des avis, commentaires et points d\'intérêt. Tout contenu diffamatoire, illégal ou contraire aux bonnes mœurs est interdit. NIKA se réserve le droit de modérer et supprimer tout contenu sans préavis.'
        },
        {
          title: '7. Responsabilité',
          content: 'NIKA s\'efforce d\'assurer la disponibilité de la plateforme 24h/24 mais ne garantit pas l\'absence d\'interruption. La responsabilité de NIKA est limitée au montant des transactions effectuées sur la plateforme dans les 30 jours précédant le litige.'
        },
        {
          title: '8. Modification des CGU',
          content: 'NIKA se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés par email avec un délai de préavis de 15 jours. La poursuite de l\'utilisation après ce délai vaut acceptation des nouvelles conditions.'
        },
        {
          title: '9. Droit applicable',
          content: 'Les présentes CGU sont soumises au droit français. En cas de litige, les parties s\'engagent à rechercher une solution amiable avant tout recours judiciaire. À défaut, les tribunaux compétents de Nice seront seuls habilités.'
        },
      ].map(({ title, content }) => (
        <div key={title} style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 20, fontWeight: 700, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.6rem' }}>{title}</h2>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.8, margin: 0 }}>{content}</p>
        </div>
      ))}
    </main>
  );
}
