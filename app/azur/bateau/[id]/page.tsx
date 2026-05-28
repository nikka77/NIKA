import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return { title: 'Prestataire AZUR — NIKA' };
  const { data: pro } = await supabase.from('pros').select('business_name').eq('id', id).single();
  return { title: `${pro?.business_name || 'Prestataire'} — NIKA` };
}

export default async function AzurBateauPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: pro }, { data: listings }, { data: reviews }] = await Promise.all([
    supabase ? supabase.from('pros').select('*').eq('id', id).eq('domain', 'azur').single() : Promise.resolve({ data: null }),
    supabase ? supabase.from('listings').select('*').eq('pro_id', id).eq('available', true).order('price', { ascending: true }) : Promise.resolve({ data: [] }),
    supabase ? supabase.from('reviews').select('rating, comment, created_at, users(username, level_name)').eq('pro_id', id).order('created_at', { ascending: false }).limit(5) : Promise.resolve({ data: [] }),
  ]);

  if (!pro) notFound();

  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 900, margin: '0 auto' }}>
      <Link href="/azur" style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '1.2rem' }}>← AZUR</Link>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,5vw,52px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95 }}>
                {pro.business_name}
              </h1>
              {pro.verified && <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: 'var(--teal)', background: 'rgba(14,168,120,0.1)', border: '1px solid rgba(14,168,120,0.2)', borderRadius: 10, padding: '3px 9px', flexShrink: 0 }}>✓ CERTIFIÉ</span>}
            </div>
            {pro.description && <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.6, maxWidth: 500, margin: '0 0 0.6rem' }}>{pro.description}</p>}
            {pro.address && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>📍 {pro.address}</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            {pro.rating > 0 && <div style={{ fontFamily: 'var(--fe)', fontSize: 22, fontStyle: 'italic', color: 'var(--gold2)' }}>⭐ {pro.rating.toFixed(1)}</div>}
            {pro.phone && (
              <a href={`tel:${pro.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: '#0868A0', border: '1px solid rgba(8,104,160,0.3)', padding: '8px 16px', borderRadius: 6, textDecoration: 'none' }}>
                📞 Réserver
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Listings */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem' }}>
          Nos prestations
        </h2>
        {listings && listings.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem' }} className="max-sm:grid-cols-1">
            {listings.map((item: { id: string; title: string; description?: string; price?: number }) => (
              <div key={item.id} style={{ background: 'var(--bg2)', border: '1px solid rgba(8,104,160,0.2)', borderRadius: 10, padding: '1.3rem' }}>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 15, fontWeight: 600, color: 'var(--td)', marginBottom: '0.3rem' }}>{item.title}</div>
                {item.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', marginBottom: '0.6rem' }}>{item.description}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {item.price && <span style={{ fontFamily: 'var(--fn)', fontSize: 24, color: '#0868A0' }}>{item.price}€</span>}
                  {pro.phone ? (
                    <a href={`tel:${pro.phone}`} style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: '#0868A0', textDecoration: 'none' }}>
                      📞 Contacter
                    </a>
                  ) : (
                    <Link href={user ? `/food/commande/${item.id}?pro=${id}` : `/connexion?redirect=/azur/bateau/${id}`} style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: '#0868A0', textDecoration: 'none' }}>
                      Réserver →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '2rem', textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>
            Catalogue en cours de mise à jour.
          </div>
        )}
      </div>

      {/* Reviews */}
      {reviews && reviews.length > 0 && (
        <div>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem' }}>Avis</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {(reviews as { rating: number; comment?: string; created_at: string; users: { username: string } | null }[]).map((r, i: number) => (
              <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td)' }}>{r.users?.username || 'Anonyme'}</span>
                  <div>{[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: 12, color: s <= r.rating ? 'var(--gold)' : 'var(--bd2)' }}>★</span>)}</div>
                </div>
                {r.comment && <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', margin: 0 }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
