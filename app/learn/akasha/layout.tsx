// app/learn/akasha/layout.tsx — la COQUILLE AKASHA (refonte « zones », lot 1).
// Rail de contexte à gauche : titre du module, recherche ⌘K montée PARTOUT, et les 8 univers
// par leur WORDMARK canon (les vrais logos — décision Dan, ni emoji ni monogramme). Répare
// l'architecture en étoile : plus besoin de repasser par la racine pour changer de monde.
import type { ReactNode } from 'react';
import Link from 'next/link';
import OmniSearch from '@/components/akasha/OmniSearch';
import { UNIVERSE_META, universeWordmark } from '@/lib/akasha/types';
import { universeHubSlug } from '@/lib/akasha/universe-taxonomy';

export default function AkashaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ak-shell">
      <nav className="ak-rail" aria-label="Navigation AKASHA">
        <Link href="/learn/akasha" className="ak-rail-item" title="Registre AKASHA"
          style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--purple)' }}>
          Akasha
        </Link>
        <OmniSearch variant="icon" />
        <span className="ak-rail-sep" aria-hidden />
        <div className="ak-rail-unis">
          {UNIVERSE_META.map((u) => {
            const slug = universeHubSlug(u.name);
            const mark = universeWordmark(u.name);
            if (!slug) return null;
            return (
              <Link key={u.name} href={`/learn/akasha/u/${slug}`} className="ak-rail-uni" title={u.name}
                style={{ ['--uc' as string]: u.color }}>
                {mark ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mark} alt={u.name} loading="lazy" />
                ) : (
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, color: 'var(--td2)' }}>{u.name}</span>
                )}
              </Link>
            );
          })}
        </div>
        <Link href="/learn" className="ak-rail-item ak-rail-up" title="Retour à NIKA LEARN">↑ NIKA Learn</Link>
      </nav>
      <div className="ak-shell-main">{children}</div>
    </div>
  );
}
