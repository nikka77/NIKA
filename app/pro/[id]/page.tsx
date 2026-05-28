import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { DOMAINS } from '@/lib/constants';
import type { Metadata } from 'next';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = supabase ? await supabase.from('pros').select('business_name, domain').eq('id', id).single() : { data: null };
  return { title: data ? `${data.business_name} — NIKA Pro` : 'Profil pro NIKA' };
}

export default async function ProProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();

  const { data: pro } = await supabase.from('pros').select('*').eq('id', id).eq('active', true).single();
  if (!pro) notFound();

  const [{ data: listings }, { data: deals }] = await Promise.all([
    supabase.from('listings').select('*').eq('pro_id', id).eq('available', true).limit(8),
    supabase.from('flash_deals').select('*').eq('pro_id', id).eq('active', true).gt('expires_at', new Date().toISOString()).limit(3),
  ]);

  const domain = DOMAINS.find(d => d.slug === pro.domain);
  const domainColor = domain?.color || '#0094D4';

  return (
    <main style={{ padding: '0 0 5rem' }}>
      {/* Header band */}
      <div style={{ background: `linear-gradient(135deg, var(--bg2), var(--bg3))`, borderBottom: '1px solid var(--bd)', padding: '4rem 1.4rem 3rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: domainColor }} />
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ width: 72, height: 72, borderRadius: 12, background: `${domainColor}22`, border: `2px solid ${domainColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>
              {domain?.icon || '🏢'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '2px 9px', borderRadius: 20, background: `${domainColor}15`, color: domainColor, border: `1px solid ${domainColor}30` }}>
                  {domain?.label || pro.domain.toUpperCase()}
                </span>
                {pro.verified && (
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 9px', borderRadius: 20, background: 'rgba(14,168,120,0.1)', color: 'var(--teal)', border: '1px solid rgba(14,168,120,0.2)' }}>
                    ✓ Certifié NIKA
                  </span>
                )}
              </div>
              <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,5vw,52px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '0.7rem' }}>
                {pro.business_name}
              </h1>
              {pro.description && (
                <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.7, maxWidth: 560, marginBottom: '1rem' }}>
                  {pro.description}
                </p>
              )}
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {pro.rating > 0 && (
                  <span style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', color: 'var(--gold2)' }}>
                    ⭐ {pro.rating.toFixed(1)} <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', fontStyle: 'normal' }}>({pro.review_count} avis)</span>
                  </span>
                )}
                {pro.address && (
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    📍 {pro.address}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
              {pro.phone && (
                <a href={`tel:${pro.phone}`} style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '11px 22px', borderRadius: 3, background: domainColor, color: '#fff', boxShadow: `0 0 20px ${domainColor}30`, display: 'block', textAlign: 'center' }}>
                  📞 Appeler
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 1.4rem 0' }}>
        {/* Flash deals */}
        {deals && deals.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 28, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>
              Flash Deals actifs
            </h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {deals.map((deal: { id: string; title: string; description?: string; discount_type: string; discount_value: number; expires_at: string }) => (
                <div key={deal.id} style={{ background: 'var(--bg2)', border: '1px solid var(--gold)33', borderRadius: 10, padding: '1.2rem 1.5rem', flex: '1 1 220px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--gold)' }} />
                  <div style={{ fontFamily: 'var(--fn)', fontSize: 32, color: 'var(--gold2)', marginBottom: '0.2rem' }}>
                    {deal.discount_type === 'percent' ? `-${deal.discount_value}%` : deal.discount_type === 'fixed' ? `-${deal.discount_value}€` : 'OFFERT'}
                  </div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 600, color: 'var(--td)', marginBottom: '0.2rem' }}>{deal.title}</div>
                  {deal.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', lineHeight: 1.5 }}>{deal.description}</div>}
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: '0.6rem' }}>
                    Expire {new Date(deal.expires_at).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Listings */}
        {listings && listings.length > 0 && (
          <div>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 28, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>
              Services & Produits
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }} className="max-md:grid-cols-2 max-sm:grid-cols-1">
              {listings.map((listing: { id: string; title: string; description?: string; price?: number; currency: string; stock?: number }) => (
                <div key={listing.id} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', lineHeight: 1.1 }}>{listing.title}</div>
                  {listing.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', lineHeight: 1.5, flex: 1 }}>{listing.description}</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    {listing.price ? (
                      <div style={{ fontFamily: 'var(--fn)', fontSize: 22, color: domainColor }}>
                        {listing.price}{listing.currency === 'EUR' ? '€' : listing.currency}
                      </div>
                    ) : (
                      <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--teal)' }}>Gratuit</div>
                    )}
                    {listing.stock !== undefined && listing.stock !== null && (
                      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: listing.stock < 5 ? 'var(--coral)' : 'var(--td3)' }}>
                        Stock: {listing.stock}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!listings?.length && !deals?.length && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>{domain?.icon || '🏢'}</div>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td3)' }}>Ce professionnel n&apos;a pas encore ajouté de services.</p>
            {pro.phone && (
              <a href={`tel:${pro.phone}`} style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: domainColor, display: 'inline-block', marginTop: '1rem' }}>
                Contactez-les directement →
              </a>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
