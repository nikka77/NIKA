import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AZUR — Location Bateaux & Mer Côte d\'Azur | NIKA',
  description: 'Location de bateaux, skippers, water taxi, plongée et beach clubs sur la Méditerranée. Réservez votre journée en mer depuis Nice, Cannes ou Antibes.',
  keywords: ['location bateau nice', 'skipper côte d\'azur', 'water taxi cannes', 'plongée méditerranée', 'beach club nice'],
};

const AZUR_SERVICES = [
  { slug: 'bateau', label: 'Location bateaux', icon: '🛥️', desc: 'Sorties en mer' },
  { slug: 'skipper', label: 'Skippers', icon: '⚓', desc: 'Capitaine à bord' },
  { slug: 'watertaxi', label: 'Water Taxi', icon: '⛵', desc: 'Transferts mer' },
  { slug: 'aqua', label: 'Plongée', icon: '🤿', desc: 'Aqua Dive' },
  { slug: 'beach', label: 'Beach Clubs', icon: '🏖️', desc: 'La dolce vita' },
  { slug: 'jetski', label: 'Jet Ski', icon: '🏄', desc: 'Sensations fortes' },
];

export default async function AzurPage() {
  const supabase = await createClient();

  const { data: pros } = supabase
    ? await supabase.from('pros').select('id, business_name, description, address, rating, verified, phone').eq('domain', 'azur').eq('active', true).order('rating', { ascending: false }).limit(20)
    : { data: [] };

  const { data: listings } = supabase
    ? await supabase.from('listings').select('*, pros(id, business_name)').eq('available', true).in('pro_id',
        pros?.map((p: { id: string }) => p.id) || []
      ).limit(12)
    : { data: [] };

  return (
    <main style={{ padding: 'clamp(2rem,5vw,3rem) 1.4rem clamp(3rem,7vw,5rem)', maxWidth: 1100, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ marginBottom: '3rem' }}>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0868A0', marginBottom: '0.4rem' }}>🛥️ Domaine 04</p>
        <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(40px,7vw,72px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, marginBottom: '0.8rem' }}>
          AZUR
        </h1>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td2)', maxWidth: 500, lineHeight: 1.6 }}>
          Mer, bateaux, skippers — vivez la Méditerranée autrement.
        </p>
      </div>

      {/* Services grid */}
      <div style={{ gap: '0.8rem', marginBottom: '3rem' }} className="g-3 max-sm:grid-cols-2">
        {AZUR_SERVICES.map(s => (
          <Link key={s.slug} href={`/azur/services?type=${s.slug}`} style={{ background: 'var(--bg2)', border: '1px solid rgba(8,104,160,0.2)', borderRadius: 12, padding: '1.5rem', textDecoration: 'none', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: '0.5rem' }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--fe)', fontSize: 16, fontStyle: 'italic', color: 'var(--td)', fontWeight: 700, marginBottom: '0.2rem' }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{s.desc}</div>
          </Link>
        ))}
      </div>

      {/* Listings */}
      {listings && listings.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 26, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>Disponible maintenant</h2>
          <div style={{ gap: '1rem' }} className="g-3 max-md:grid-cols-2 max-sm:grid-cols-1">
            {listings.map((item: { id: string; title: string; description?: string; price?: number; pros: { id: string; business_name: string } | null }) => (
              <Link key={item.id} href={item.pros ? `/azur/bateau/${item.pros.id}` : '/azur'} style={{ background: 'var(--bg2)', border: '1px solid rgba(8,104,160,0.2)', borderRadius: 10, padding: '1.3rem', textDecoration: 'none' }}>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: 'var(--td)', marginBottom: '0.3rem' }}>{item.title}</div>
                {item.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td2)', marginBottom: '0.5rem' }}>{item.description.slice(0, 60)}…</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {item.price && <span style={{ fontFamily: 'var(--fn)', fontSize: 22, color: '#0868A0' }}>{item.price}€</span>}
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{item.pros?.business_name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pros */}
      <div>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 26, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>Prestataires</h2>
        {pros && pros.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {pros.map((pro: { id: string; business_name: string; description?: string; address?: string; rating: number; verified: boolean; phone?: string }) => (
              <Link key={pro.id} href={`/azur/bateau/${pro.id}`} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', textDecoration: 'none', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.3rem' }}>
                    <span style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', color: 'var(--td)', fontWeight: 700 }}>{pro.business_name}</span>
                    {pro.verified && <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, color: 'var(--teal)', background: 'rgba(14,168,120,0.1)', border: '1px solid rgba(14,168,120,0.2)', borderRadius: 10, padding: '2px 7px' }}>✓</span>}
                  </div>
                  {pro.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)' }}>{pro.description.slice(0, 80)}…</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {pro.rating > 0 && <div style={{ fontFamily: 'var(--fe)', fontSize: 17, fontStyle: 'italic', color: 'var(--gold2)', marginBottom: '0.2rem' }}>⭐ {pro.rating.toFixed(1)}</div>}
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: '#0868A0', fontWeight: 700 }}>Voir →</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>🛥️</div>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td3)', marginBottom: '1.5rem' }}>Les prestataires nautiques arrivent sur NIKA.</p>
            <Link href="/pro/inscription?type=azur" style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: '#0868A0', border: '1px solid rgba(8,104,160,0.3)', padding: '10px 20px', borderRadius: 6 }}>
              Inscrire mon activité →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
