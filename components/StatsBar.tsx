'use client';
import { useEffect, useRef, useState } from 'react';

const STATS = [
  { target: 312, label: 'Commerces' },
  { target: 186, label: 'Hébergements' },
  { target: 9,   label: 'Domaines' },
  { target: 48,  label: 'Pros vérifiés' },
];

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          setValue(Math.round(p * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        obs.disconnect();
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);

  return { value, ref };
}

function StatItem({ target, label, last }: { target: number; label: string; last: boolean }) {
  const { value, ref } = useCountUp(target);
  return (
    <div style={{
      padding: '1.4rem 1rem', textAlign: 'center',
      borderRight: last ? 'none' : '1px solid rgba(0,0,0,0.08)',
    }}>
      <span ref={ref} style={{
        fontFamily: 'var(--fe)', fontSize: 34, fontWeight: 900,
        fontStyle: 'italic', color: 'var(--tl)', display: 'block', lineHeight: 1,
      }}>
        <em style={{ color: 'var(--az)', fontStyle: 'normal' }}>{value}</em>
      </span>
      <span style={{
        fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--tl2)', marginTop: 3, display: 'block',
      }}>
        {label}
      </span>
    </div>
  );
}

export default function StatsBar() {
  return (
    <div className="sand-grain" style={{
      background: 'var(--sand)',
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      borderTop: '1px solid rgba(0,0,0,0.06)',
      position: 'relative',
    }}>
      {STATS.map(({ target, label }, i) => (
        <StatItem key={label} target={target} label={label} last={i === STATS.length - 1} />
      ))}
    </div>
  );
}
