'use client';
import { useEffect, useRef, useState } from 'react';

const MSGS = ["CHARGEMENT NIKA...", "CÔTE D'AZUR", "NIKA ONLINE ✓"];

export default function Loader() {
  const [status, setStatus] = useState(MSGS[0]);
  const [logoVisible, setLogoVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hidden, setHidden] = useState(() =>
    typeof window !== 'undefined' && !!sessionStorage.getItem('nika_loaded')
  );
  const [dotOpacities, setDotOpacities] = useState([0, 0, 0, 0, 0]);
  const sweepRef = useRef<SVGLineElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    // Skip intro on repeat visits within the same session
    if (sessionStorage.getItem('nika_loaded')) {
      setHidden(true);
      return;
    }
    sessionStorage.setItem('nika_loaded', '1');

    // Radar sweep animation
    function animR(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const angle = ((ts - startRef.current) / 20) % 360;
      const r = (angle * Math.PI) / 180;
      if (sweepRef.current) {
        sweepRef.current.setAttribute('x2', String(100 + 90 * Math.cos(r)));
        sweepRef.current.setAttribute('y2', String(100 + 90 * Math.sin(r)));
      }
      if (glowRef.current) {
        const r0 = ((angle - 40) * Math.PI) / 180;
        glowRef.current.setAttribute(
          'd',
          `M100,100 L${100 + 90 * Math.cos(r0)},${100 + 90 * Math.sin(r0)} A90,90 0 0,1 ${100 + 90 * Math.cos(r)},${100 + 90 * Math.sin(r)} Z`
        );
      }
      rafRef.current = requestAnimationFrame(animR);
    }
    rafRef.current = requestAnimationFrame(animR);

    // Progress bar — 1200ms total
    let prog = 0;
    const pi = setInterval(() => {
      prog = Math.min(prog + 4, 100);
      setProgress(prog);
      if (prog >= 100) clearInterval(pi);
    }, 40);

    // Status messages compressed to 1200ms
    MSGS.forEach((m, i) => {
      setTimeout(() => {
        setStatus(m);
        if (i === 2) setLogoVisible(true);
      }, i * 320);
    });

    // Radar dots
    [120, 250, 380, 520, 660].forEach((delay, i) => {
      setTimeout(() => {
        setDotOpacities(prev => {
          const next = [...prev];
          next[i] = 1;
          return next;
        });
      }, delay);
    });

    // Hide at 1200ms
    const hideTimer = setTimeout(() => {
      setHidden(true);
      cancelAnimationFrame(rafRef.current);
    }, 1200);

    return () => {
      clearInterval(pi);
      clearTimeout(hideTimer);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (hidden) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#020810',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Grid bg */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(0,148,212,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,148,212,0.04) 1px,transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      {/* Radar */}
      <div style={{ width: 190, height: 190, marginBottom: '1.6rem' }}>
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(0,148,212,0.15)" strokeWidth="1"/>
          <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(0,148,212,0.12)" strokeWidth="1"/>
          <circle cx="100" cy="100" r="30" fill="none" stroke="rgba(0,148,212,0.1)" strokeWidth="1"/>
          <line x1="100" y1="8" x2="100" y2="192" stroke="rgba(0,148,212,0.08)" strokeWidth="1"/>
          <line x1="8" y1="100" x2="192" y2="100" stroke="rgba(0,148,212,0.08)" strokeWidth="1"/>
          <line ref={sweepRef} x1="100" y1="100" x2="190" y2="100" stroke="rgba(0,194,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
          <path ref={glowRef} fill="rgba(0,148,212,0.05)"/>
          {[
            { cx: 145, cy: 75,  r: 3.5, fill: '#00C2FF' },
            { cx: 80,  cy: 130, r: 3,   fill: '#D4A017' },
            { cx: 125, cy: 140, r: 4,   fill: '#0EA878' },
            { cx: 60,  cy: 85,  r: 3,   fill: '#E07038' },
            { cx: 155, cy: 115, r: 3.5, fill: '#7B5CF0' },
          ].map((dot, i) => (
            <circle
              key={i} cx={dot.cx} cy={dot.cy} r={dot.r} fill={dot.fill}
              style={{ opacity: dotOpacities[i], transition: 'opacity 0.25s' }}
            />
          ))}
        </svg>
      </div>

      {/* Status */}
      <p style={{
        fontFamily: 'Outfit, system-ui, sans-serif',
        fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
        color: logoVisible ? '#00C2FF' : '#2A5068',
        minHeight: 18, textAlign: 'center', marginBottom: '0.8rem',
        transition: 'color 0.3s',
      }}>
        {status}
      </p>

      {/* Logo */}
      <div style={{
        fontFamily: 'Bebas Neue, Arial Black, sans-serif',
        fontSize: 56, letterSpacing: '0.12em',
        color: '#EBE5D6',
        opacity: logoVisible ? 1 : 0,
        transform: logoVisible ? 'scale(1)' : 'scale(0.88)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}>
        NIKA
      </div>

      {/* Progress bar */}
      <div style={{
        width: 160, height: 2, background: 'rgba(0,148,212,0.12)',
        borderRadius: 1, marginTop: '0.7rem', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: 'linear-gradient(90deg,#0094D4,#00C2FF)',
          borderRadius: 1, transition: 'width 0.04s linear',
        }} />
      </div>
    </div>
  );
}
