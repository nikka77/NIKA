import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Location voiture Nice — Sans agence | NIKA AUTO',
  description: 'Location de véhicules à Nice et Côte d\'Azur. Voitures, scooters, utilitaires. Disponible maintenant, sans agence physique.',
};

export default async function LocationPage() {
  const supabase = await createClient();
  const { data: vehicles } = supabase
    ? await supabase.from('listings').select('*, pros(business_name, phone, verified, rating)').eq('domain', 'auto').eq('available', true).order('created_at', { ascending: false })
    : { data: null };

  const categories = [
    { icon: '🚗', label: 'Citadines', desc: 'Parfait pour la ville', color: '#0094D4' },
    { icon: '🚙', label: 'SUV / Crossover', desc: 'Escapades et routes de montagne', color: '#0868A0' },
    { icon: '🏎️', label: 'Prestige', desc: 'Ferrari, Porsche, Lamborghini', color: '#D4A017' },
    { icon: '🛵', label: 'Scooters', desc: 'Mobilité urbaine', color: '#0EA878' },
    { icon: '🚐', label: 'Utilitaires', desc: 'Déménagements, transports', color: '#E07038' },
    { icon: '⚡', label: 'Électriques', desc: 'Zéro émission sur la côte', color: '#7B5CF0' },
  ];

  return (
    <main>
      <div style={{ background: 'linear-gradient(135deg, var(--bg) 0%, var(--bg2) 100%)', borderBottom: '1px solid var(--bd)', padding: '5rem 1.4rem 4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0094D4', marginBottom: '0.6rem' }}>
            02 · Automobile · Location
          </p>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(48px,8vw,96px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, marginBottom: '1rem' }}>
            Location <span style={{ color: '#00C2FF' }}>Véhicules</span>
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 16, color: 'var(--td2)', maxWidth: 520, lineHeight: 1.7, marginBottom: '2rem' }}>
            Véhicules disponibles immédiatement. Sans agence physique, sans attente — directement depuis l&apos;app.
          </p>
          <Link href="/auto" style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '10px 20px', borderRadius: 3, border: '1px solid var(--bd2)', color: 'var(--td)' }}>
            ← Retour AUTO
          </Link>
        </div>
      </div>

      <div style={{ padding: '4rem 1.4rem', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,4vw,40px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '2rem' }}>
          Catégories
        </h2>
        <div style={{ gap: '0.8rem', marginBottom: '3rem' }} className="g-6 max-md:grid-cols-3 max-sm:grid-cols-2">
          {categories.map(({ icon, label, desc, color }) => (
            <button key={label} style={{ background: 'var(--bg2)', border: `1px solid ${color}25`, borderRadius: 10, padding: '1.2rem 0.8rem', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}>
              <div style={{ fontSize: 28, marginBottom: '0.5rem' }}>{icon}</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color, marginBottom: '0.2rem' }}>{label}</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>{desc}</div>
            </button>
          ))}
        </div>

        {vehicles && vehicles.length > 0 ? (
          <>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,4vw,40px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '2rem' }}>
              Véhicules disponibles
            </h2>
            <div style={{ gap: '1rem' }} className="g-3 max-md:grid-cols-2 max-sm:grid-cols-1">
              {vehicles.map((v: { id: string; title: string; description?: string; price?: number; currency: string; pros: { business_name: string; phone?: string; verified: boolean; rating: number } | null }) => (
                <div key={v.id} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)' }}>{v.title}</div>
                  {v.description && <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', lineHeight: 1.5, flex: 1 }}>{v.description}</p>}
                  {v.pros && <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>par {v.pros.business_name}</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                    {v.price && <div style={{ fontFamily: 'var(--fn)', fontSize: 24, color: '#0094D4' }}>{v.price}€<span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>/j</span></div>}
                    <button style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 6, background: 'rgba(0,148,212,0.1)', border: '1px solid rgba(0,148,212,0.3)', color: '#0094D4', cursor: 'pointer' }}>
                      Réserver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>🚗</div>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', marginBottom: '1.5rem' }}>Catalogue en cours de construction — bêta Nice.</p>
            <Link href="/pro/inscription?domain=auto" style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '11px 24px', borderRadius: 3, background: '#0094D4', color: '#fff', display: 'inline-block' }}>
              Proposer des véhicules →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
