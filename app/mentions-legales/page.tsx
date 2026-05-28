import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Mentions Légales — NIKA' };

export default function MentionsLegalesPage() {
  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '3rem' }}>
        Mentions Légales
      </h1>

      {[
        {
          title: 'Éditeur',
          lines: [
            'NIKA SAS (en cours d\'immatriculation)',
            'Siège social : Nice, Alpes-Maritimes (06), France',
            'Directeur de publication : Dan (fondateur)',
            'Contact : legal@nika.app',
          ]
        },
        {
          title: 'Hébergement',
          lines: [
            'Supabase Inc.',
            '970 Toa Payoh North, Singapour',
            'Serveurs : Union Européenne (Frankfurt)',
            'supabase.com',
          ]
        },
        {
          title: 'Propriété intellectuelle',
          lines: [
            'L\'ensemble des contenus de la plateforme NIKA (logo, typographies, design, code) est protégé par le droit de la propriété intellectuelle.',
            'Toute reproduction sans autorisation préalable est strictement interdite.',
          ]
        },
        {
          title: 'Données personnelles',
          lines: [
            'Responsable du traitement : NIKA SAS',
            'DPO : privacy@nika.app',
            'Pour exercer vos droits RGPD, consultez notre politique de confidentialité.',
          ]
        },
        {
          title: 'Médiation',
          lines: [
            'En cas de litige, vous pouvez recourir à la médiation de la consommation.',
            'Plateforme européenne de règlement en ligne : ec.europa.eu/consumers/odr',
          ]
        },
      ].map(({ title, lines }) => (
        <div key={title} style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 20, fontWeight: 700, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.8rem' }}>{title}</h2>
          {lines.map((line, i) => (
            <p key={i} style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.8, margin: '0 0 0.3rem' }}>{line}</p>
          ))}
        </div>
      ))}
    </main>
  );
}
