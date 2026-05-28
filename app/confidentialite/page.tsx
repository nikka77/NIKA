import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Politique de Confidentialité — NIKA' };

export default function ConfidentialitePage() {
  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '0.5rem' }}>
        Confidentialité
      </h1>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginBottom: '3rem' }}>Politique de Confidentialité & RGPD — Version 1.0 · Mai 2026</p>

      {[
        {
          title: 'Données collectées',
          content: 'NIKA collecte les données nécessaires au fonctionnement de la plateforme : adresse email, nom d\'utilisateur, numéro de téléphone (optionnel), données de commande et de paiement (traitées par Stripe), données de géolocalisation (avec votre consentement) et historique d\'activité sur la plateforme.'
        },
        {
          title: 'Utilisation des données',
          content: 'Vos données sont utilisées pour : gérer votre compte et vos commandes, personnaliser votre expérience, calculer votre niveau XP et vos récompenses, contacter les professionnels, et améliorer nos services. Nous n\'utilisons pas vos données à des fins publicitaires tierces.'
        },
        {
          title: 'Stockage & Sécurité',
          content: 'Vos données sont hébergées sur Supabase (serveurs européens, conformes RGPD). Les mots de passe sont hachés. Les données de paiement ne sont pas stockées sur nos serveurs : elles transitent directement via Stripe (certifié PCI DSS Level 1).'
        },
        {
          title: 'Vos droits',
          content: 'Conformément au RGPD, vous disposez d\'un droit d\'accès, de rectification, d\'effacement, de portabilité et d\'opposition. Pour exercer ces droits, contactez-nous à privacy@nika.app. Délai de réponse : 30 jours maximum.'
        },
        {
          title: 'Cookies',
          content: 'NIKA utilise des cookies essentiels au fonctionnement (session d\'authentification) et des cookies analytiques anonymisés. Aucun cookie publicitaire tiers n\'est utilisé. Vous pouvez gérer vos préférences de cookies via les paramètres de votre navigateur.'
        },
        {
          title: 'Partage de données',
          content: 'Vos données ne sont jamais vendues. Elles peuvent être partagées avec : les professionnels NIKA (uniquement les données nécessaires à votre commande) et nos sous-traitants techniques (Supabase, Stripe, opérateur SMS). Tout partage est encadré par un contrat de traitement de données.'
        },
        {
          title: 'Suppression du compte',
          content: 'Vous pouvez demander la suppression de votre compte à tout moment depuis vos paramètres ou en contactant support@nika.app. Les données seront supprimées dans un délai de 30 jours, sauf obligation légale de conservation (données comptables : 10 ans).'
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
