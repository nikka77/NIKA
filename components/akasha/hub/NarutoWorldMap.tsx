'use client';
// components/akasha/hub/NarutoWorldMap.tsx — carte du monde shinobi : SVG canon en fond + hotspots pays/villages.
// Clic pays/village → page des ninjas du village (/learn/akasha/u/naruto/village/{village}). Pan/zoom (comme OP).
// Formes extraites du SVG (scripts/build-naruto-world.mjs), même espace 1500×882 → transform identité.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NARUTO_MAP, NW_COUNTRIES, NW_VILLAGES, NW_LANDMARKS } from '@/lib/akasha/naruto-world';
import { useMapZoomPanSvg } from '@/lib/akasha/useMapZoomPanSvg';

const W = NARUTO_MAP.w, H = NARUTO_MAP.h;
const villageHref = (village: string) => `/learn/akasha/u/naruto/village/${encodeURIComponent(village)}`;

export default function NarutoWorldMap({ color = '#E8613C' }: { color?: string }) {
  const router = useRouter();
  const { view, svgRef, zoomAround, reset, dragRef, onPointerDown, onPointerMove, onPointerUp } = useMapZoomPanSvg({ w: W, h: H, minW: 360 });
  const [hover, setHover] = useState<string | null>(null);

  const zoomBtn = (f: number) => zoomAround(f);
  const go = (village: string) => { if (!dragRef.current?.moved) router.push(villageHref(village)); };

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
              style={{ width: 44, height: 44, borderRadius: 8, border: '1px solid var(--bd)', background: 'rgba(20,28,40,0.8)', color: '#EAF2F8', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t}</button>
          ))}
          <button onClick={reset} aria-label="Recentrer" style={{ width: 44, height: 44, borderRadius: 8, border: '1px solid var(--bd)', background: 'rgba(20,28,40,0.8)', color: '#EAF2F8', fontSize: 13, cursor: 'pointer' }}>⤢</button>
        </div>

        <svg ref={svgRef} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} role="application"
          aria-label="Carte du continent shinobi — pays et villages navigables au clavier" preserveAspectRatio="xMidYMid slice"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
          style={{ width: '100%', aspectRatio: `${W} / ${H}`, display: 'block', touchAction: 'none', cursor: dragRef.current ? 'grabbing' : 'grab' }}>

          <image href={NARUTO_MAP.bg} x={0} y={0} width={W} height={H} preserveAspectRatio="none" />

          {/* Hotspots pays (grandes nations) */}
          {NW_COUNTRIES.map((c) => {
            const on = hover === c.key;
            return (
              <g key={c.key} style={{ cursor: 'pointer' }} className="ak-svg-focusable" tabIndex={0} role="button" aria-label={`${c.villageName} — ${c.land}`}
                onPointerEnter={() => setHover(c.key)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(c.key)} onBlur={() => setHover(null)}
                onClick={() => go(c.village)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(c.village); } }}>
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
              <g key={v.key} style={{ cursor: 'pointer' }} className="ak-svg-focusable" tabIndex={0} role="button" aria-label={v.name}
                onPointerEnter={() => setHover(v.key)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(v.key)} onBlur={() => setHover(null)}
                onClick={() => go(v.village)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(v.village); } }}>
                <circle cx={v.x} cy={v.y} r={on ? 18 : 12} fill={color} stroke="#1A2230" strokeWidth={3} />
                {on && <text x={v.x} y={v.y - 22} textAnchor="middle" fontFamily="var(--fo)" fontWeight="800" fontSize={24} fill="#FFFFFF" stroke="#1A2230" strokeWidth={6} paintOrder="stroke" style={{ pointerEvents: 'none' }}>{v.name}</text>}
              </g>
            );
          })}

          {/* Repères lore (villages sans data ninja) — label au survol, non cliquables */}
          {NW_LANDMARKS.map((l) => {
            const on = hover === l.key;
            return (
              <g key={l.key} style={{ cursor: 'help' }} className="ak-svg-focusable" tabIndex={0} aria-label={`${l.full} — ${l.land}`}
                onPointerEnter={() => setHover(l.key)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(l.key)} onBlur={() => setHover(null)}>
                <circle cx={l.x} cy={l.y} r={on ? 13 : 8} fill="#EAF2F8" fillOpacity={0.55} stroke="#1A2230" strokeWidth={2.5} pointerEvents="all" />
                {on && (
                  <g style={{ pointerEvents: 'none' }}>
                    <text x={l.x} y={l.y - 20} textAnchor="middle" fontFamily="var(--fo)" fontWeight="800" fontSize={22} fill="#FFFFFF" stroke="#1A2230" strokeWidth={6} paintOrder="stroke">{l.full}</text>
                    <text x={l.x} y={l.y - 40} textAnchor="middle" fontFamily="var(--fo)" fontWeight="700" fontSize={15} fill="#CBD8E6" stroke="#1A2230" strokeWidth={4} paintOrder="stroke">{l.land}</text>
                  </g>
                )}
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
