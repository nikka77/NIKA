// app/learn/akasha/layout.tsx — la COQUILLE AKASHA (refonte « zones », lot 1 v3).
// Barre fine et minimaliste : AKASHA · switcher d'univers (wordmark courant → popover des 8
// logos) · recherche ⌘K montée PARTOUT. Remplace le rail latéral (trop encombrant — Dan).
import type { ReactNode } from 'react';
import Link from 'next/link';
import OmniSearch from '@/components/akasha/OmniSearch';
import UniverseSwitcher from '@/components/akasha/UniverseSwitcher';

export default function AkashaLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="ak-topbar">
        <Link href="/learn/akasha" title="Registre AKASHA"
          style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--purple)', textDecoration: 'none', flexShrink: 0 }}>
          Akasha
        </Link>
        <span className="ak-topbar-sep" aria-hidden />
        <UniverseSwitcher />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <OmniSearch variant="icon" />
        </div>
      </div>
      {children}
    </>
  );
}
