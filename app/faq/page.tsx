'use client';
import { useState } from 'react';

const FAQS = [
  {
    q: 'Qu\'est-ce que NIKA ?',
    a: 'NIKA est une super-application dédiée à la Côte d\'Azur. Elle regroupe 9 domaines : alimentation, automobile, logement, nautique, location, services, apprentissage, sécurité et actualités — tout le local en une seule app.'
  },
  {
    q: 'Comment créer un compte ?',
    a: 'Clique sur "S\'inscrire" et choisis ton profil (client, pro, VTC ou hôte). Tu peux t\'inscrire par email ou via Google. L\'inscription est gratuite et instantanée.'
  },
  {
    q: 'C\'est quoi les crédits NIKA ?',
    a: 'Les crédits NIKA sont la monnaie virtuelle de la plateforme. 10 crédits = 1€ de valeur. Tu peux en acheter ou en gagner en utilisant l\'app (commandes, avis, check-ins, invitations). Ils se dépensent chez tous les pros NIKA.'
  },
  {
    q: 'Comment fonctionne le système XP ?',
    a: 'Chaque action sur NIKA te rapporte des points d\'expérience : connexion quotidienne (20 XP), commande (30 XP), avis laissé (50 XP), POI créé (80 XP), invitation acceptée (150 XP)... Tu progresses de "Inconnu" à "Légende" en 10 niveaux.'
  },
  {
    q: 'Comment devenir pro sur NIKA ?',
    a: 'Va sur /pro/inscription, choisis ton domaine, renseigne les infos de ton établissement. L\'équipe NIKA vérifie ton dossier sous 48h. Une fois certifié, tu apparais dans le moteur local et peux recevoir des commandes.'
  },
  {
    q: 'Les Flash Deals, c\'est quoi ?',
    a: 'Les Flash Deals sont des offres à durée limitée créées par les pros (1h à 24h). En tant que client, tu reçois une alerte quand un deal se lance dans ton secteur. Tu peux commander à prix réduit directement via l\'app.'
  },
  {
    q: 'Comment fonctionne les cartes NFC ?',
    a: 'Certains pros NIKA disposent de cartes NFC physiques. Scanne la carte avec ton téléphone pour accéder instantanément à leur profil, ta carte de fidélité, ou démarrer une commande. Aucune app à télécharger pour le client.'
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: 'Oui. Tes données sont hébergées sur des serveurs européens (Supabase, RGPD compliant). Tes paiements transitent par Stripe (certifié PCI DSS). Nous ne vendons aucune donnée à des tiers. Consulte notre politique de confidentialité pour plus de détails.'
  },
  {
    q: 'Comment contacter le support ?',
    a: 'Via le formulaire de contact sur /contact ou par email à support@nika.app. Délai de réponse : 24h en semaine, 48h le week-end.'
  },
  {
    q: 'NIKA est disponible dans quelles villes ?',
    a: 'NIKA est lancé sur Nice et s\'étend progressivement à Cannes, Antibes, Monaco, Menton et l\'ensemble de la Côte d\'Azur. Si tu veux que NIKA arrive dans ta ville, contacte-nous !'
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '0.5rem' }}>
        FAQ
      </h1>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', marginBottom: '2.5rem' }}>Questions fréquentes</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {FAQS.map((faq, i) => (
          <div key={i} style={{ background: 'var(--bg2)', border: `1px solid ${open === i ? 'rgba(0,148,212,0.3)' : 'var(--bd)'}`, borderRadius: 10, overflow: 'hidden' }}>
            <button onClick={() => setOpen(open === i ? null : i)} style={{ width: '100%', textAlign: 'left', padding: '1.2rem 1.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}>
              <span style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: open === i ? 'var(--az)' : 'var(--td)', lineHeight: 1.4 }}>{faq.q}</span>
              <span style={{ fontFamily: 'var(--fn)', fontSize: 20, color: 'var(--td3)', flexShrink: 0, transition: 'transform 0.2s', transform: open === i ? 'rotate(180deg)' : 'none' }}>∨</span>
            </button>
            {open === i && (
              <div style={{ padding: '0 1.4rem 1.2rem', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.7 }}>
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
