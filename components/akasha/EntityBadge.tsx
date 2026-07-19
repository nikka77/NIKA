// components/akasha/EntityBadge.tsx — pastille colorée du type d'entité (1 couleur/catégorie).
import { TYPE_META, type AkashaType } from '@/lib/akasha/types';

export default function EntityBadge({ type, size = 'md' }: { type: AkashaType; size?: 'sm' | 'md' }) {
  const m = TYPE_META[type];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontFamily: 'var(--fo)',
        fontSize: size === 'sm' ? 10 : 11,
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        padding: size === 'sm' ? '2px 8px' : '3px 10px',
        borderRadius: 20,
        background: `${m.color}1A`,
        color: m.color,
        border: `1px solid ${m.color}40`,
        whiteSpace: 'nowrap',
      }}
    >
      {m.label}
    </span>
  );
}
