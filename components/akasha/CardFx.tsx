'use client';
// components/akasha/CardFx.tsx — tilt 3D au pointeur + foil holographique (intensité par rareté).
// Enveloppe une carte serveur (passée en children). Respecte prefers-reduced-motion.
import { useRef, type ReactNode, type PointerEvent as RPointerEvent } from 'react';

export default function CardFx({ children, color, foilmax = 0.4 }: { children: ReactNode; color: string; foilmax?: number }) {
  const tilt = useRef<HTMLDivElement>(null);

  const apply = (clientX: number, clientY: number) => {
    const el = tilt.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
    el.style.setProperty('--rx', `${(0.5 - py) * 10}deg`);
    el.style.setProperty('--ry', `${(px - 0.5) * 10}deg`);
    el.style.setProperty('--gx', `${px * 100}%`);
    el.style.setProperty('--gy', `${py * 100}%`);
    el.style.setProperty('--glow', '1');
  };
  const reset = () => {
    const el = tilt.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--glow', '0');
  };

  const onPointer = (e: RPointerEvent<HTMLDivElement>) => apply(e.clientX, e.clientY);

  return (
    <div className="ak-fx-persp" style={{ ['--foilmax' as string]: String(foilmax) }}>
      <div
        ref={tilt}
        className="ak-fx-tilt"
        style={{ ['--frame' as string]: color }}
        onPointerMove={onPointer}
        onPointerLeave={reset}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (t) apply(t.clientX, t.clientY);
        }}
        onTouchEnd={reset}
      >
        {children}
        <div className="ak-fx-foil" aria-hidden />
      </div>
    </div>
  );
}
