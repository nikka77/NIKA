'use client';
// components/akasha/hub/ShinobiMap.tsx — carte interactive du continent shinobi (Naruto).
// Géométrie SVG maison (continent unique + archipel, relief, rose des vents) + texture terrain générée.
// Les PINS sont dessinés DANS le SVG (coordonnées viewBox) → aucun élément ne peut « retomber » dans un
// coin au re-render. Seul le tooltip est un overlay HTML unique, ancré aux coordonnées du village survolé.
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MAP, REGIONS, VILLAGES, LANDMARKS, CONTINENT, ISLANDS, MOUNTAINS, TREES, DUNES } from '@/lib/akasha/naruto-map';

export default function ShinobiMap({ counts, hubSlug = 'naruto', color = '#4a8a3a' }: {
  counts: Record<string, number>; hubSlug?: string; color?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const [reduce, setReduce] = useState(false);
  useEffect(() => { try { setReduce(matchMedia('(prefers-reduced-motion: reduce)').matches); } catch { /* SSR */ } }, []);
  const router = useRouter();
  const hoveredLand = VILLAGES.find((v) => v.key === hover)?.land ?? null;
  const villageHref = (fullName: string) => `/learn/akasha/u/${hubSlug}/village/${encodeURIComponent(fullName)}`;
  const maxCount = Math.max(1, ...VILLAGES.map((v) => counts[v.key] || 0)); // pour dimensionner les pins ∝ densité
  const grat: number[] = [];
  for (let x = 100; x < MAP.w; x += 100) grat.push(x);

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 2px 10px', fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        <span style={{ color }}>🗺️ Le continent shinobi</span>
        <span style={{ color: 'var(--td3)' }}>{VILLAGES.length} villages · carte interactive</span>
      </div>

      {/* Conteneur externe (sans overflow) → le tooltip HTML n'est pas coupé */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: `${MAP.w} / ${MAP.h}` }}>
        {/* Cadre visuel interne (clippé, coins arrondis) */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--bd)', boxShadow: 'inset 0 0 70px rgba(0,0,0,0.7)' }}>
          <svg viewBox={`0 0 ${MAP.w} ${MAP.h}`} width="100%" height="100%" style={{ position: 'absolute', inset: 0, display: 'block' }}>
            <defs>
              <clipPath id="sm-land">
                <path d={CONTINENT} />
                {ISLANDS.map((d, i) => <path key={i} d={d} />)}
              </clipPath>
              <linearGradient id="sm-ocean" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#0d2636" /><stop offset="1" stopColor="#071824" />
              </linearGradient>
              <pattern id="sm-waves" width="46" height="28" patternUnits="userSpaceOnUse">
                <path d="M0,15 q11,-9 23,0 t23,0" fill="none" stroke="#3f7290" strokeWidth="1.3" strokeLinecap="round" opacity="0.4" />
                {!reduce && <animateTransform attributeName="patternTransform" type="translate" from="0 0" to="46 0" dur="9s" repeatCount="indefinite" />}
              </pattern>
              <radialGradient id="sm-vignette" cx="50%" cy="45%" r="78%">
                <stop offset="58%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity="0.5" />
              </radialGradient>
              <radialGradient id="sm-pinbg" cx="50%" cy="42%" r="60%">
                <stop offset="55%" stopColor="#080b10" stopOpacity="0.92" /><stop offset="100%" stopColor="#080b10" stopOpacity="0.4" />
              </radialGradient>
              <filter id="sm-landshadow" x="-10%" y="-10%" width="120%" height="130%">
                <feDropShadow dx="0" dy="7" stdDeviation="8" floodColor="#000" floodOpacity="0.55" />
              </filter>
            </defs>

            {/* Océan + graticule + houle */}
            <rect width={MAP.w} height={MAP.h} fill="url(#sm-ocean)" />
            <g stroke="#5a8aa6" strokeWidth="0.6" opacity="0.1">
              {grat.map((x) => <line key={`v${x}`} x1={x} y1="0" x2={x} y2={MAP.h} />)}
              {[100, 200, 300, 400, 500].map((y) => <line key={`h${y}`} x1="0" y1={y} x2={MAP.w} y2={y} />)}
            </g>
            <rect width={MAP.w} height={MAP.h} fill="url(#sm-waves)" />

            {/* Ombre portée du continent */}
            <g filter="url(#sm-landshadow)">
              <path d={CONTINENT} fill="#03080c" />
              {ISLANDS.map((d, i) => <path key={i} d={d} fill="#03080c" />)}
            </g>

            {/* Terre : terrain + teintes + relief, clippés */}
            <g clipPath="url(#sm-land)">
              <image href="/images/akasha/map/terrain.webp" x="-20" y="-20" width={MAP.w + 40} height={MAP.h + 40} preserveAspectRatio="xMidYMid slice" opacity="0.92" />
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

            {/* Côtes */}
            <path d={CONTINENT} fill="none" stroke="#0a2130" strokeOpacity="0.9" strokeWidth="5" strokeLinejoin="round" />
            <path d={CONTINENT} fill="none" stroke="#f0ead8" strokeOpacity="0.4" strokeWidth="2" strokeLinejoin="round" />
            {ISLANDS.map((d, i) => (
              <g key={i}>
                <path d={d} fill="none" stroke="#0a2130" strokeOpacity="0.9" strokeWidth="4" strokeLinejoin="round" />
                <path d={d} fill="none" stroke="#f0ead8" strokeOpacity="0.4" strokeWidth="1.6" strokeLinejoin="round" />
              </g>
            ))}

            {/* Kanji + label de nation */}
            {REGIONS.map((r) => (
              <g key={r.key} style={{ transition: 'opacity .2s' }} opacity={hoveredLand && r.label !== hoveredLand ? 0.55 : 1}>
                <text x={r.lx} y={r.ly} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 44, fontWeight: 900, fill: '#05070b', fillOpacity: 0.5, letterSpacing: 2 }}>{r.kanji}</text>
                <text x={r.lx} y={r.ly + 32} textAnchor="middle" style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, fill: '#f5efe0', fillOpacity: 0.85, letterSpacing: 1.5 }}>{r.label.replace('Pays ', '').toUpperCase()}</text>
              </g>
            ))}

            {/* Repères */}
            {LANDMARKS.map((l) => (
              <g key={l.key}>
                <path d={`M${l.x},${l.y - 3.4} L${l.x + 3.4},${l.y} L${l.x},${l.y + 3.4} L${l.x - 3.4},${l.y} Z`} fill="#f0ead8" opacity="0.85" />
                <text x={l.x + 7} y={l.y + 3.4} style={{ fontFamily: 'var(--fo)', fontSize: 8.5, fontWeight: 600, fill: '#f0ead8', fillOpacity: 0.65 }}>{l.name}</text>
              </g>
            ))}

            {/* Rose des vents */}
            <g transform="translate(930,585)" opacity="0.8">
              <circle r="24" fill="rgba(6,14,20,0.55)" stroke="#f0ead8" strokeOpacity="0.3" strokeWidth="1" />
              <circle r="15" fill="none" stroke="#f0ead8" strokeOpacity="0.18" strokeWidth="0.7" />
              <path d="M0,-22 L4.5,-3 L0,0 L-4.5,-3 Z" fill="#f0ead8" fillOpacity="0.85" />
              <path d="M0,22 L4.5,3 L0,0 L-4.5,3 Z" fill="#f0ead8" fillOpacity="0.4" />
              <path d="M22,0 L3,4.5 L0,0 L3,-4.5 Z" fill="#f0ead8" fillOpacity="0.55" />
              <path d="M-22,0 L-3,4.5 L0,0 L-3,-4.5 Z" fill="#f0ead8" fillOpacity="0.55" />
              <text x="0" y="-25" textAnchor="middle" style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 800, fill: '#f0ead8' }}>N</text>
            </g>

            {/* Kanji décoratifs dans l'océan */}
            <text x="286" y="62" style={{ fontSize: 54, fontWeight: 900, fill: '#2a4a5e', fillOpacity: 0.22 }}>忍</text>
            <text x="470" y="624" style={{ fontSize: 40, fontWeight: 900, fill: '#2a4a5e', fillOpacity: 0.2 }}>海</text>
            <text x="726" y="360" style={{ fontSize: 30, fontWeight: 900, fill: '#2a4a5e', fillOpacity: 0.2 }}>渦</text>

            {/* Barre d'échelle */}
            <g transform="translate(60,610)" opacity="0.7">
              <line x1="0" y1="0" x2="90" y2="0" stroke="#f0ead8" strokeWidth="1.6" />
              <line x1="0" y1="-3" x2="0" y2="3" stroke="#f0ead8" strokeWidth="1.6" />
              <line x1="45" y1="-2" x2="45" y2="2" stroke="#f0ead8" strokeWidth="1.2" />
              <line x1="90" y1="-3" x2="90" y2="3" stroke="#f0ead8" strokeWidth="1.6" />
              <text x="45" y="-6" textAnchor="middle" style={{ fontFamily: 'var(--fo)', fontSize: 8.5, fontWeight: 700, fill: '#f0ead8', fillOpacity: 0.8 }}>≈ 100 ri</text>
            </g>

            <rect width={MAP.w} height={MAP.h} fill="url(#sm-vignette)" pointerEvents="none" />

            {/* ── PINS (dans le SVG, coordonnées viewBox → jamais dans un coin) ── */}
            {VILLAGES.map((v) => {
              const great = v.tier === 'great';
              const on = hover === v.key;
              const r = great ? Math.round(16 + 11 * Math.sqrt((counts[v.key] || 0) / maxCount)) : 6; // rayon ∝ densité
              const bs = Math.round(r * 1.5); // taille du blason
              const nameStyle = { fontFamily: 'var(--fe)', fontStyle: 'italic' as const, fontWeight: 800, fontSize: great ? 13 : 10, fill: '#fff', paintOrder: 'stroke' as const, stroke: '#05070b', strokeWidth: 3, strokeOpacity: 0.9, strokeLinejoin: 'round' as const };
              const nav = great ? () => router.push(villageHref(v.fullName)) : undefined;
              return (
                <g
                  key={v.key}
                  role={great ? 'link' : undefined}
                  aria-label={great ? `${v.fullName} — ${counts[v.key] ?? ''} ninjas` : v.fullName}
                  tabIndex={great ? 0 : undefined}
                  onClick={nav}
                  onKeyDown={great ? (e) => { if (e.key === 'Enter') nav?.(); } : undefined}
                  onMouseEnter={() => setHover(v.key)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(v.key)}
                  onBlur={() => setHover(null)}
                  style={{ cursor: great ? 'pointer' : 'default' }}
                >
                  {great ? (
                    <g transform={`translate(${v.x} ${v.y})`}>
                      {on && <circle r={r + 4} fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" />}
                      <circle r={r} fill="url(#sm-pinbg)" stroke={on ? '#ffffff' : '#f0ead8'} strokeOpacity={on ? 0.85 : 0.22} strokeWidth="1.5" />
                      <image href={`/images/akasha/emblems/${v.emblem}.webp`} x={-bs / 2} y={-bs / 2} width={bs} height={bs} />
                      <text y={r + 17} textAnchor="middle" style={nameStyle}>{v.name}</text>
                    </g>
                  ) : (
                    <g transform={`translate(${v.x} ${v.y})`}>
                      <circle r={on ? 7 : 5.5} fill="#f0ead8" stroke="#0a2130" strokeWidth="2" style={{ transition: 'r .15s' }} />
                      <text y="20" textAnchor="middle" style={nameStyle}>{v.name}</text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Tooltip UNIQUE ancré aux coordonnées du village survolé (enfant direct du conteneur) */}
        {(() => {
          const v = VILLAGES.find((x) => x.key === hover);
          if (!v) return null;
          const count = counts[v.key];
          const great = v.tier === 'great';
          const flipDown = v.y < MAP.h * 0.36;
          const px = (v.x / MAP.w) * 100;
          const tx = px < 15 ? '-6%' : px > 85 ? '-94%' : '-50%';
          return (
            <div role="tooltip" style={{ position: 'absolute', left: `${px}%`, top: `${(v.y / MAP.h) * 100}%`, transform: `translate(${tx}, ${flipDown ? '44px' : 'calc(-100% - 30px)'})`, width: 200, padding: '11px 13px', borderRadius: 13, background: 'linear-gradient(180deg, rgba(15,20,28,0.98), rgba(9,12,18,0.98))', border: `1px solid ${color}66`, boxShadow: '0 14px 36px rgba(0,0,0,0.7)', pointerEvents: 'none', zIndex: 80 }}>
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

      {/* Légende */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 11, fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 600, color: 'var(--td3)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: color }} /> Grand village (cliquable)</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f0ead8' }} /> Village mineur canon</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 8, height: 8, background: '#f0ead8', transform: 'rotate(45deg)' }} /> Lieu marquant</span>
      </div>
    </section>
  );
}
