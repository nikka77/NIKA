'use client';
// components/akasha/hub/ShinobiMap.tsx — carte interactive du continent shinobi (Naruto).
// Hybride : géométrie SVG maison (régions canon + repères) + texture terrain générée clippée,
// overlay HTML pour les blasons cliquables et les tooltips. Aucun asset tiers.
import { useState } from 'react';
import Link from 'next/link';
import { MAP, REGIONS, VILLAGES, LANDMARKS } from '@/lib/akasha/naruto-map';
import { VillageEmblem } from '@/components/akasha/NarutoIcons';

export default function ShinobiMap({ counts, hubSlug = 'naruto', color = '#4a8a3a' }: {
  counts: Record<string, number>; hubSlug?: string; color?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const pos = (x: number, y: number) => ({ left: `${(x / MAP.w) * 100}%`, top: `${(y / MAP.h) * 100}%` });

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 2px 10px', fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        <span style={{ color }}>🗺️ Le continent shinobi</span>
        <span style={{ color: 'var(--td3)' }}>{VILLAGES.length} villages · carte interactive</span>
      </div>

      <div style={{ position: 'relative', width: '100%', aspectRatio: `${MAP.w} / ${MAP.h}`, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--bd)', boxShadow: 'inset 0 0 60px rgba(0,0,0,0.6)' }}>
        <svg viewBox={`0 0 ${MAP.w} ${MAP.h}`} width="100%" height="100%" style={{ position: 'absolute', inset: 0, display: 'block' }} aria-hidden>
          <defs>
            <clipPath id="sm-continent">{REGIONS.map((r) => <path key={r.key} d={r.path} />)}</clipPath>
            <pattern id="sm-waves" width="42" height="26" patternUnits="userSpaceOnUse" patternTransform="translate(0 0)">
              <path d="M0,14 q10,-8 21,0 t21,0" fill="none" stroke="#3a6a86" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
            </pattern>
            <radialGradient id="sm-vignette" cx="50%" cy="45%" r="75%">
              <stop offset="60%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
            </radialGradient>
          </defs>

          {/* Océan */}
          <rect width={MAP.w} height={MAP.h} fill="#0a2130" />
          <rect width={MAP.w} height={MAP.h} fill="url(#sm-waves)" />

          {/* Terrain (texture générée) clippé au continent + halo côtier */}
          <g clipPath="url(#sm-continent)">
            <image href="/images/akasha/map/terrain.webp" x="-20" y="-20" width={MAP.w + 40} height={MAP.h + 40} preserveAspectRatio="xMidYMid slice" opacity="0.95" />
          </g>
          {/* Teintes de nation + côtes + kanji */}
          {REGIONS.map((r) => {
            const on = hover === r.key;
            return (
              <g key={r.key}>
                <path d={r.path} fill={r.tint} fillOpacity={on ? 0.42 : 0.24} stroke={r.tint} strokeOpacity="0.95" strokeWidth={on ? 3 : 2} style={{ transition: 'fill-opacity .2s' }} />
                <text x={r.lx} y={r.ly} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 46, fontWeight: 900, fill: '#0c0f16', fillOpacity: 0.5, letterSpacing: 2 }}>{r.kanji}</text>
                <text x={r.lx} y={r.ly + 34} textAnchor="middle" style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, fill: '#f0ead8', fillOpacity: 0.85, letterSpacing: 1 }}>{r.label.replace('Pays ', '')}</text>
              </g>
            );
          })}

          {/* Repères */}
          {LANDMARKS.map((l) => (
            <g key={l.key}>
              <circle cx={l.x} cy={l.y} r="2.6" fill="#e9e2d0" opacity="0.85" />
              <text x={l.x + 6} y={l.y + 3.5} style={{ fontFamily: 'var(--fo)', fontSize: 8.5, fontWeight: 600, fill: '#e9e2d0', fillOpacity: 0.7 }}>{l.name}</text>
            </g>
          ))}

          <rect width={MAP.w} height={MAP.h} fill="url(#sm-vignette)" pointerEvents="none" />
        </svg>

        {/* Overlay HTML : villages cliquables + tooltips */}
        {VILLAGES.map((v) => {
          const count = counts[v.key];
          const great = v.tier === 'great';
          const on = hover === v.key;
          const marker = (
            <div
              onMouseEnter={() => setHover(v.key)} onMouseLeave={() => setHover(null)}
              style={{ position: 'absolute', ...pos(v.x, v.y), transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: great ? 'pointer' : 'default', zIndex: on ? 30 : great ? 20 : 10 }}
            >
              {great ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 50, height: 50, borderRadius: '50%', background: 'radial-gradient(circle, rgba(8,11,16,0.9) 55%, rgba(8,11,16,0.35))', boxShadow: `0 3px 12px rgba(0,0,0,0.8), 0 0 0 1.5px ${on ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.18)'}`, transform: on ? 'scale(1.16)' : 'scale(1)', transition: 'all .18s' }}>
                  <VillageEmblem slug={v.key} size={38} />
                </span>
              ) : (
                <span style={{ width: on ? 14 : 11, height: on ? 14 : 11, borderRadius: '50%', background: '#e9e2d0', border: '2px solid #0a2130', boxShadow: '0 0 6px rgba(233,226,208,0.6)', transition: 'all .18s' }} />
              )}
              <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: great ? 12.5 : 10, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9)', whiteSpace: 'nowrap' }}>{v.name}</span>

              {on && (
                <div role="tooltip" style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translate(-50%, -8px)', width: 190, padding: '10px 12px', borderRadius: 12, background: 'rgba(10,14,20,0.97)', border: '1px solid var(--bd)', boxShadow: '0 10px 30px rgba(0,0,0,0.6)', pointerEvents: 'none', zIndex: 40 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: note(v) ? 6 : 0 }}>
                    {great && <VillageEmblem slug={v.key} size={30} />}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 14, color: 'var(--td)', lineHeight: 1 }}>{v.fullName}</div>
                      <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: 'var(--td3)', marginTop: 3 }}>{v.land}</div>
                    </div>
                  </div>
                  {typeof count === 'number' ? (
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color }}>{count} ninjas répertoriés →</div>
                  ) : v.note ? (
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, lineHeight: 1.4, color: 'var(--td2)' }}>{v.note}</div>
                  ) : null}
                </div>
              )}
            </div>
          );
          return great ? (
            <Link key={v.key} href={`/learn/akasha/u/${hubSlug}/village/${encodeURIComponent(v.fullName)}`} style={{ textDecoration: 'none' }} aria-label={`${v.fullName} — ${count ?? ''} ninjas`}>{marker}</Link>
          ) : (
            <div key={v.key}>{marker}</div>
          );
        })}
      </div>

      {/* Légende */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10, fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 600, color: 'var(--td3)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: color }} /> Grand village (cliquable)</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: '#e9e2d0' }} /> Village mineur canon</span>
      </div>
    </section>
  );
}

function note(v: { note?: string }) { return !!v.note; }
