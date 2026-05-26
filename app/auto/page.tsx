import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AUTO — Dépannage & VTC Nice | NIKA',
  description: 'Dépannage automobile, VTC certifiés, lavage, mécanique mobile sur la Côte d\'Azur. Géolocalisation en temps réel.',
};

export default async function AutoPage() {
  const supabase = await createClient();
  const { data: pros } = supabase
    ? await supabase.from('pros').select('*, listings(*)').eq('domain', 'auto').eq('active', true).order('rating', { ascending: false })
    : { data: null };

  const services = [
    { icon: '🔧', title: 'Dépannage', desc: 'Pro le plus proche en temps réel. ETA garanti.', color: '#0094D4' },
    { icon: '🚖', title: 'VTC', desc: 'Chauffeurs certifiés NIKA. Réservation instantanée.', color: '#00C2FF' },
    { icon: '⛽', title: 'Carburant', desc: 'Livraison de carburant directement à votre véhicule.', color: '#E07038' },
    { icon: '🚿', title: 'Lavage mobile', desc: 'Lavage à la mousse écologique sans eau sur votre parking.', color: '#0EA878' },
    { icon: '🔑', title: 'Location', desc: 'Véhicules disponibles immédiatement. Sans agence physique.', color: '#7B5CF0' },
    { icon: '🏎️', title: 'Mécanique mobile', desc: 'Vidange, pneus, freins. L\'atelier vient à vous.', color: '#D4A017' },
  ];

  return (
    <main>
      {/* Hero */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--bd)', padding: '5rem 1.4rem 4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0094D4', marginBottom: '0.6rem' }}>
            02 / Automobile & VTC
          </p>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(48px,8vw,96px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, marginBottom: '1rem' }}>
            AUTO
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 16, color: 'var(--td2)', maxWidth: 520, lineHeight: 1.7, marginBottom: '2rem' }}>
            Dépannage Uber-like, VTC avec chauffeurs de confiance vérifiés NIKA, lavage mobile, livraison carburant et location — tout l&apos;automobile en un seul endroit.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '13px 30px', borderRadius: 3, background: '#0094D4', color: '#fff', boxShadow: '0 0 28px rgba(0,148,212,0.3)' }}>
              🔧 Dépannage maintenant
            </button>
            <button style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '13px 30px', borderRadius: 3, border: '1px solid var(--bd2)', color: 'var(--td)' }}>
              🚖 Appeler un VTC
            </button>
          </div>
        </div>
      </div>

      {/* Services grid */}
      <div style={{ padding: '4rem 1.4rem', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,4vw,42px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '2rem' }}>
          Services disponibles
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem' }}
          className="max-md:grid-cols-2 max-sm:grid-cols-1">
          {services.map(({ icon, title, desc, color }) => (
            <div key={title} style={{ background: 'var(--bg2)', border: `1px solid ${color}22`, borderRadius: 8, padding: '1.5rem', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, opacity: 0.75 }} />
              <div style={{ fontSize: 32, marginBottom: '0.8rem' }}>{icon}</div>
              <h3 style={{ fontFamily: 'var(--fe)', fontSize: 20, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.5rem' }}>{title}</h3>
              <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pros listings */}
      {pros && pros.length > 0 && (
        <div style={{ padding: '0 1.4rem 4rem', maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,4vw,42px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '2rem' }}>
            Pros certifiés NIKA
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1rem' }}
            className="max-sm:grid-cols-1">
            {pros.map((pro) => (
              <div key={pro.id} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1.5rem', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)' }}>{pro.business_name}</div>
                    {pro.verified && (
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, background: 'rgba(14,168,120,0.1)', color: 'var(--teal)', border: '1px solid rgba(14,168,120,0.2)' }}>
                        ✓ Certifié
                      </span>
                    )}
                  </div>
                  {pro.rating > 0 && (
                    <div style={{ fontFamily: 'var(--fe)', fontSize: 16, fontWeight: 700, fontStyle: 'italic', color: 'var(--gold2)' }}>
                      ⭐ {pro.rating.toFixed(1)}
                    </div>
                  )}
                </div>
                {pro.description && (
                  <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.6, marginBottom: '0.8rem' }}>{pro.description}</p>
                )}
                {pro.phone && (
                  <a href={`tel:${pro.phone}`} style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: '#0094D4' }}>
                    📞 {pro.phone}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Devenir pro */}
      <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--bd)', padding: '4rem 1.4rem', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,4vw,42px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem' }}>
          Tu es un pro de l&apos;automobile ?
        </h2>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', maxWidth: 480, margin: '0 auto 1.6rem', lineHeight: 1.7 }}>
          Rejoins le réseau NIKA. Gère tout par SMS, reçois des demandes géolocalisées, développe ta clientèle.
        </p>
        <Link href="/pro/register?domain=auto" style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '13px 30px', borderRadius: 3, background: '#0094D4', color: '#fff', boxShadow: '0 0 28px rgba(0,148,212,0.3)', display: 'inline-block' }}>
          Rejoindre en tant que pro →
        </Link>
      </div>
    </main>
  );
}
