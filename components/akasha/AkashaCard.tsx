// components/akasha/AkashaCard.tsx — carte d'entité (grille du registre).
import Link from 'next/link';
import EntityBadge from './EntityBadge';
import { TYPE_META, RARITY_META, universeMeta, type AkashaEntryCard } from '@/lib/akasha/types';

/** Fallback visuel THÉMÉ par collection quand l'entrée n'a pas d'image : icône + teinte
 *  propres à la collection (au lieu de l'emoji de type générique) → les grilles des 2 400
 *  entrées sans visuel restent « designées ». */
const CATEGORY_FALLBACK: Record<string, { icon: string; color: string }> = {
  'Jutsu':             { icon: '🌀', color: '#D44B24' },
  'Arme & outil':      { icon: '⚔️', color: '#D4A017' },
  'Organisation':      { icon: '🛡️', color: '#E07038' },
  'Métier':            { icon: '🧰', color: '#0094D4' },
  'Nature de chakra':  { icon: '🔥', color: '#D44B24' },
  'Kekkei genkai':     { icon: '🧬', color: '#7B5CF0' },
  'Classification':    { icon: '📜', color: '#7A90A8' },
  'Village':           { icon: '🏯', color: '#0EA878' },
  'Clan':              { icon: '⛩️', color: '#E8623A' },
  'Clan & lignée':     { icon: '⛩️', color: '#E8623A' },
  'Dōjutsu':           { icon: '👁️', color: '#D63C3C' },
  'Titre & rang':      { icon: '👑', color: '#D4A017' },
  'Fruit du Démon':    { icon: '🍈', color: '#8E44AD' },
  'Équipage':          { icon: '🏴‍☠️', color: '#D63C3C' },
  'Haki':              { icon: '🌊', color: '#5A88B0' },
  'Gear':              { icon: '⚙️', color: '#D63C3C' },
  'Navire':            { icon: '⛵', color: '#0094D4' },
  'Relique':           { icon: '🏺', color: '#D4A017' },
  'Transformation':    { icon: '⚡', color: '#F2A93B' },
  'Planète':           { icon: '🪐', color: '#0094D4' },
  'Technique':         { icon: '💥', color: '#D44B24' },
  'Aptitude':          { icon: '✴️', color: '#12B8CC' },
  'Stand':             { icon: '👥', color: '#8E44AD' },
  'Race & espèce':     { icon: '🧬', color: '#3FA35C' },
  'Voiture':           { icon: '🏎️', color: '#0094D4' },
  'Écurie de course':  { icon: '🏁', color: '#0094D4' },
  'Lieu':              { icon: '🗺️', color: '#0EA878' },
};

export default function AkashaCard({ entry }: { entry: AkashaEntryCard }) {
  const m = TYPE_META[entry.type];
  const fb = (entry.category && CATEGORY_FALLBACK[entry.category]) || null;
  const fbColor = fb?.color ?? m.color;
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
          background: entry.image_url
            ? `linear-gradient(135deg, ${m.color}33, ${m.color}0A)`
            : `radial-gradient(120% 120% at 50% 0%, ${fbColor}3D 0%, ${fbColor}14 45%, rgba(5,8,18,0.9) 100%)`,
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
          <>
            <span aria-hidden style={{ position: 'absolute', fontSize: 96, opacity: 0.1, filter: 'blur(1px)', transform: 'rotate(-12deg) translateY(6px)' }}>
              {fb?.icon ?? m.icon}
            </span>
            <span aria-hidden style={{ fontSize: 38, filter: `drop-shadow(0 4px 14px ${fbColor}88)` }}>
              {fb?.icon ?? m.icon}
            </span>
          </>
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
          {entry.category && entry.type !== 'character' && (
            <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: '#0EA878', background: 'rgba(14,168,120,0.10)', border: '1px solid rgba(14,168,120,0.35)', borderRadius: 20, padding: '1px 8px' }}>
              ◈ {entry.category}
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
