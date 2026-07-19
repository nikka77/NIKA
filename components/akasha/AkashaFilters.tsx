// components/akasha/AkashaFilters.tsx — onglets de filtre par type (liens → URL partageable).
import Link from 'next/link';
import { AKASHA_TYPES, TYPE_META, type AkashaType } from '@/lib/akasha/types';
import { registryHref, type RegistryFilters } from '@/lib/akasha/href';

const ACCENT = '#7B5CF0';

// PROPAGE tous les filtres au changement de type (builder central) — fin des resets silencieux (L3).
export default function AkashaFilters({ active, search, universe, keep }: { active?: AkashaType; search: string; universe?: string; keep?: Partial<RegistryFilters> }) {
  const tabs: { type: AkashaType | null; label: string; icon?: string }[] = [
    { type: null, label: 'Tout' },
    ...AKASHA_TYPES.map((t) => ({ type: t, label: TYPE_META[t].plural, icon: undefined as string | undefined })),
  ];

  return (
    <div className="hero-domabar" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
      {tabs.map((tab) => {
        const isActive = (tab.type ?? undefined) === active;
        return (
          <Link
            key={tab.label}
            href={registryHref({ ...keep, universe, search, type: tab.type ?? undefined })}
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

            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
