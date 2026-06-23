'use client';
// components/BottomNav.tsx — barre mobile flottante « bulle » (verre dépoli, type Tinder).
// Navigation par DOMAINES, paginée : page 1 = FOOD/AUTO/STAY/AZUR/RENT, page 2 = SERV/LEARN/SEC/NEWS.
// Slide horizontal (swipe) + points indicateurs. Fixe, visible au scroll, sur toutes les pages (< 768px).
// Les utilitaires (Accueil = logo, Carte = 🗺️, NIKO, Profil) restent dans le header.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { DOMAINS } from '@/lib/constants';

const PAGES = [DOMAINS.slice(0, 5), DOMAINS.slice(5)]; // [food…rent], [serv…news]

export default function BottomNav() {
  const pathname = usePathname();
  const [page, setPage] = useState(0);
  const startX = useRef<number | null>(null);

  const activeSlug = DOMAINS.find(d => pathname === `/${d.slug}` || pathname.startsWith(`/${d.slug}/`))?.slug;

  // Aligner la page visible sur le domaine actif (ex. /sec → page 2).
  useEffect(() => {
    if (!activeSlug) return;
    const idx = PAGES.findIndex(pg => pg.some(d => d.slug === activeSlug));
    if (idx >= 0) setPage(idx);
  }, [activeSlug]);

  const onEnd = (x: number) => {
    if (startX.current == null) return;
    const dx = x - startX.current;
    startX.current = null;
    if (dx < -40) setPage(p => Math.min(PAGES.length - 1, p + 1));
    else if (dx > 40) setPage(p => Math.max(0, p - 1));
  };

  return (
    <nav className="bottom-nav" aria-label="Navigation des domaines">
      <div style={{ overflow: 'hidden', width: '100%' }}
        onTouchStart={e => { startX.current = e.touches[0].clientX; }}
        onTouchEnd={e => onEnd(e.changedTouches[0].clientX)}
        onPointerDown={e => { if (e.pointerType === 'mouse') startX.current = e.clientX; }}
        onPointerUp={e => { if (e.pointerType === 'mouse') onEnd(e.clientX); }}>
        <div className="bn-track" style={{ transform: `translateX(-${page * 100}%)` }}>
          {PAGES.map((pg, pi) => (
            <div className="bn-page" key={pi}>
              {pg.map(d => {
                const active = d.slug === activeSlug;
                return (
                  <Link key={d.slug} href={`/${d.slug}`} className="bn-dom" data-active={active} aria-label={d.label}
                    tabIndex={page === pi ? 0 : -1} style={active ? { color: d.color } : undefined}>
                    <span className="bn-dom-ic" aria-hidden style={active ? { filter: `drop-shadow(0 0 7px ${d.color})` } : undefined}>{d.icon}</span>
                    <span className="bn-dom-label">{d.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="bn-dots">
        {PAGES.map((_, i) => (
          <button key={i} className="bn-dot" data-on={page === i} aria-label={`Page ${i + 1} de domaines`} aria-pressed={page === i} onClick={() => setPage(i)} />
        ))}
      </div>
    </nav>
  );
}
