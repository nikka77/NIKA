// components/akasha/UniverseGates.tsx — les PORTES des univers (registre-cosmos, lot 2b).
// Sur la racine, l'entrée principale n'est plus un rail de chips mais une grille de portes :
// le wordmark canon en grand + le compte d'entrées, survol teinté à la couleur du monde.
// Server Component pur — le hover passe par la classe .ak-gate et la variable --uc.
import Link from 'next/link';
import { UNIVERSE_META, universeWordmark } from '@/lib/akasha/types';
import { universeHubSlug } from '@/lib/akasha/universe-taxonomy';

export default function UniverseGates({ counts }: { counts: { universe: string; count: number }[] }) {
  const byName = new Map(counts.map((c) => [c.universe, c.count]));
  return (
    <div className="ak-gates">
      {UNIVERSE_META.map((u) => {
        const slug = universeHubSlug(u.name);
        const mark = universeWordmark(u.name);
        const n = byName.get(u.name) ?? 0;
        if (!slug || n === 0) return null;
        return (
          <Link key={u.name} href={`/learn/akasha/u/${slug}`} className="ak-gate" title={u.name}
            style={{ ['--uc' as string]: u.color }}>
            {mark ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mark} alt={u.name} loading="lazy" />
            ) : (
              <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 17, textTransform: 'uppercase', color: 'var(--td)' }}>{u.name}</span>
            )}
            <span className="ak-gate-count">{n.toLocaleString('fr-FR')} entrées</span>
          </Link>
        );
      })}
    </div>
  );
}
