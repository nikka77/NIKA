'use client';
// components/akasha/UniverseSwitcher.tsx — switcher d'univers minimaliste (coquille, lot 1 v3).
// UN bouton compact : le wordmark de l'univers courant (détecté par l'URL) ou « Univers » ;
// clic → popover avec les 8 wordmarks + l'entrée registre. Fermeture clic-dehors / Échap.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UNIVERSE_META, universeWordmark } from '@/lib/akasha/types';
import { UNIVERSE_TAXONOMY } from '@/lib/akasha/universe-taxonomy';

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease', flexShrink: 0 }}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function UniverseSwitcher() {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() ?? '';

  // Univers courant : détecté sur les pages de hub /u/[slug] (et leurs sous-pages d'axe).
  const slugMatch = pathname.match(/\/learn\/akasha\/u\/([^/]+)/);
  const currentTaxo = slugMatch ? UNIVERSE_TAXONOMY.find((t) => t.slug === slugMatch[1]) : undefined;
  const currentMark = currentTaxo ? universeWordmark(currentTaxo.name) : null;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey); };
  }, [open]);

  // Fermer au changement de page (après navigation via le popover).
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu"
        className="ak-bar-btn" title="Changer d'univers">
        {currentMark ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentMark} alt={currentTaxo!.name} style={{ height: 16, width: 'auto', maxWidth: 96, objectFit: 'contain', display: 'block' }} />
        ) : (
          <span>Univers</span>
        )}
        <Chevron open={open} />
      </button>

      {open && (
        <div role="menu" className="ak-switch-pop">
          <Link role="menuitem" href="/learn/akasha" className="ak-switch-item" style={{ ['--uc' as string]: '#7B5CF0' }}>
            <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 12.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--purple)' }}>
              Tout le registre
            </span>
          </Link>
          <span className="ak-switch-sep" aria-hidden />
          {UNIVERSE_META.map((u) => {
            const taxo = UNIVERSE_TAXONOMY.find((t) => t.name === u.name);
            const mark = universeWordmark(u.name);
            if (!taxo) return null;
            return (
              <Link role="menuitem" key={u.name} href={`/learn/akasha/u/${taxo.slug}`} className="ak-switch-item"
                title={u.name} style={{ ['--uc' as string]: u.color }}>
                {mark ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mark} alt={u.name} loading="lazy" />
                ) : (
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: 'var(--td2)' }}>{u.name}</span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
