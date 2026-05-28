import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = supabase ? await supabase.from('listings').select('title, description').eq('id', id).single() : { data: null };
  return { title: data ? `${data.title} — NIKA STAY` : 'Logement insolite NIKA' };
}

export default async function StayListingPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();

  const { data: listing } = await supabase.from('listings').select('*, pros(business_name, phone, rating, review_count, address)').eq('id', id).single();
  if (!listing) notFound();

  const meta = listing.metadata as Record<string, unknown> || {};
  const images = listing.images as string[] || [];
  const isAffil = !!listing.affil_url;

  return (
    <main style={{ padding: '0 0 5rem' }}>
      {/* Hero image / placeholder */}
      <div style={{ width: '100%', height: 420, background: `linear-gradient(135deg, var(--bg2), var(--bg3))`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', marginBottom: '0' }}>
        {images.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images[0]} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ fontSize: 80 }}>🏡</div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg) 0%, transparent 50%)' }} />
        {isAffil && (
          <div style={{ position: 'absolute', top: 16, right: 16, fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 20, background: 'rgba(212,160,23,0.2)', color: 'var(--gold)', border: '1px solid rgba(212,160,23,0.3)', backdropFilter: 'blur(8px)' }}>
            Affiliation
          </div>
        )}
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2.5rem 1.4rem 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '3rem', alignItems: 'start' }} className="max-md:grid-cols-1">
          {/* Left */}
          <div>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#E07038', marginBottom: '0.5rem' }}>
              STAY · Logement insolite
            </p>
            <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px,5vw,56px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '1rem' }}>
              {listing.title}
            </h1>

            {listing.pros && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)' }}>
                  par <strong style={{ color: 'var(--td)' }}>{listing.pros.business_name}</strong>
                </span>
                {listing.pros.rating > 0 && (
                  <span style={{ fontFamily: 'var(--fe)', fontSize: 16, fontStyle: 'italic', color: 'var(--gold2)' }}>
                    ⭐ {listing.pros.rating.toFixed(1)} ({listing.pros.review_count} avis)
                  </span>
                )}
                {listing.pros.address && (
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>📍 {listing.pros.address}</span>
                )}
              </div>
            )}

            {listing.description && (
              <p style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td2)', lineHeight: 1.8, marginBottom: '2rem' }}>
                {listing.description}
              </p>
            )}

            {/* Features from metadata */}
            {typeof meta.features === 'object' && Array.isArray(meta.features) && (meta.features as unknown[]).length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem' }}>
                  Ce qui rend ce lieu unique
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
                  {(meta.features as string[]).map((f, i) => (
                    <div key={i} style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#E07038', flexShrink: 0 }}>✓</span> {f}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — booking card */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd2)', borderRadius: 12, padding: '1.8rem', position: 'sticky', top: 70 }}>
            {listing.price && (
              <div style={{ marginBottom: '1.2rem' }}>
                <div style={{ fontFamily: 'var(--fn)', fontSize: 38, color: '#E07038', lineHeight: 1 }}>
                  {listing.price}{listing.currency === 'EUR' ? '€' : listing.currency}
                </div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginTop: 4 }}>par nuit</div>
              </div>
            )}

            {isAffil ? (
              <>
                <a href={listing.affil_url as string} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', padding: '14px', borderRadius: 6, background: '#E07038', color: '#fff', fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center', boxShadow: '0 0 28px rgba(224,112,56,0.3)', marginBottom: '0.8rem' }}>
                  Réserver via Airbnb →
                </a>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', textAlign: 'center', lineHeight: 1.5 }}>
                  Lien affilié — vous serez redirigé vers Airbnb/Booking pour finaliser.
                </div>
              </>
            ) : (
              <button style={{ width: '100%', padding: '14px', borderRadius: 6, background: '#E07038', color: '#fff', fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', boxShadow: '0 0 28px rgba(224,112,56,0.3)', cursor: 'pointer' }}>
                Réserver →
              </button>
            )}

            {listing.pros?.phone && (
              <a href={`tel:${listing.pros.phone}`} style={{ display: 'block', width: '100%', padding: '11px', borderRadius: 6, border: '1px solid var(--bd2)', color: 'var(--td)', fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, textAlign: 'center', marginTop: '0.8rem' }}>
                📞 Contacter l&apos;hôte
              </a>
            )}

            <div style={{ marginTop: '1.2rem', padding: '0.8rem', background: 'rgba(224,112,56,0.04)', border: '1px solid rgba(224,112,56,0.12)', borderRadius: 8, fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', lineHeight: 1.6 }}>
              +30 XP à chaque réservation via NIKA
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
