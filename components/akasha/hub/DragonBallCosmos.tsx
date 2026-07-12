'use client';
// components/akasha/hub/DragonBallCosmos.tsx — CARTE DU MULTIVERS Dragon Ball.
// Vue « Planètes » : orbes illustrées (Higgsfield i2i sur réf canon) flottant dans le cosmos,
// groupées par royaume (Univers 7 / Univers 6 / Au-delà). Recherche, zoom/pan, plein écran,
// fiche enrichie (statut, gravité, habitants → fiches). Vue « Univers » : les 12 univers de DBS.
import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { DB_PLANETS, DB_UNIVERSES, DB_REALM_META, DB_TOP_META, type CosmosRealm, type CosmosPlanet } from '@/lib/akasha/db-cosmos';

const RARITY_COLOR: Record<string, string> = { legendary: '#F2C14E', epic: '#C77DFF', rare: '#4EA8DE' };
const REALMS: CosmosRealm[] = ['univers-7', 'univers-6', 'au-dela'];
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Étoiles déterministes (seed fixe) → aucun mismatch d'hydratation.
function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const STARS = (() => {
  const rnd = mulberry32(0x5A17);
  return Array.from({ length: 130 }, () => ({ x: rnd() * 100, y: rnd() * 100, s: 0.4 + rnd() * 1.5, o: 0.25 + rnd() * 0.6, d: (rnd() * 6).toFixed(2) }));
})();

export default function DragonBallCosmos({ color = '#E8613C' }: { color?: string }) {
  const [view, setView] = useState<'planetes' | 'univers'>('planetes');
  const [realm, setRealm] = useState<CosmosRealm | null>(null);
  const [sel, setSel] = useState<CosmosPlanet | null>(null);
  const [q, setQ] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const boxRef = useRef<HTMLDivElement>(null);
  const ptrs = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gest = useRef<{ moved: boolean; startPan: { x: number; y: number }; startDist: number; startZoom: number } | null>(null);

  const query = norm(q.trim());
  const matches = useCallback((p: CosmosPlanet) => !query || norm(p.name).includes(query) || p.people.some((x) => norm(x.name).includes(query)), [query]);

  const links = useMemo(() => {
    const out: { x1: number; y1: number; x2: number; y2: number; c: string }[] = [];
    for (const rl of REALMS) {
      const ps = DB_PLANETS.filter((p) => p.realm === rl).sort((a, b) => a.x - b.x);
      for (let i = 0; i < ps.length - 1; i++) out.push({ x1: ps[i].x * 1.6, y1: ps[i].y, x2: ps[i + 1].x * 1.6, y2: ps[i + 1].y, c: DB_REALM_META[rl].color });
    }
    return out;
  }, []);

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
    gest.current = { moved: false, startPan: pan, startDist: arr.length === 2 ? Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y) : 0, startZoom: zoom };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!ptrs.current.has(e.pointerId) || !gest.current) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const arr = [...ptrs.current.values()];
    if (arr.length === 2 && gest.current.startDist) {
      const d = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
      applyZoom(gest.current.startZoom * (d / gest.current.startDist));
      gest.current.moved = true;
    }
  };
  // Pan (pointeur unique) : on suit le déplacement depuis le down.
  const panStart = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const onDown2 = (e: React.PointerEvent) => { if (zoom > 1 && ptrs.current.size <= 1) panStart.current = { px: e.clientX, py: e.clientY, ox: pan.x, oy: pan.y }; };
  const onMove2 = (e: React.PointerEvent) => {
    if (panStart.current && ptrs.current.size === 1 && zoom > 1) {
      const p = clampPan({ x: panStart.current.ox + (e.clientX - panStart.current.px), y: panStart.current.oy + (e.clientY - panStart.current.py) }, zoom);
      if (gest.current) gest.current.moved = true; setPan(p);
    }
  };
  const onPointerUp = (e: React.PointerEvent) => { ptrs.current.delete(e.pointerId); if (ptrs.current.size === 0) panStart.current = null; };

  const toggleFs = () => { const el = boxRef.current; if (!el) return; if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.(); };

  const nResults = query ? DB_PLANETS.filter(matches).length : 0;

  return (
    <div style={{ marginTop: '1.8rem' }}>
      <style>{`@keyframes ak-twinkle{0%,100%{opacity:.25}50%{opacity:1}}@keyframes ak-float{0%,100%{transform:translate(-50%,-50%)}50%{transform:translate(-50%,calc(-50% - 5px))}}@media (prefers-reduced-motion: reduce){.ak-star,.ak-orb{animation:none!important}}.db-cosmos-box:fullscreen{width:100vw;height:100vh;aspect-ratio:auto;border-radius:0}.db-cosmos-box:fullscreen .db-cosmos-world{height:100%}`}</style>

      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, marginBottom: 4 }}>
        🪐 Carte du multivers — {DB_PLANETS.length} planètes · 12 univers
      </div>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td3)', margin: '0 0 12px', maxWidth: 640 }}>
        Navigue les mondes de Dragon Ball — de la Terre à Sadala, des royaumes des Kaïō au palais de Zeno. Clique une planète pour sa fiche, zoome et cherche.
      </p>

      {/* Bascule + recherche */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'inline-flex', gap: 4, padding: 3, borderRadius: 999, border: '1px solid var(--bd)', background: 'var(--bg2)' }}>
          {(['planetes', 'univers'] as const).map((v) => {
            const active = view === v;
            return (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '5px 14px', borderRadius: 999, cursor: 'pointer', border: 'none',
                fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 800, letterSpacing: '0.03em',
                background: active ? color : 'transparent', color: active ? '#0A1420' : 'var(--td2)',
              }}>{v === 'planetes' ? '🪐 Planètes' : '🌌 Univers'}</button>
            );
          })}
        </div>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 300 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={view === 'planetes' ? '🔎 Chercher une planète, un habitant…' : '🔎 Chercher un univers, un dieu…'}
            style={{ width: '100%', padding: '7px 12px', borderRadius: 999, border: '1px solid var(--bd)', background: 'var(--bg2)', color: 'var(--td)', fontFamily: 'var(--fo)', fontSize: 12.5 }} />
        </div>
        {view === 'planetes' && query && <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{nResults} résultat{nResults > 1 ? 's' : ''}</span>}
      </div>

      {view === 'planetes' && (
        <>
          {/* Légende / filtre par royaume */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {REALMS.map((rl) => {
              const meta = DB_REALM_META[rl];
              const n = DB_PLANETS.filter((p) => p.realm === rl).length;
              const active = realm === rl;
              return (
                <button key={rl} onClick={() => setRealm(active ? null : rl)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                  fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700,
                  border: `1px solid ${active ? meta.color : 'var(--bd)'}`, background: active ? `${meta.color}22` : 'transparent', color: active ? meta.color : 'var(--td2)',
                }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
                  {meta.label} <span style={{ opacity: 0.6, fontSize: 10 }}>{n}</span>
                </button>
              );
            })}
          </div>

          {/* Cosmos */}
          <div ref={boxRef} className="db-cosmos-box" onWheel={onWheel}
            onPointerDown={(e) => { onPointerDown(e); onDown2(e); }} onPointerMove={(e) => { onPointerMove(e); onMove2(e); }} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
            style={{
              position: 'relative', width: '100%', aspectRatio: '16 / 10', borderRadius: 18, overflow: 'hidden',
              border: '1px solid var(--bd)', background: 'radial-gradient(ellipse 80% 70% at 28% 18%, #241640 0%, #0d0820 46%, #050308 100%)',
              boxShadow: 'inset 0 0 120px rgba(0,0,0,0.7)', touchAction: 'none', cursor: zoom > 1 ? 'grab' : 'default',
            }}>
            {/* Monde zoomable */}
            <div className="db-cosmos-world" style={{ position: 'absolute', inset: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '50% 50%', transition: gest.current?.moved ? 'none' : 'transform 0.18s ease-out' }}>
              {/* Nébuleuses */}
              <div aria-hidden style={{ position: 'absolute', width: '55%', height: '55%', left: '-8%', top: '30%', background: 'radial-gradient(circle, rgba(232,97,60,0.16), transparent 68%)', filter: 'blur(10px)', pointerEvents: 'none' }} />
              <div aria-hidden style={{ position: 'absolute', width: '48%', height: '48%', right: '2%', top: '-6%', background: 'radial-gradient(circle, rgba(120,90,220,0.16), transparent 68%)', filter: 'blur(10px)', pointerEvents: 'none' }} />
              <div aria-hidden style={{ position: 'absolute', width: '40%', height: '40%', right: '6%', bottom: '-8%', background: 'radial-gradient(circle, rgba(70,150,200,0.13), transparent 68%)', filter: 'blur(10px)', pointerEvents: 'none' }} />

              {/* Étoiles */}
              {STARS.map((st, i) => (
                <span key={i} className="ak-star" aria-hidden style={{ position: 'absolute', left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, borderRadius: 999, background: '#fff', opacity: st.o, animation: `ak-twinkle ${2.5 + (i % 5)}s ease-in-out ${st.d}s infinite` }} />
              ))}

              {/* Lignes de constellation */}
              <svg aria-hidden viewBox="0 0 160 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                {links.map((l, i) => <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.c} strokeWidth={0.25} strokeDasharray="1.4 1.6" opacity={0.28} />)}
              </svg>

              {/* Planètes */}
              {DB_PLANETS.map((p, i) => {
                const dim = (realm !== null && p.realm !== realm) || (!!query && !matches(p));
                const isSel = sel?.slug === p.slug;
                return (
                  <button key={p.slug} onClick={() => { if (gest.current?.moved) return; setSel(isSel ? null : p); }}
                    aria-label={`${p.name} — ${p.realmLabel}`} className="ak-orb"
                    style={{
                      position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: `${p.r * 2}%`, aspectRatio: '1 / 1',
                      transform: 'translate(-50%,-50%)', border: 'none', padding: 0, cursor: 'pointer', background: 'transparent',
                      animation: `ak-float ${6 + (i % 4)}s ease-in-out ${(i * 0.7).toFixed(1)}s infinite`,
                      opacity: dim ? 0.22 : 1, transition: 'opacity 0.3s', zIndex: isSel ? 5 : 2,
                    }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} alt={p.name} loading="lazy" style={{
                      width: '100%', height: '100%',
                      objectFit: p.clip ? 'cover' : 'contain', borderRadius: p.clip ? '50%' : 0,
                      boxShadow: p.clip ? `0 0 ${isSel ? 20 : 12}px ${p.glow}${isSel ? 'CC' : '88'}, 0 4px 14px rgba(0,0,0,0.6)` : 'none',
                      filter: p.clip ? 'none' : `drop-shadow(0 0 ${isSel ? 14 : 9}px ${p.glow}${isSel ? 'CC' : '99'}) drop-shadow(0 4px 10px rgba(0,0,0,0.6))`,
                    }} />
                    <span style={{
                      position: 'absolute', left: '50%', top: 'calc(100% + 3px)', transform: 'translateX(-50%)', whiteSpace: 'nowrap',
                      fontFamily: 'var(--fo)', fontSize: 'clamp(8px,1.1vw,11px)', fontWeight: 700, color: isSel ? p.glow : 'rgba(255,255,255,0.82)',
                      textShadow: '0 1px 4px rgba(0,0,0,0.9)', pointerEvents: 'none',
                    }}>{p.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Contrôles (hors monde zoomable) */}
            <div style={{ position: 'absolute', right: 10, bottom: 10, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 10 }}>
              {[{ k: 'fs', t: '⛶', f: toggleFs }, { k: '+', t: '＋', f: () => applyZoom(zoom * 1.3) }, { k: '-', t: '－', f: () => applyZoom(zoom / 1.3) }, { k: 'r', t: '⟲', f: reset }].map((b) => (
                <button key={b.k} onClick={b.f} aria-label={b.k} style={{
                  width: 30, height: 30, borderRadius: 8, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(10,8,24,0.7)', color: '#fff', fontSize: 14, fontWeight: 700, backdropFilter: 'blur(4px)',
                }}>{b.t}</button>
              ))}
            </div>
            {zoom > 1 && <div style={{ position: 'absolute', left: 10, bottom: 10, zIndex: 10, fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.75)', background: 'rgba(10,8,24,0.6)', borderRadius: 6, padding: '2px 8px' }}>×{zoom.toFixed(1)}</div>}
          </div>

          {/* Fiche planète sélectionnée */}
          {sel && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 12, padding: 12, borderRadius: 14, border: `1px solid ${sel.glow}55`, background: 'var(--bg2)' }}>
              <div style={{ width: 76, height: 76, flexShrink: 0, borderRadius: sel.clip ? '50%' : 10, overflow: 'hidden', background: 'radial-gradient(circle, #1a1030, #0a0612)', boxShadow: `0 0 16px ${sel.glow}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sel.img} alt={sel.name} style={{ width: '100%', height: '100%', objectFit: sel.clip ? 'cover' : 'contain' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 18, color: 'var(--td)', lineHeight: 1 }}>{sel.name}</span>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: DB_REALM_META[sel.realm].color, background: `${DB_REALM_META[sel.realm].color}1F`, border: `1px solid ${DB_REALM_META[sel.realm].color}55`, borderRadius: 20, padding: '1px 8px' }}>{sel.realmLabel}</span>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, color: 'var(--td3)', background: 'var(--su2)', borderRadius: 20, padding: '1px 8px' }}>{sel.status.startsWith('Détruite') ? '💥' : '🌍'} {sel.status}</span>
                  {sel.gravity && <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, color: 'var(--td3)', background: 'var(--su2)', borderRadius: 20, padding: '1px 8px' }}>🏋 {sel.gravity}</span>}
                </div>
                <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', margin: 0, lineHeight: 1.5 }}>{sel.note}</p>
                {sel.people.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 1 }}>
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--td3)' }}>Habitants&nbsp;:</span>
                    {sel.people.map((pe) => (
                      <Link key={pe.slug} href={`/learn/akasha/${pe.slug}`} style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: 'var(--td2)', background: 'var(--su2)', border: '1px solid var(--bd)', borderRadius: 999, padding: '2px 9px', textDecoration: 'none' }}>{pe.name}</Link>
                    ))}
                  </div>
                )}
                <Link href={`/learn/akasha/${sel.slug}`} style={{ fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 800, color: sel.glow, textDecoration: 'none', marginTop: 2 }}>
                  Voir la fiche complète →
                </Link>
              </div>
              <button onClick={() => setSel(null)} aria-label="Fermer" style={{ flexShrink: 0, border: 'none', background: 'transparent', color: 'var(--td3)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
            </div>
          )}
        </>
      )}

      {view === 'univers' && (
        <div className="g-3">
          {DB_UNIVERSES.filter((u) => !query || norm(u.name || `univers ${u.num}`).includes(query) || norm(u.god).includes(query) || norm(u.angel).includes(query) || String(u.num) === query).map((u) => {
            const rc = RARITY_COLOR[u.rarity] || '#8FA3B0';
            const top = DB_TOP_META[u.top];
            const godChip = (label: string, icon: string, slug: string | null, dim?: boolean) => slug
              ? <Link href={`/learn/akasha/${slug}`} style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, color: dim ? 'var(--td3)' : 'var(--td)', background: 'var(--su2)', border: `1px solid ${rc}44`, borderRadius: 6, padding: '2px 7px', textDecoration: 'none' }}>{icon} {label}</Link>
              : <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, color: 'var(--td3)', background: 'var(--su2)', borderRadius: 6, padding: '2px 7px' }}>{icon} {label}</span>;
            return (
              <div key={u.slug} className={`dom-card ak-r-${u.rarity}`} style={{
                display: 'flex', flexDirection: 'column', gap: 8, padding: 13, borderRadius: 14,
                border: `1px solid ${rc}55`, background: `radial-gradient(120% 90% at 0% 0%, ${rc}14, var(--bg2) 60%)`,
              }}>
                <Link href={`/learn/akasha/${u.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                  <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 30, lineHeight: 0.9, color: rc, minWidth: 42 }}>{u.num}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 800, color: 'var(--td)' }}>{u.name || `Univers ${u.num}`}</div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: top.color }}>{top.label}</div>
                  </div>
                </Link>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {godChip(`💥 ${u.god}`, '', u.godSlug)}
                  {godChip(`😇 ${u.angel}`, '', u.angelSlug)}
                  <Link href={`/learn/akasha/${u.twin <= 12 ? 'univers-' + u.twin : u.slug}`} style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, color: 'var(--td3)', background: 'var(--su2)', borderRadius: 6, padding: '2px 7px', textDecoration: 'none' }}>↔ Jumeau {u.twin}</Link>
                </div>
                <p style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{u.desc}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
