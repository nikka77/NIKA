import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'FOOD — NIKA' };

const FOOD_CATS = [
  { slug: 'restaurant', label: 'Restaurants', icon: '🍽️' },
  { slug: 'fastfood', label: 'Fast Food', icon: '🍔' },
  { slug: 'pizzeria', label: 'Pizzerias', icon: '🍕' },
  { slug: 'boulangerie', label: 'Boulangeries', icon: '🥐' },
  { slug: 'sushi', label: 'Sushis', icon: '🍱' },
  { slug: 'vegan', label: 'Vegan & Bio', icon: '🥗' },
  { slug: 'foodtruck', label: 'Food Trucks', icon: '🚚' },
  { slug: 'cave', label: 'Caves à vins', icon: '🍷' },
];

export default async function FoodPage() {
  const supabase = await createClient();

  const { data: pros } = supabase
    ? await supabase.from('pros').select('id, business_name, description, address, rating, rating_count, verified').eq('domain', 'food').eq('active', true).order('rating', { ascending: false }).limit(20)
    : { data: [] };

  const { data: deals } = supabase
    ? await supabase.from('flash_deals').select('*, pros(id, business_name)').eq('active', true).gt('expires_at', new Date().toISOString()).limit(6)
    : { data: [] };

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 1100, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ marginBottom: '3rem' }}>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D4A017', marginBottom: '0.4rem' }}>🍽️ Domaine 01</p>
        <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(40px,7vw,72px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, marginBottom: '0.8rem' }}>
          FOOD
        </h1>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td2)', maxWidth: 500, lineHeight: 1.6 }}>
          Restaurants, boulangeries, food trucks — la gastronomie de la Côte d&apos;Azur.
        </p>
      </div>

      {/* Categories */}
      <div style={{ gap: '0.7rem', marginBottom: '3rem' }} className="g-4 max-sm:grid-cols-2">
        {FOOD_CATS.map(cat => (
          <Link key={cat.slug} href={`/food?cat=${cat.slug}`} style={{ background: 'var(--bg2)', border: '1px solid rgba(212,160,23,0.15)', borderRadius: 10, padding: '1.1rem', textAlign: 'center', textDecoration: 'none' }}>
            <div style={{ fontSize: 26, marginBottom: '0.4rem' }}>{cat.icon}</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 600, color: 'var(--td2)' }}>{cat.label}</div>
          </Link>
        ))}
      </div>

      {/* Flash Deals */}
      {deals && deals.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 26, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>
            ⚡ Flash Deals
          </h2>
          <div style={{ gap: '1rem' }} className="g-3 max-md:grid-cols-2 max-sm:grid-cols-1">
            {deals.map((deal: { id: string; title: string; discount_type: string; discount_value: number; expires_at: string; pros: { id: string; business_name: string } | null }) => {
              const disc = deal.discount_type === 'percent' ? `-${deal.discount_value}%` : deal.discount_type === 'fixed' ? `-${deal.discount_value}€` : 'OFFERT';
              return (
                <Link key={deal.id} href={deal.pros ? `/food/${deal.pros.id}` : '/food'} style={{ background: 'var(--bg2)', border: '1px solid rgba(212,160,23,0.25)', borderRadius: 10, padding: '1.2rem', textDecoration: 'none', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--gold)' }} />
                  <div style={{ fontFamily: 'var(--fn)', fontSize: 32, color: 'var(--gold2)', marginBottom: '0.3rem' }}>{disc}</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td)', marginBottom: '0.2rem' }}>{deal.title}</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: '#D4A017', fontWeight: 600 }}>{deal.pros?.business_name}</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', marginTop: '0.4rem' }}>
                    Expire {new Date(deal.expires_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Pros list */}
      <div>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 26, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>
          Établissements
        </h2>
        {pros && pros.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {pros.map((pro: { id: string; business_name: string; description?: string; address?: string; rating: number; rating_count: number; verified: boolean }) => (
              <Link key={pro.id} href={`/food/${pro.id}`} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', textDecoration: 'none', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.3rem' }}>
                    <span style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', color: 'var(--td)', fontWeight: 700 }}>{pro.business_name}</span>
                    {pro.verified && <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, color: 'var(--teal)', background: 'rgba(14,168,120,0.1)', border: '1px solid rgba(14,168,120,0.2)', borderRadius: 10, padding: '2px 7px' }}>✓ CERTIFIÉ</span>}
                  </div>
                  {pro.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', marginBottom: '0.2rem' }}>{pro.description.slice(0, 80)}{pro.description.length > 80 ? '…' : ''}</div>}
                  {pro.address && <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>📍 {pro.address}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {pro.rating > 0 && (
                    <div style={{ fontFamily: 'var(--fe)', fontSize: 17, fontStyle: 'italic', color: 'var(--gold2)', marginBottom: '0.2rem' }}>⭐ {pro.rating.toFixed(1)}</div>
                  )}
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--az)', fontWeight: 700 }}>Voir le menu →</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>🍽️</div>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td3)', marginBottom: '1.5rem' }}>
              Les établissements arrivent bientôt sur NIKA !
            </p>
            <Link href="/pro/inscription?type=food" style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: '#D4A017', border: '1px solid rgba(212,160,23,0.3)', padding: '10px 20px', borderRadius: 6 }}>
              Inscrire mon établissement →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
