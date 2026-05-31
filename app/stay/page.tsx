import type { Metadata } from 'next';
import Link from 'next/link';
import TravelpayoutsSearch from '@/components/TravelpayoutsSearch';
import wowData from '@/data/wow_listings.json';

export const metadata: Metadata = {
  title: 'Logement Insolite Monde entier — NIKA STAY',
  description: 'Bunkers, sous-marins, maisons hobbit, bulles transparentes, chambres sous-marines. Les hébergements WOW les plus rares du monde.',
  keywords: ['logement insolite', 'maison bulle location', 'chambre sous-marine', 'dormir dans un bunker', 'maison hobbit location', 'hébergement insolite monde'],
};

const WOW_EXCLUSIFS = [
  { slug: 'silo-bunker',              icon: '☢️',  name: 'Bunker & Silo',        badge: '5/5', desc: 'Silos à missiles déclassifiés, bunkers WWII', from: 195, direct: true  },
  { slug: 'sous-marin',               icon: '🤿',  name: 'Sous-Marin',           badge: '5/5', desc: 'Le Sous-Marin Jaune des Beatles · Nouvelle-Zélande', from: 380, direct: true  },
  { slug: 'grue-industrielle',        icon: '🏗️',  name: 'Grue Industrielle',    badge: '5/5', desc: '50m de hauteur · Vue portuaire panoramique',  from: 450, direct: false },
  { slug: 'maison-hobbit',            icon: '🌿',  name: 'Maison Hobbit',        badge: '4/5', desc: 'Cob cottages sculptés · Earthships hors réseau', from: 145, direct: true  },
  { slug: 'tour-observation',         icon: '🦅',  name: 'Tour & Birdbox',       badge: '4/5', desc: 'Birdbox fjords · Gawthorne\'s Hut Top 10 Monde', from: 380, direct: true  },
  { slug: 'bulle-transparente',       icon: '🫧',  name: 'Bulle & Dôme',        badge: '3/5', desc: 'Dômes transparents sous les étoiles',          from: 290, direct: true  },
  { slug: 'architecture-surréaliste', icon: '🌀',  name: 'Architecture insolite',badge: '4/5', desc: 'OVNI · Sphère dans les rochers · Bloomhouse',  from: 285, direct: true  },
  { slug: 'maison-terre',             icon: '🧱',  name: 'Maison en Terre',      badge: '4/5', desc: 'Grottes France · Earthship Taos · Naturhus',   from: 120, direct: true  },
];

const THEMES_CLASSIQUES = [
  { slug: 'cabane-perchée',           icon: '🌲', name: 'Cabane perchée',       count: 10 },
  { slug: 'maison-terre',             icon: '🧱', name: 'Maison en Terre',      count: 6  },
  { slug: 'tiny-house',               icon: '🏡', name: 'Tiny House & Birdbox', count: 4  },
  { slug: 'bambou',                   icon: '🎋', name: 'Bambou & Jungle',      count: 3  },
  { slug: 'villa-bali',               icon: '🌴', name: 'Villa Bali',           count: 3  },
  { slug: 'architecture-surréaliste', icon: '🌀', name: 'Architecture insolite',count: 3  },
  { slug: 'avion',                    icon: '🚂', name: 'Train & Transport',    count: 3  },
  { slug: 'grotte',                   icon: '🪨', name: 'Grotte & Cave',        count: 2  },
  { slug: 'maison-flottante',         icon: '🚤', name: 'Flottant & Péniche',  count: 2  },
  { slug: 'thematique',               icon: '🎭', name: 'Thématique',           count: 2  },
  { slug: 'moulin-reconverti',        icon: '⚙️', name: 'Moulin reconverti',    count: 1  },
  { slug: 'france',                   icon: '🇫🇷', name: 'France insolite',      count: 17 },
];

// Featured listings from JSON (wow_score >= 23)
const featuredListings = wowData.listings
  .filter(l => l.wow_score >= 23)
  .sort((a, b) => b.wow_score - a.wow_score);

const ICON_BY_TYPE: Record<string, string> = {
  'sous-marin': '🤿', 'train-reconverti': '🚂', 'bunker-militaire': '☢️',
  'suite-flottante': '🚤', 'architecture-surréaliste': '🌀', 'transport-reconverti': '🪵',
  'peniche': '⚓', 'silo-reconverti': '🏗️', 'earthship': '🌱', 'maison-terre': '🧱',
  'grotte': '🪨', 'eco-cabin': '🌲', 'maison-architecturale': '🏛️', 'dome-adobe': '🌵',
  'cabane-perchée': '🌲', 'tiny-house': '🏡', 'bambou': '🎋', 'villa-bali': '🌴',
  'dôme': '🫧', 'yourte': '⛺', 'moulin-reconverti': '⚙️', 'eco-farm': '🌾',
  'grange-reconvertie': '🏚️', 'thématique': '🎭', 'cabane-architecturale': '🏗️', 'cabane-organique': '🍄',
};

export default function StayPage() {
  return (
    <main>
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(to bottom, #060F1E, #0A1628)', padding: 'clamp(3rem,8vw,5rem) 1.4rem clamp(2rem,5vw,3.5rem)', borderBottom: '1px solid var(--bd)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#E07038', marginBottom: '0.6rem' }}>
            03 / Logement insolite · Monde entier
          </p>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(56px,10vw,112px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.88, marginBottom: '1.2rem' }}>
            STAY
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 16, color: 'var(--td2)', maxWidth: 520, lineHeight: 1.7, marginBottom: '2.2rem' }}>
            Bunkers, silos à missiles, maisons hobbit, chambres sous-marines.
            Les logements WOW introuvables sur Booking ou Expedia.
          </p>

          {/* Stats bar */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: '2rem' }}>
            {[
              { val: '57', label: 'Logements WOW' },
              { val: '11', label: 'Pays' },
              { val: '37', label: 'Résa directes' },
              { val: '4.93', label: 'Note moyenne' },
            ].map(({ val, label }) => (
              <div key={label}>
                <div style={{ fontFamily: 'var(--fe)', fontSize: 28, fontWeight: 900, fontStyle: 'italic', color: '#E07038', lineHeight: 1 }}>{val}</div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Source badges */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {['Booking.com', 'Expedia', 'Airbnb'].map(p => (
              <span key={p} style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(224,112,56,0.12)', border: '1px solid rgba(224,112,56,0.25)', color: '#E07038' }}>{p}</span>
            ))}
            <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(14,168,120,0.1)', border: '1px solid rgba(14,168,120,0.3)', color: 'var(--teal)' }}>Réservation directe</span>
          </div>
        </div>
      </div>

      {/* ── WOW EXCLUSIFS ─────────────────────────────────────────────── */}
      <div style={{ padding: 'clamp(2rem,5vw,4rem) 1.4rem', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(26px,4vw,44px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', margin: 0 }}>
              WOW Exclusifs
            </h2>
            <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E07038', background: 'rgba(224,112,56,0.1)', border: '1px solid rgba(224,112,56,0.3)', borderRadius: 20, padding: '3px 10px' }}>
              Introuvables ailleurs
            </span>
          </div>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '2rem', lineHeight: 1.6 }}>
            Logements sans équivalent sur Booking, Expedia ou Airbnb. Certains en réservation directe propriétaire via NIKA.
          </p>

          <div style={{ gap: '1rem' }} className="g-4 max-md:grid-cols-2 max-sm:grid-cols-1">
            {WOW_EXCLUSIFS.map(({ slug, icon, name, desc, from, direct, badge }) => (
              <Link key={slug} href={`/stay/theme/${slug}`} className="wow-card" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', background: 'var(--bg2)', border: `1px solid ${direct ? 'rgba(14,168,120,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ height: 3, background: direct ? 'linear-gradient(90deg, var(--teal), transparent)' : 'linear-gradient(90deg, #E07038, transparent)', flexShrink: 0 }} />
                <div style={{ padding: '1.2rem 1.2rem 0.8rem', background: direct ? 'linear-gradient(135deg,#071A12,#0D2519)' : 'linear-gradient(135deg,#0A1628,#0E1F3A)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 32, lineHeight: 1 }}>{icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    {direct && (
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', background: 'rgba(14,168,120,0.15)', border: '1px solid rgba(14,168,120,0.3)', borderRadius: 20, padding: '2px 7px', whiteSpace: 'nowrap' }}>
                        Via NIKA
                      </span>
                    )}
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 9, color: 'var(--td3)', letterSpacing: '0.05em' }}>Rareté {badge}</span>
                  </div>
                </div>
                <div style={{ padding: '0.9rem 1.2rem 1.1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.25rem', lineHeight: 1.2 }}>{name}</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', lineHeight: 1.5, marginBottom: '0.8rem', flex: 1 }}>{desc}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.7rem', borderTop: '1px solid var(--bd)' }}>
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>
                      dès <strong style={{ fontFamily: 'var(--fe)', fontSize: 16, fontStyle: 'italic', color: '#E07038' }}>{from}€</strong><span style={{ fontSize: 10 }}>/nuit</span>
                    </span>
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: direct ? 'var(--teal)' : '#E07038' }}>
                      Découvrir →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── TOP 11 FEATURED ─────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(180deg,#060F1E,#0A1628)', borderTop: '1px solid var(--bd)', padding: 'clamp(2rem,5vw,4rem) 1.4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(22px,3.5vw,38px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', margin: 0 }}>
              Coups de cœur NIKA
            </h2>
            <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold2)', background: 'rgba(212,160,23,0.12)', border: '1px solid rgba(212,160,23,0.3)', borderRadius: 20, padding: '3px 10px' }}>
              WOW score ≥ 23
            </span>
          </div>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '2rem' }}>
            Les {featuredListings.length} logements avec le score WOW le plus élevé de notre sélection.
          </p>
          <div style={{ gap: '1rem' }} className="g-3 max-md:grid-cols-2 max-sm:grid-cols-1">
            {featuredListings.map((l) => {
              const isDirect = l.booking_type === 'direct' || l.booking_type === 'direct_or_booking';
              const icon = ICON_BY_TYPE[l.type] ?? '🏡';
              return (
                <Link key={l.slug} href={`/stay/${l.slug}`} className="stay-card" style={{ textDecoration: 'none', background: 'rgba(14,168,120,0.04)', border: '1px solid rgba(14,168,120,0.15)', borderRadius: 10, padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 28 }}>{icon}</span>
                    <span style={{ fontFamily: 'var(--fe)', fontSize: 11, fontWeight: 900, fontStyle: 'italic', color: '#E07038', background: 'rgba(224,112,56,0.1)', border: '1px solid rgba(224,112,56,0.3)', borderRadius: 20, padding: '2px 8px' }}>
                      {l.wow_score}/25
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', lineHeight: 1.2 }}>{l.name}</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>📍 {l.city}, {l.country}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <span style={{ fontFamily: 'var(--fe)', fontSize: 13, fontStyle: 'italic', color: 'var(--gold2)' }}>⭐ {l.rating}</span>
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: isDirect ? 'var(--teal)' : '#E07038' }}>
                      {isDirect ? 'Via NIKA →' : 'Voir →'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── THÈMES ─────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--bd)', padding: 'clamp(2rem,5vw,4rem) 1.4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(22px,3.5vw,38px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.4rem' }}>
            Explorer par thème
          </h2>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '2rem' }}>
            57 logements organisés par type d&apos;architecture et d&apos;expérience.
          </p>
          <div style={{ gap: '0.9rem' }} className="g-4 max-md:grid-cols-3 max-sm:grid-cols-2">
            {THEMES_CLASSIQUES.map(({ slug, icon, name, count }) => (
              <Link key={slug} href={`/stay/theme/${slug}`} className="theme-card" style={{ background: 'var(--bg3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '1.2rem 1rem', textAlign: 'center', textDecoration: 'none', display: 'block' }}>
                <div style={{ fontSize: 28, marginBottom: '0.5rem' }}>{icon}</div>
                <div style={{ fontFamily: 'var(--fe)', fontSize: 12, fontWeight: 800, fontStyle: 'italic', color: 'var(--td)', marginBottom: 3 }}>{name}</div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>{count} logement{count > 1 ? 's' : ''}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── TOUS LES 57 ──────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg)', borderTop: '1px solid var(--bd)', padding: 'clamp(2rem,5vw,4rem) 1.4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(22px,3.5vw,38px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', margin: 0 }}>
              Les 57 WOW
            </h2>
            <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: 'var(--td3)' }}>sélection complète</span>
          </div>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '2rem' }}>
            Tous les logements de la sélection NIKA. Cliquez sur un logement pour accéder à sa fiche complète.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {wowData.listings.map((l) => {
              const isDirect = l.booking_type === 'direct' || l.booking_type === 'direct_or_booking';
              const isAffil = l.booking_type === 'booking_affil' || l.booking_type === 'homestay';
              const icon = ICON_BY_TYPE[l.type] ?? '🏡';
              return (
                <Link key={l.slug} href={`/stay/${l.slug}`} style={{ background: 'var(--bg2)', border: `1px solid ${isDirect ? 'rgba(14,168,120,0.15)' : 'var(--bd)'}`, borderRadius: 8, padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', lineHeight: 1.2 }}>{l.name}</div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: 2 }}>📍 {l.city}, {l.country}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
                    {l.rating > 0 && <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--gold2)' }}>⭐ {l.rating}</span>}
                    <span style={{ fontFamily: 'var(--fe)', fontSize: 10, fontStyle: 'italic', color: '#E07038', background: 'rgba(224,112,56,0.08)', border: '1px solid rgba(224,112,56,0.2)', borderRadius: 10, padding: '1px 7px' }}>
                      WOW {l.wow_score}
                    </span>
                    {isDirect && (
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, color: 'var(--teal)', background: 'rgba(14,168,120,0.1)', border: '1px solid rgba(14,168,120,0.25)', borderRadius: 10, padding: '1px 7px' }}>NIKA</span>
                    )}
                    {isAffil && (
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, color: '#FF5A5F', background: 'rgba(255,90,95,0.08)', border: '1px solid rgba(255,90,95,0.2)', borderRadius: 10, padding: '1px 7px' }}>Airbnb</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── COMPARER LES HÔTELS ─────────────────────────────────────── */}
      <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--bd)', padding: 'clamp(2rem,5vw,4rem) 1.4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(22px,3.5vw,38px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.4rem' }}>
              Comparer tous les hôtels
            </h2>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>
              Booking.com, Expedia, Hotels.com — meilleur prix garanti via Travelpayouts.
            </p>
          </div>
          <TravelpayoutsSearch />
        </div>
      </div>
    </main>
  );
}
