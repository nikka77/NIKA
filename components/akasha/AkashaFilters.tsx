// components/akasha/AkashaFilters.tsx — onglets de filtre par type (liens → URL partageable).
import Link from 'next/link';
import { AKASHA_TYPES, TYPE_META, type AkashaType } from '@/lib/akasha/types';

const ACCENT = '#7B5CF0';

function buildHref(type: AkashaType | null, search: string, universe?: string): string {
  const p = new URLSearchParams();
  if (universe) p.set('universe', universe);
  if (type) p.set('type', type);
  if (search) p.set('search', search);
  const qs = p.toString();
  return qs ? `/learn/akasha?${qs}` : '/learn/akasha';
}

export default function AkashaFilters({ active, search, universe }: { active?: AkashaType; search: string; universe?: string }) {
  const tabs: { type: AkashaType | null; label: string; icon?: string }[] = [
    { type: null, label: 'Tout' },
    ...AKASHA_TYPES.map((t) => ({ type: t, label: TYPE_META[t].plural, icon: TYPE_META[t].icon })),
  ];

  return (
    <div className="hero-domabar" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
      {tabs.map((tab) => {
        const isActive = (tab.type ?? undefined) === active;
        return (
          <Link
            key={tab.label}
            href={buildHref(tab.type, search, universe)}
            className="ak-tab"
            style={{
              fontFamily: 'var(--fo)',
              fontSize: 12.5,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              padding: '7px 14px',
              borderRadius: 20,
              textDecoration: 'none',
              border: `1px solid ${isActive ? ACCENT : 'var(--bd2)'}`,
              background: isActive ? 'rgba(123,92,240,0.14)' : 'transparent',
              color: isActive ? ACCENT : 'var(--td2)',
            }}
          >
            {tab.icon ? `${tab.icon} ` : ''}
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
