'use client';
// components/akasha/hub/OnePieceMap.tsx — carte du monde One Piece détaillée + parcours de l'équipage.
// Structure canon (Grand Line, Red Line + canal Fishman, Reverse Mountain, Calm Belts, 4 Blues),
// formes d'îles procédurales, route animée East Blue → Laugh Tale. Cf. lib/akasha/onepiece-map.ts.
import { useState } from 'react';
import Link from 'next/link';
import {
  OP_MAP, GRAND_LINE, CALM_BELTS, RED_LINE_CENTER, RED_LINE_EDGES, FISHMAN_CHANNEL,
  REVERSE_MTN, REVERSE_RIVERS, OP_ZONES, OP_ISLANDS, type OpIsland,
} from '@/lib/akasha/onepiece-map';

// Pseudo-aléatoire déterministe (pas de Math.random → rendu stable SSR).
const rnd = (seed: number, i: number) => { const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return x - Math.floor(x); };

// Silhouette d'île organique fermée (Catmull-Rom) autour de (cx,cy).
function islandPath(cx: number, cy: number, r: number, seed: number, n = 11): string {
  const p: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.72 + rnd(seed, i) * 0.52);
    p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.86]);
  }
  let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}

// Chemin lissé ouvert par une liste de points (pour la route).
function smooth(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? pts[i + 1];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function Island({ isl, on, onHover }: { isl: OpIsland; on: boolean; onHover: (v: boolean) => void }) {
  const { x, y, r, seed, name, sky, route, note, lbl, minor } = isl;
  const isStart = route === 1, isEnd = route === 22;
  const body = (
    <g style={{ cursor: isl.slug ? 'pointer' : 'default' }} onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)}>
      {sky && <g fill="#EAF2F8" opacity="0.9"><ellipse cx={x} cy={y + r * 0.9} rx={r * 1.5} ry={r * 0.55} /><ellipse cx={x - r} cy={y + r} rx={r * 0.7} ry={r * 0.4} /><ellipse cx={x + r} cy={y + r} rx={r * 0.7} ry={r * 0.4} /></g>}
      {/* halo au survol */}
      {on && <circle cx={x} cy={y} r={r * 1.7} fill="#F2C14E" opacity="0.14" />}
      {/* terre + côte */}
      <path d={islandPath(x, y, r, seed)} fill="#CDB98E" stroke="#7C623E" strokeWidth={1.4} />
      {/* végétation */}
      <path d={islandPath(x, y - r * 0.16, r * 0.64, seed + 1)} fill="#6E9E4C" stroke="#4E7636" strokeWidth={0.8} />
      {r >= 15 && <path d={`M${x - r * 0.3},${y - r * 0.1} l${r * 0.28},${-r * 0.55} l${r * 0.3},${r * 0.55} z`} fill="#B7A277" stroke="#7C623E" strokeWidth={0.7} />}
      {(isStart || isEnd) && <circle cx={x} cy={y} r={r + 6} fill="none" stroke={isEnd ? '#F2C14E' : '#3FBE7A'} strokeWidth={2} opacity="0.7" />}
      {/* étiquette */}
      <text x={x} y={lbl === 'up' ? y - r - (minor ? 4 : 6) : y + r + (minor ? 11 : 14)} textAnchor="middle" fontFamily="var(--fo)" fontWeight="700"
        fontSize={on ? (minor ? 12.5 : 14) : (minor ? 8.7 : 11)} fill={on ? '#FFFFFF' : (minor ? '#AEC2D4' : '#DCE8F2')}
        opacity={minor && !on ? 0.8 : 1} stroke="#06131F" strokeWidth={minor ? 2 : 2.6} paintOrder="stroke">{name}</text>
      {on && note && (
        <text x={x} y={lbl === 'up' ? y - r - 21 : y + r + 30} textAnchor="middle" fontFamily="var(--fo)" fontStyle="italic"
          fontSize="11" fill="#F2C14E" stroke="#06131F" strokeWidth={2.4} paintOrder="stroke">{note}</text>
      )}
    </g>
  );
  return isl.slug ? <Link href={`/learn/akasha/${isl.slug}`} aria-label={name}>{body}</Link> : body;
}

export default function OnePieceMap({ color = '#D63C3C' }: { color?: string }) {
  const [hover, setHover] = useState<string | null>(null);
  // Points du parcours (îles route + Reverse Mountain en étape 3).
  const routeStops = [
    ...OP_ISLANDS.filter((i) => i.route).map((i) => ({ o: i.route!, x: i.x, y: i.y })),
    { o: 3, x: REVERSE_MTN.x, y: REVERSE_MTN.y },
  ].sort((a, b) => a.o - b.o);
  const routeD = smooth(routeStops.map((s) => [s.x, s.y]));

  return (
    <div style={{ marginTop: '1.6rem' }}>
      <style>{`@keyframes opFlow{to{stroke-dashoffset:-30}}.op-flow{animation:opFlow 1.3s linear infinite}
        @media (prefers-reduced-motion:reduce){.op-flow{animation:none}}`}</style>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span>🗺️ Carte du monde &amp; route de l’équipage</span>
        <span style={{ color: 'var(--td3)' }}>East Blue → Laugh Tale</span>
      </div>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td3)', margin: '0 0 10px' }}>
        Grand Line, Red Line et les quatre Blues — le voyage des Chapeaux de Paille, île par île. Clique une île pour l’explorer.
      </p>

      <div style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid var(--bd)', background: '#0A2036' }}>
        <svg viewBox={`0 0 ${OP_MAP.w} ${OP_MAP.h}`} role="img" aria-label="Carte du monde One Piece et parcours de l'équipage"
          style={{ width: '100%', minWidth: 860, height: 'auto', display: 'block' }}>
          <defs>
            <linearGradient id="op-ocean" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0C3350" /><stop offset="0.5" stopColor="#0F4468" /><stop offset="1" stopColor="#0A2338" />
            </linearGradient>
            <linearGradient id="op-red" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#7C2C2C" /><stop offset="0.5" stopColor="#A64240" /><stop offset="1" stopColor="#6E2626" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width={OP_MAP.w} height={OP_MAP.h} fill="url(#op-ocean)" />
          {/* courants (houle) */}
          <g stroke="#2E6488" strokeWidth="1" opacity="0.22" fill="none">
            {Array.from({ length: 11 }, (_, i) => (
              <path key={i} d={`M0,${50 + i * 76} q70,-16 140,0 t140,0 t140,0 t140,0 t140,0 t140,0 t140,0 t140,0 t140,0 t140,0`} />
            ))}
          </g>
          {/* Calm Belts */}
          {CALM_BELTS.map((b, i) => <rect key={i} x="0" y={b.y0} width={OP_MAP.w} height={b.y1 - b.y0} fill="#0B2233" opacity="0.55" />)}
          {/* Grand Line (couloir plus clair) */}
          <rect x="0" y={GRAND_LINE.y0} width={OP_MAP.w} height={GRAND_LINE.y1 - GRAND_LINE.y0} fill="#12557C" opacity="0.28" />

          {/* Red Line (bords + centre) */}
          {RED_LINE_EDGES.map((d, i) => <path key={i} d={d} fill="url(#op-red)" opacity="0.9" />)}
          <path d={RED_LINE_CENTER} fill="url(#op-red)" stroke="#4E1C1C" strokeWidth="2" />
          {/* texture rocheuse */}
          <g stroke="#5C2020" strokeWidth="1.4" opacity="0.4" fill="none">
            <path d="M700,40 q30,120 -8,220 M732,120 q-24,140 10,240 M700,560 q26,120 -6,260" />
          </g>
          {/* Canal de l'Île des Hommes-Poissons (eau à travers la Red Line) */}
          <rect x={FISHMAN_CHANNEL.x0} y={FISHMAN_CHANNEL.y0} width={FISHMAN_CHANNEL.x1 - FISHMAN_CHANNEL.x0} height={FISHMAN_CHANNEL.y1 - FISHMAN_CHANNEL.y0} fill="#0F4468" opacity="0.92" />
          <text x={714} y={352} textAnchor="middle" transform="rotate(90 714 352)" fontFamily="var(--fe)" fontSize="17" fontWeight="800" fill="#EDBDB6" opacity="0.85" letterSpacing="4">RED LINE</text>

          {/* Reverse Mountain — rivières des 4 Blues + bassin */}
          <g stroke="#2E6488" strokeWidth="3" opacity="0.5" strokeLinecap="round">
            {REVERSE_RIVERS.map((r, i) => <line key={i} x1={r[0]} y1={r[1]} x2={r[2]} y2={r[3]} />)}
          </g>
          <circle cx={REVERSE_MTN.x} cy={REVERSE_MTN.y} r={REVERSE_MTN.r} fill="#8A3A38" stroke="#4E1C1C" strokeWidth="2" />
          <path d={`M${REVERSE_MTN.x - 14},${REVERSE_MTN.y + 8} l14,-26 l14,26 z`} fill="#B7A277" stroke="#4E1C1C" strokeWidth="1" />
          <text x={REVERSE_MTN.x + 4} y={REVERSE_MTN.y + REVERSE_MTN.r + 15} textAnchor="middle" fontFamily="var(--fo)" fontWeight="700" fontSize="11" fill="#EDBDB6" stroke="#06131F" strokeWidth="2.4" paintOrder="stroke">Reverse Mountain</text>

          {/* Zones */}
          {OP_ZONES.map((z) => (
            <text key={z.label + z.x + '-' + z.y} x={z.x} y={z.y} textAnchor="middle" fontFamily="var(--fe)" fontStyle={z.italic ? 'italic' : 'normal'}
              fontWeight="800" fontSize={z.size} fill={z.color} opacity="0.6" letterSpacing="2">{z.label}</text>
          ))}

          {/* Route : sillage + trait animé (par-dessus l'océan, sous les îles) */}
          <path d={routeD} fill="none" stroke={color} strokeOpacity="0.16" strokeWidth="12" strokeLinecap="round" />
          <path className="op-flow" d={routeD} fill="none" stroke="#F2C14E" strokeWidth="2.8" strokeLinecap="round" strokeDasharray="6 8" />

          {/* Îles */}
          {OP_ISLANDS.map((isl) => (
            <Island key={isl.name} isl={isl} on={hover === isl.name} onHover={(v) => setHover(v ? isl.name : null)} />
          ))}
        </svg>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8, fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: '50%', border: '2px solid #3FBE7A' }} /> Départ (Fushia)</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: '50%', border: '2px solid #F2C14E' }} /> Laugh Tale</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 16, height: 3, background: '#F2C14E', display: 'inline-block' }} /> Route suivie</span>
        <span>{OP_ISLANDS.length} lieux · {routeStops.length} escales</span>
      </div>
    </div>
  );
}
