// components/akasha/CategoryRail.tsx — rail « Collections » : regroupements thématiques navigables
// (Jutsu, Fruits du Démon, Équipages, Organisations, Stands, Voitures, Races…) via ?cat=.
// Rendu serveur, liens URL partageables. La catégorie est DROPPÉE quand on change d'univers ou de
// type (elle n'aurait plus de sens) — seuls ce rail, la recherche et la pagination la portent.
import Link from 'next/link';
import type { AkashaType } from '@/lib/akasha/types';

const ACCENT = '#0EA878';

function buildHref(cat: string | null, universe: string | undefined, type: AkashaType | undefined, search: string): string {
  const p = new URLSearchParams();
  if (universe) p.set('universe', universe);
  if (type) p.set('type', type);
  if (cat) p.set('cat', cat);
  if (search) p.set('search', search);
  const qs = p.toString();
  return qs ? `/learn/akasha?${qs}` : '/learn/akasha';
}

export default function CategoryRail({
  counts,
  active,
  universe,
  type,
  search,
}: {
  counts: { category: string; count: number }[];
  active?: string;
  universe?: string;
  type?: AkashaType;
  search: string;
}) {
  // Un seul regroupement = rien à naviguer ; on n'affiche le rail qu'à partir de 2 collections.
  if (counts.length < 2) return null;

  return (
    <div style={{ margin: '0.9rem 0 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT }}>
          ◈ Collections
        </span>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: 'var(--td3)' }}>
          {counts.length} regroupements
        </span>
      </div>
      <div className="hero-domabar" style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 5 }}>
        {active && (
          <Link
            href={buildHref(null, universe, type, search)}
            className="ak-tab"
            style={{
              flexShrink: 0, fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', textDecoration: 'none',
              padding: '6px 12px', borderRadius: 18, border: '1px solid var(--bd2)', background: 'transparent', color: 'var(--td3)',
            }}
          >
            ✕ {active}
          </Link>
        )}
        {counts.map(({ category, count }) => {
          const on = active === category;
          return (
            <Link
              key={category}
              href={buildHref(on ? null : category, universe, type, search)}
              className="ak-tab"
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none',
                fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                padding: '6px 12px', borderRadius: 18,
                border: `1px solid ${on ? ACCENT : 'var(--bd2)'}`,
                background: on ? 'rgba(14,168,120,0.14)' : 'transparent',
                color: on ? ACCENT : 'var(--td2)',
              }}
            >
              {category}
              <span style={{ fontSize: 9.5, fontWeight: 800, color: on ? ACCENT : 'var(--td3)', background: 'rgba(5,12,23,0.45)', borderRadius: 20, padding: '1px 6px' }}>{count}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
