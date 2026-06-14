'use client';
// components/BottomNav.tsx — barre de navigation mobile (app-feel)
// Visible uniquement < 768px (CSS .bottom-nav). Icônes SVG (pas d'emoji).
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMapStore } from '@/lib/store';

const ICONS: Record<string, React.ReactNode> = {
  home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
  ),
  explore: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></svg>
  ),
  map: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-6.5-5.6-6.5-10.5A6.5 6.5 0 0 1 12 4a6.5 6.5 0 0 1 6.5 6.5C18.5 15.4 12 21 12 21Z" /><circle cx="12" cy="10.5" r="2.3" /></svg>
  ),
  niko: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9Z" /></svg>
  ),
  account: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.6" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" /></svg>
  ),
};

const ITEMS = [
  { key: 'home', label: 'Accueil', href: '/' },
  { key: 'explore', label: 'Explorer', href: '/#domaines' },
  { key: 'map', label: 'Carte', action: 'map' as const },
  { key: 'niko', label: 'NIKO', href: '/niko' },
  { key: 'account', label: 'Profil', href: '/dashboard' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { openMap } = useMapStore();

  const isActive = (href?: string) => {
    if (!href || href.includes('#')) return false; // les ancres ne sont pas des "pages"
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <nav className="bottom-nav" aria-label="Navigation principale mobile">
      {ITEMS.map(item => {
        const active = isActive(item.href);
        const content = (
          <>
            <span className="bn-icon">{ICONS[item.key]}</span>
            <span className="bn-label">{item.label}</span>
          </>
        );
        if (item.action === 'map') {
          return (
            <button key={item.key} onClick={openMap} className="bn-item" aria-label={item.label}>
              {content}
            </button>
          );
        }
        return (
          <Link key={item.key} href={item.href!} className="bn-item" data-active={active} aria-label={item.label}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
