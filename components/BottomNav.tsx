'use client';
// components/BottomNav.tsx — barre mobile flottante « bulle » (verre dépoli, type Tinder).
// Navigation par DOMAINES, paginée : page 1 = FOOD/AUTO/STAY/AZUR/RENT, page 2 = SERV/LEARN/SEC/NEWS.
// Slide horizontal (swipe) + points indicateurs. Fixe, visible au scroll, sur toutes les pages (< 768px).
// Les utilitaires (Accueil = logo, Carte = 🗺️, NIKO, Profil) restent dans le header.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { DOMAINS } from '@/lib/constants';
import { useHeroNav } from '@/lib/store';

const PAGES = [DOMAINS.slice(0, 5), DOMAINS.slice(5)]; // [food…rent], [serv…news]

export default function BottomNav() {
  const pathname = usePathname() ?? '';
  // La console /ops est un poste de travail, pas une page du site : la bulle recouvrait les
  // boutons ✓/× de review (68 px mesurés le 01/08) et chaque tap raté éjectait Dan vers /food.
  if (pathname.startsWith('/ops')) return null;
  const router = useRouter();
  const heroActive = useHeroNav(s => s.activeDomain);
  const requestDomain = useHeroNav(s => s.requestDomain);
  const [page, setPage] = useState(0);
  const startX = useRef<number | null>(null);

  const onHome = pathname === '/';
  const pageSlug = DOMAINS.find(d => pathname === `/${d.slug}` || pathname.startsWith(`/${d.slug}/`))?.slug;
  // Sur l'accueil : « actif » = le module ouvert dans le hero. Ailleurs : la page courante.
  const activeSlug = onHome ? heroActive : pageSlug;

  // 1er tap = ouvrir le module dans le hero ; 2e tap (déjà actif) = aller sur la page /domaine.
  const openDomain = (slug: string, e: React.MouseEvent) => {
    if (onHome && heroActive === slug) return;   // 2e tap : laisser le <Link> naviguer vers /slug
    e.preventDefault();
    requestDomain(slug);
    if (!onHome) router.push('/');                // depuis une autre page → accueil, le hero ouvre le module
  };

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
    <nav data-liquid-glass="capsule" suppressHydrationWarning className="bottom-nav" aria-label="Navigation des domaines">
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
                  <Link key={d.slug} href={`/${d.slug}`} onClick={e => openDomain(d.slug, e)} className="bn-dom" data-active={active} aria-label={d.label}
                    tabIndex={page === pi ? 0 : -1} style={active ? { color: d.color } : undefined}>
                    <span className="bn-dom-ic" aria-hidden style={active ? { filter: `drop-shadow(0 0 8px ${d.color})` } : undefined}>
                      <span className="bn-emoji">{d.icon}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/images/domains/${d.slug}.webp`} alt="" loading="lazy" decoding="async" onError={e => { const img = e.currentTarget; img.style.display = 'none'; const em = img.parentElement?.querySelector('.bn-emoji') as HTMLElement | null; if (em) em.style.display = 'block'; }} />
                    </span>
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
