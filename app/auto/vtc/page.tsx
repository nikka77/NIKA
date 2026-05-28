import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VTC Nice — Chauffeurs certifiés NIKA | AUTO',
  description: 'Chauffeurs VTC certifiés sur Nice et la Côte d\'Azur. Réservation instantanée, tarifs transparents, véhicules premium.',
};

export default async function VTCPage() {
  const supabase = await createClient();
  const { data: chauffeurs } = supabase
    ? await supabase.from('pros').select('*, listings(*)').eq('domain', 'auto').eq('active', true).eq('verified', true).order('rating', { ascending: false })
    : { data: null };

  const services = [
    { icon: '🏢', title: 'Transfert aéroport', desc: 'Nice Côte d\'Azur, Monaco, Cannes', price: 'Dès 35€', color: '#0094D4' },
    { icon: '🛳️', title: 'Port de Nice / Monaco', desc: 'Croisières, yachts, événements maritimes', price: 'Dès 25€', color: '#0868A0' },
    { icon: '🎰', title: 'Monte-Carlo / Casino', desc: 'Soirées, événements, transfert Monaco', price: 'Dès 55€', color: '#D4A017' },
    { icon: '🎉', title: 'Événement & Gala', desc: 'Mariages, soirées, conférences professionnelles', price: 'Sur devis', color: '#7B5CF0' },
    { icon: '🏖️', title: 'Beach clubs & Plages', desc: 'Juan-les-Pins, Antibes, Cannes', price: 'Dès 20€', color: '#E07038' },
    { icon: '🚞', title: 'Gare de Nice', desc: 'Correspondances TGV, horaires garantis', price: 'Dès 15€', color: '#0EA878' },
  ];

  return (
    <main>
      <div style={{ background: 'linear-gradient(135deg, var(--bg) 0%, var(--bg2) 100%)', borderBottom: '1px solid var(--bd)', padding: '5rem 1.4rem 4rem', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #0094D4, #00C2FF)' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0094D4', marginBottom: '0.6rem' }}>
            02 · Automobile · VTC
          </p>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(48px,8vw,96px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, marginBottom: '1rem' }}>
            VTC <span style={{ color: '#00C2FF' }}>Certifiés</span>
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 16, color: 'var(--td2)', maxWidth: 520, lineHeight: 1.7, marginBottom: '2rem' }}>
            Chauffeurs privés vérifiés par NIKA. Véhicules haut de gamme, tarifs transparents, disponibles maintenant sur la Côte d&apos;Azur.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '13px 30px', borderRadius: 3, background: '#0094D4', color: '#fff', boxShadow: '0 0 28px rgba(0,148,212,0.3)', cursor: 'pointer' }}>
              🚖 Réserver maintenant
            </button>
            <Link href="/auto" style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '13px 30px', borderRadius: 3, border: '1px solid var(--bd2)', color: 'var(--td)' }}>
              ← Retour AUTO
            </Link>
          </div>
        </div>
      </div>

      <div style={{ padding: '4rem 1.4rem', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,4vw,42px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '2rem' }}>
          Destinations populaires
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }} className="max-md:grid-cols-2 max-sm:grid-cols-1">
          {services.map(({ icon, title, desc, price, color }) => (
            <div key={title} style={{ background: 'var(--bg2)', border: `1px solid ${color}25`, borderRadius: 10, padding: '1.5rem', cursor: 'pointer', transition: 'border-color 0.2s', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
              <div style={{ fontSize: 28, marginBottom: '0.7rem' }}>{icon}</div>
              <h3 style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.3rem' }}>{title}</h3>
              <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', lineHeight: 1.5, marginBottom: '0.7rem' }}>{desc}</p>
              <div style={{ fontFamily: 'var(--fn)', fontSize: 20, color }}>{price}</div>
            </div>
          ))}
        </div>
      </div>

      {chauffeurs && chauffeurs.length > 0 && (
        <div style={{ padding: '0 1.4rem 4rem', maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,4vw,42px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '2rem' }}>
            Chauffeurs disponibles
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }} className="max-sm:grid-cols-1">
            {chauffeurs.map((pro: { id: string; business_name: string; verified: boolean; rating: number; description?: string; phone?: string }) => (
              <Link key={pro.id} href={`/pro/${pro.id}`} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.5rem', transition: 'border-color 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.7rem' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.3rem' }}>🚖 {pro.business_name}</div>
                    {pro.verified && <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(14,168,120,0.1)', color: 'var(--teal)', border: '1px solid rgba(14,168,120,0.2)' }}>✓ Certifié NIKA</span>}
                  </div>
                  {pro.rating > 0 && <span style={{ fontFamily: 'var(--fe)', fontSize: 16, fontStyle: 'italic', color: 'var(--gold2)' }}>⭐ {pro.rating.toFixed(1)}</span>}
                </div>
                {pro.description && <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.5, marginBottom: '0.7rem' }}>{pro.description}</p>}
                <div style={{ fontFamily: 'var(--fe)', fontSize: 12, fontStyle: 'italic', color: '#0094D4', display: 'flex', alignItems: 'center', gap: 4 }}>Voir le profil →</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--bd)', padding: '4rem 1.4rem', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,4vw,42px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem' }}>
          Tu es chauffeur VTC ?
        </h2>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', maxWidth: 480, margin: '0 auto 1.5rem', lineHeight: 1.7 }}>
          Rejoins le réseau NIKA. Profil vérifié, clients qualifiés, gestion par SMS.
        </p>
        <Link href="/pro/inscription?domain=auto" style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '13px 30px', borderRadius: 3, background: '#0094D4', color: '#fff', display: 'inline-block' }}>
          Devenir chauffeur NIKA →
        </Link>
      </div>
    </main>
  );
}
