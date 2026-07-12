'use client';
// components/akasha/hub/DragonBallCosmos.tsx — CARTE DU MULTIVERS Dragon Ball (fusion galaxies ↔ planètes).
// Vue « Multivers » : 12 galaxies illustrées flottant dans le cosmos (Zeno au centre). Clic sur une
// galaxie → on plonge dedans : ses planètes s'organisent en spirale (en gros), avec un panneau détaillant
// sa hiérarchie divine et ses personnages importants. Vue « Hiérarchie » : la chaîne divine globale.
import { useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { DB_UNIVERSES, DB_TOP_META, DB_GALLERY, DB_HIERARCHY, DB_PLANETS, DB_PLANET_CHARS, type CosmosUniverse, type CosmosGalleryItem } from '@/lib/akasha/db-cosmos';
import { useFullscreenToggle } from '@/lib/akasha/useFullscreenToggle';

const RARITY_COLOR: Record<string, string> = { legendary: '#F2C14E', epic: '#C77DFF', rare: '#4EA8DE' };
// Région d'une planète → numéro d'univers (royaumes hors-numéro rattachés à l'Univers 7).
const regionUniv = (region: string): number => { const m = region.match(/Univers (\d+)/); return m ? Number(m[1]) : 7; };
const planetsOf = (num: number) => DB_GALLERY.filter((g) => regionUniv(g.region) === num);

// Position des 12 galaxies dans le cadre (x%, y%). Jumeaux (somme = 13) reliés par une ligne.
const GALAXY_POS: Record<number, [number, number]> = {
  1: [15, 21], 2: [37, 14], 3: [63, 14], 4: [85, 21], 5: [90, 45], 6: [64, 41],
  7: [37, 45], 8: [15, 45], 9: [15, 74], 10: [37, 83], 11: [64, 83], 12: [86, 74],
};

// Positions en spirale (phyllotaxie) pour n planètes dans le cadre — effet « galaxie de mondes ».
function spiral(i: number, n: number): [number, number] {
  if (n <= 1) return [50, 50];
  const gold = 2.399963229728653; // angle d'or (rad)
  const frac = (i + 0.5) / n;
  const rad = Math.sqrt(frac) * 45;
  const a = i * gold;
  return [50 + rad * Math.cos(a) * 0.86, 50 + rad * Math.sin(a)];
}

// Étoiles déterministes (seed fixe) → aucun mismatch d'hydratation.
function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const STARS = (() => {
  const rnd = mulberry32(0x5A17);
  return Array.from({ length: 130 }, () => ({ x: rnd() * 100, y: rnd() * 100, s: 0.4 + rnd() * 1.5, o: 0.25 + rnd() * 0.6, d: (rnd() * 6).toFixed(2) }));
})();

export default function DragonBallCosmos({ color = '#E8613C' }: { color?: string }) {
  const [view, setView] = useState<'multivers' | 'hierarchie'>('multivers');
  const [enteredU, setEnteredU] = useState<CosmosUniverse | null>(null);
  const [sel, setSel] = useState<CosmosGalleryItem | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const boxRef = useRef<HTMLDivElement>(null);
  const ptrs = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gest = useRef<{ moved: boolean; startDist: number; startZoom: number } | null>(null);
  const panStart = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  // ── Zoom / pan ──
  const clampPan = useCallback((p: { x: number; y: number }, z: number) => {
    const el = boxRef.current; if (!el) return p;
    const mx = (el.clientWidth * (z - 1)) / 2, my = (el.clientHeight * (z - 1)) / 2;
    return { x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(-my, Math.min(my, p.y)) };
  }, []);
  const applyZoom = useCallback((z: number) => { const nz = Math.max(1, Math.min(4, z)); setZoom(nz); setPan((p) => clampPan(nz === 1 ? { x: 0, y: 0 } : p, nz)); }, [clampPan]);
  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const onWheel = (e: React.WheelEvent) => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); applyZoom(zoom * (e.deltaY < 0 ? 1.12 : 0.89)); };
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const arr = [...ptrs.current.values()];
    gest.current = { moved: false, startDist: arr.length === 2 ? Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y) : 0, startZoom: zoom };
    if (zoom > 1 && ptrs.current.size <= 1) panStart.current = { px: e.clientX, py: e.clientY, ox: pan.x, oy: pan.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!ptrs.current.has(e.pointerId) || !gest.current) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const arr = [...ptrs.current.values()];
    if (arr.length === 2 && gest.current.startDist) {
      applyZoom(gest.current.startZoom * (Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y) / gest.current.startDist));
      gest.current.moved = true;
    } else if (panStart.current && arr.length === 1 && zoom > 1) {
      setPan(clampPan({ x: panStart.current.ox + (e.clientX - panStart.current.px), y: panStart.current.oy + (e.clientY - panStart.current.py) }, zoom));
      gest.current.moved = true;
    }
  };
  const onPointerUp = (e: React.PointerEvent) => { ptrs.current.delete(e.pointerId); if (ptrs.current.size === 0) panStart.current = null; };
  const toggleFs = useFullscreenToggle(boxRef);

  const enterU = (u: CosmosUniverse) => { if (gest.current?.moved) return; setEnteredU(u); setSel(null); reset(); };
  const exitU = () => { setEnteredU(null); setSel(null); reset(); };

  const twinLinks = useMemo(() => {
    const seen = new Set<number>(); const out: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let n = 1; n <= 12; n++) { const t = 13 - n; if (seen.has(n)) continue; seen.add(n); seen.add(t); const a = GALAXY_POS[n], b = GALAXY_POS[t]; out.push({ x1: a[0] * 1.6, y1: a[1], x2: b[0] * 1.6, y2: b[1] }); }
    return out;
  }, []);

  const uPlanets = enteredU ? planetsOf(enteredU.num) : [];
  const pR = enteredU ? Math.max(3.1, Math.min(7, 26 / Math.sqrt(Math.max(1, uPlanets.length)))) : 0;
  const rc = enteredU ? (RARITY_COLOR[enteredU.rarity] || '#8FA3B0') : color;
  const selRich = sel ? DB_PLANETS.find((p) => p.slug === sel.slug) : undefined;

  return (
    <div style={{ marginTop: '1.8rem' }}>
      <style>{`@keyframes ak-twinkle{0%,100%{opacity:.25}50%{opacity:1}}@keyframes ak-float{0%,100%{transform:translate(-50%,-50%)}50%{transform:translate(-50%,calc(-50% - 5px))}}@keyframes ak-floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes ak-spin{to{transform:translate(-50%,-50%) rotate(360deg)}}@media (prefers-reduced-motion: reduce){.ak-star,.ak-orb,.ak-galbg{animation:none!important}}.db-cosmos-box:fullscreen{width:100vw;height:100vh;aspect-ratio:auto;border-radius:0}.db-cosmos-box:fullscreen .db-cosmos-world{height:100%}.ak-plabel{opacity:0;transition:opacity .15s}.ak-orb:hover .ak-plabel,.ak-plabel.on{opacity:1}.ak-orb:hover{z-index:6!important}`}</style>

      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, marginBottom: 4 }}>
        🪐 Carte du multivers — 12 univers · {DB_GALLERY.length} mondes
      </div>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td3)', margin: '0 0 12px', maxWidth: 660 }}>
        {view === 'hierarchie'
          ? 'La chaîne divine qui régit les douze univers, de Zeno aux Kaïō.'
          : enteredU
          ? `Univers ${enteredU.num} — ses ${uPlanets.length} monde${uPlanets.length > 1 ? 's' : ''}. Clique une planète pour sa fiche, ou reviens au multivers.`
          : 'Les douze univers gouvernés par Zeno. Plonge dans une galaxie pour explorer ses planètes, sa hiérarchie divine et ses figures majeures.'}
      </p>

      {/* Bascule */}
      <div style={{ display: 'inline-flex', gap: 4, padding: 3, borderRadius: 999, border: '1px solid var(--bd)', background: 'var(--bg2)', marginBottom: 12 }}>
        {(['multivers', 'hierarchie'] as const).map((v) => {
          const active = view === v;
          return (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '5px 14px', borderRadius: 999, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
              fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 800, letterSpacing: '0.03em',
              background: active ? color : 'transparent', color: active ? '#0A1420' : 'var(--td2)',
            }}>{v === 'multivers' ? '🌌 Multivers' : '👑 Hiérarchie'}</button>
          );
        })}
      </div>

      {view === 'multivers' && (
        <>
          <div ref={boxRef} className="db-cosmos-box" onWheel={onWheel}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
            style={{
              position: 'relative', width: '100%', aspectRatio: '16 / 10', borderRadius: 18, overflow: 'hidden',
              border: '1px solid var(--bd)', background: 'radial-gradient(ellipse 80% 70% at 28% 18%, #241640 0%, #0d0820 46%, #050308 100%)',
              boxShadow: 'inset 0 0 120px rgba(0,0,0,0.7)', touchAction: 'none', cursor: zoom > 1 ? 'grab' : 'default',
            }}>
            <div className="db-cosmos-world" style={{ position: 'absolute', inset: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '50% 50%', transition: gest.current?.moved ? 'none' : 'transform 0.18s ease-out' }}>
              {/* Nébuleuses + étoiles */}
              <div aria-hidden style={{ position: 'absolute', width: '55%', height: '55%', left: '-8%', top: '30%', background: 'radial-gradient(circle, rgba(232,97,60,0.14), transparent 68%)', filter: 'blur(10px)' }} />
              <div aria-hidden style={{ position: 'absolute', width: '48%', height: '48%', right: '2%', top: '-6%', background: 'radial-gradient(circle, rgba(120,90,220,0.14), transparent 68%)', filter: 'blur(10px)' }} />
              {STARS.map((st, i) => (
                <span key={i} className="ak-star" aria-hidden style={{ position: 'absolute', left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, borderRadius: 999, background: '#fff', opacity: st.o, animation: `ak-twinkle ${2.5 + (i % 5)}s ease-in-out ${st.d}s infinite` }} />
              ))}

              {!enteredU ? (
                <>
                  {/* Liens jumeaux + galaxies */}
                  <svg aria-hidden viewBox="0 0 160 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    {twinLinks.map((l, i) => <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#C79BF0" strokeWidth={0.22} strokeDasharray="1.2 1.8" opacity={0.22} />)}
                  </svg>
                  {/* Palais de Zeno au centre */}
                  <Link href="/learn/akasha/templo-movil-del-rey-de-todo" title="Palais de Zeno — Roi de tout" style={{ position: 'absolute', left: '50%', top: '62%', transform: 'translate(-50%,-50%)', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, zIndex: 3 }}>
                    <span style={{ fontSize: 22, filter: 'drop-shadow(0 0 8px #F4D03F)' }}>👑</span>
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 'clamp(8px,1vw,10px)', fontWeight: 700, color: '#F4D03F', textShadow: '0 1px 4px #000', whiteSpace: 'nowrap' }}>Palais de Zeno</span>
                  </Link>
                  {DB_UNIVERSES.map((u, i) => {
                    const [x, y] = GALAXY_POS[u.num]; const urc = RARITY_COLOR[u.rarity] || '#8FA3B0';
                    const nP = planetsOf(u.num).length;
                    const numBadge = <span aria-hidden style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(13px,2.3vw,21px)', color: '#fff', textShadow: '0 1px 5px #000, 0 0 10px #000' }}>{u.num}</span>;
                    return (
                      <div key={u.slug} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: '13%', transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: Math.round(100 - y) }}>
                        <div className="ak-orb" style={{ position: 'relative', width: '100%', aspectRatio: '1/1', animation: `ak-floaty ${6 + (i % 4)}s ease-in-out ${(i * 0.6).toFixed(1)}s infinite` }}>
                          <span aria-hidden style={{ position: 'absolute', inset: '-26%', borderRadius: '50%', background: `radial-gradient(circle, ${urc}40, transparent 66%)`, filter: 'blur(5px)', pointerEvents: 'none' }} />
                          {nP > 0 ? (
                            <button onClick={() => enterU(u)} title={`Univers ${u.num} — ${nP} monde${nP > 1 ? 's' : ''}`} aria-label={`Explorer l'Univers ${u.num}`} style={{ position: 'absolute', inset: 0, border: 'none', padding: 0, cursor: 'pointer', background: 'transparent' }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={u.img} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', boxShadow: `0 0 14px ${urc}88, 0 4px 14px rgba(0,0,0,0.6)` }} />
                              {numBadge}
                            </button>
                          ) : (
                            <span title={`Univers ${u.num} — aucune planète cartographiée`} style={{ position: 'absolute', inset: 0, opacity: 0.52, cursor: 'default' }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={u.img} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', boxShadow: `0 0 10px ${urc}44` }} />
                              {numBadge}
                            </span>
                          )}
                        </div>
                        <span style={{ marginTop: 2, whiteSpace: 'nowrap', fontFamily: 'var(--fo)', fontSize: 'clamp(8px,1.05vw,10.5px)', fontWeight: 700, color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 4px #000' }}>{u.name || `Univers ${u.num}`}</span>
                        <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                          {u.godSlug && u.godImg && (
                            <Link href={`/learn/akasha/${u.godSlug}`} title={`💥 ${u.god} — Dieu de la Destruction`} style={{ display: 'block', width: 20, height: 20, borderRadius: '50%', overflow: 'hidden', border: `1.5px solid ${urc}`, boxShadow: `0 0 6px ${urc}88` }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={u.godImg} alt={u.god} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                            </Link>
                          )}
                          {u.angelSlug && u.angelImg && (
                            <Link href={`/learn/akasha/${u.angelSlug}`} title={`😇 ${u.angel} — Ange`} style={{ display: 'block', width: 20, height: 20, borderRadius: '50%', overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.55)' }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={u.angelImg} alt={u.angel} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <>
                  {/* Galaxie en fond + planètes en spirale */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="ak-galbg" aria-hidden src={enteredU.img} alt="" style={{ position: 'absolute', left: '50%', top: '50%', width: '78%', height: 'auto', transform: 'translate(-50%,-50%)', opacity: 0.16, filter: 'blur(1px)', borderRadius: '50%', animation: 'ak-spin 140s linear infinite', pointerEvents: 'none' }} />
                  {uPlanets.map((g, i) => {
                    const [x, y] = spiral(i, uPlanets.length); const isSel = sel?.slug === g.slug;
                    return (
                      <button key={g.slug} onClick={() => { if (gest.current?.moved) return; setSel(isSel ? null : g); }} aria-label={g.name} className="ak-orb"
                        style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: `${pR * 2}%`, aspectRatio: '1/1', transform: 'translate(-50%,-50%)', border: 'none', padding: 0, cursor: 'pointer', background: 'transparent', zIndex: isSel ? 5 : 2, animation: `ak-float ${6 + (i % 4)}s ease-in-out ${(i * 0.3).toFixed(1)}s infinite` }}>
                        <span aria-hidden style={{ position: 'absolute', inset: '-30%', borderRadius: '50%', background: `radial-gradient(circle, ${rc}${isSel ? '66' : '33'}, transparent 64%)`, filter: 'blur(4px)', pointerEvents: 'none' }} />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.img} alt={g.name} loading="lazy" style={{ position: 'relative', width: '100%', height: '100%', objectFit: g.slug === 'beerus-planet' ? 'contain' : 'cover', borderRadius: g.slug === 'beerus-planet' ? 0 : '50%', boxShadow: g.slug === 'beerus-planet' ? 'none' : `0 0 ${isSel ? 16 : 9}px ${rc}${isSel ? 'CC' : '77'}, 0 3px 10px rgba(0,0,0,0.6)`, filter: g.slug === 'beerus-planet' ? `drop-shadow(0 0 9px ${rc}99)` : 'none' }} />
                        <span className={`ak-plabel${isSel ? ' on' : ''}`} style={{ position: 'absolute', left: '50%', top: 'calc(100% + 1px)', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontFamily: 'var(--fo)', fontSize: 'clamp(8px,1vw,11px)', fontWeight: 700, color: isSel ? rc : '#fff', background: 'rgba(8,6,18,0.7)', borderRadius: 5, padding: '0 4px', textShadow: '0 1px 4px #000', pointerEvents: 'none' }}>{g.name}</span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>

          </div>

          {/* Barre d'outils SOUS la carte (pas en overlay) — aucun risque de recouvrir une planète/galaxie */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {enteredU && (
              <button onClick={exitU} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 14px', borderRadius: 999, cursor: 'pointer', border: '1px solid var(--bd)', background: 'var(--bg2)', color: 'var(--td)', fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700 }}>← Multivers</button>
            )}
            <div style={{ display: 'flex', gap: 6, marginLeft: enteredU ? 'auto' : 0 }}>
              {[
                { k: 'fs', t: '⛶', label: 'Plein écran', f: toggleFs },
                { k: '+', t: '＋', label: 'Zoom avant', f: () => applyZoom(zoom * 1.3) },
                { k: '-', t: '－', label: 'Zoom arrière', f: () => applyZoom(zoom / 1.3) },
                { k: 'r', t: '⟲', label: 'Réinitialiser le zoom', f: reset },
              ].map((b) => (
                <button key={b.k} onClick={b.f} aria-label={b.label} title={b.label} style={{ width: 44, height: 44, borderRadius: 10, cursor: 'pointer', border: '1px solid var(--bd)', background: 'var(--bg2)', color: 'var(--td)', fontSize: 16, fontWeight: 700 }}>{b.t}</button>
              ))}
            </div>
            {zoom > 1 && <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: 'var(--td3)' }}>×{zoom.toFixed(1)}</span>}
          </div>

          {/* Panneau détail de la galaxie explorée : hiérarchie + [fiche planète] + personnages */}
          {enteredU && (() => {
            const top = DB_TOP_META[enteredU.top];
            const trioChip = { display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', padding: '4px 11px', borderRadius: 999, border: `1px solid ${rc}44`, background: `${rc}12`, fontFamily: 'var(--fo)', fontSize: 11.5 } as const;
            const trio = [
              { role: 'Dieu de la Destruction', icon: '💥', name: enteredU.god, slug: enteredU.godSlug },
              { role: 'Ange', icon: '😇', name: enteredU.angel, slug: enteredU.angelSlug },
              { role: 'Kaïō Shin', icon: '🔮', name: enteredU.kai, slug: enteredU.kaiSlug },
            ];
            const pchars = sel ? DB_PLANET_CHARS[sel.slug] : undefined;
            const charsList = pchars && pchars.length ? pchars : enteredU.chars;
            const charsLabel = pchars && pchars.length && sel ? `Sur ${sel.name}` : 'Personnages importants';
            return (
              <div className={`ak-r-${enteredU.rarity}`} style={{ marginTop: 12, borderRadius: 16, border: `1px solid ${rc}55`, background: `radial-gradient(120% 80% at 0% 0%, ${rc}12, var(--bg2) 55%)`, padding: 16 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 13, flexWrap: 'wrap' }}>
                  <span style={{ width: 66, height: 66, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `2px solid ${rc}88`, boxShadow: `0 0 18px ${rc}55` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={enteredU.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </span>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 26, color: rc, lineHeight: 0.9 }}>Univers {enteredU.num}</span>
                      {enteredU.name && <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)' }}>{enteredU.name}</span>}
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: top.color, background: `${top.color}1F`, border: `1px solid ${top.color}55`, borderRadius: 20, padding: '1px 8px' }}>{top.label}</span>
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: 'var(--td3)' }}>↔ Jumeau {enteredU.twin}</span>
                      <Link href={`/learn/akasha/${enteredU.slug}`} style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, color: rc, textDecoration: 'none' }}>fiche →</Link>
                    </div>
                    <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', margin: '5px 0 0', lineHeight: 1.5 }}>{enteredU.desc}</p>
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 7 }}>Hiérarchie divine</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {trio.map((t) => t.slug
                    ? <Link key={t.role} href={`/learn/akasha/${t.slug}`} style={trioChip}>{t.icon} <b style={{ fontWeight: 800, color: 'var(--td)' }}>{t.name}</b> <span style={{ opacity: 0.6, fontSize: 9.5, color: 'var(--td3)' }}>{t.role}</span></Link>
                    : <span key={t.role} style={{ ...trioChip, color: 'var(--td3)' }}>{t.icon} <b style={{ fontWeight: 800 }}>{t.name}</b> <span style={{ opacity: 0.6, fontSize: 9.5 }}>{t.role}</span></span>
                  )}
                </div>

                {/* Fiche de la planète sélectionnée (entre hiérarchie et personnages) */}
                {sel && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, margin: '14px 0', padding: 11, borderRadius: 12, border: `1px solid ${rc}55`, background: 'var(--su)' }}>
                    <div style={{ width: 62, height: 62, flexShrink: 0, borderRadius: sel.slug === 'beerus-planet' ? 9 : '50%', overflow: 'hidden', background: 'radial-gradient(circle, #1a1030, #0a0612)', boxShadow: `0 0 14px ${rc}66` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sel.img} alt={sel.name} style={{ width: '100%', height: '100%', objectFit: sel.slug === 'beerus-planet' ? 'contain' : 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 17, color: 'var(--td)', lineHeight: 1 }}>{sel.name}</span>
                        <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: rc }}>Planète</span>
                        {selRich && <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, color: 'var(--td3)', background: 'var(--su2)', borderRadius: 20, padding: '1px 8px' }}>{selRich.status.startsWith('Détruite') ? '💥' : '🌍'} {selRich.status}</span>}
                        {selRich?.gravity && <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, color: 'var(--td3)', background: 'var(--su2)', borderRadius: 20, padding: '1px 8px' }}>🏋 {selRich.gravity}</span>}
                      </div>
                      {selRich && <p style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', margin: 0, lineHeight: 1.45 }}>{selRich.note}</p>}
                      <Link href={`/learn/akasha/${sel.slug}`} style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 800, color: rc, textDecoration: 'none', marginTop: 1 }}>Voir la fiche complète →</Link>
                    </div>
                    <button onClick={() => setSel(null)} aria-label="Fermer" style={{ flexShrink: 0, border: 'none', background: 'transparent', color: 'var(--td3)', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>✕</button>
                  </div>
                )}

                {charsList.length > 0 && (
                  <div style={{ marginTop: sel ? 0 : 16 }}>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color, marginBottom: 8 }}>👥 {charsLabel} — {charsList.length}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {charsList.map((m) => (
                        <Link key={m.slug} href={`/learn/akasha/${m.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', padding: '3px 11px 3px 3px', borderRadius: 999, border: `1px solid ${rc}44`, background: `${rc}12` }}>
                          <span style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)', border: `1px solid ${rc}66` }}>
                            {m.img && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.img} alt={m.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                            )}
                          </span>
                          <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, color: 'var(--td)' }}>{m.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}

      {view === 'hierarchie' && (
        <div>
          <div style={{ position: 'relative', paddingLeft: 6 }}>
            <div aria-hidden style={{ position: 'absolute', left: 10, top: 6, bottom: 20, width: 2, background: 'linear-gradient(180deg, #F4D03F, #C77DFF 45%, #5FD08A)', opacity: 0.4, borderRadius: 2 }} />
            {DB_HIERARCHY.map((tier) => (
              <div key={tier.label} style={{ position: 'relative', marginBottom: 16, paddingLeft: 20 }}>
                <span aria-hidden style={{ position: 'absolute', left: 4, top: 3, width: 13, height: 13, borderRadius: 999, background: tier.color, boxShadow: `0 0 8px ${tier.color}`, border: '2px solid var(--bg)' }} />
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 9 }}>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: tier.color }}>{tier.label}</span>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{tier.desc}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {tier.members.map((m) => (
                    <Link key={m.slug} href={`/learn/akasha/${m.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', padding: '3px 11px 3px 3px', borderRadius: 999, border: `1px solid ${tier.color}44`, background: `${tier.color}12` }}>
                      <span style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)', border: `1px solid ${tier.color}77` }}>
                        {m.img && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.img} alt={m.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                        )}
                      </span>
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, color: 'var(--td)' }}>{m.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
