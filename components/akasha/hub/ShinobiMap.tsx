'use client';
// components/akasha/hub/ShinobiMap.tsx — carte interactive du continent shinobi (Naruto).
// Hybride : géométrie SVG maison (continent unique + archipel, relief, rose des vents) + texture
// terrain générée clippée ; overlay HTML pour les pins cliquables et les tooltips. Aucun asset tiers.
import { useState } from 'react';
import Link from 'next/link';
import { MAP, REGIONS, VILLAGES, LANDMARKS, CONTINENT, ISLANDS, MOUNTAINS, TREES, DUNES } from '@/lib/akasha/naruto-map';
import { VillageEmblem } from '@/components/akasha/NarutoIcons';

export default function ShinobiMap({ counts, hubSlug = 'naruto', color = '#4a8a3a' }: {
  counts: Record<string, number>; hubSlug?: string; color?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const hoveredLand = VILLAGES.find((v) => v.key === hover)?.land ?? null;
  const pos = (x: number, y: number) => ({ left: `${(x / MAP.w) * 100}%`, top: `${(y / MAP.h) * 100}%` });
  const grat: number[] = [];
  for (let x = 100; x < MAP.w; x += 100) grat.push(x);

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 2px 10px', fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        <span style={{ color }}>🗺️ Le continent shinobi</span>
        <span style={{ color: 'var(--td3)' }}>{VILLAGES.length} villages · carte interactive</span>
      </div>

      {/* Conteneur externe (sans overflow) → les tooltips ne sont pas coupés */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: `${MAP.w} / ${MAP.h}` }}>
        {/* Cadre visuel interne (clippé, coins arrondis) */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--bd)', boxShadow: 'inset 0 0 70px rgba(0,0,0,0.7)' }}>
          <svg viewBox={`0 0 ${MAP.w} ${MAP.h}`} width="100%" height="100%" style={{ position: 'absolute', inset: 0, display: 'block' }} aria-hidden>
            <defs>
              <clipPath id="sm-land">
                <path d={CONTINENT} />
                {ISLANDS.map((d, i) => <path key={i} d={d} />)}
              </clipPath>
              <linearGradient id="sm-ocean" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#0d2636" />
                <stop offset="1" stopColor="#071824" />
              </linearGradient>
              <pattern id="sm-waves" width="46" height="28" patternUnits="userSpaceOnUse">
                <path d="M0,15 q11,-9 23,0 t23,0" fill="none" stroke="#3f7290" strokeWidth="1.3" strokeLinecap="round" opacity="0.4" />
              </pattern>
              <radialGradient id="sm-vignette" cx="50%" cy="45%" r="78%">
                <stop offset="58%" stopColor="#000" stopOpacity="0" />
                <stop offset="100%" stopColor="#000" stopOpacity="0.5" />
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

            {/* Ombre portée du continent (profondeur) */}
            <g filter="url(#sm-landshadow)">
              <path d={CONTINENT} fill="#03080c" />
              {ISLANDS.map((d, i) => <path key={i} d={d} fill="#03080c" />)}
            </g>

            {/* Terre : terrain + teintes de nation + relief, clippés */}
            <g clipPath="url(#sm-land)">
              <image href="/images/akasha/map/terrain.webp" x="-20" y="-20" width={MAP.w + 40} height={MAP.h + 40} preserveAspectRatio="xMidYMid slice" opacity="0.92" />
              {REGIONS.map((r) => {
                const on = r.label === hoveredLand;
                return <path key={r.key} d={r.path} fill={r.tint} fillOpacity={on ? 0.5 : 0.3} stroke={r.tint} strokeOpacity="0.35" strokeWidth="1.5" style={{ transition: 'fill-opacity .2s' }} />;
              })}
              {/* Reliefs par biome */}
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

            {/* Côtes : halo + trait net */}
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

            <rect width={MAP.w} height={MAP.h} fill="url(#sm-vignette)" pointerEvents="none" />
          </svg>
        </div>

        {/* Overlay des pins (hors cadre clippé → tooltips visibles) */}
        {VILLAGES.map((v) => {
          const count = counts[v.key];
          const great = v.tier === 'great';
          const on = hover === v.key;
          const marker = (
            <div
              onMouseEnter={() => setHover(v.key)} onMouseLeave={() => setHover(null)}
              style={{ position: 'absolute', ...pos(v.x, v.y), transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: great ? 'pointer' : 'default', zIndex: on ? 60 : great ? 30 : 20 }}
            >
              {great ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 50, height: 50, borderRadius: '50%', background: 'radial-gradient(circle, rgba(8,11,16,0.92) 55%, rgba(8,11,16,0.4))', boxShadow: `0 4px 14px rgba(0,0,0,0.85), 0 0 0 1.5px ${on ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.2)'}${on ? ', 0 0 16px rgba(255,255,255,0.35)' : ''}`, transform: on ? 'translateY(-3px) scale(1.16)' : 'scale(1)', transition: 'all .18s cubic-bezier(.2,.8,.3,1.3)' }}>
                  <VillageEmblem slug={v.key} size={38} />
                </span>
              ) : (
                <span style={{ width: on ? 15 : 11, height: on ? 15 : 11, borderRadius: '50%', background: '#f0ead8', border: '2px solid #0a2130', boxShadow: on ? '0 0 10px rgba(240,234,216,0.9)' : '0 0 6px rgba(240,234,216,0.5)', transition: 'all .18s' }} />
              )}
              <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: great ? 12.5 : 10, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)', whiteSpace: 'nowrap', letterSpacing: 0.3 }}>{v.name}</span>
            </div>
          );
          return great ? (
            <Link key={v.key} href={`/learn/akasha/u/${hubSlug}/village/${encodeURIComponent(v.fullName)}`} style={{ textDecoration: 'none' }} aria-label={`${v.fullName} — ${count ?? ''} ninjas`}>{marker}</Link>
          ) : (
            <div key={v.key}>{marker}</div>
          );
        })}

        {/* Tooltip UNIQUE ancré aux coordonnées du village survolé (enfant direct du conteneur → jamais dans un coin) */}
        {(() => {
          const v = VILLAGES.find((x) => x.key === hover);
          if (!v) return null;
          const count = counts[v.key];
          const great = v.tier === 'great';
          const flipDown = v.y < MAP.h * 0.36;                    // villages du haut → tooltip dessous
          const px = (v.x / MAP.w) * 100;
          const tx = px < 15 ? '-6%' : px > 85 ? '-94%' : '-50%'; // évite les débordements latéraux
          return (
            <div role="tooltip" style={{ position: 'absolute', left: `${px}%`, top: `${(v.y / MAP.h) * 100}%`, transform: `translate(${tx}, ${flipDown ? '42px' : 'calc(-100% - 30px)'})`, width: 200, padding: '11px 13px', borderRadius: 13, background: 'linear-gradient(180deg, rgba(15,20,28,0.98), rgba(9,12,18,0.98))', border: `1px solid ${color}66`, boxShadow: '0 14px 36px rgba(0,0,0,0.7)', pointerEvents: 'none', zIndex: 80 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: (typeof count === 'number' || v.note) ? 7 : 0 }}>
                {great && <VillageEmblem slug={v.key} size={32} />}
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
