import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

type Props = { params: Promise<{ resto_id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { resto_id } = await params;
  const supabase = await createClient();
  if (!supabase) return { title: 'Restaurant — NIKA' };
  const { data: pro } = await supabase.from('pros').select('business_name').eq('id', resto_id).single();
  return { title: `${pro?.business_name || 'Restaurant'} — NIKA` };
}

export default async function FoodRestoPage({ params }: Props) {
  const { resto_id } = await params;
  const supabase = await createClient();

  const [{ data: pro }, { data: listings }, { data: deals }, { data: reviews }] = await Promise.all([
    supabase ? supabase.from('pros').select('*').eq('id', resto_id).eq('domain', 'food').single() : Promise.resolve({ data: null }),
    supabase ? supabase.from('listings').select('*').eq('pro_id', resto_id).eq('available', true).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    supabase ? supabase.from('flash_deals').select('*').eq('pro_id', resto_id).eq('active', true).gt('expires_at', new Date().toISOString()) : Promise.resolve({ data: [] }),
    supabase ? supabase.from('reviews').select('rating, comment, created_at, users(username, level_name)').eq('pro_id', resto_id).order('created_at', { ascending: false }).limit(5) : Promise.resolve({ data: [] }),
  ]);

  if (!pro) notFound();

  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 900, margin: '0 auto' }}>
      <Link href="/food" style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '1.2rem' }}>← FOOD</Link>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,5vw,52px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95 }}>
                {pro.business_name}
              </h1>
              {pro.verified && <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: 'var(--teal)', background: 'rgba(14,168,120,0.1)', border: '1px solid rgba(14,168,120,0.2)', borderRadius: 10, padding: '3px 9px', flexShrink: 0 }}>✓ CERTIFIÉ NIKA</span>}
            </div>
            {pro.description && <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.6, maxWidth: 500, margin: '0 0 0.6rem' }}>{pro.description}</p>}
            {pro.address && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>📍 {pro.address}</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            {pro.rating > 0 && <div style={{ fontFamily: 'var(--fe)', fontSize: 22, fontStyle: 'italic', color: 'var(--gold2)' }}>⭐ {pro.rating.toFixed(1)} <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>({pro.rating_count})</span></div>}
            {pro.phone && (
              <a href={`tel:${pro.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: '#D4A017', border: '1px solid rgba(212,160,23,0.3)', padding: '8px 16px', borderRadius: 6, textDecoration: 'none' }}>
                📞 Appeler
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Flash Deals */}
      {deals && deals.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.8rem' }}>⚡ Offres du moment</h2>
          <div style={{ gap: '0.8rem' }} className="g-2 max-sm:grid-cols-1">
            {deals.map((deal: { id: string; title: string; description?: string; discount_type: string; discount_value: number; expires_at: string }) => {
              const disc = deal.discount_type === 'percent' ? `-${deal.discount_value}%` : deal.discount_type === 'fixed' ? `-${deal.discount_value}€` : 'OFFERT';
              return (
                <div key={deal.id} style={{ background: 'var(--bg2)', border: '1px solid rgba(212,160,23,0.3)', borderRadius: 10, padding: '1.2rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--gold)' }} />
                  <div style={{ fontFamily: 'var(--fn)', fontSize: 28, color: 'var(--gold2)', marginBottom: '0.2rem' }}>{disc}</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td)' }}>{deal.title}</div>
                  {deal.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', marginTop: '0.2rem' }}>{deal.description}</div>}
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', marginTop: '0.5rem' }}>
                    Expire à {new Date(deal.expires_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Menu / Listings */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem' }}>
          Menu
        </h2>
        {listings && listings.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {listings.map((item: { id: string; title: string; description?: string; price?: number; stock?: number }) => (
              <div key={item.id} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 15, fontWeight: 600, color: 'var(--td)', marginBottom: '0.2rem' }}>{item.title}</div>
                  {item.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)' }}>{item.description}</div>}
                  {item.stock !== undefined && item.stock !== null && item.stock < 5 && (
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--coral)', marginTop: '0.2rem' }}>⚠️ Plus que {item.stock}</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                  {item.price && <span style={{ fontFamily: 'var(--fn)', fontSize: 22, color: '#D4A017' }}>{item.price}€</span>}
                  <Link
                    href={user ? `/food/commande/${item.id}?pro=${resto_id}` : `/connexion?redirect=/food/${resto_id}`}
                    style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 6, background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.3)', color: '#D4A017', textDecoration: 'none' }}
                  >
                    Commander
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '2rem', textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>
            Menu en cours de mise à jour.
          </div>
        )}
      </div>

      {/* Reviews */}
      {reviews && reviews.length > 0 && (
        <div>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem' }}>Avis</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {(reviews as { rating: number; comment?: string; created_at: string; users: { username: string; level_name: string } | null }[]).map((r, i: number) => (
              <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
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
