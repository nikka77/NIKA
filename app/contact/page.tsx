import type { Metadata } from 'next';
import ContactForm from './ContactForm';

export const metadata: Metadata = {
  title: 'Contact — NIKA Côte d\'Azur',
  description: 'Contactez l\'équipe NIKA pour une question, un partenariat ou une réservation directe de logement insolite. Réponse sous 24h.',
  keywords: ['contact nika', 'support nika', 'partenariat nika', 'réservation logement insolite'],
};

export default function ContactPage() {
  return <ContactForm />;
}
