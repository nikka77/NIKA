// components/akasha/AkashaCard.tsx — carte d'entité (grille du registre).
import Link from 'next/link';
import EntityBadge from './EntityBadge';
import { TYPE_META, RARITY_META, universeMeta, type AkashaEntryCard } from '@/lib/akasha/types';

export default function AkashaCard({ entry }: { entry: AkashaEntryCard }) {
  const m = TYPE_META[entry.type];
  return (
    <Link
      href={`/learn/akasha/${entry.slug}`}
      className="dom-card akasha-card"
      style={{
        width: '100%',
        background: 'var(--bg2)',
        border: '1px solid var(--bd)',
        borderRadius: 12,
        overflow: 'hidden',
        textDecoration: 'none',
        display: 'flex',
        flexDirection: 'column',
        ['--dc' as string]: m.color,
      }}
    >
      {/* Visuel */}
      <div
        style={{
          position: 'relative',
          height: 130,
          background: `linear-gradient(135deg, ${m.color}33, ${m.color}0A)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {entry.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.image_url}
            alt=""
            loading="lazy"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
          />
        ) : (
          <span aria-hidden style={{ fontSize: 40, opacity: 0.5 }}>
            {m.icon}
          </span>
        )}
        <span style={{ position: 'absolute', top: 8, left: 8 }}>
          <EntityBadge type={entry.type} size="sm" />
        </span>
        {entry.rarity && (
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              fontFamily: 'var(--fo)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              padding: '2px 7px',
              borderRadius: 20,
              background: 'rgba(5,12,23,0.6)',
              color: RARITY_META[entry.rarity].color,
              border: `1px solid ${RARITY_META[entry.rarity].color}55`,
            }}
          >
            {RARITY_META[entry.rarity].label}
          </span>
        )}
      </div>

      {/* Corps */}
      <div style={{ padding: '0.9rem 1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 700, fontSize: 17, color: 'var(--td)', lineHeight: 1.1 }}>
          {entry.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {entry.universe && (
            <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 600, color: universeMeta(entry.universe).color }}>
              {universeMeta(entry.universe).emoji} {entry.universe}
            </span>
          )}
          <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 600, color: entry.is_fiction ? m.color : 'var(--td3)' }}>
            {entry.is_fiction ? '✦ Fiction' : '◆ Réel'}
          </span>
        </div>
        {entry.summary && (
          <p
            style={{
              fontFamily: 'var(--fo)',
              fontSize: 12.5,
              color: 'var(--td2)',
              lineHeight: 1.5,
              margin: '0.2rem 0 0',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {entry.summary}
          </p>
        )}
      </div>
    </Link>
  );
}
