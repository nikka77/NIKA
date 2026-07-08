'use client';
// components/akasha/hub/ShinobiMap.tsx — carte interactive du continent shinobi (Naruto).
// Géométrie SVG maison (continent unique + archipel, relief, biomes, rose des vents) + textures générées.
// Zoom/pan sur le groupe carte ; les PINS sont dans le SVG (coordonnées viewBox) → aucun élément HTML
// absolu ne peut « retomber » dans un coin. Seul le tooltip est un overlay HTML, suivant le zoom.
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MAP, REGIONS, VILLAGES, LANDMARKS, CONTINENT, ISLANDS, MOUNTAINS, TREES, DUNES } from '@/lib/akasha/naruto-map';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function ShinobiMap({ counts, hubSlug = 'naruto', color = '#4a8a3a' }: {
  counts: Record<string, number>; hubSlug?: string; color?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const [reduce, setReduce] = useState(false);
  const [compact, setCompact] = useState(false);
  const [showMinor, setShowMinor] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [showAnime, setShowAnime] = useState(true);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ cx: number; cy: number; x: number; y: number } | null>(null);
  const didPan = useRef(false);
  const router = useRouter();

  useEffect(() => { try { setReduce(matchMedia('(prefers-reduced-motion: reduce)').matches); } catch { /* SSR */ } }, []);
  useEffect(() => {
    const check = () => setCompact(window.innerWidth < 620);
    check(); window.addEventListener('resize', check); return () => window.removeEventListener('resize', check);
  }, []);
  const uiScale = compact ? 1.7 : 1; // agrandit pins & labels sur petit écran
  const shownVillages = VILLAGES.filter((v) => (v.tier === 'great' || showMinor) && (v.canon !== 'anime' || showAnime));

  const hoveredLand = VILLAGES.find((v) => v.key === hover)?.land ?? null;
  const villageHref = (fullName: string) => `/learn/akasha/u/${hubSlug}/village/${encodeURIComponent(fullName)}`;
  const maxCount = Math.max(1, ...VILLAGES.map((v) => counts[v.key] || 0));
  const windPath = REGIONS.find((r) => r.key === 'wind')?.path ?? '';
  const lightningPath = REGIONS.find((r) => r.key === 'lightning')?.path ?? '';
  const grat: number[] = [];
  for (let x = 100; x < MAP.w; x += 100) grat.push(x);

  const clampView = (k: number, x: number, y: number) => ({ k, x: clamp(x, MAP.w * (1 - k), 0), y: clamp(y, MAP.h * (1 - k), 0) });
  const zoomBy = (f: number) => setView((v) => {
    const k = clamp(v.k * f, 1, 3.5);
    const cx = (MAP.w / 2 - v.x) / v.k, cy = (MAP.h / 2 - v.y) / v.k;
    return clampView(k, MAP.w / 2 - cx * k, MAP.h / 2 - cy * k);
  });
  const reset = () => setView({ k: 1, x: 0, y: 0 });
  const onDown = (e: React.PointerEvent) => { if (view.k <= 1) return; didPan.current = false; drag.current = { cx: e.clientX, cy: e.clientY, x: view.x, y: view.y }; };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    const dx = (e.clientX - drag.current.cx) / r.width * MAP.w;
    const dy = (e.clientY - drag.current.cy) / r.height * MAP.h;
    if (Math.abs(dx) + Math.abs(dy) > 3) didPan.current = true;
    setView((v) => clampView(v.k, drag.current!.x + dx, drag.current!.y + dy));
  };
  const onUp = () => { drag.current = null; };
  const tf = `translate(${view.x} ${view.y}) scale(${view.k})`;

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 2px 10px', fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        <span style={{ color }}>🗺️ Le continent shinobi</span>
        <span style={{ color: 'var(--td3)' }}>{VILLAGES.length} villages · carte interactive</span>
      </div>

      <div style={{ position: 'relative', width: '100%', aspectRatio: `${MAP.w} / ${MAP.h}` }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--bd)', boxShadow: 'inset 0 0 70px rgba(0,0,0,0.7)' }}>
          <svg ref={svgRef} viewBox={`0 0 ${MAP.w} ${MAP.h}`} width="100%" height="100%" style={{ position: 'absolute', inset: 0, display: 'block', cursor: view.k > 1 ? (drag.current ? 'grabbing' : 'grab') : 'default', touchAction: 'none' }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
            <defs>
              <clipPath id="sm-land"><path d={CONTINENT} />{ISLANDS.map((d, i) => <path key={i} d={d} />)}</clipPath>
              <clipPath id="sm-desert"><path d={windPath} /></clipPath>
              <clipPath id="sm-water">{ISLANDS.map((d, i) => <path key={i} d={d} />)}</clipPath>
              <clipPath id="sm-lightning"><path d={lightningPath} /></clipPath>
              <linearGradient id="sm-ocean" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d2636" /><stop offset="1" stopColor="#071824" /></linearGradient>
              <pattern id="sm-waves" width="46" height="28" patternUnits="userSpaceOnUse">
                <path d="M0,15 q11,-9 23,0 t23,0" fill="none" stroke="#3f7290" strokeWidth="1.3" strokeLinecap="round" opacity="0.4" />
                {!reduce && <animateTransform attributeName="patternTransform" type="translate" from="0 0" to="46 0" dur="9s" repeatCount="indefinite" />}
              </pattern>
              <radialGradient id="sm-vignette" cx="50%" cy="45%" r="78%"><stop offset="58%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity="0.5" /></radialGradient>
              <radialGradient id="sm-pinbg" cx="50%" cy="42%" r="60%"><stop offset="55%" stopColor="#080b10" stopOpacity="0.92" /><stop offset="100%" stopColor="#080b10" stopOpacity="0.4" /></radialGradient>
              <filter id="sm-landshadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="7" stdDeviation="8" floodColor="#000" floodOpacity="0.55" /></filter>
            </defs>

            {/* Fond océan fixe (jamais de vide au pan) */}
            <rect width={MAP.w} height={MAP.h} fill="url(#sm-ocean)" />

            {/* ── Groupe carte transformable (zoom/pan) ── */}
            <g transform={tf} style={{ transition: drag.current ? 'none' : 'transform .22s ease' }}>
              <g stroke="#5a8aa6" strokeWidth="0.6" opacity="0.1">
                {grat.map((x) => <line key={`v${x}`} x1={x} y1="0" x2={x} y2={MAP.h} />)}
                {[100, 200, 300, 400, 500].map((y) => <line key={`h${y}`} x1="0" y1={y} x2={MAP.w} y2={y} />)}
              </g>
              <rect width={MAP.w} height={MAP.h} fill="url(#sm-waves)" />

              <g filter="url(#sm-landshadow)">
                <path d={CONTINENT} fill="#03080c" />
                {ISLANDS.map((d, i) => <path key={i} d={d} fill="#03080c" />)}
              </g>

              <g clipPath="url(#sm-land)">
                <image href="/images/akasha/map/terrain.webp" x="-20" y="-20" width={MAP.w + 40} height={MAP.h + 40} preserveAspectRatio="xMidYMid slice" opacity="0.92" />
                <g clipPath="url(#sm-desert)">
                  <image href="/images/akasha/map/desert.webp" x="40" y="330" width="320" height="290" preserveAspectRatio="xMidYMid slice" opacity="0.96" />
                </g>
                <g clipPath="url(#sm-water)">
                  <image href="/images/akasha/map/reef.webp" x="730" y="290" width="250" height="260" preserveAspectRatio="xMidYMid slice" opacity="0.95" />
                </g>
                <g clipPath="url(#sm-lightning)">
                  <image href="/images/akasha/map/highlands.webp" x="700" y="60" width="290" height="230" preserveAspectRatio="xMidYMid slice" opacity="0.95" />
                </g>
                {REGIONS.map((r) => (
                  <path key={r.key} d={r.path} fill={r.tint} fillOpacity={r.label === hoveredLand ? 0.5 : 0.3} stroke={r.tint} strokeOpacity="0.35" strokeWidth="1.5" style={{ transition: 'fill-opacity .2s' }} />
                ))}
                {MOUNTAINS.map(([x, y, s], i) => (
                  <g key={`m${i}`} opacity="0.6">
                    <path d={`M${x - 12 * s},${y + 8 * s} L${x - 2 * s},${y - 9 * s} L${x + 4 * s},${y - 1 * s} L${x + 9 * s},${y - 14 * s} L${x + 16 * s},${y + 8 * s} Z`} fill="#221d17" stroke="#05070b" strokeWidth="0.5" />
                    <path d={`M${x + 9 * s},${y - 14 * s} l${-3 * s},${5 * s} l${3 * s},${1.2 * s} l${3 * s},${-2.5 * s} Z`} fill="#e9e2d0" fillOpacity="0.55" />
                  </g>
                ))}
                {TREES.map(([x, y], i) => (
                  <g key={`t${i}`} opacity="0.5">
                    <path d={`M${x},${y - 11} L${x - 5},${y - 1} L${x + 5},${y - 1} Z`} fill="#132417" />
                    <path d={`M${x},${y - 6} L${x - 6},${y + 4} L${x + 6},${y + 4} Z`} fill="#183020" />
                  </g>
                ))}
                {DUNES.map(([x, y], i) => <path key={`d${i}`} d={`M${x - 15},${y} q15,-9 30,0`} fill="none" stroke="#d0aa54" strokeOpacity="0.4" strokeWidth="1.6" strokeLinecap="round" />)}
              </g>

              <path d={CONTINENT} fill="none" stroke="#0a2130" strokeOpacity="0.9" strokeWidth="5" strokeLinejoin="round" />
              <path d={CONTINENT} fill="none" stroke="#f0ead8" strokeOpacity="0.4" strokeWidth="2" strokeLinejoin="round" />
              {ISLANDS.map((d, i) => (
                <g key={i}>
                  <path d={d} fill="none" stroke="#0a2130" strokeOpacity="0.9" strokeWidth="4" strokeLinejoin="round" />
                  <path d={d} fill="none" stroke="#f0ead8" strokeOpacity="0.4" strokeWidth="1.6" strokeLinejoin="round" />
                </g>
              ))}

              {REGIONS.map((r) => (
                <g key={r.key} style={{ transition: 'opacity .2s' }} opacity={hoveredLand && r.label !== hoveredLand ? 0.55 : 1}>
                  <text x={r.lx} y={r.ly} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 44, fontWeight: 900, fill: '#05070b', fillOpacity: 0.5, letterSpacing: 2 }}>{r.kanji}</text>
                  <text x={r.lx} y={r.ly + 32} textAnchor="middle" style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, fill: '#f5efe0', fillOpacity: 0.85, letterSpacing: 1.5 }}>{r.label.replace('Pays ', '').toUpperCase()}</text>
                </g>
              ))}

              {showLandmarks && LANDMARKS.map((l) => {
                const d = 3.4 * uiScale;
                const lon = hover === `lm:${l.key}`;
                const go = () => { if (!didPan.current) router.push(`/learn/akasha/${l.slug}`); };
                return (
                  <g key={l.key} role="link" aria-label={l.name} tabIndex={0} style={{ cursor: 'pointer' }}
                    onClick={go} onKeyDown={(e) => { if (e.key === 'Enter') go(); }}
                    onMouseEnter={() => setHover(`lm:${l.key}`)} onMouseLeave={() => setHover(null)}>
                    <circle cx={l.x} cy={l.y} r={10 * uiScale} fill="transparent" />
                    <path d={`M${l.x},${l.y - d} L${l.x + d},${l.y} L${l.x},${l.y + d} L${l.x - d},${l.y} Z`} fill={lon ? '#fff' : '#f0ead8'} opacity={lon ? 1 : 0.85} />
                    <text x={l.x + d + 3} y={l.y + d} style={{ fontFamily: 'var(--fo)', fontSize: 8.5 * uiScale, fontWeight: 600, fill: lon ? '#fff' : '#f0ead8', fillOpacity: lon ? 0.95 : 0.65, textDecoration: lon ? 'underline' : 'none' }}>{l.name}</text>
                  </g>
                );
              })}

              <text x="286" y="62" style={{ fontSize: 54, fontWeight: 900, fill: '#2a4a5e', fillOpacity: 0.22 }}>忍</text>
              <text x="470" y="624" style={{ fontSize: 40, fontWeight: 900, fill: '#2a4a5e', fillOpacity: 0.2 }}>海</text>
              <text x="726" y="360" style={{ fontSize: 30, fontWeight: 900, fill: '#2a4a5e', fillOpacity: 0.2 }}>渦</text>

              {/* PINS */}
              {shownVillages.map((v) => {
                const great = v.tier === 'great';
                const on = hover === v.key;
                const r = Math.round((great ? 16 + 11 * Math.sqrt((counts[v.key] || 0) / maxCount) : 6) * uiScale);
                const bs = Math.round(r * 1.5);
                const nameStyle = { fontFamily: 'var(--fe)', fontStyle: 'italic' as const, fontWeight: 800, fontSize: (great ? 13 : 10) * uiScale, fill: '#fff', paintOrder: 'stroke' as const, stroke: '#05070b', strokeWidth: 3, strokeOpacity: 0.9, strokeLinejoin: 'round' as const };
                const nav = great ? () => { if (!didPan.current) router.push(villageHref(v.fullName)); } : undefined;
                return (
                  <g key={v.key} role={great ? 'link' : undefined} aria-label={great ? `${v.fullName} — ${counts[v.key] ?? ''} ninjas` : v.fullName}
                    tabIndex={great ? 0 : undefined} onClick={nav} onKeyDown={great ? (e) => { if (e.key === 'Enter') router.push(villageHref(v.fullName)); } : undefined}
                    onMouseEnter={() => setHover(v.key)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(v.key)} onBlur={() => setHover(null)}
                    style={{ cursor: great ? 'pointer' : 'default' }}>
                    <g transform={`translate(${v.x} ${v.y})`}>
                      {great ? (
                        <>
                          {on && <circle r={r + 4} fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" />}
                          <circle r={r} fill="url(#sm-pinbg)" stroke={on ? '#ffffff' : '#f0ead8'} strokeOpacity={on ? 0.85 : 0.22} strokeWidth="1.5" />
                          <image href={`/images/akasha/emblems/${v.emblem}.webp`} x={-bs / 2} y={-bs / 2} width={bs} height={bs} />
                          <text y={r + 17} textAnchor="middle" style={nameStyle}>{v.name}</text>
                        </>
                      ) : (
                        <>
                          <circle r={on ? 7 : 5.5} fill="#f0ead8" stroke="#0a2130" strokeWidth="2" style={{ transition: 'r .15s' }} />
                          <text y="20" textAnchor="middle" style={nameStyle}>{v.name}</text>
                        </>
                      )}
                    </g>
                  </g>
                );
              })}
            </g>

            {/* Chrome fixe (non transformé) */}
            <g transform="translate(930,585)" opacity="0.8">
              <circle r="24" fill="rgba(6,14,20,0.55)" stroke="#f0ead8" strokeOpacity="0.3" strokeWidth="1" />
              <circle r="15" fill="none" stroke="#f0ead8" strokeOpacity="0.18" strokeWidth="0.7" />
              <path d="M0,-22 L4.5,-3 L0,0 L-4.5,-3 Z" fill="#f0ead8" fillOpacity="0.85" />
              <path d="M0,22 L4.5,3 L0,0 L-4.5,3 Z" fill="#f0ead8" fillOpacity="0.4" />
              <path d="M22,0 L3,4.5 L0,0 L3,-4.5 Z" fill="#f0ead8" fillOpacity="0.55" />
              <path d="M-22,0 L-3,4.5 L0,0 L-3,-4.5 Z" fill="#f0ead8" fillOpacity="0.55" />
              <text x="0" y="-25" textAnchor="middle" style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 800, fill: '#f0ead8' }}>N</text>
            </g>
            <g transform="translate(60,610)" opacity="0.7">
              <line x1="0" y1="0" x2="90" y2="0" stroke="#f0ead8" strokeWidth="1.6" />
              <line x1="0" y1="-3" x2="0" y2="3" stroke="#f0ead8" strokeWidth="1.6" />
              <line x1="45" y1="-2" x2="45" y2="2" stroke="#f0ead8" strokeWidth="1.2" />
              <line x1="90" y1="-3" x2="90" y2="3" stroke="#f0ead8" strokeWidth="1.6" />
              <text x="45" y="-6" textAnchor="middle" style={{ fontFamily: 'var(--fo)', fontSize: 8.5, fontWeight: 700, fill: '#f0ead8', fillOpacity: 0.8 }}>≈ 100 ri</text>
            </g>
            <rect width={MAP.w} height={MAP.h} fill="url(#sm-vignette)" pointerEvents="none" />
          </svg>
        </div>

        {/* Contrôles de zoom */}
        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 50 }}>
          {[{ l: '+', a: () => zoomBy(1.5) }, { l: '−', a: () => zoomBy(1 / 1.5) }, { l: '⟲', a: reset }].map((b) => (
            <button key={b.l} onClick={b.a} aria-label={b.l === '+' ? 'Zoom avant' : b.l === '−' ? 'Zoom arrière' : 'Réinitialiser'}
              style={{ width: 30, height: 30, borderRadius: 9, border: '1px solid var(--bd)', background: 'rgba(10,14,20,0.85)', color: 'var(--td)', fontSize: 15, fontWeight: 700, cursor: 'pointer', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{b.l}</button>
          ))}
        </div>

        {/* Tooltip (suit le zoom) */}
        {(() => {
          const v = VILLAGES.find((x) => x.key === hover);
          if (!v) return null;
          const count = counts[v.key];
          const great = v.tier === 'great';
          const px = ((v.x * view.k + view.x) / MAP.w) * 100;
          const py = ((v.y * view.k + view.y) / MAP.h) * 100;
          const flipDown = py < 36;
          const tx = px < 15 ? '-6%' : px > 85 ? '-94%' : '-50%';
          return (
            <div role="tooltip" style={{ position: 'absolute', left: `${px}%`, top: `${py}%`, transform: `translate(${tx}, ${flipDown ? '44px' : 'calc(-100% - 30px)'})`, width: 200, padding: '11px 13px', borderRadius: 13, background: 'linear-gradient(180deg, rgba(15,20,28,0.98), rgba(9,12,18,0.98))', border: `1px solid ${color}66`, boxShadow: '0 14px 36px rgba(0,0,0,0.7)', pointerEvents: 'none', zIndex: 80 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: (typeof count === 'number' || v.note) ? 7 : 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {great && <img src={`/images/akasha/emblems/${v.emblem}.webp`} alt="" width={32} height={32} style={{ objectFit: 'contain' }} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 14.5, color: 'var(--td)', lineHeight: 1.05 }}>{v.fullName}</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: 'var(--td3)', marginTop: 3, letterSpacing: 0.3 }}>{v.land}</div>
                </div>
              </div>
              {typeof count === 'number' ? (
                <div style={{ fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 800, color }}>{count} ninjas répertoriés →</div>
              ) : v.note ? (
                <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, lineHeight: 1.45, color: 'var(--td2)' }}>{v.note}</div>
              ) : null}
            </div>
          );
        })()}
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 11 }}>
        {[
          { l: 'Villages mineurs', on: showMinor, set: setShowMinor },
          { l: 'Anime-exclusif', on: showAnime, set: setShowAnime },
          { l: 'Repères', on: showLandmarks, set: setShowLandmarks },
        ].map((t) => (
          <button key={t.l} onClick={() => t.set((v) => !v)} aria-pressed={t.on}
            style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, padding: '5px 11px', borderRadius: 20, cursor: 'pointer', border: `1px solid ${t.on ? color : 'var(--bd)'}`, background: t.on ? `${color}22` : 'transparent', color: t.on ? color : 'var(--td3)' }}>
            {t.on ? '◉' : '○'} {t.l}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 9, fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 600, color: 'var(--td3)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: color }} /> Grand village (cliquable)</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f0ead8' }} /> Village mineur canon</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 8, height: 8, background: '#f0ead8', transform: 'rotate(45deg)' }} /> Lieu marquant</span>
      </div>
    </section>
  );
}
