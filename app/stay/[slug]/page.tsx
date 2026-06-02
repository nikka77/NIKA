import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import wowData from '@/data/wow_listings.json';

function getSlugImages(slug: string): { cover?: string; gallery: string[] } {
  const dir = path.join(process.cwd(), 'public', 'images', 'wow', slug);
  if (!fs.existsSync(dir)) return { gallery: [] };
  const files = fs.readdirSync(dir).sort();
  const cover = files.includes('cover.jpg') ? `/images/wow/${slug}/cover.jpg` : undefined;
  const gallery = files
    .filter(f => f.startsWith('gallery-'))
    .map(f => `/images/wow/${slug}/${f}`);
  return { cover, gallery };
}

type WowListing = typeof wowData.listings[0];
type Props = { params: Promise<{ slug: string }> };

function getListing(slug: string): WowListing | undefined {
  return wowData.listings.find(l => l.slug === slug);
}

export async function generateStaticParams() {
  return wowData.listings.map(l => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const l = getListing(slug);
  if (!l) return { title: 'Logement introuvable — NIKA STAY' };

  return {
    title: `${l.name} — ${l.city}, ${l.country} · NIKA STAY`,
    description: l.description_nika.slice(0, 160),
    keywords: [
      l.type.replace(/-/g, ' '),
      `logement insolite ${l.country.toLowerCase()}`,
      `${l.type.replace(/-/g, ' ')} location`,
      l.city.toLowerCase(),
      'hébergement insolite',
      'logement wow',
    ],
    openGraph: {
      title: `${l.name} — ${l.tagline}`,
      description: l.description_nika.slice(0, 200),
      type: 'website',
    },
  };
}

const TYPE_ICONS: Record<string, string> = {
  'sous-marin': '🤿',
  'train-reconverti': '🚂',
  'bunker-militaire': '☢️',
  'suite-flottante': '🚤',
  'architecture-surréaliste': '🌀',
  'transport-reconverti': '🪵',
  'peniche': '⚓',
  'silo-reconverti': '🏗️',
  'earthship': '🌱',
  'maison-terre': '🧱',
  'grotte': '🪨',
  'eco-cabin': '🌲',
  'maison-architecturale': '🏛️',
  'dome-adobe': '🌵',
  'cabane-perchée': '🌲',
  'tiny-house': '🏡',
  'bambou': '🎋',
  'villa-bali': '🌴',
  'dôme': '🔵',
  'yourte': '⛺',
  'moulin-reconverti': '⚙️',
  'eco-farm': '🌾',
  'grange-reconvertie': '🏚️',
  'thématique': '🎭',
  'cabane-architecturale': '🏗️',
  'cabane-organique': '🍄',
};

const PRIORITY_COLOR: Record<string, string> = {
  'MAXIMALE': 'var(--coral)',
  'HAUTE': '#E07038',
};

function priorityColor(p: string) {
  if (p.startsWith('MAXIMALE')) return PRIORITY_COLOR['MAXIMALE'];
  if (p.startsWith('HAUTE')) return PRIORITY_COLOR['HAUTE'];
  return 'var(--td3)';
}

export default async function StaySlugPage({ params }: Props) {
  const { slug } = await params;
  const l = getListing(slug);
  if (!l) notFound();

  const icon = TYPE_ICONS[l.type] ?? '🏡';
  const history = ((l.history ?? {}) as Record<string, unknown>);
  const alsoOnBooking = (l as unknown as { also_on_booking?: boolean }).also_on_booking;
  const isDirect = l.booking_type === 'direct' || l.booking_type === 'direct_or_booking';
  const isAffil = l.booking_type === 'booking_affil';
  const { cover, gallery } = getSlugImages(slug);

  return (
    <main style={{ paddingBottom: '4rem' }}>
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--bd)' }}>
        {/* Background — photo or gradient */}
        {cover ? (
          <>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(6,9,20,0.88) 0%,rgba(6,9,20,0.70) 60%,rgba(6,9,20,0.55) 100%)' }} />
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #060F1E 0%, #0A1A30 60%, #071A12 100%)' }} />
        )}

        {/* Background icon (decorative, only when no photo) */}
        {!cover && (
          <div style={{ position: 'absolute', right: '5%', top: '50%', transform: 'translateY(-50%)', fontSize: 180, opacity: 0.04, pointerEvents: 'none', userSelect: 'none' }}>
            {icon}
          </div>
        )}

        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', padding: 'clamp(3rem,8vw,5rem) 1.4rem clamp(2rem,5vw,3.5rem)' }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
            <Link href="/stay" style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--td3)' }}>STAY</Link>
            <span style={{ color: 'var(--td3)', fontSize: 10 }}>/</span>
            <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#E07038' }}>
              {l.type.replace(/-/g, ' ')}
            </span>
          </div>

          {/* WOW Score badge */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--fe)', fontSize: 11, fontWeight: 900, fontStyle: 'italic', padding: '3px 10px', borderRadius: 20, background: 'rgba(224,112,56,0.15)', border: '1px solid rgba(224,112,56,0.4)', color: '#E07038' }}>
              WOW {l.wow_score}/25
            </span>
            {l.badge && (
              <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(212,160,23,0.12)', border: '1px solid rgba(212,160,23,0.3)', color: 'var(--gold2)' }}>
                {l.badge}
              </span>
            )}
            {isAffil ? (
              <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,90,95,0.1)', border: '1px solid rgba(255,90,95,0.3)', color: '#FF5A5F' }}>
                Via Airbnb
              </span>
            ) : (
              <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${priorityColor(l.contact_priority)}18`, border: `1px solid ${priorityColor(l.contact_priority)}40`, color: priorityColor(l.contact_priority) }}>
                Résa directe
              </span>
            )}
          </div>

          {/* Title */}
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(40px,8vw,88px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.88, marginBottom: '1rem' }}>
            {l.name}
          </h1>
          <p style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(14px,2.5vw,20px)', fontStyle: 'italic', color: 'var(--teal)', marginBottom: '1.2rem', lineHeight: 1.3 }}>
            {l.tagline}
          </p>

          {/* Location + rating */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)' }}>
              📍 {l.city}{l.country !== l.city ? `, ${l.country}` : ''}
            </span>
            {l.rating > 0 && <span style={{ fontFamily: 'var(--fe)', fontSize: 16, fontStyle: 'italic', color: 'var(--gold2)' }}>⭐ {l.rating}/5</span>}
            {l.reviews_count > 0 && <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>{l.reviews_count.toLocaleString('fr-FR')} avis</span>}
            {l.host && <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>par {l.host}</span>}
          </div>
        </div>
      </div>

      {/* ── GALERIE PHOTOS ───────────────────────────────────────────── */}
      {gallery.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--bd)', background: 'var(--bg)' }}>
          <div style={{
            display: 'flex', gap: 4, overflowX: 'auto', padding: '4px 0',
            scrollbarWidth: 'none',
          }}>
            {gallery.map((src, i) => (
              <div key={i} style={{ flexShrink: 0, height: 220, width: 320, overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${l.name} — photo ${i + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CONTENT + BOOKING SIDEBAR ────────────────────────────────── */}
      <div style={{ maxWidth: 900, margin: '3rem auto 0', padding: '0 1.4rem' }}>
        <div style={{ gap: '3rem' }} className="g-listing max-md:grid-cols-1">

          {/* LEFT */}
          <div>
            {/* Description */}
            <p style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td2)', lineHeight: 1.85, marginBottom: '2.5rem' }}>
              {l.description_nika}
            </p>

            {/* Histoire du lieu */}
            {Object.keys(history).length > 0 && (
              <div style={{ marginBottom: '2.5rem' }}>
                <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(20px,3vw,30px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>
                  L&apos;histoire de ce lieu
                </h2>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderLeft: '3px solid #E07038', borderRadius: 8, padding: '1.4rem 1.6rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  {Object.entries(history).map(([key, val]) => {
                    if (typeof val === 'string') {
                      return (
                        <div key={key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#E07038', minWidth: 80, paddingTop: 2 }}>
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.5 }}>{val}</span>
                        </div>
                      );
                    }
                    if (Array.isArray(val)) {
                      return (
                        <div key={key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#E07038', minWidth: 80, paddingTop: 2 }}>
                            {key.replace(/_/g, ' ')}
                          </span>
                          <ul style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.6, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {(val as string[]).map((item, i) => (
                              <li key={i}>— {item}</li>
                            ))}
                          </ul>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}

            {/* Équipements */}
            {l.amenities && l.amenities.length > 0 && (
              <div style={{ marginBottom: '2.5rem' }}>
                <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(18px,2.5vw,26px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem' }}>
                  Équipements inclus
                </h2>
                <div style={{ gap: '0.5rem' }} className="g-2 max-sm:grid-cols-1">
                  {l.amenities.map((a, i) => (
                    <div key={i} style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', display: 'flex', alignItems: 'center', gap: 8, padding: '0.4rem 0' }}>
                      <span style={{ color: 'var(--teal)', flexShrink: 0, fontSize: 10 }}>✓</span>
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ce qu'ils en disent */}
            {l.sample_reviews && l.sample_reviews.length > 0 && (
              <div style={{ marginBottom: '2.5rem' }}>
                <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(18px,2.5vw,26px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem' }}>
                  Ce qu&apos;ils en disent
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {l.sample_reviews.map((rev, i) => (
                    <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1.1rem 1.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)' }}>{rev.author}</span>
                          <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--gold2)' }}>
                            {'⭐'.repeat((rev as { stars?: number; rating?: number }).stars ?? (rev as { stars?: number; rating?: number }).rating ?? 5)}
                          </span>
                        </div>
                        <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>{rev.date}</span>
                      </div>
                      <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>
                        &ldquo;{rev.text}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Thèmes des avis */}
            {l.review_categories && Object.keys(l.review_categories).length > 0 && (
              <div style={{ marginBottom: '2.5rem' }}>
                <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(16px,2vw,22px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem' }}>
                  Thèmes des {l.reviews_count} avis
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.entries(l.review_categories as unknown as Record<string, number>)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, count]) => (
                      <span key={cat} style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: 'var(--bg2)', border: '1px solid var(--bd2)', color: 'var(--td2)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {cat.replace(/_/g, ' ')}
                        <strong style={{ color: 'var(--teal)', fontFamily: 'var(--fe)', fontStyle: 'italic', fontSize: 13 }}>{count}</strong>
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Booking card */}
          <div className="booking-sidebar" style={{ background: 'var(--bg2)', border: `1px solid ${isAffil ? 'rgba(224,112,56,0.2)' : 'rgba(14,168,120,0.2)'}`, borderRadius: 12, padding: '1.8rem', position: 'sticky', top: 70 }}>
            {/* Top accent */}
            <div style={{ height: 3, background: isAffil ? 'linear-gradient(90deg, #E07038, transparent)' : 'linear-gradient(90deg, var(--teal), transparent)', borderRadius: 2, marginBottom: '1.4rem', marginLeft: '-1.8rem', marginRight: '-1.8rem', marginTop: '-1.8rem' }} />

            <div style={{ marginBottom: '1.2rem' }}>
              <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 10px', borderRadius: 20, background: isAffil ? 'rgba(224,112,56,0.1)' : 'rgba(14,168,120,0.12)', border: `1px solid ${isAffil ? 'rgba(224,112,56,0.3)' : 'rgba(14,168,120,0.3)'}`, color: isAffil ? '#E07038' : 'var(--teal)' }}>
                {isAffil ? 'Disponible sur Airbnb' : 'Réservation directe NIKA'}
              </span>
            </div>

            <div style={{ fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: 4, lineHeight: 1.2 }}>
              {l.name}
            </div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginBottom: '1.2rem' }}>
              📍 {l.city}, {l.country}
            </div>

            {/* Check-in/out */}
            {(l.checkin || l.checkout) && (
              <div style={{ display: 'flex', gap: 12, marginBottom: '1.4rem' }}>
                {l.checkin && (
                  <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 6, padding: '0.6rem 0.8rem' }}>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 9, color: 'var(--td3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Check-in</div>
                    <div style={{ fontFamily: 'var(--fe)', fontSize: 14, fontStyle: 'italic', color: 'var(--td)' }}>{l.checkin}</div>
                  </div>
                )}
                {l.checkout && (
                  <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 6, padding: '0.6rem 0.8rem' }}>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 9, color: 'var(--td3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Check-out</div>
                    <div style={{ fontFamily: 'var(--fe)', fontSize: 14, fontStyle: 'italic', color: 'var(--td)' }}>{l.checkout}</div>
                  </div>
                )}
              </div>
            )}

            {/* Capacity */}
            {'capacity' in l && l.capacity && (
              <div style={{ display: 'flex', gap: 12, marginBottom: '1.4rem', flexWrap: 'wrap' }}>
                {[
                  { val: l.capacity.guests, label: 'voyageurs' },
                  { val: l.capacity.bedrooms, label: 'chambres' },
                  { val: l.capacity.bathrooms, label: 'SDB' },
                ].map(({ val, label }) => (
                  <div key={label} style={{ textAlign: 'center', flex: 1, minWidth: 50 }}>
                    <div style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', color: '#E07038', lineHeight: 1 }}>{val}</div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 9, color: 'var(--td3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            {isAffil ? (
              <>
                <a
                  href={`https://www.airbnb.com/rooms/${(l as unknown as Record<string, string>).airbnb_id}`}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  style={{ display: 'block', width: '100%', padding: '14px', borderRadius: 6, background: '#FF5A5F', color: '#fff', fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center', textDecoration: 'none', marginBottom: '0.8rem' }}
                >
                  Voir sur Airbnb →
                </a>
                <Link
                  href={`/contact?logement=${encodeURIComponent(l.name)}&lieu=${encodeURIComponent(`${l.city}, ${l.country}`)}`}
                  style={{ display: 'block', width: '100%', padding: '11px', borderRadius: 6, border: '1px solid var(--bd2)', color: 'var(--td)', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 600, textAlign: 'center', textDecoration: 'none', marginBottom: '0.8rem' }}
                >
                  Demander l&apos;aide de NIKA
                </Link>
              </>
            ) : (
              <Link
                href={`/contact?logement=${encodeURIComponent(l.name)}&lieu=${encodeURIComponent(`${l.city}, ${l.country}`)}`}
                className="btn-direct"
                style={{ display: 'block', width: '100%', padding: '14px', borderRadius: 6, background: 'var(--teal)', color: '#fff', fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center', textDecoration: 'none', marginBottom: '0.8rem' }}
              >
                Réserver via NIKA →
              </Link>
            )}

            {alsoOnBooking && l.booking_type !== 'booking_affil' && (
              <Link
                href={`/stay?search=${encodeURIComponent(l.city)}`}
                style={{ display: 'block', width: '100%', padding: '11px', borderRadius: 6, border: '1px solid var(--bd2)', color: 'var(--td)', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 600, textAlign: 'center', textDecoration: 'none', marginBottom: '0.8rem' }}
              >
                Aussi disponible sur Booking.com
              </Link>
            )}

            <div style={{ marginTop: '1.2rem', padding: '0.8rem', background: isAffil ? 'rgba(224,112,56,0.04)' : 'rgba(14,168,120,0.04)', border: `1px solid ${isAffil ? 'rgba(224,112,56,0.12)' : 'rgba(14,168,120,0.12)'}`, borderRadius: 8, fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', lineHeight: 1.6 }}>
              {isAffil
                ? 'Logement sélectionné et vérifié par NIKA · WOW score ' + l.wow_score + '/25'
                : '+30 XP à chaque réservation via NIKA · Analyse IA de vos avis incluse'}
            </div>
          </div>
        </div>
      </div>

      {/* ── RETOUR STAY ─────────────────────────────────────────────── */}
      <div style={{ maxWidth: 900, margin: '3rem auto 0', padding: '0 1.4rem', borderTop: '1px solid var(--bd)', paddingTop: '2rem' }}>
        <Link href="/stay" style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          ← Tous les logements insolites
        </Link>
      </div>
    </main>
  );
}
