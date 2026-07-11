'use client';
// components/akasha/hub/OnePieceMap.tsx — carte du monde One Piece + parcours de l'équipage
// (East Blue → Laugh Tale). SVG maison, îles cliquables, route animée. Cf. lib/akasha/onepiece-map.ts.
import { useState } from 'react';
import Link from 'next/link';
import { OP_MAP, RED_LINE, OP_ROUTE, OP_ZONES } from '@/lib/akasha/onepiece-map';

/** Chemin lissé (Catmull-Rom → cubiques) passant par tous les points. */
function smoothPath(p: [number, number][]): string {
  if (p.length < 2) return '';
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export default function OnePieceMap({ color = '#D63C3C' }: { color?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const d = smoothPath(OP_ROUTE.map((s) => [s.x, s.y]));
  const last = OP_ROUTE.length - 1;

  return (
    <div style={{ marginTop: '1.6rem' }}>
      <style>{`@keyframes opFlow{to{stroke-dashoffset:-28}}.op-flow{animation:opFlow 1.3s linear infinite}
        @media (prefers-reduced-motion:reduce){.op-flow{animation:none}}
        .op-pin{cursor:pointer}.op-pin text{transition:opacity .15s}`}</style>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>🗺️ La route de l’équipage</span>
        <span style={{ color: 'var(--td3)' }}>East Blue → Laugh Tale</span>
      </div>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td3)', margin: '0 0 10px' }}>
        Le voyage des Chapeaux de Paille à travers Grand Line — clique une île pour l’explorer.
      </p>

      <div style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid var(--bd)' }}>
        <svg viewBox={`0 0 ${OP_MAP.w} ${OP_MAP.h}`} role="img" aria-label="Carte du monde One Piece et parcours de l'équipage"
          style={{ width: '100%', minWidth: 620, height: 'auto', display: 'block' }}>
          <defs>
            <linearGradient id="op-ocean" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0B2A44" /><stop offset="0.5" stopColor="#0E3C5C" /><stop offset="1" stopColor="#0A2036" />
            </linearGradient>
            <linearGradient id="op-redline" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#7A2A2A" /><stop offset="0.5" stopColor="#A23A38" /><stop offset="1" stopColor="#6E2323" />
            </linearGradient>
            <radialGradient id="op-glow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor={color} stopOpacity="0.5" /><stop offset="1" stopColor={color} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Océan + houle */}
          <rect x="0" y="0" width={OP_MAP.w} height={OP_MAP.h} fill="url(#op-ocean)" />
          <g stroke="#2C5B7A" strokeWidth="1" opacity="0.25" fill="none">
            {Array.from({ length: 7 }, (_, i) => (
              <path key={i} d={`M0,${60 + i * 80} q60,-14 120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0`} />
            ))}
          </g>
          {/* Calm Belts (bandes calmes) */}
          <rect x="0" y="196" width={OP_MAP.w} height="26" fill="#0C2033" opacity="0.5" />
          <rect x="0" y="392" width={OP_MAP.w} height="26" fill="#0C2033" opacity="0.5" />

          {/* Red Line */}
          <path d={RED_LINE} fill="url(#op-redline)" stroke="#4E1A1A" strokeWidth="2" opacity="0.9" />
          <text x="515" y="150" textAnchor="middle" transform="rotate(90 515 150)" fontFamily="var(--fe)" fontSize="15" fontWeight="800" fill="#E9B7B0" opacity="0.85" letterSpacing="3">RED LINE</text>

          {/* Zones */}
          {OP_ZONES.map((z) => (
            <text key={z.label} x={z.x} y={z.y} textAnchor="middle" fontFamily="var(--fe)" fontStyle="italic" fontWeight="800"
              fontSize={z.size} fill={z.color} opacity="0.7" letterSpacing="2">{z.label}</text>
          ))}

          {/* Route : sillage large + trait animé */}
          <path d={d} fill="none" stroke={color} strokeOpacity="0.18" strokeWidth="11" strokeLinecap="round" />
          <path className="op-flow" d={d} fill="none" stroke="#F2C14E" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="5 7" />

          {/* Escales (îles cliquables) */}
          {OP_ROUTE.map((s, i) => {
            const isStart = i === 0, isEnd = i === last, on = hover === i;
            const r = (isStart || isEnd ? 8 : 5) + (on ? 2.5 : 0);
            const fill = isEnd ? '#F2C14E' : isStart ? '#3FBE7A' : '#EAF2F8';
            const above = s.y > 300;
            return (
              <Link key={s.slug} href={`/learn/akasha/${s.slug}`} className="op-pin" aria-label={s.name}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <circle cx={s.x} cy={s.y} r={r + 3} fill="#06131F" opacity={on ? 0.9 : 0} />
                <circle cx={s.x} cy={s.y} r={r} fill={fill} stroke="#06131F" strokeWidth="1.6" />
                {(isStart || isEnd) && <circle cx={s.x} cy={s.y} r={r + 5} fill="none" stroke={fill} strokeWidth="1.4" opacity="0.5" />}
                <text x={s.x} y={above ? s.y - r - 5 : s.y + r + 12} textAnchor="middle" fontFamily="var(--fo)" fontWeight="700"
                  fontSize={on ? 13 : 10.5} fill={on ? '#FFFFFF' : '#CBDCEA'} stroke="#06131F" strokeWidth="2.4" paintOrder="stroke"
                  opacity={on || isStart || isEnd || i % 2 === 0 ? 1 : 0.82}>{s.name}</text>
                {on && s.note && (
                  <text x={s.x} y={above ? s.y - r - 20 : s.y + r + 27} textAnchor="middle" fontFamily="var(--fo)" fontStyle="italic"
                    fontSize="10" fill="#F2C14E" stroke="#06131F" strokeWidth="2.2" paintOrder="stroke">{s.note}</text>
                )}
              </Link>
            );
          })}
        </svg>
      </div>

      {/* Légende */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8, fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: '#3FBE7A', display: 'inline-block' }} /> Départ</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: '#F2C14E', display: 'inline-block' }} /> Laugh Tale</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 16, height: 3, background: '#F2C14E', display: 'inline-block' }} /> La route suivie</span>
        <span>{OP_ROUTE.length} escales</span>
      </div>
    </div>
  );
}
