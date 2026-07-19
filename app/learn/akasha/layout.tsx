// app/learn/akasha/layout.tsx — la COQUILLE AKASHA (refonte « zones », lot 1).
// Première coquille commune du module : rail de contexte fin à gauche (registre, recherche ⌘K
// désormais montée PARTOUT, accès direct aux 8 univers) + zone de contenu. Répare l'architecture
// en étoile : plus besoin de repasser par la racine pour changer de monde.
import type { ReactNode } from 'react';
import Link from 'next/link';
import OmniSearch from '@/components/akasha/OmniSearch';
import { UNIVERSE_META } from '@/lib/akasha/types';
import { universeHubSlug } from '@/lib/akasha/universe-taxonomy';

export default function AkashaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ak-shell">
      <nav className="ak-rail" aria-label="Navigation AKASHA">
        <Link href="/learn/akasha" className="ak-rail-item ak-rail-logo" title="Registre AKASHA">✦</Link>
        <OmniSearch variant="icon" />
        <span className="ak-rail-sep" aria-hidden />
        <div className="ak-rail-unis">
          {UNIVERSE_META.map((u) => {
            const slug = universeHubSlug(u.name);
            if (!slug) return null;
            return (
              <Link key={u.name} href={`/learn/akasha/u/${slug}`} className="ak-rail-item" title={u.name}
                style={{ ['--uc' as string]: u.color }}>
                <span aria-hidden>{u.emoji}</span>
              </Link>
            );
          })}
        </div>
        <Link href="/learn" className="ak-rail-item ak-rail-up" title="Retour à NIKA LEARN">↑</Link>
      </nav>
      <div className="ak-shell-main">{children}</div>
    </div>
  );
}
