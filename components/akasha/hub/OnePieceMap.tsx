'use client';
// components/akasha/hub/OnePieceMap.tsx — carte du monde One Piece interactive (données op-maps retraitées).
// Pan/zoom, formes d'îles réelles, POI, routes individuelles des Chapeaux de Paille + Merry/Sunny,
// territoires des Yonko, panneau d'info canon. Cf. lib/akasha/op-world-map.ts.
import { useEffect, useMemo, useRef, useState } from 'react';
import { OP_WORLD, OPW_REGION_TINT, OPW_ROUTE_LABEL, type OpwIsland, type OpwPoi } from '@/lib/akasha/op-world-map';

const B = OP_WORLD.bounds;
const PAD = 40;
const FULL = { x: B.minX - PAD, y: B.minY - PAD, w: B.maxX - B.minX + PAD * 2, h: B.maxY - B.minY + PAD * 2 };
const MIN_W = 220;            // zoom max
const MAX_W = FULL.w;         // zoom min (vue entière)

const pathFrom = (pts: [number, number][]) => pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ',' + p[1]).join(' ');
const polyFrom = (pts: [number, number][]) => pts.map((p) => p[0] + ',' + p[1]).join(' ');

function Island({ isl, on, sel, zoomedLabels, onSel, onHover }: {
  isl: OpwIsland; on: boolean; sel: boolean; zoomedLabels: boolean;
  onSel: () => void; onHover: (v: boolean) => void;
}) {
  const tint = OPW_REGION_TINT[isl.region] || '#CDB98E';
  const showLabel = isl.area >= 6000 || on || sel || (zoomedLabels && isl.major);
  return (
    <g style={{ cursor: 'pointer' }} onPointerEnter={() => onHover(true)} onPointerLeave={() => onHover(false)} onClick={onSel}>
      {isl.shape && isl.shape.length > 2
        ? <path d={pathFrom(isl.shape) + 'Z'} fill={tint} stroke={sel ? '#F2C14E' : on ? '#FFFFFF' : '#5B4A2E'} strokeWidth={sel || on ? 4 : 1.6}
            opacity={on || sel ? 1 : 0.92} />
        : <circle cx={isl.x} cy={isl.y} r={7} fill={tint} stroke={sel ? '#F2C14E' : '#5B4A2E'} strokeWidth={sel ? 4 : 1.6} />}
      {showLabel && (
        <text x={isl.x} y={isl.y - (isl.area >= 20000 ? 22 : 12)} textAnchor="middle" fontFamily="var(--fo)" fontWeight="700"
          fontSize={isl.area >= 40000 ? 30 : 20} fill={on || sel ? '#FFFFFF' : '#EAF2F8'} stroke="#06131F" strokeWidth={on || sel ? 6 : 4.5}
          paintOrder="stroke" style={{ pointerEvents: 'none' }}>{isl.name}</text>
      )}
    </g>
  );
}

export default function OnePieceMap({ color = '#D63C3C' }: { color?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState(FULL);
  const [hover, setHover] = useState<string | null>(null);
  const [sel, setSel] = useState<{ kind: 'island' | 'poi'; id: string } | null>(null);
  const [routes, setRoutes] = useState<Set<string>>(new Set(['straw-hat-crew']));
  const [showPoi, setShowPoi] = useState(false);
  const [showYonko, setShowYonko] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const zoomedLabels = view.w < 1100;
  const selected = useMemo(() => {
    if (!sel) return null;
    return sel.kind === 'island'
      ? OP_WORLD.islands.find((i) => i.id === sel.id) || null
      : OP_WORLD.poi.find((p) => p.id === sel.id) || null;
  }, [sel]);

  // zoom molette (listener natif non-passif)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return; // molette simple → scroll de page ; Ctrl/⌘+molette → zoom
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width, py = (e.clientY - rect.top) / rect.height;
      setView((v) => {
        const f = e.deltaY < 0 ? 0.82 : 1.22;
        let nw = Math.min(MAX_W, Math.max(MIN_W, v.w * f));
        const k = nw / v.w, nh = v.h * k;
        const cx = v.x + px * v.w, cy = v.y + py * v.h;
        return { x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k, w: nw, h: nh };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const zoomBtn = (f: number) => setView((v) => {
    let nw = Math.min(MAX_W, Math.max(MIN_W, v.w * f));
    const k = nw / v.w, nh = v.h * k;
    const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    return { x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k, w: nw, h: nh };
  });

  const onPointerDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY }; (e.target as Element).setPointerCapture?.(e.pointerId); };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dx = (e.clientX - drag.current.x) * (view.w / rect.width);
    const dy = (e.clientY - drag.current.y) * (view.h / rect.height);
    drag.current = { x: e.clientX, y: e.clientY };
    setView((v) => ({ ...v, x: v.x - dx, y: v.y - dy }));
  };
  const onPointerUp = () => { drag.current = null; };

  const toggleRoute = (id: string) => setRoutes((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const chip = (active: boolean, onClick: () => void, label: React.ReactNode, dot?: string, key?: string) => (
    <button key={key} onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 999, cursor: 'pointer',
      fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
      border: `1px solid ${active ? 'transparent' : 'var(--bd)'}`,
      background: active ? (dot || color) : 'transparent', color: active ? '#0A1420' : 'var(--td3)',
    }}>{dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? '#0A1420' : dot }} />}{label}</button>
  );

  return (
    <div style={{ marginTop: '1.6rem' }}>
      <style>{`@keyframes opFlow{to{stroke-dashoffset:-40}}.op-flow{animation:opFlow 1.6s linear infinite}
        @media (prefers-reduced-motion:reduce){.op-flow{animation:none}}`}</style>

      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, marginBottom: 4 }}>
        🗺️ Carte du monde — {OP_WORLD.counts.islands} îles · {OP_WORLD.counts.poi} lieux · routes d’équipage · territoires Yonko
      </div>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td3)', margin: '0 0 10px' }}>
        Formes et positions canon des îles, des quatre Blues au Nouveau Monde. Glisse pour explorer, boutons ou Ctrl/⌘+molette pour zoomer, clique une île pour sa fiche.
      </p>

      {/* Contrôles calques */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, alignItems: 'center' }}>
        {chip(showPoi, () => setShowPoi((v) => !v), 'POI', '#F2C14E')}
        {chip(showYonko, () => setShowYonko((v) => !v), 'Territoires Yonko', '#E056C1')}
        <span style={{ width: 1, height: 18, background: 'var(--bd)', margin: '0 2px' }} />
        {OP_WORLD.routes.map((r) => chip(routes.has(r.id), () => toggleRoute(r.id), OPW_ROUTE_LABEL[r.id] || r.character, r.color, r.id))}
        <span style={{ width: 1, height: 18, background: 'var(--bd)', margin: '0 2px' }} />
        {chip(false, () => setRoutes(new Set()), 'Effacer routes')}
      </div>

      <div style={{ position: 'relative', borderRadius: 16, border: '1px solid var(--bd)', background: '#0A2036', overflow: 'hidden' }}>
        {/* Zoom */}
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 5, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[['+', 0.7], ['−', 1.43]].map(([t, f]) => (
            <button key={t as string} onClick={() => zoomBtn(f as number)} aria-label={t === '+' ? 'Zoom avant' : 'Zoom arrière'}
              style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--bd)', background: 'rgba(10,20,32,0.85)', color: '#EAF2F8', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t}</button>
          ))}
          <button onClick={() => setView(FULL)} aria-label="Recentrer" style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--bd)', background: 'rgba(10,20,32,0.85)', color: '#EAF2F8', fontSize: 13, cursor: 'pointer' }}>⤢</button>
        </div>

        <svg ref={svgRef} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} role="img"
          aria-label="Carte du monde One Piece interactive"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
          style={{ width: '100%', height: 560, display: 'block', touchAction: 'none', cursor: drag.current ? 'grabbing' : 'grab', background: 'radial-gradient(circle at 50% 30%, #0F4468 0%, #0A2338 70%)' }}>

          {/* Territoires Yonko */}
          {showYonko && OP_WORLD.yonko.map((y) => (
            <g key={y.id} style={{ pointerEvents: 'none' }}>
              {y.shapes.map((sh, i) => <polygon key={i} points={polyFrom(sh)} fill={y.color} fillOpacity={0.12} stroke={y.color} strokeOpacity={0.55} strokeWidth={3} strokeDasharray="10 8" />)}
              <text x={y.shapes[0][0][0]} y={y.shapes[0][0][1]} fontFamily="var(--fe)" fontStyle="italic" fontWeight="800" fontSize={34} fill={y.color} opacity={0.85} stroke="#06131F" strokeWidth={5} paintOrder="stroke">{y.yonko}</text>
            </g>
          ))}

          {/* Îles */}
          {OP_WORLD.islands.map((isl) => (
            <Island key={isl.id} isl={isl} on={hover === isl.id} sel={sel?.kind === 'island' && sel.id === isl.id}
              zoomedLabels={zoomedLabels} onHover={(v) => setHover(v ? isl.id : null)} onSel={() => setSel({ kind: 'island', id: isl.id })} />
          ))}

          {/* Routes */}
          {OP_WORLD.routes.filter((r) => routes.has(r.id)).map((r) => (
            <g key={r.id} style={{ pointerEvents: 'none' }}>
              <path d={pathFrom(r.path)} fill="none" stroke={r.color} strokeOpacity={0.22} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
              <path className={r.id === 'straw-hat-crew' ? 'op-flow' : undefined} d={pathFrom(r.path)} fill="none" stroke={r.color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 10" />
            </g>
          ))}

          {/* POI */}
          {showPoi && OP_WORLD.poi.map((p) => (
            <g key={p.id} style={{ cursor: 'pointer' }} onPointerEnter={() => setHover(p.id)} onPointerLeave={() => setHover(null)} onClick={() => setSel({ kind: 'poi', id: p.id })}>
              <path d={`M${p.x},${p.y - 8} L${p.x + 7},${p.y} L${p.x},${p.y + 8} L${p.x - 7},${p.y} Z`} fill="#F2C14E" stroke="#06131F" strokeWidth={1.6} />
              {(hover === p.id || zoomedLabels) && (
                <text x={p.x} y={p.y - 12} textAnchor="middle" fontFamily="var(--fo)" fontWeight="700" fontSize={16} fill="#FDE9B0" stroke="#06131F" strokeWidth={4} paintOrder="stroke" style={{ pointerEvents: 'none' }}>{p.name}</text>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* Panneau d'info */}
      {selected && (
        <div style={{ marginTop: 10, border: '1px solid var(--bd)', borderRadius: 12, padding: '12px 14px', background: 'var(--su)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--fb)', fontSize: 20, color: 'var(--td)' }}>{selected.name}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: (OPW_REGION_TINT[selected.region] || '#888') + '33', color: 'var(--td2)' }}>{selected.region}</span>
                {'firstAppearance' in selected && (selected as OpwIsland).firstAppearance?.chapter && (
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)' }}>Ch. {(selected as OpwIsland).firstAppearance!.chapter} · Ép. {(selected as OpwIsland).firstAppearance!.episode}</span>
                )}
              </div>
            </div>
            <button onClick={() => setSel(null)} aria-label="Fermer" style={{ border: 'none', background: 'transparent', color: 'var(--td3)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
          {selected.description && <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', margin: '8px 0 0', lineHeight: 1.5 }}>{selected.description}</p>}
          {selected.visitedBy?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 4 }}>Fréquenté par</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {selected.visitedBy.slice(0, 12).map((v) => <span key={v} style={{ fontFamily: 'var(--fo)', fontSize: 10.5, padding: '2px 7px', borderRadius: 999, border: '1px solid var(--bd)', color: 'var(--td2)' }}>{v}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8, fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>
        <span>🖱️ Glisser = déplacer · Ctrl/⌘ + molette = zoom · boutons +/−</span>
        <span>Données géographiques : op-maps.com (retraitées)</span>
      </div>
    </div>
  );
}
