'use client';
// components/akasha/UniverseWheel.tsx — LA ROUE DES UNIVERS (coquille, lot 1 v4).
// Façon roue d'armes GTA V : un bouton (wordmark de l'univers courant) ouvre une roue radiale
// plein écran — 8 segments, un par univers, wordmark au centroïde, survol = segment allumé à la
// couleur du monde + nom au centre. Clic segment → hub ; centre → tout le registre ; Échap ferme.
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import { UNIVERSE_META, universeWordmark } from '@/lib/akasha/types';
import { UNIVERSE_TAXONOMY } from '@/lib/akasha/universe-taxonomy';

const SIZE = 560;
const C = SIZE / 2;
const R_IN = 98;
const R_OUT = 248;
const GAP_DEG = 2.4;

const rad = (deg: number) => (deg * Math.PI) / 180;
const pt = (angleDeg: number, r: number): [number, number] =>
  [C + Math.cos(rad(angleDeg)) * r, C + Math.sin(rad(angleDeg)) * r];

/** Secteur annulaire SVG entre deux angles (degrés), rayons R_IN→R_OUT. */
function sectorPath(a0: number, a1: number): string {
  const [x0o, y0o] = pt(a0, R_OUT);
  const [x1o, y1o] = pt(a1, R_OUT);
  const [x0i, y0i] = pt(a0, R_IN);
  const [x1i, y1i] = pt(a1, R_IN);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0o.toFixed(1)} ${y0o.toFixed(1)} A ${R_OUT} ${R_OUT} 0 ${large} 1 ${x1o.toFixed(1)} ${y1o.toFixed(1)} L ${x1i.toFixed(1)} ${y1i.toFixed(1)} A ${R_IN} ${R_IN} 0 ${large} 0 ${x0i.toFixed(1)} ${y0i.toFixed(1)} Z`;
}

function WheelGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
    </svg>
  );
}

export default function UniverseWheel() {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname() ?? '';

  const slugMatch = pathname.match(/\/learn\/akasha\/u\/([^/]+)/);
  const currentTaxo = slugMatch ? UNIVERSE_TAXONOMY.find((t) => t.slug === slugMatch[1]) : undefined;
  const currentMark = currentTaxo ? universeWordmark(currentTaxo.name) : null;

  // 8 segments : géométrie précalculée, départ plein nord, sens horaire.
  const segments = useMemo(() => UNIVERSE_META.map((u, i) => {
    const step = 360 / UNIVERSE_META.length;
    const a0 = -90 - step / 2 + i * step + GAP_DEG / 2;
    const a1 = a0 + step - GAP_DEG;
    const mid = (a0 + a1) / 2;
    const [mx, my] = pt(mid, (R_IN + R_OUT) / 2);
    const taxo = UNIVERSE_TAXONOMY.find((t) => t.name === u.name);
    return { ...u, path: sectorPath(a0, a1), mx, my, slug: taxo?.slug, mark: universeWordmark(u.name) };
  }), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => { setOpen(false); }, [pathname]);

  const go = (slug?: string) => {
    if (!slug) return;
    setOpen(false);
    router.push(`/learn/akasha/u/${slug}`);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="ak-bar-btn" title="Roue des univers" aria-haspopup="dialog">
        {currentMark ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentMark} alt={currentTaxo!.name} style={{ height: 16, width: 'auto', maxWidth: 96, objectFit: 'contain', display: 'block' }} />
        ) : (
          <span>Univers</span>
        )}
        <WheelGlyph />
      </button>

      {open && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Roue des univers" className="ak-wheel-overlay" onClick={() => setOpen(false)}>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="ak-wheel" onClick={(e) => e.stopPropagation()}>
            {segments.map((s) => (
              <g key={s.name} className="ak-wheel-seg" style={{ ['--uc' as string]: s.color }}
                role="link" tabIndex={0} aria-label={s.name}
                onClick={() => go(s.slug)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(s.slug); } }}
                onMouseEnter={() => setHover(s.name)} onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(s.name)} onBlur={() => setHover(null)}>
                <path d={s.path} />
                {s.mark ? (
                  <image href={s.mark} x={s.mx - 52} y={s.my - 20} width={104} height={40}
                    preserveAspectRatio="xMidYMid meet" style={{ pointerEvents: 'none' }} />
                ) : (
                  <text x={s.mx} y={s.my} textAnchor="middle" dominantBaseline="central"
                    style={{ pointerEvents: 'none', fill: 'var(--td)', fontFamily: 'var(--fo)', fontSize: 15, fontWeight: 700 }}>
                    {s.name}
                  </text>
                )}
              </g>
            ))}
            {/* Moyeu : retour au registre complet. */}
            <g className="ak-wheel-hub" role="link" tabIndex={0} aria-label="Tout le registre"
              onClick={() => { setOpen(false); router.push('/learn/akasha'); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(false); router.push('/learn/akasha'); } }}>
              <circle cx={C} cy={C} r={R_IN - 14} />
              <text x={C} y={C - 10} textAnchor="middle"
                style={{ pointerEvents: 'none', fill: hover ? 'var(--td)' : 'var(--purple)', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: hover ? 17 : 21, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {hover ?? 'Akasha'}
              </text>
              <text x={C} y={C + 16} textAnchor="middle"
                style={{ pointerEvents: 'none', fill: 'var(--td3)', fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                {hover ? 'Entrer dans ce monde' : 'Tout le registre'}
              </text>
            </g>
          </svg>
        </div>,
        document.body
      )}
    </>
  );
}
