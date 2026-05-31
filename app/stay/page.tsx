import type { Metadata } from 'next';
import Link from 'next/link';
import TravelpayoutsSearch from '@/components/TravelpayoutsSearch';
import HeroSlideshow from './HeroSlideshow';
import WowFilter from './WowFilter';
import wowData from '@/data/wow_listings.json';
import type { HeroSlide } from './HeroSlideshow';

export const metadata: Metadata = {
  title: 'Logement Insolite Monde entier — NIKA STAY',
  description: 'Bunkers, sous-marins, maisons hobbit, bulles transparentes, chambres sous-marines. Les hébergements WOW les plus rares du monde.',
  keywords: ['logement insolite', 'maison bulle location', 'chambre sous-marine', 'dormir dans un bunker', 'maison hobbit location', 'hébergement insolite monde'],
};

// WOW Exclusifs — 7 thèmes (grue-industrielle retirée : listing non importé)
const WOW_EXCLUSIFS = [
  { slug: 'silo-bunker',              icon: '☢️',  name: 'Bunker & Silo',        badge: '5/5', desc: 'Silos à missiles déclassifiés, bunkers WWII', from: 195, direct: true  },
  { slug: 'sous-marin',               icon: '🤿',  name: 'Sous-Marin',           badge: '5/5', desc: 'Le Sous-Marin Jaune des Beatles · Nouvelle-Zélande', from: 380, direct: true  },
  { slug: 'maison-hobbit',            icon: '🌿',  name: 'Maison Hobbit',        badge: '4/5', desc: 'Cob cottages sculptés · Earthships hors réseau', from: 145, direct: true  },
  { slug: 'tour-observation',         icon: '🦅',  name: 'Tour & Birdbox',       badge: '4/5', desc: "Birdbox fjords · Gawthorne's Hut Top 10 Monde", from: 380, direct: true  },
  { slug: 'bulle-transparente',       icon: '🫧',  name: 'Bulle & Dôme',        badge: '3/5', desc: 'Dômes transparents sous les étoiles',          from: 290, direct: true  },
  { slug: 'architecture-surrealiste', icon: '🌀',  name: 'Architecture insolite',badge: '4/5', desc: 'OVNI · Sphère dans les rochers · Bloomhouse',  from: 285, direct: true  },
  { slug: 'maison-terre',             icon: '🧱',  name: 'Maison en Terre',      badge: '4/5', desc: 'Grottes France · Earthship Taos · Naturhus',   from: 120, direct: true  },
];

// Coups de cœur NIKA — top listings for hero slideshow (wow_score ≥ 24, sorted desc)
const heroSlides: HeroSlide[] = wowData.listings
  .filter(l => l.wow_score >= 24)
  .sort((a, b) => b.wow_score - a.wow_score)
  .map(l => ({
    slug: l.slug,
    name: l.name,
    city: l.city,
    country: l.country,
    type: l.type,
    wow_score: l.wow_score,
    rating: l.rating,
    booking_type: l.booking_type,
    tagline: ((l as unknown as { description_nika?: string }).description_nika ?? '').slice(0, 120) + '…',
  }));

// Full listing list for filter section
const listings = wowData.listings.map(l => ({
  slug: l.slug,
  name: l.name,
  city: l.city,
  country: l.country,
  type: l.type,
  wow_score: l.wow_score,
  rating: l.rating,
  booking_type: l.booking_type,
}));

export default function StayPage() {
  return (
    <main>
      {/* ── HERO DIAPORAMA — Coups de cœur NIKA ───────────────────────── */}
      <HeroSlideshow slides={heroSlides} />

      {/* ── STATS BAR ─────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--bd)', padding: '1.6rem 1.4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            {[
              { val: '57', label: 'Logements WOW' },
              { val: '11', label: 'Pays' },
              { val: '37', label: 'Résa directes' },
              { val: '4.93', label: 'Note moyenne' },
            ].map(({ val, label }) => (
              <div key={label}>
                <div style={{ fontFamily: 'var(--fe)', fontSize: 26, fontWeight: 900, fontStyle: 'italic', color: '#E07038', lineHeight: 1 }}>{val}</div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Booking.com', 'Expedia', 'Airbnb'].map(p => (
              <span key={p} style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(224,112,56,0.08)', border: '1px solid rgba(224,112,56,0.2)', color: '#E07038' }}>{p}</span>
            ))}
            <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(14,168,120,0.08)', border: '1px solid rgba(14,168,120,0.25)', color: 'var(--teal)' }}>Réservation directe</span>
          </div>
        </div>
      </div>

      {/* ── WOW EXCLUSIFS ─────────────────────────────────────────────── */}
      <div style={{ padding: 'clamp(2rem,4vw,3rem) 1.4rem', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: '1.4rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(22px,3.5vw,36px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', margin: 0 }}>
              WOW Exclusifs
            </h2>
            <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E07038', background: 'rgba(224,112,56,0.1)', border: '1px solid rgba(224,112,56,0.3)', borderRadius: 20, padding: '3px 10px' }}>
              7 thèmes
            </span>
          </div>

          {/* Horizontal scroll row */}
          <div style={{
            display: 'flex', gap: '0.75rem',
            overflowX: 'auto', paddingBottom: 6,
            scrollbarWidth: 'none',
          }}>
            {WOW_EXCLUSIFS.map(({ slug, icon, name, desc, from, direct, badge }) => (
              <Link
                key={slug}
                href={`/stay/theme/${slug}`}
                className="wow-card"
                style={{
                  textDecoration: 'none', flexShrink: 0,
                  width: 200,
                  display: 'flex', flexDirection: 'column',
                  background: direct ? 'linear-gradient(160deg,#071A12,#0D1E14)' : 'var(--bg2)',
                  border: `1px solid ${direct ? 'rgba(14,168,120,0.18)' : 'var(--bd)'}`,
                  borderRadius: 10, overflow: 'hidden',
                }}
              >
                <div style={{ height: 2, background: direct ? 'linear-gradient(90deg,var(--teal),transparent)' : 'linear-gradient(90deg,#E07038,transparent)' }} />
                <div style={{ padding: '1rem 1rem 0.7rem', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 28, lineHeight: 1 }}>{icon}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                      {direct && (
                        <span style={{ fontFamily: 'var(--fo)', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', background: 'rgba(14,168,120,0.12)', border: '1px solid rgba(14,168,120,0.28)', borderRadius: 20, padding: '2px 6px' }}>
                          Via NIKA
                        </span>
                      )}
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 8, color: 'var(--td3)' }}>Rareté {badge}</span>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', lineHeight: 1.2 }}>{name}</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', lineHeight: 1.4, flex: 1 }}>{desc}</div>
                  <div style={{ paddingTop: 8, borderTop: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>
                      dès <strong style={{ fontFamily: 'var(--fe)', fontSize: 14, fontStyle: 'italic', color: '#E07038' }}>{from}€</strong>
                    </span>
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: direct ? 'var(--teal)' : '#E07038' }}>→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── FILTER + LES 57 WOW ──────────────────────────────────────── */}
      <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--bd)', padding: 'clamp(2rem,4vw,3.5rem) 1.4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: '1.6rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(22px,3.5vw,36px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', margin: 0 }}>
              Les 57 WOW
            </h2>
            <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 600, color: 'var(--td3)' }}>
              sélection complète · cliquez sur un filtre
            </span>
          </div>
          <WowFilter listings={listings} />
        </div>
      </div>

      {/* ── COMPARER LES HÔTELS ─────────────────────────────────────── */}
      <div style={{ background: 'var(--bg)', borderTop: '1px solid var(--bd)', padding: 'clamp(2rem,4vw,3.5rem) 1.4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(20px,3vw,34px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.4rem' }}>
            Comparer tous les hôtels
          </h2>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '2rem' }}>
            Booking.com, Expedia, Hotels.com — meilleur prix garanti via Travelpayouts.
          </p>
          <TravelpayoutsSearch />
        </div>
      </div>
    </main>
  );
}
