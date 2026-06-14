'use client';
// components/ScrollProgress.tsx — fine barre de progression de lecture en haut.
import { useEffect, useState } from 'react';

export default function ScrollProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        setPct(max > 0 ? Math.min((h.scrollTop / max) * 100, 100) : 0);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div aria-hidden style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2.5, zIndex: 2000, pointerEvents: 'none' }}>
      <div style={{
        height: '100%', width: `${pct}%`,
        background: 'linear-gradient(90deg, var(--az), var(--gold))',
        boxShadow: '0 0 8px rgba(0,148,212,0.5)',
        transition: 'width .08s linear',
      }} />
    </div>
  );
}
