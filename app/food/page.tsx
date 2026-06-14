import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';
import Spin360 from '@/components/Spin360';
import DomainHero from '@/components/DomainHero';
import { visual } from '@/lib/visuals';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'FOOD — Restaurants & Livraison Côte d\'Azur | NIKA',
  description: 'Restaurants, pizzerias, boulangeries, food trucks et sushis sur Nice, Antibes et Cannes. Commande, Flash Deals et livraison via NIKA.',
  keywords: ['restaurant nice', 'livraison nice', 'food truck côte d\'azur', 'pizzeria antibes', 'sushi cannes'],
};

const ACCENT = '#D4A017';

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

  // NIKKA Food — prestataires de nuit
  const { data: foodProviders } = supabase
    ? await supabase.from('food_providers').select('id, slug, name, description, city, opens_at, closes_at').eq('active', true)
    : { data: [] };

  const today = new Date().toISOString().split('T')[0];
  const providerIds = (foodProviders || []).map((p: { id: string }) => p.id);
  const { data: tonightSessions } = providerIds.length > 0 && supabase
    ? await supabase.from('food_sessions').select('provider_id, status').eq('date', today).in('provider_id', providerIds)
    : { data: [] };

  const sessionByProvider: Record<string, string> = {};
  for (const s of (tonightSessions || [])) {
    sessionByProvider[(s as { provider_id: string; status: string }).provider_id] = (s as { provider_id: string; status: string }).status;
  }

  const { data: pros } = supabase
    ? await supabase.from('pros').select('id, business_name, description, address, rating, rating_count, verified').eq('domain', 'food').eq('active', true).order('rating', { ascending: false }).limit(20)
    : { data: [] };

  const { data: deals } = supabase
    ? await supabase.from('flash_deals').select('*, pros(id, business_name)').eq('active', true).gt('expires_at', new Date().toISOString()).limit(6)
    : { data: [] };

  const openTonight = Object.values(sessionByProvider).filter(s => s === 'open').length;

  return (
    <main>
      {/* ── HERO ──────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(180deg, #170F02 0%, #221705 60%, var(--bg) 100%)',
        borderBottom: '1px solid var(--bd)',
        padding: 'clamp(3rem,7vw,5.5rem) 1.4rem',
        position: 'relative', overflow: 'hidden',
      }}>
        <DomainHero slug="food" />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div style={{
            fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: ACCENT, marginBottom: '1rem',
          }}>
            🍽️ NIKA FOOD — Domaine 01
          </div>

          <h1 style={{
            fontFamily: 'var(--fe)',
            fontSize: 'clamp(44px,8vw,96px)',
            fontWeight: 900, fontStyle: 'italic',
            textTransform: 'uppercase', color: 'var(--td)',
            lineHeight: 0.88, marginBottom: '1.2rem',
          }}>
            La Côte se met<br />
            <span style={{ color: ACCENT }}>à table</span>
          </h1>

          <p style={{
            fontFamily: 'var(--fo)',
            fontSize: 'clamp(14px,1.5vw,16px)',
            color: 'var(--td2)', maxWidth: 480, lineHeight: 1.7,
            marginBottom: '1.8rem',
          }}>
            Restaurants, food de nuit, flash deals — de la socca niçoise
            aux saveurs des Comores, livré chez vous.
          </p>

          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            <a href="#nuit" style={{
              fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 800, fontStyle: 'italic',
              letterSpacing: '0.04em', textTransform: 'uppercase',
              padding: '12px 26px', borderRadius: 3,
              background: ACCENT, color: '#1a1200', textDecoration: 'none',
            }}>
              🌙 Food de nuit →
            </a>
            <Link href="/pro/inscription?type=food" style={{
              fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700,
              padding: '12px 22px', borderRadius: 3,
              border: '1px solid var(--bd2)', color: 'var(--td2)', textDecoration: 'none',
            }}>
              Inscrire mon établissement
            </Link>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ─────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--bd)', padding: '0.9rem 1.4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: '2.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { v: '08', l: 'Catégories' },
            { v: openTonight > 0 ? `${openTonight} ouvert${openTonight > 1 ? 's' : ''}` : '🌙', l: 'Food de nuit ce soir' },
            { v: deals?.length ? `${deals.length} live` : '⚡', l: 'Flash deals' },
          ].map(stat => (
            <div key={stat.l}>
              <div style={{ fontFamily: 'var(--fn)', fontSize: 20, color: ACCENT, lineHeight: 1 }}>
                {stat.v}
              </div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 9, color: 'var(--td3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>
                {stat.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CONTENU ───────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(2rem,4vw,3rem) 1.4rem clamp(3rem,7vw,5rem)' }}>

        {/* Catégories */}
        <div style={{ gap: '0.7rem', marginBottom: '3rem' }} className="g-4 max-sm:grid-cols-2">
          {FOOD_CATS.map(cat => (
            <Link key={cat.slug} href={`/food?cat=${cat.slug}`} className="dom-card" style={{
              background: 'var(--bg2)', border: '1px solid rgba(212,160,23,0.15)',
              borderRadius: 10, padding: '1.1rem', textAlign: 'center', textDecoration: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem',
              ['--dc' as string]: ACCENT,
            }}>
              <Spin360 emoji={cat.icon} alt={cat.label} accent={ACCENT} size={56} {...visual('food/cats', cat.slug)} />
              <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 600, color: 'var(--td2)' }}>{cat.label}</div>
            </Link>
          ))}
        </div>

        {/* NIKKA Food de nuit */}
        {foodProviders && foodProviders.length > 0 && (
          <div id="nuit" style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.92, marginBottom: '0.4rem' }}>
              🌙 Food de nuit
            </h2>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '1.5rem' }}>
              Livraison le soir — Nice et alentours
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {(foodProviders as { id: string; slug: string; name: string; description?: string; city?: string; opens_at?: string; closes_at?: string }[]).map(provider => {
                const status = sessionByProvider[provider.id] as 'open' | 'closed' | 'sold_out' | undefined;
                const isOpen = status === 'open';
                const isSoldOut = status === 'sold_out';
                return (
                  <Link
                    key={provider.slug}
                    href={`/food/${provider.slug}`}
                    className="dom-card"
                    style={{
                      background: 'var(--food-dark)',
                      borderRadius: 14,
                      padding: '1.2rem 1.4rem',
                      textDecoration: 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      flexWrap: 'wrap',
                      border: isOpen ? '1px solid rgba(216,90,48,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      ['--dc' as string]: 'rgba(216,90,48,0.7)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--fn)', fontSize: 22, color: '#fff', letterSpacing: '0.04em', marginBottom: '0.3rem' }}>
                        {provider.name}
                      </div>
                      {provider.description && (
                        <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                          {provider.description}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                        {provider.city && <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>📍 {provider.city}</span>}
                        {provider.opens_at && provider.closes_at && (
                          <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                            🕐 {provider.opens_at.slice(0, 5)} – {provider.closes_at.slice(0, 5)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                      <span className={`food-status-pill ${isOpen ? 'open' : isSoldOut ? 'sold_out' : 'closed'}`}>
                        {isOpen ? '🟢 Ouvert' : isSoldOut ? '🔴 Épuisé' : '⚫ Fermé'}
                      </span>
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Voir le menu →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Flash Deals */}
        {deals && deals.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>
              ⚡ Flash Deals
            </h2>
            <div style={{ gap: '1rem' }} className="g-3 max-md:grid-cols-2 max-sm:grid-cols-1">
              {deals.map((deal: { id: string; title: string; discount_type: string; discount_value: number; expires_at: string; pros: { id: string; business_name: string } | null }) => {
                const disc = deal.discount_type === 'percent' ? `-${deal.discount_value}%` : deal.discount_type === 'fixed' ? `-${deal.discount_value}€` : 'OFFERT';
                return (
                  <Link key={deal.id} href={deal.pros ? `/food/${deal.pros.id}` : '/food'} className="dom-card" style={{
                    background: 'var(--bg2)', border: '1px solid rgba(212,160,23,0.25)',
                    borderRadius: 10, padding: '1.2rem', textDecoration: 'none',
                    position: 'relative', overflow: 'hidden',
                    ['--dc' as string]: ACCENT,
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--gold)' }} />
                    <div style={{ fontFamily: 'var(--fn)', fontSize: 32, color: 'var(--gold2)', marginBottom: '0.3rem' }}>{disc}</div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td)', marginBottom: '0.2rem' }}>{deal.title}</div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: ACCENT, fontWeight: 600 }}>{deal.pros?.business_name}</div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', marginTop: '0.4rem' }}>
                      Expire {new Date(deal.expires_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Établissements */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>
            Établissements
          </h2>
          {pros && pros.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {pros.map((pro: { id: string; business_name: string; description?: string; address?: string; rating: number; rating_count: number; verified: boolean }) => (
                <Link key={pro.id} href={`/food/${pro.id}`} className="dom-card" style={{
                  background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10,
                  padding: '1.4rem', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', gap: '1rem', textDecoration: 'none', flexWrap: 'wrap',
                  ['--dc' as string]: ACCENT,
                }}>
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
            <div style={{ background: 'var(--bg2)', border: '1px dashed rgba(212,160,23,0.3)', borderRadius: 12, padding: '3.5rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: 44, marginBottom: '0.8rem' }}>🍽️</div>
              <p style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', fontWeight: 700, color: 'var(--td)', marginBottom: '0.4rem' }}>Les établissements arrivent</p>
              <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>Les premiers restaurants sont en cours de certification.</p>
            </div>
          )}
        </div>

        {/* CTA pro */}
        <div style={{
          borderRadius: 16, padding: 'clamp(1.8rem,4vw,2.6rem)',
          background: 'linear-gradient(135deg, rgba(212,160,23,0.14), rgba(212,160,23,0.04))',
          border: '1px solid rgba(212,160,23,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '1.2rem',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(20px,2.5vw,26px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.3rem' }}>
              Vous régalez la Côte ?
            </div>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', margin: 0 }}>
              Restaurant, food truck, cuisine de nuit — vendez sur NIKA, flash deals inclus.
            </p>
          </div>
          <Link href="/pro/inscription?type=food" style={{
            fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 800, fontStyle: 'italic',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            padding: '13px 28px', borderRadius: 3, flexShrink: 0,
            background: ACCENT, color: '#1a1200', textDecoration: 'none',
          }}>
            Inscrire mon établissement →
          </Link>
        </div>
      </div>
    </main>
  );
}
