import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Logement Insolite Monde entier — NIKA STAY',
  description: 'Maisons flottantes, avions reconvertis, cabanes dans les arbres, sous-marins, grottes, fusées. Les hébergements insolites les plus spectaculaires du monde.',
  keywords: ['logement insolite', 'hébergement insolite', 'maison flottante', 'cabane arbres', 'avion hôtel', 'sous-marin'],
};

const THEMES = [
  { slug: 'maison-flottante', icon: '🚤', name: 'Maison flottante', count: 24 },
  { slug: 'avion',            icon: '✈️', name: 'Avion reconverti', count: 12 },
  { slug: 'sous-marin',       icon: '🤿', name: 'Sous-marin',       count: 8  },
  { slug: 'cabane-arbres',    icon: '🌲', name: 'Cabane dans les arbres', count: 47 },
  { slug: 'grotte',           icon: '🏔️', name: 'Grotte / Cave',   count: 15 },
  { slug: 'fusee',            icon: '🚀', name: 'Fusée / Espace',  count: 6  },
  { slug: 'igloo',            icon: '❄️', name: 'Igloo',           count: 9  },
  { slug: 'chateau',          icon: '🏰', name: 'Château',         count: 31 },
];

const DESTINATIONS = [
  { slug: 'cote-d-azur', name: "Côte d'Azur", country: 'france', icon: '🌊' },
  { slug: 'islande',     name: 'Islande',      country: 'monde',  icon: '🌋' },
  { slug: 'maldives',   name: 'Maldives',     country: 'monde',  icon: '🏝️' },
  { slug: 'alpes',      name: 'Alpes',        country: 'france', icon: '⛷️' },
  { slug: 'bali',       name: 'Bali',         country: 'monde',  icon: '🌺' },
  { slug: 'nice',       name: 'Nice',         country: 'france', icon: '🗺️' },
];

export default function StayPage() {
  return (
    <main>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(to bottom, #0A1628, #0E1F3A)', padding: '5rem 1.4rem 4rem', borderBottom: '1px solid var(--bd)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#E07038', marginBottom: '0.6rem' }}>
            03 / Logement insolite · Monde entier
          </p>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(48px,8vw,96px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, marginBottom: '1rem' }}>
            STAY
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 16, color: 'var(--td2)', maxWidth: 560, lineHeight: 1.7, marginBottom: '2rem' }}>
            Les hébergements les plus insolites du monde. Curatés, thématiques, affiliés Airbnb & Booking.
            Maison flottante, avion reconverti, cabane dans les arbres, sous-marin, fusée, grotte.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>
              <strong style={{ color: 'var(--gold)', fontWeight: 600 }}>Airbnb</strong> · <strong style={{ color: 'var(--gold)', fontWeight: 600 }}>Booking</strong> affiliés
            </div>
            <span style={{ color: 'var(--td3)' }}>·</span>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>186 hébergements référencés</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ background: 'var(--bg2)', padding: '1.5rem 1.4rem', borderBottom: '1px solid var(--bd)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input placeholder="Destination ou thème..." style={{ flex: 1, minWidth: 200, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--bd2)', borderRadius: 40, padding: '10px 20px', fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td)', outline: 'none' }} />
          <select style={{ background: 'var(--bg3)', border: '1px solid var(--bd2)', borderRadius: 6, padding: '10px 16px', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td)', outline: 'none' }}>
            <option value="">Tous les thèmes</option>
            {THEMES.map(t => <option key={t.slug} value={t.slug}>{t.icon} {t.name}</option>)}
          </select>
          <button style={{ fontFamily: 'var(--fe)', fontSize: 12, fontWeight: 800, fontStyle: 'italic', padding: '10px 24px', borderRadius: 6, background: '#E07038', color: '#fff', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Rechercher
          </button>
        </div>
      </div>

      {/* Themes */}
      <div style={{ padding: '4rem 1.4rem', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,4vw,42px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '2rem' }}>
          Par thème
        </h2>
        <div style={{ gap: '1rem' }}
          className="g-4 max-md:grid-cols-2">
          {THEMES.map(({ slug, icon, name, count }) => (
            <Link key={slug} href={`/stay/theme/${slug}`} style={{ background: 'var(--bg2)', border: '1px solid rgba(224,112,56,0.15)', borderRadius: 8, padding: '1.5rem 1rem', textAlign: 'center', textDecoration: 'none', transition: 'all 0.2s', display: 'block' }}>
              <div style={{ fontSize: 36, marginBottom: '0.6rem' }}>{icon}</div>
              <div style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', color: 'var(--td)', marginBottom: 4 }}>{name}</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{count} logements</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Destinations */}
      <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--bd)', padding: '4rem 1.4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,4vw,42px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '2rem' }}>
            Par destination
          </h2>
          <div style={{ gap: '1rem' }}
            className="g-3 max-md:grid-cols-2 max-sm:grid-cols-1">
            {DESTINATIONS.map(({ slug, country, icon, name }) => (
              <Link key={slug} href={`/stay/${country}/${slug}`} style={{ background: 'var(--bg3)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1.4rem', display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', transition: 'border-color 0.2s' }}>
                <span style={{ fontSize: 28 }}>{icon}</span>
                <div>
                  <div style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)' }}>{name}</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>Logements insolites</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
