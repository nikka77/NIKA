'use client';
// components/akasha/hub/OnePieceMap.tsx — carte du monde One Piece : image officielle (op-maps) en fond
// + calques superposés (îles, POI, routes équipage/membres/navires, territoires Yonko). Lecture GAUCHE→DROITE.
// Transform data→image : X = coord.y, Y = 2048 − coord.x. Recherche, filtre mer/arc, plein écran, pinch,
// escales numérotées, rejeu du voyage, fiche enrichie (vignette + liens personnages).
import { useEffect, useMemo, useRef, useState } from 'react';
import { OP_WORLD, OPW_ROUTE_LABEL, type OpwIsland } from '@/lib/akasha/op-world-map';
import { useMapZoomPanSvg } from '@/lib/akasha/useMapZoomPanSvg';
import { useFullscreenToggle } from '@/lib/akasha/useFullscreenToggle';

const W = 4096, H = 2048;                 // fond op-world-bg.webp (4096×2048)
const T = (px: number, py: number): [number, number] => [py, H - px]; // data [x,y] → écran paysage
const tShape = (pts: [number, number][]) => pts.map(([x, y], i) => (i ? 'L' : 'M') + T(x, y).join(',')).join(' ');

// Route de l'équipage précalculée (rejeu #10 + escales #9).
const CREW = OP_WORLD.routes.find((r) => r.id === 'straw-hat-crew');
const CREW_PTS: [number, number][] = CREW ? CREW.path.map(([x, y]) => T(x, y)) : [];
const CREW_D = CREW_PTS.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
const CREW_LEN = CREW_PTS.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - CREW_PTS[i - 1][0], p[1] - CREW_PTS[i - 1][1]) : 0), 0);
const REGIONS = [...new Set(OP_WORLD.islands.map((i) => i.region))];
const ARCS = [...new Set(OP_WORLD.islands.flatMap((i) => i.arcs))].sort();
const registryHref = (name: string) => `/learn/akasha?universe=${encodeURIComponent('One Piece')}&search=${encodeURIComponent(name)}`;

function Island({ isl, on, sel, matched, onSel, onHover }: {
  isl: OpwIsland; on: boolean; sel: boolean; matched: boolean; onSel: () => void; onHover: (v: boolean) => void;
}) {
  const [cx, cy] = T(isl.x, isl.y);
  const hi = on || sel || matched;
  const stroke = sel ? '#F2C14E' : on ? '#FFFFFF' : matched ? '#3FBEFF' : 'none';
  return (
    <g style={{ cursor: 'pointer' }} className="ak-svg-focusable" tabIndex={0} role="button" aria-label={isl.name}
      onPointerEnter={() => onHover(true)} onPointerLeave={() => onHover(false)} onFocus={() => onHover(true)} onBlur={() => onHover(false)}
      onClick={onSel} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSel(); } }}>
      {isl.shape && isl.shape.length > 2
        ? <path d={tShape(isl.shape) + 'Z'} fill={matched ? '#3FBEFF' : '#FFE082'} fillOpacity={sel ? 0.34 : on ? 0.24 : matched ? 0.2 : 0}
            stroke={stroke} strokeWidth={sel ? 7 : hi ? 5 : 0} pointerEvents="all" />
        : <circle cx={cx} cy={cy} r={16} fill={matched ? '#3FBEFF' : '#FFE082'} fillOpacity={sel ? 0.34 : hi ? 0.24 : 0}
            stroke={stroke} strokeWidth={hi ? 4 : 0} pointerEvents="all" />}
      {hi && (
        <text x={cx} y={cy - (isl.area >= 20000 ? 34 : 20)} textAnchor="middle" fontFamily="var(--fo)" fontWeight="700"
          fontSize={26} fill="#FFFFFF" stroke="#06131F" strokeWidth={6} paintOrder="stroke" style={{ pointerEvents: 'none' }}>{isl.name}</text>
      )}
    </g>
  );
}

export default function OnePieceMap({ color = '#D63C3C' , yonkoCounts }: { color?: string ; yonkoCounts?: Record<string, number> }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const { view, setView, svgRef, clamp, zoomAround, reset, dragRef, onPointerDown, onPointerMove, onPointerUp } = useMapZoomPanSvg({ w: W, h: H, minW: 520 });
  const [hover, setHover] = useState<string | null>(null);
  const [sel, setSel] = useState<{ kind: 'island' | 'poi'; id: string } | null>(null);
  const [routes, setRoutes] = useState<Set<string>>(new Set(['straw-hat-crew']));
  const [showPoi, setShowPoi] = useState(false);
  const [yonko, setYonko] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<{ kind: 'region' | 'arc'; value: string } | null>(null);
  const [showStops, setShowStops] = useState(false);
  const [replay, setReplay] = useState(false);
  const [replayNonce, setReplayNonce] = useState(0);

  const motionRef = useRef<SVGAnimateMotionElement>(null);
  const drawRef = useRef<SVGAnimateElement>(null);

  const selected = useMemo(() => {
    if (!sel) return null;
    return sel.kind === 'island'
      ? OP_WORLD.islands.find((i) => i.id === sel.id) || null
      : OP_WORLD.poi.find((p) => p.id === sel.id) || null;
  }, [sel]);

  const matchedIds = useMemo(() => {
    if (!filter) return null;
    const s = new Set<string>();
    for (const i of OP_WORLD.islands) {
      if (filter.kind === 'region' ? i.region === filter.value : i.arcs.includes(filter.value)) s.add(i.id);
    }
    return s;
  }, [filter]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const hit = (n: string) => n.toLowerCase().includes(q);
    return [
      ...OP_WORLD.islands.filter((i) => hit(i.name)).map((i) => ({ kind: 'island' as const, id: i.id, name: i.name, x: i.x, y: i.y, region: i.region })),
      ...OP_WORLD.poi.filter((p) => hit(p.name)).map((p) => ({ kind: 'poi' as const, id: p.id, name: p.name, x: p.x, y: p.y, region: p.region })),
    ].slice(0, 8);
  }, [query]);

  // Rejeu du voyage (#10).
  useEffect(() => {
    if (!replay) return;
    const id = requestAnimationFrame(() => { motionRef.current?.beginElement?.(); drawRef.current?.beginElement?.(); });
    return () => cancelAnimationFrame(id);
  }, [replay, replayNonce]);

  const focusOn = (x: number, y: number) => {
    const [cx, cy] = T(x, y);
    const w = 1100, h = w / 2;
    setView(clamp({ x: cx - w / 2, y: cy - h / 2, w, h }));
  };

  const toggleRoute = (id: string) => setRoutes((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleYonko = (id: string) => setYonko((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleFullscreen = useFullscreenToggle(boxRef);
  const startReplay = () => { setRoutes((s) => new Set(s).add('straw-hat-crew')); setReplay(true); setReplayNonce((n) => n + 1); };

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
        East Blue (droite) → Grand Line → Nouveau Monde (gauche). Glisse pour explorer, Ctrl/⌘+molette ou pincer pour zoomer, clique une île pour sa fiche.
      </p>

      {/* Recherche (#1) + filtre mer/arc (#5) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔎 Rechercher une île, un lieu…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 10, border: '1px solid var(--bd)', background: 'var(--bg2)', color: 'var(--td)', fontFamily: 'var(--fo)', fontSize: 13 }} />
          {searchResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: 4, background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
              {searchResults.map((r) => (
                <button key={r.kind + r.id} onClick={() => { focusOn(r.x, r.y); setSel({ kind: r.kind, id: r.id }); setQuery(''); }}
                  style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 8, padding: '8px 12px', border: 'none', borderBottom: '1px solid var(--bd)', background: 'transparent', color: 'var(--td)', cursor: 'pointer', fontFamily: 'var(--fo)', fontSize: 12.5, textAlign: 'left' }}>
                  <span>{r.kind === 'poi' ? '◆ ' : ''}{r.name}</span><span style={{ color: 'var(--td3)', fontSize: 10.5 }}>{r.region}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <select value={filter?.kind === 'region' ? filter.value : ''} onChange={(e) => setFilter(e.target.value ? { kind: 'region', value: e.target.value } : null)}
          style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--bd)', background: 'var(--bg2)', color: 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 12 }}>
          <option value="">🌊 Toutes les mers</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filter?.kind === 'arc' ? filter.value : ''} onChange={(e) => setFilter(e.target.value ? { kind: 'arc', value: e.target.value } : null)}
          style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--bd)', background: 'var(--bg2)', color: 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 12, maxWidth: 200 }}>
          <option value="">📖 Tous les arcs</option>
          {ARCS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        {filter && chip(true, () => setFilter(null), `✕ ${matchedIds?.size ?? 0} îles`, '#3FBEFF')}
      </div>

      {/* Calques */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, alignItems: 'center' }}>
        {chip(showPoi, () => setShowPoi((v) => !v), 'POI', '#F2C14E')}
        {chip(showStops, () => setShowStops((v) => !v), 'Escales n°', '#3FBE7A')}
        {chip(replay, startReplay, '▶ Rejouer le voyage', color)}
        <span style={{ width: 1, height: 18, background: 'var(--bd)', margin: '0 2px' }} />
        {OP_WORLD.routes.map((r) => chip(routes.has(r.id), () => toggleRoute(r.id), OPW_ROUTE_LABEL[r.id] || r.character, r.color, r.id))}
        {chip(false, () => setRoutes(new Set()), 'Effacer')}
      </div>
      {/* Territoires Yonko (#3) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--td3)' }}>Territoires&nbsp;:</span>
        {OP_WORLD.yonko.map((y) => chip(yonko.has(y.id), () => toggleYonko(y.id), yonkoCounts?.[y.yonko] ? `${y.yonko} · ${yonkoCounts[y.yonko]}` : y.yonko, y.color, y.id))}
        {chip(yonko.size === OP_WORLD.yonko.length, () => setYonko(yonko.size === OP_WORLD.yonko.length ? new Set() : new Set(OP_WORLD.yonko.map((y) => y.id))), 'Tous')}
      </div>

      <div ref={boxRef} style={{ position: 'relative', borderRadius: 16, border: '1px solid var(--bd)', background: '#0A2036', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 5, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {([['+', 0.7], ['−', 1.43]] as const).map(([t, f]) => (
            <button key={t} onClick={() => zoomAround(f)} aria-label={t === '+' ? 'Zoom avant' : 'Zoom arrière'}
              style={{ width: 44, height: 44, borderRadius: 8, border: '1px solid var(--bd)', background: 'rgba(10,20,32,0.85)', color: '#EAF2F8', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t}</button>
          ))}
          <button onClick={reset} aria-label="Recentrer" style={{ width: 44, height: 44, borderRadius: 8, border: '1px solid var(--bd)', background: 'rgba(10,20,32,0.85)', color: '#EAF2F8', fontSize: 13, cursor: 'pointer' }}>⤢</button>
          <button onClick={toggleFullscreen} aria-label="Plein écran" style={{ width: 44, height: 44, borderRadius: 8, border: '1px solid var(--bd)', background: 'rgba(10,20,32,0.85)', color: '#EAF2F8', fontSize: 13, cursor: 'pointer' }}>⛶</button>
        </div>

        <svg ref={svgRef} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} role="application"
          aria-label="Carte du monde One Piece interactive — îles et points d'intérêt navigables au clavier" preserveAspectRatio="xMidYMid slice"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onPointerLeave={onPointerUp}
          style={{ width: '100%', aspectRatio: '2 / 1', display: 'block', touchAction: 'pan-y', cursor: dragRef.current ? 'grabbing' : 'grab' }}>

          <image href="/images/akasha/op-world-bg.webp" x={0} y={0} width={W} height={H} preserveAspectRatio="none" />

          {/* Territoires Yonko */}
          {OP_WORLD.yonko.filter((y) => yonko.has(y.id)).map((y) => {
            const all = y.shapes.flat();
            const [lx, ly] = T(all.reduce((s, p) => s + p[0], 0) / all.length, all.reduce((s, p) => s + p[1], 0) / all.length);
            return (
              <g key={y.id} style={{ pointerEvents: 'none' }}>
                {y.shapes.map((sh, i) => <path key={i} d={tShape(sh) + 'Z'} fill={y.color} fillOpacity={0.16} stroke={y.color} strokeOpacity={0.7} strokeWidth={4} strokeDasharray="14 10" />)}
                <text x={lx} y={ly} textAnchor="middle" fontFamily="var(--fe)" fontStyle="italic" fontWeight="800" fontSize={40} fill={y.color} stroke="#06131F" strokeWidth={6} paintOrder="stroke">{y.yonko}</text>
              </g>
            );
          })}

          {/* Routes */}
          {OP_WORLD.routes.filter((r) => routes.has(r.id)).map((r) => (
            <g key={r.id} style={{ pointerEvents: 'none' }}>
              <path d={tShape(r.path)} fill="none" stroke={r.color} strokeOpacity={0.28} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
              <path className={r.id === 'straw-hat-crew' && !replay ? 'op-flow' : undefined} d={tShape(r.path)} fill="none" stroke={r.color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 12" />
            </g>
          ))}

          {/* Îles (hotspots) */}
          {OP_WORLD.islands.map((isl) => (
            <Island key={isl.id} isl={isl} on={hover === isl.id} sel={sel?.kind === 'island' && sel.id === isl.id} matched={!!matchedIds?.has(isl.id)}
              onHover={(v) => setHover(v ? isl.id : null)} onSel={() => { if (!dragRef.current?.moved) setSel({ kind: 'island', id: isl.id }); }} />
          ))}

          {/* POI (au-dessus → cliquables) */}
          {showPoi && OP_WORLD.poi.map((p) => {
            const [cx, cy] = T(p.x, p.y);
            return (
              <g key={p.id} style={{ cursor: 'pointer' }} className="ak-svg-focusable" tabIndex={0} role="button" aria-label={p.name}
                onPointerEnter={() => setHover(p.id)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(p.id)} onBlur={() => setHover(null)}
                onClick={() => { if (!dragRef.current?.moved) setSel({ kind: 'poi', id: p.id }); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel({ kind: 'poi', id: p.id }); } }}>
                <path d={`M${cx},${cy - 11} L${cx + 9},${cy} L${cx},${cy + 11} L${cx - 9},${cy} Z`} fill="#F2C14E" stroke="#06131F" strokeWidth={2} />
                {hover === p.id && <text x={cx} y={cy - 16} textAnchor="middle" fontFamily="var(--fo)" fontWeight="700" fontSize={22} fill="#FDE9B0" stroke="#06131F" strokeWidth={5} paintOrder="stroke" style={{ pointerEvents: 'none' }}>{p.name}</text>}
              </g>
            );
          })}

          {/* Escales numérotées (#9) */}
          {showStops && CREW_PTS.map((p, i) => (
            <g key={i} style={{ pointerEvents: 'none' }}>
              <circle cx={p[0]} cy={p[1]} r={16} fill={color} stroke="#06131F" strokeWidth={2.5} />
              <text x={p[0]} y={p[1] + 6} textAnchor="middle" fontFamily="var(--fo)" fontWeight="800" fontSize={19} fill="#FFFFFF">{i + 1}</text>
            </g>
          ))}

          {/* Rejeu du voyage (#10) */}
          {replay && (
            <g style={{ pointerEvents: 'none' }}>
              <path d={CREW_D} fill="none" stroke="#F2C14E" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={CREW_LEN} strokeDashoffset={CREW_LEN}>
                <animate ref={drawRef} attributeName="stroke-dashoffset" from={CREW_LEN} to={0} dur="16s" begin="indefinite" fill="freeze" />
              </path>
              <g transform={CREW_PTS.length ? `translate(${CREW_PTS[0][0]},${CREW_PTS[0][1]})` : undefined}>
                <circle r={22} fill="#0A1420" stroke="#F2C14E" strokeWidth={3} />
                <text textAnchor="middle" y={9} fontSize={28}>⛵</text>
                <animateMotion ref={motionRef} dur="16s" begin="indefinite" fill="freeze" rotate="0" path={CREW_D} />
              </g>
            </g>
          )}
        </svg>

        {/* Légende (#3) */}
        <div style={{ position: 'absolute', left: 10, bottom: 10, zIndex: 5, display: 'flex', gap: 12, flexWrap: 'wrap', padding: '6px 10px', borderRadius: 10, background: 'rgba(10,20,32,0.78)', border: '1px solid var(--bd)', fontFamily: 'var(--fo)', fontSize: 10.5, color: '#DCE8F2' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 16, height: 3, background: '#F2C14E' }} /> Route</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ color: '#F2C14E' }}>◆</span> POI</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 11, height: 11, border: '2px dashed #E056C1', borderRadius: 3 }} /> Territoire Yonko</span>
        </div>
      </div>

      {/* Fiche (#8 vignette + #7 liens) */}
      {selected && (
        <div style={{ marginTop: 10, border: '1px solid var(--bd)', borderRadius: 12, padding: '12px 14px', background: 'var(--su)' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {selected.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.image} alt={selected.name} width={90} height={90} loading="lazy"
                style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--bd)', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
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
                    {selected.visitedBy.slice(0, 14).map((v) => (
                      <a key={v} href={registryHref(v)} style={{ fontFamily: 'var(--fo)', fontSize: 10.5, padding: '2px 7px', borderRadius: 999, border: '1px solid var(--bd)', color: 'var(--td2)', textDecoration: 'none' }}>{v}</a>
                    ))}
                  </div>
                </div>
              )}
              {selected.entitySlug && (
                <a href={`/learn/akasha/${selected.entitySlug}`} style={{ display: 'inline-block', marginTop: 10, fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color, textDecoration: 'none' }}>Voir la fiche complète →</a>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8, fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>
        <span>🖱️ Glisser = déplacer · Ctrl/⌘ + molette / pincer = zoom · ⛶ plein écran</span>
        <span>Fond &amp; données : op-maps.com</span>
      </div>
    </div>
  );
}
