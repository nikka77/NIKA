// components/akasha/UniverseRail.tsx — hub des univers du registre : rail horizontal de cartes
// (emoji + nom + compteur), liens → URL partageable (?universe=…). Ordre curé via UNIVERSE_META,
// les univers inconnus (futurs seeds) apparaissent après, avec le fallback visuel.
import Link from 'next/link';
import { UNIVERSE_META, universeMeta, universeWordmark, type AkashaType } from '@/lib/akasha/types';

const ACCENT = '#7B5CF0';

function buildHref(universe: string | null, type: AkashaType | undefined, search: string): string {
  const p = new URLSearchParams();
  if (universe) p.set('universe', universe);
  if (type) p.set('type', type);
  if (search) p.set('search', search);
  const qs = p.toString();
  return qs ? `/learn/akasha?${qs}` : '/learn/akasha';
}

export default function UniverseRail({
  counts,
  active,
  type,
  search,
}: {
  counts: { universe: string; count: number }[];
  active?: string;
  type?: AkashaType;
  search: string;
}) {
  if (!counts.length) return null;
  const byName = new Map(counts.map((c) => [c.universe, c.count]));
  // Ordre curé d'abord, puis les univers hors méta (alphabétique).
  const known = UNIVERSE_META.filter((u) => byName.has(u.name)).map((u) => u.name);
  const unknown = counts.map((c) => c.universe).filter((n) => !known.includes(n)).sort((a, b) => a.localeCompare(b, 'fr'));
  const ordered = [...known, ...unknown];
  const total = counts.reduce((s, c) => s + c.count, 0);

  return (
    <div style={{ marginBottom: '1.4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT }}>
          ✦ Univers
        </span>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, color: 'var(--td3)' }}>
          {ordered.length} mondes · {total} entrées
        </span>
      </div>

      <div className="hero-domabar" style={{ display: 'flex', gap: 9, overflowX: 'auto', paddingBottom: 6 }}>
        {/* Tous */}
        <Link
          href={buildHref(null, type, search)}
          className="ak-tab"
          style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none',
            fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
            padding: '9px 15px', borderRadius: 12,
            border: `1px solid ${!active ? ACCENT : 'var(--bd2)'}`,
            background: !active ? 'rgba(123,92,240,0.16)' : 'var(--bg2)',
            color: !active ? ACCENT : 'var(--td2)',
          }}
        >
          <span aria-hidden>✦</span>
          Tous
          <span style={{ fontSize: 10, fontWeight: 800, color: !active ? ACCENT : 'var(--td3)', background: 'rgba(5,12,23,0.45)', borderRadius: 20, padding: '1px 7px' }}>{total}</span>
        </Link>

        {ordered.map((name) => {
          const m = universeMeta(name);
          const on = active === name;
          return (
            <Link
              key={name}
              href={buildHref(name, type, search)}
              className="ak-tab"
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none',
                fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
                padding: '9px 15px', borderRadius: 12,
                border: `1px solid ${on ? m.color : 'var(--bd2)'}`,
                background: on ? `${m.color}22` : 'var(--bg2)',
                color: on ? m.color : 'var(--td2)',
                boxShadow: on ? `0 6px 18px -10px ${m.color}` : 'none',
              }}
            >
              {universeWordmark(name)
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={universeWordmark(name)!} alt={name} loading="lazy" style={{ height: 24, width: 'auto', objectFit: 'contain', display: 'block', filter: on ? 'none' : 'saturate(0.9)' }} />
                : <><span aria-hidden>{m.emoji}</span>{name}</>}
              <span style={{ fontSize: 10, fontWeight: 800, color: on ? m.color : 'var(--td3)', background: 'rgba(5,12,23,0.45)', borderRadius: 20, padding: '1px 7px' }}>{byName.get(name)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
