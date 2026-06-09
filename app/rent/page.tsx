import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RENT — Location de Matériel Côte d\'Azur | NIKA',
  description: 'Location de vélos, scooters, matériel de surf, camping et équipement photo sur la Côte d\'Azur. Disponible immédiatement sans agence.',
  keywords: ['location vélo nice', 'location scooter côte d\'azur', 'location matériel sport antibes'],
};

const RENT_CATS = [
  { slug: 'sport', label: 'Sport & Loisirs', icon: '⛷️' },
  { slug: 'bricolage', label: 'Bricolage & Outils', icon: '🔧' },
  { slug: 'photo', label: 'Photo & Vidéo', icon: '📸' },
  { slug: 'camping', label: 'Camping', icon: '🏕️' },
  { slug: 'materiel', label: 'Matériel Event', icon: '🎪' },
  { slug: 'vehicule', label: 'Véhicules', icon: '🚐' },
];

export default async function RentPage() {
  const supabase = await createClient();
  const { data: listings } = supabase
    ? await supabase.from('listings').select('*, pros(id, business_name, verified)').eq('available', true).in('pro_id',
        (await supabase.from('pros').select('id').eq('domain', 'rent').eq('active', true)).data?.map((p: { id: string }) => p.id) || []
      ).order('created_at', { ascending: false }).limit(20)
    : { data: [] };

  const { data: pros } = supabase
    ? await supabase.from('pros').select('id, business_name, description, rating, verified').eq('domain', 'rent').eq('active', true).order('rating', { ascending: false }).limit(10)
    : { data: [] };

  return (
    <main style={{ padding: 'clamp(2rem,5vw,3rem) 1.4rem clamp(3rem,7vw,5rem)', maxWidth: 1100, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ marginBottom: '3rem' }}>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5A88B0', marginBottom: '0.4rem' }}>📦 Domaine 05</p>
        <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(44px,8vw,96px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, marginBottom: '0.8rem' }}>
          RENT
        </h1>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td2)', maxWidth: 500, lineHeight: 1.6 }}>
          Location de matériel entre particuliers et professionnels sur la Côte d&apos;Azur.
        </p>
      </div>

      {/* Categories */}
      <div style={{ gap: '0.7rem', marginBottom: '3rem' }} className="g-3 max-sm:grid-cols-2">
        {RENT_CATS.map(c => (
          <Link key={c.slug} href={`/rent?cat=${c.slug}`} style={{ background: 'var(--bg2)', border: '1px solid rgba(90,136,176,0.15)', borderRadius: 10, padding: '1.1rem', textAlign: 'center', textDecoration: 'none' }}>
            <div style={{ fontSize: 26, marginBottom: '0.4rem' }}>{c.icon}</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 600, color: 'var(--td2)' }}>{c.label}</div>
          </Link>
        ))}
      </div>

      {/* Listings */}
      {listings && listings.length > 0 ? (
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 26, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>Articles disponibles</h2>
          <div style={{ gap: '1rem' }} className="g-3 max-md:grid-cols-2 max-sm:grid-cols-1">
            {listings.map((item: { id: string; title: string; description?: string; price?: number; pros: { id: string; business_name: string; verified: boolean } | null }) => (
              <Link key={item.id} href={`/rent/${item.id}`} style={{ background: 'var(--bg2)', border: '1px solid rgba(90,136,176,0.2)', borderRadius: 10, padding: '1.3rem', textDecoration: 'none' }}>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: 'var(--td)', marginBottom: '0.3rem' }}>{item.title}</div>
                {item.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td2)', marginBottom: '0.6rem' }}>{item.description.slice(0, 60)}…</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {item.price && <span style={{ fontFamily: 'var(--fn)', fontSize: 22, color: '#5A88B0' }}>{item.price}€<span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>/j</span></span>}
                  {item.pros?.verified && <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, color: 'var(--teal)', background: 'rgba(14,168,120,0.1)', border: '1px solid rgba(14,168,120,0.2)', borderRadius: 10, padding: '2px 7px' }}>✓</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '4rem', textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ fontSize: 48, marginBottom: '1rem' }}>📦</div>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td3)', marginBottom: '1.5rem' }}>Le catalogue de location arrive bientôt.</p>
          <Link href="/pro/inscription?type=rent" style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: '#5A88B0', border: '1px solid rgba(90,136,176,0.3)', padding: '10px 20px', borderRadius: 6 }}>
            Proposer mon matériel →
          </Link>
        </div>
      )}

      {/* Pros */}
      {pros && pros.length > 0 && (
        <div>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 26, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>Loueurs</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {pros.map((pro: { id: string; business_name: string; description?: string; rating: number; verified: boolean }) => (
              <Link key={pro.id} href={`/rent/${pro.id}`} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--fe)', fontSize: 17, fontStyle: 'italic', color: 'var(--td)', fontWeight: 700 }}>{pro.business_name}</span>
                    {pro.verified && <span style={{ fontFamily: 'var(--fo)', fontSize: 9, color: 'var(--teal)', background: 'rgba(14,168,120,0.1)', border: '1px solid rgba(14,168,120,0.2)', borderRadius: 10, padding: '2px 7px', fontWeight: 700 }}>✓</span>}
                  </div>
                  {pro.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', marginTop: '0.2rem' }}>{pro.description.slice(0, 70)}…</div>}
                </div>
                {pro.rating > 0 && <div style={{ fontFamily: 'var(--fe)', fontSize: 16, fontStyle: 'italic', color: 'var(--gold2)', flexShrink: 0 }}>⭐ {pro.rating.toFixed(1)}</div>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
