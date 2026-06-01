'use client';
import { useState } from 'react';
import Link from 'next/link';

interface Listing {
  slug: string;
  name: string;
  city: string;
  country: string;
  type: string;
  wow_score: number;
  rating: number;
  booking_type: string;
  price_per_night?: number;
  coverImage?: string;
}

interface FilterTab {
  id: string;
  icon: string;
  label: string;
  types: string[];
  byCountry?: string;
}

const FILTERS: FilterTab[] = [
  { id: 'all',       icon: '✦',  label: 'Tous',         types: [] },
  { id: 'cabane',    icon: '🌲', label: 'Cabane',        types: ['cabane-perchée', 'cabane-architecturale', 'cabane-organique', 'eco-cabin', 'tiny-house', 'bambou', 'eco-farm', 'grange-reconvertie'] },
  { id: 'terre',     icon: '🧱', label: 'Terre',         types: ['maison-terre', 'earthship', 'grotte', 'dome-adobe', 'maison-architecturale'] },
  { id: 'transport', icon: '🚂', label: 'Transport',     types: ['train-reconverti', 'transport-reconverti'] },
  { id: 'eau',       icon: '🤿', label: 'Eau',           types: ['sous-marin', 'suite-flottante', 'peniche'] },
  { id: 'dome',      icon: '🫧', label: 'Dôme & Bulle',  types: ['dôme', 'yourte', 'villa-bali'] },
  { id: 'insolite',  icon: '🌀', label: 'Insolite',      types: ['architecture-surréaliste', 'silo-reconverti', 'bunker-militaire', 'thématique', 'moulin-reconverti'] },
  { id: 'france',    icon: '🇫🇷', label: 'France',        types: [], byCountry: 'France' },
];

const ICON_BY_TYPE: Record<string, string> = {
  'sous-marin': '🤿', 'train-reconverti': '🚂', 'bunker-militaire': '☢️',
  'suite-flottante': '🚤', 'architecture-surréaliste': '🌀', 'transport-reconverti': '🚃',
  'peniche': '⚓', 'silo-reconverti': '🏗️', 'earthship': '🌱', 'maison-terre': '🧱',
  'grotte': '🪨', 'eco-cabin': '🌲', 'maison-architecturale': '🏛️', 'dome-adobe': '🌵',
  'cabane-perchée': '🌲', 'tiny-house': '🏡', 'bambou': '🎋', 'villa-bali': '🌴',
  'dôme': '🫧', 'yourte': '⛺', 'moulin-reconverti': '⚙️', 'eco-farm': '🌾',
  'grange-reconvertie': '🏚️', 'thématique': '🎭', 'cabane-architecturale': '🏗️', 'cabane-organique': '🍄',
};

const PAGE_SIZE = 12;

export default function WowFilter({ listings }: { listings: Listing[] }) {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = listings.filter(l => {
    const f = FILTERS.find(f => f.id === activeFilter);
    if (!f || f.id === 'all') return true;
    if (f.byCountry) return l.country === f.byCountry;
    return f.types.includes(l.type);
  });

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  function selectFilter(id: string) {
    setActiveFilter(id);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <div>
      {/* Filter tabs */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4,
        marginBottom: '1.8rem',
        scrollbarWidth: 'none',
      }}>
        {FILTERS.map(f => {
          const isActive = activeFilter === f.id;
          const count = f.id === 'all' ? listings.length
            : listings.filter(l => f.byCountry ? l.country === f.byCountry : f.types.includes(l.type)).length;
          return (
            <button
              key={f.id}
              onClick={() => selectFilter(f.id)}
              style={{
                flexShrink: 0,
                fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700,
                padding: '7px 14px', borderRadius: 20,
                background: isActive ? '#E07038' : 'rgba(255,255,255,0.04)',
                border: isActive ? '1px solid #E07038' : '1px solid var(--bd2)',
                color: isActive ? '#fff' : 'var(--td2)',
                cursor: 'pointer', transition: 'all 0.15s ease',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <span style={{ fontSize: 14 }}>{f.icon}</span>
              {f.label}
              <span style={{
                fontSize: 10, fontWeight: 600, opacity: 0.7,
                background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                borderRadius: 10, padding: '1px 6px',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards grid */}
      <div style={{ gap: '0.7rem' }} className="g-3 max-md:grid-cols-2 max-sm:grid-cols-1">
        {visible.map((l, i) => {
          const isDirect = l.booking_type === 'direct' || l.booking_type === 'direct_or_booking';
          const isAffil = l.booking_type === 'booking_affil' || l.booking_type === 'homestay';
          const icon = ICON_BY_TYPE[l.type] ?? '🏡';
          return (
            <Link
              key={l.slug}
              href={`/stay/${l.slug}`}
              className="stay-card fade-up"
              style={{
                textDecoration: 'none', display: 'flex', flexDirection: 'column',
                background: 'var(--bg2)', border: `1px solid ${isDirect ? 'rgba(14,168,120,0.13)' : 'var(--bd)'}`,
                borderRadius: 10, overflow: 'hidden', gap: 0,
                animationDelay: `${(i % PAGE_SIZE) * 0.03}s`,
              }}
            >
              {l.coverImage && (
                <div style={{ height: 130, overflow: 'hidden', flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.coverImage} alt={l.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                </div>
              )}
              <div style={{ padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 24, lineHeight: 1 }}>{icon}</span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <span style={{
                    fontFamily: 'var(--fe)', fontSize: 10, fontStyle: 'italic',
                    color: '#E07038', background: 'rgba(224,112,56,0.08)',
                    border: '1px solid rgba(224,112,56,0.2)', borderRadius: 10, padding: '1px 7px',
                  }}>
                    WOW {l.wow_score}
                  </span>
                  {isDirect && (
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, color: 'var(--teal)', background: 'rgba(14,168,120,0.08)', border: '1px solid rgba(14,168,120,0.22)', borderRadius: 10, padding: '1px 6px' }}>
                      NIKA
                    </span>
                  )}
                  {isAffil && (
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, color: '#FF5A5F', background: 'rgba(255,90,95,0.07)', border: '1px solid rgba(255,90,95,0.2)', borderRadius: 10, padding: '1px 6px' }}>
                      Airbnb
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', lineHeight: 1.2 }}>
                {l.name}
              </div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: 'auto' }}>
                📍 {l.city}, {l.country}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid var(--bd)' }}>
                {l.rating > 0 ? (
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--gold2)' }}>⭐ {l.rating}</span>
                ) : <span />}
                <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: isDirect ? 'var(--teal)' : '#E07038' }}>
                  {isDirect ? 'Via NIKA →' : 'Voir →'}
                </span>
              </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Load more */}
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button
            onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
            style={{
              fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 900, fontStyle: 'italic',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              background: 'transparent', color: 'var(--td2)',
              border: '1px solid var(--bd2)', borderRadius: 4, padding: '12px 28px',
              cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s',
            }}
          >
            Charger {Math.min(PAGE_SIZE, filtered.length - visibleCount)} de plus →
          </button>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: 8 }}>
            {visibleCount} / {filtered.length} logements
          </div>
        </div>
      )}
    </div>
  );
}
