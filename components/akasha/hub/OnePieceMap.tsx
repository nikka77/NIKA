'use client';
// components/akasha/hub/OnePieceMap.tsx — carte du monde One Piece : image officielle (op-maps) en fond
// + calques d'infos superposés (îles cliquables, POI, routes de l'équipage/membres/navires, territoires
// Yonko). Lecture GAUCHE→DROITE (paysage). Transform data→image : X = coord.y, Y = 2048 − coord.x.
import { useEffect, useMemo, useRef, useState } from 'react';
import { OP_WORLD, OPW_ROUTE_LABEL, type OpwIsland, type OpwPoi } from '@/lib/akasha/op-world-map';

const W = 4096, H = 2048;                 // fond op-world-bg.webp (4096×2048)
const T = (px: number, py: number): [number, number] => [py, H - px]; // data [x,y] → écran paysage
const tShape = (pts: [number, number][]) => pts.map(([x, y], i) => (i ? 'L' : 'M') + T(x, y).join(',')).join(' ');
const FULL = { x: 0, y: 0, w: W, h: H };
const MIN_W = 520, MAX_W = W;

function Island({ isl, on, sel, onSel, onHover }: {
  isl: OpwIsland; on: boolean; sel: boolean; onSel: () => void; onHover: (v: boolean) => void;
}) {
  const [cx, cy] = T(isl.x, isl.y);
  const hot = { style: { cursor: 'pointer' as const }, onPointerEnter: () => onHover(true), onPointerLeave: () => onHover(false), onClick: onSel };
  return (
    <g {...hot}>
      {isl.shape && isl.shape.length > 2
        ? <path d={tShape(isl.shape) + 'Z'} fill="#FFE082" fillOpacity={sel ? 0.34 : on ? 0.24 : 0}
            stroke={sel ? '#F2C14E' : on ? '#FFFFFF' : 'none'} strokeWidth={sel ? 7 : on ? 5 : 0} pointerEvents="all" />
        : <circle cx={cx} cy={cy} r={16} fill="#FFE082" fillOpacity={sel ? 0.34 : on ? 0.24 : 0}
            stroke={sel || on ? '#F2C14E' : 'none'} strokeWidth={sel || on ? 4 : 0} pointerEvents="all" />}
      {(on || sel) && (
        <text x={cx} y={cy - (isl.area >= 20000 ? 34 : 20)} textAnchor="middle" fontFamily="var(--fo)" fontWeight="700"
          fontSize={26} fill="#FFFFFF" stroke="#06131F" strokeWidth={6} paintOrder="stroke" style={{ pointerEvents: 'none' }}>{isl.name}</text>
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
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const selected = useMemo(() => {
    if (!sel) return null;
    return sel.kind === 'island'
      ? OP_WORLD.islands.find((i) => i.id === sel.id) || null
      : OP_WORLD.poi.find((p) => p.id === sel.id) || null;
  }, [sel]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return; // molette simple → scroll page ; Ctrl/⌘+molette → zoom
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width, py = (e.clientY - rect.top) / rect.height;
      setView((v) => {
        const f = e.deltaY < 0 ? 0.82 : 1.22;
        const nw = Math.min(MAX_W, Math.max(MIN_W, v.w * f));
        const k = nw / v.w, nh = v.h * k;
        const cx = v.x + px * v.w, cy = v.y + py * v.h;
        return { x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k, w: nw, h: nh };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const zoomBtn = (f: number) => setView((v) => {
    const nw = Math.min(MAX_W, Math.max(MIN_W, v.w * f));
    const k = nw / v.w, nh = v.h * k;
    const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    return { x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k, w: nw, h: nh };
  });

  const onPointerDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY, moved: false }; (e.target as Element).setPointerCapture?.(e.pointerId); };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dx = (e.clientX - drag.current.x) * (view.w / rect.width);
    const dy = (e.clientY - drag.current.y) * (view.h / rect.height);
    if (Math.abs(e.clientX - drag.current.x) + Math.abs(e.clientY - drag.current.y) > 3) drag.current.moved = true;
    drag.current = { x: e.clientX, y: e.clientY, moved: drag.current.moved };
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
      <style>{`@keyframes opFlow{to{stroke-dashoffset:-60}}.op-flow{animation:opFlow 1.6s linear infinite}
        @media (prefers-reduced-motion:reduce){.op-flow{animation:none}}`}</style>

      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, marginBottom: 4 }}>
        🗺️ Carte du monde — {OP_WORLD.counts.islands} îles · {OP_WORLD.counts.poi} lieux · routes d’équipage · territoires Yonko
      </div>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td3)', margin: '0 0 10px' }}>
        East Blue (droite) → Grand Line → Nouveau Monde (gauche). Glisse pour explorer, boutons ou Ctrl/⌘+molette pour zoomer, clique une île pour sa fiche.
      </p>

      {/* Calques */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, alignItems: 'center' }}>
        {chip(showPoi, () => setShowPoi((v) => !v), 'POI', '#F2C14E')}
        {chip(showYonko, () => setShowYonko((v) => !v), 'Territoires Yonko', '#E056C1')}
        <span style={{ width: 1, height: 18, background: 'var(--bd)', margin: '0 2px' }} />
        {OP_WORLD.routes.map((r) => chip(routes.has(r.id), () => toggleRoute(r.id), OPW_ROUTE_LABEL[r.id] || r.character, r.color, r.id))}
        <span style={{ width: 1, height: 18, background: 'var(--bd)', margin: '0 2px' }} />
        {chip(false, () => setRoutes(new Set()), 'Effacer routes')}
      </div>

      <div style={{ position: 'relative', borderRadius: 16, border: '1px solid var(--bd)', background: '#0A2036', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 5, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[['+', 0.7], ['−', 1.43]].map(([t, f]) => (
            <button key={t as string} onClick={() => zoomBtn(f as number)} aria-label={t === '+' ? 'Zoom avant' : 'Zoom arrière'}
              style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--bd)', background: 'rgba(10,20,32,0.85)', color: '#EAF2F8', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t}</button>
          ))}
          <button onClick={() => setView(FULL)} aria-label="Recentrer" style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--bd)', background: 'rgba(10,20,32,0.85)', color: '#EAF2F8', fontSize: 13, cursor: 'pointer' }}>⤢</button>
        </div>

        <svg ref={svgRef} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} role="img"
          aria-label="Carte du monde One Piece interactive"
          preserveAspectRatio="xMidYMid slice"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
          style={{ width: '100%', aspectRatio: '2 / 1', display: 'block', touchAction: 'none', cursor: drag.current ? 'grabbing' : 'grab' }}>

          {/* Fond : carte officielle */}
          <image href="/images/akasha/op-world-bg.webp" x={0} y={0} width={W} height={H} preserveAspectRatio="none" />

          {/* Territoires Yonko */}
          {showYonko && OP_WORLD.yonko.map((y) => (
            <g key={y.id} style={{ pointerEvents: 'none' }}>
              {y.shapes.map((sh, i) => <path key={i} d={tShape(sh) + 'Z'} fill={y.color} fillOpacity={0.16} stroke={y.color} strokeOpacity={0.7} strokeWidth={4} strokeDasharray="14 10" />)}
              <text x={T(y.shapes[0][0][0], y.shapes[0][0][1])[0]} y={T(y.shapes[0][0][0], y.shapes[0][0][1])[1]} fontFamily="var(--fe)" fontStyle="italic" fontWeight="800" fontSize={40} fill={y.color} stroke="#06131F" strokeWidth={6} paintOrder="stroke">{y.yonko}</text>
            </g>
          ))}

          {/* Routes */}
          {OP_WORLD.routes.filter((r) => routes.has(r.id)).map((r) => (
            <g key={r.id} style={{ pointerEvents: 'none' }}>
              <path d={tShape(r.path)} fill="none" stroke={r.color} strokeOpacity={0.28} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
              <path className={r.id === 'straw-hat-crew' ? 'op-flow' : undefined} d={tShape(r.path)} fill="none" stroke={r.color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 12" />
            </g>
          ))}

          {/* POI */}
          {showPoi && OP_WORLD.poi.map((p) => {
            const [cx, cy] = T(p.x, p.y);
            return (
              <g key={p.id} style={{ cursor: 'pointer' }} onPointerEnter={() => setHover(p.id)} onPointerLeave={() => setHover(null)} onClick={() => setSel({ kind: 'poi', id: p.id })}>
                <path d={`M${cx},${cy - 11} L${cx + 9},${cy} L${cx},${cy + 11} L${cx - 9},${cy} Z`} fill="#F2C14E" stroke="#06131F" strokeWidth={2} />
                {hover === p.id && <text x={cx} y={cy - 16} textAnchor="middle" fontFamily="var(--fo)" fontWeight="700" fontSize={22} fill="#FDE9B0" stroke="#06131F" strokeWidth={5} paintOrder="stroke" style={{ pointerEvents: 'none' }}>{p.name}</text>}
              </g>
            );
          })}

          {/* Îles (hotspots cliquables) */}
          {OP_WORLD.islands.map((isl) => (
            <Island key={isl.id} isl={isl} on={hover === isl.id} sel={sel?.kind === 'island' && sel.id === isl.id}
              onHover={(v) => setHover(v ? isl.id : null)} onSel={() => { if (!drag.current?.moved) setSel({ kind: 'island', id: isl.id }); }} />
          ))}
        </svg>
      </div>

      {/* Fiche */}
      {selected && (
        <div style={{ marginTop: 10, border: '1px solid var(--bd)', borderRadius: 12, padding: '12px 14px', background: 'var(--su)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--fb)', fontSize: 20, color: 'var(--td)' }}>{selected.name}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--su2)', color: 'var(--td2)' }}>{selected.region}</span>
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
        <span>Fond & données : op-maps.com</span>
      </div>
    </div>
  );
}
