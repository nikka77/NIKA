// app/learn/akasha/layout.tsx — la COQUILLE AKASHA (refonte « zones », lot 1 v3).
// Barre fine minimaliste : AKASHA · ROUE des univers (façon roue d'armes GTA — wordmark
// courant → roue radiale plein écran) · recherche ⌘K montée PARTOUT.
import type { ReactNode } from 'react';
import Link from 'next/link';
import OmniSearch from '@/components/akasha/OmniSearch';
import UniverseWheel from '@/components/akasha/UniverseWheel';

export default function AkashaLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div data-liquid-glass="bar" suppressHydrationWarning className="ak-topbar">
        <Link href="/learn/akasha" title="Registre AKASHA"
          style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--purple)', textDecoration: 'none', flexShrink: 0 }}>
          Akasha
        </Link>
        <span className="ak-topbar-sep" aria-hidden />
        <UniverseWheel />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <OmniSearch variant="icon" />
        </div>
      </div>
      {children}
    </>
  );
}
