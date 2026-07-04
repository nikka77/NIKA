'use client';
// components/akasha/hub/HubHalo.tsx — halo lumineux qui suit le pointeur sur le hero du hub
// (desktop fin uniquement, neutralisé par CSS sous prefers-reduced-motion / tactile).
import { useEffect, useRef } from 'react';

export default function HubHalo({ color }: { color: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = host.getBoundingClientRect();
        el.style.setProperty('--hx', `${e.clientX - r.left}px`);
        el.style.setProperty('--hy', `${e.clientY - r.top}px`);
      });
    };
    host.addEventListener('mousemove', onMove);
    return () => { host.removeEventListener('mousemove', onMove); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return <div ref={ref} className="ak-hub-halo" aria-hidden style={{ ['--ak-accent' as string]: `${color}30` }} />;
}
