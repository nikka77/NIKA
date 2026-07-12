'use client';
// components/akasha/hub/NarutoWorldMap.tsx — carte du monde shinobi : SVG canon en fond + hotspots pays/villages.
// Clic pays/village → page des ninjas du village (/learn/akasha/u/naruto/village/{village}). Pan/zoom (comme OP).
// Formes extraites du SVG (scripts/build-naruto-world.mjs), même espace 1500×882 → transform identité.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NARUTO_MAP, NW_COUNTRIES, NW_VILLAGES } from '@/lib/akasha/naruto-world';

const W = NARUTO_MAP.w, H = NARUTO_MAP.h;
const FULL = { x: 0, y: 0, w: W, h: H };
const MIN_W = 360, MAX_W = W;
type View = { x: number; y: number; w: number; h: number };
const clamp = (v: View): View => {
  const w = Math.min(v.w, W), h = Math.min(v.h, H);
  return { w, h, x: Math.max(0, Math.min(v.x, W - w)), y: Math.max(0, Math.min(v.y, H - h)) };
};
const villageHref = (village: string) => `/learn/akasha/u/naruto/village/${encodeURIComponent(village)}`;

export default function NarutoWorldMap({ color = '#E8613C' }: { color?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();
  const [view, setView] = useState(FULL);
  const [hover, setHover] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width, py = (e.clientY - rect.top) / rect.height;
      setView((v) => {
        const f = e.deltaY < 0 ? 0.82 : 1.22;
        const nw = Math.min(MAX_W, Math.max(MIN_W, v.w * f)), k = nw / v.w;
        const cx = v.x + px * v.w, cy = v.y + py * v.h;
        return clamp({ x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k, w: nw, h: v.h * k });
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const zoomBtn = (f: number) => setView((v) => {
    const nw = Math.min(MAX_W, Math.max(MIN_W, v.w * f)), k = nw / v.w;
    const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    return clamp({ x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k, w: nw, h: v.h * k });
  });

  const onPointerDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY, moved: false }; (e.target as Element).setPointerCapture?.(e.pointerId); };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dx = (e.clientX - drag.current.x) * (view.w / rect.width);
    const dy = (e.clientY - drag.current.y) * (view.h / rect.height);
    if (Math.abs(e.clientX - drag.current.x) + Math.abs(e.clientY - drag.current.y) > 3) drag.current.moved = true;
    drag.current = { x: e.clientX, y: e.clientY, moved: drag.current.moved };
    setView((v) => clamp({ ...v, x: v.x - dx, y: v.y - dy }));
  };
  const onPointerUp = () => { drag.current = null; };
  const go = (village: string) => { if (!drag.current?.moved) router.push(villageHref(village)); };

  return (
    <div style={{ marginTop: '1.6rem' }}>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, marginBottom: 4 }}>
        🗺️ Continent shinobi — 5 grandes nations
      </div>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td3)', margin: '0 0 10px' }}>
        Clique un pays pour découvrir ses ninjas. Glisse pour explorer, Ctrl/⌘+molette pour zoomer.
      </p>

      <div style={{ position: 'relative', borderRadius: 16, border: '1px solid var(--bd)', background: '#99b3cc', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 5, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {([['+', 0.7], ['−', 1.43]] as const).map(([t, f]) => (
            <button key={t} onClick={() => zoomBtn(f)} aria-label={t === '+' ? 'Zoom avant' : 'Zoom arrière'}
              style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--bd)', background: 'rgba(20,28,40,0.8)', color: '#EAF2F8', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t}</button>
          ))}
          <button onClick={() => setView(FULL)} aria-label="Recentrer" style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--bd)', background: 'rgba(20,28,40,0.8)', color: '#EAF2F8', fontSize: 13, cursor: 'pointer' }}>⤢</button>
        </div>

        <svg ref={svgRef} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} role="img"
          aria-label="Carte du continent shinobi" preserveAspectRatio="xMidYMid slice"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
          style={{ width: '100%', aspectRatio: `${W} / ${H}`, display: 'block', touchAction: 'none', cursor: drag.current ? 'grabbing' : 'grab' }}>

          <image href={NARUTO_MAP.bg} x={0} y={0} width={W} height={H} preserveAspectRatio="none" />

          {/* Hotspots pays (grandes nations) */}
          {NW_COUNTRIES.map((c) => {
            const on = hover === c.key;
            return (
              <g key={c.key} style={{ cursor: 'pointer' }} onPointerEnter={() => setHover(c.key)} onPointerLeave={() => setHover(null)} onClick={() => go(c.village)}>
                {c.shapes.map((d, i) => (
                  <path key={i} d={d} fill={c.color} fillOpacity={on ? 0.34 : 0} stroke={on ? '#FFFFFF' : 'none'} strokeWidth={on ? 4 : 0} pointerEvents="all" />
                ))}
                {on && (
                  <g style={{ pointerEvents: 'none' }}>
                    <text x={c.cx} y={c.cy - 8} textAnchor="middle" fontFamily="var(--fo)" fontWeight="800" fontSize={30} fill="#FFFFFF" stroke="#1A2230" strokeWidth={7} paintOrder="stroke">{c.villageName}</text>
                    <text x={c.cx} y={c.cy + 24} textAnchor="middle" fontFamily="var(--fo)" fontWeight="700" fontSize={18} fill="#FFE0B0" stroke="#1A2230" strokeWidth={5} paintOrder="stroke">{c.land}</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Villages mineurs à ninjas (Oto, Ame) */}
          {NW_VILLAGES.map((v) => {
            const on = hover === v.key;
            return (
              <g key={v.key} style={{ cursor: 'pointer' }} onPointerEnter={() => setHover(v.key)} onPointerLeave={() => setHover(null)} onClick={() => go(v.village)}>
                <circle cx={v.x} cy={v.y} r={on ? 18 : 12} fill={color} stroke="#1A2230" strokeWidth={3} />
                {on && <text x={v.x} y={v.y - 22} textAnchor="middle" fontFamily="var(--fo)" fontWeight="800" fontSize={24} fill="#FFFFFF" stroke="#1A2230" strokeWidth={6} paintOrder="stroke" style={{ pointerEvents: 'none' }}>{v.name}</text>}
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        {NW_COUNTRIES.map((c) => (
          <a key={c.key} href={villageHref(c.village)} onMouseEnter={() => setHover(c.key)} onMouseLeave={() => setHover(null)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, border: `1px solid ${c.color}77`, background: `${c.color}18`, color: 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            <span style={{ fontFamily: 'var(--fe)' }}>{c.kanji}</span> {c.villageName}
          </a>
        ))}
      </div>
      <div style={{ marginTop: 8, fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>Carte : Naruto World Map (fan, CC) — retravaillée pour AKASHA.</div>
    </div>
  );
}
