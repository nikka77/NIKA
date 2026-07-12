'use client';
// components/akasha/hub/DragonBallCosmos.tsx — CARTE DU MULTIVERS Dragon Ball.
// Vue « Planètes » : orbes illustrées (Higgsfield i2i sur réf canon) flottant dans le cosmos,
// groupées par royaume (Univers 7 / Univers 6 / Au-delà), clic → fiche + lien registre.
// Vue « Univers » : les 12 univers de Dragon Ball Super (dieu, ange, jumeau, sort au Tournoi).
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DB_PLANETS, DB_UNIVERSES, DB_REALM_META, DB_TOP_META, type CosmosRealm, type CosmosPlanet } from '@/lib/akasha/db-cosmos';

const RARITY_COLOR: Record<string, string> = { legendary: '#F2C14E', epic: '#C77DFF', rare: '#4EA8DE' };
const REALMS: CosmosRealm[] = ['univers-7', 'univers-6', 'au-dela'];

// Étoiles déterministes (seed fixe) → aucun mismatch d'hydratation.
function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const STARS = (() => {
  const rnd = mulberry32(0x5A17);
  return Array.from({ length: 130 }, () => ({
    x: rnd() * 100, y: rnd() * 100, s: 0.4 + rnd() * 1.5, o: 0.25 + rnd() * 0.6, d: (rnd() * 6).toFixed(2),
  }));
})();

export default function DragonBallCosmos({ color = '#E8613C' }: { color?: string }) {
  const [view, setView] = useState<'planetes' | 'univers'>('planetes');
  const [realm, setRealm] = useState<CosmosRealm | null>(null);
  const [sel, setSel] = useState<CosmosPlanet | null>(null);

  // Chaînes de constellation : relie les planètes d'un même royaume (triées par X).
  const links = useMemo(() => {
    const out: { x1: number; y1: number; x2: number; y2: number; c: string }[] = [];
    for (const rl of REALMS) {
      const ps = DB_PLANETS.filter((p) => p.realm === rl).sort((a, b) => a.x - b.x);
      for (let i = 0; i < ps.length - 1; i++) out.push({ x1: ps[i].x * 1.6, y1: ps[i].y, x2: ps[i + 1].x * 1.6, y2: ps[i + 1].y, c: DB_REALM_META[rl].color });
    }
    return out;
  }, []);

  return (
    <div style={{ marginTop: '1.8rem' }}>
      <style>{`@keyframes ak-twinkle{0%,100%{opacity:.25}50%{opacity:1}}@keyframes ak-float{0%,100%{transform:translate(-50%,-50%)}50%{transform:translate(-50%,calc(-50% - 5px))}}@media (prefers-reduced-motion: reduce){.ak-star,.ak-orb{animation:none!important}}`}</style>

      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, marginBottom: 4 }}>
        🪐 Carte du multivers — {DB_PLANETS.length} planètes · 12 univers
      </div>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td3)', margin: '0 0 12px', maxWidth: 640 }}>
        Navigue les mondes de Dragon Ball — de la Terre à Sadala, des royaumes des Kaïō au palais de Zeno. Clique une planète pour sa fiche.
      </p>

      {/* Bascule Planètes / Univers */}
      <div style={{ display: 'inline-flex', gap: 4, padding: 3, borderRadius: 999, border: '1px solid var(--bd)', background: 'var(--bg2)', marginBottom: 12 }}>
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
          <div style={{
            position: 'relative', width: '100%', aspectRatio: '16 / 10', borderRadius: 18, overflow: 'hidden',
            border: '1px solid var(--bd)', background: 'radial-gradient(ellipse 80% 70% at 28% 18%, #241640 0%, #0d0820 46%, #050308 100%)',
            boxShadow: 'inset 0 0 120px rgba(0,0,0,0.7)',
          }}>
            {/* Nébuleuses */}
            <div aria-hidden style={{ position: 'absolute', width: '55%', height: '55%', left: '-8%', top: '30%', background: 'radial-gradient(circle, rgba(232,97,60,0.16), transparent 68%)', filter: 'blur(10px)', pointerEvents: 'none' }} />
            <div aria-hidden style={{ position: 'absolute', width: '48%', height: '48%', right: '2%', top: '-6%', background: 'radial-gradient(circle, rgba(120,90,220,0.16), transparent 68%)', filter: 'blur(10px)', pointerEvents: 'none' }} />
            <div aria-hidden style={{ position: 'absolute', width: '40%', height: '40%', right: '6%', bottom: '-8%', background: 'radial-gradient(circle, rgba(70,150,200,0.13), transparent 68%)', filter: 'blur(10px)', pointerEvents: 'none' }} />

            {/* Étoiles */}
            {STARS.map((st, i) => (
              <span key={i} className="ak-star" aria-hidden style={{
                position: 'absolute', left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, borderRadius: 999,
                background: '#fff', opacity: st.o, animation: `ak-twinkle ${2.5 + (i % 5)}s ease-in-out ${st.d}s infinite`,
              }} />
            ))}

            {/* Lignes de constellation */}
            <svg aria-hidden viewBox="0 0 160 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              {links.map((l, i) => (
                <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.c} strokeWidth={0.25} strokeDasharray="1.4 1.6" opacity={0.28} />
              ))}
            </svg>

            {/* Planètes */}
            {DB_PLANETS.map((p, i) => {
              const dim = realm !== null && p.realm !== realm;
              const isSel = sel?.slug === p.slug;
              return (
                <button key={p.slug} onClick={() => setSel(isSel ? null : p)}
                  aria-label={`${p.name} — ${p.realmLabel}`}
                  className="ak-orb"
                  style={{
                    position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: `${p.r * 2}%`, aspectRatio: '1 / 1',
                    transform: 'translate(-50%,-50%)', border: 'none', padding: 0, cursor: 'pointer', background: 'transparent',
                    animation: `ak-float ${6 + (i % 4)}s ease-in-out ${(i * 0.7).toFixed(1)}s infinite`,
                    opacity: dim ? 0.28 : 1, transition: 'opacity 0.3s, filter 0.2s', zIndex: isSel ? 5 : 2,
                    filter: isSel ? `drop-shadow(0 0 14px ${p.glow})` : 'none',
                  }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt={p.name} loading="lazy" style={{
                    width: '100%', height: '100%', objectFit: 'cover', borderRadius: p.clip ? '50%' : '16%',
                    boxShadow: `0 0 ${isSel ? 20 : 12}px ${p.glow}${isSel ? 'CC' : '88'}, 0 4px 14px rgba(0,0,0,0.6)`,
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

          {/* Fiche planète sélectionnée */}
          {sel && (
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 12, marginTop: 12, padding: 12, borderRadius: 14, border: `1px solid ${sel.glow}55`, background: 'var(--bg2)' }}>
              <div style={{ width: 74, height: 74, flexShrink: 0, borderRadius: sel.clip ? '50%' : 12, overflow: 'hidden', boxShadow: `0 0 16px ${sel.glow}66` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sel.img} alt={sel.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 18, color: 'var(--td)', lineHeight: 1 }}>{sel.name}</span>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: DB_REALM_META[sel.realm].color, background: `${DB_REALM_META[sel.realm].color}1F`, border: `1px solid ${DB_REALM_META[sel.realm].color}55`, borderRadius: 20, padding: '1px 8px' }}>{sel.realmLabel}</span>
                </div>
                <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', margin: 0, lineHeight: 1.5 }}>{sel.note}</p>
                <Link href={`/learn/akasha/${sel.slug}`} style={{ fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 800, color: sel.glow, textDecoration: 'none', marginTop: 2 }}>
                  Voir la fiche complète →
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {view === 'univers' && (
        <div className="g-3">
          {DB_UNIVERSES.map((u) => {
            const rc = RARITY_COLOR[u.rarity] || '#8FA3B0';
            const top = DB_TOP_META[u.top];
            return (
              <Link key={u.slug} href={`/learn/akasha/${u.slug}`} className={`dom-card ak-r-${u.rarity}`} style={{
                display: 'flex', flexDirection: 'column', gap: 8, textDecoration: 'none', padding: 13, borderRadius: 14,
                border: `1px solid ${rc}55`, background: `radial-gradient(120% 90% at 0% 0%, ${rc}14, var(--bg2) 60%)`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 30, lineHeight: 0.9, color: rc, minWidth: 42 }}>{u.num}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 800, color: 'var(--td)' }}>{u.name || `Univers ${u.num}`}</div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: top.color }}>{top.label}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, color: 'var(--td2)', background: 'var(--su2)', borderRadius: 6, padding: '2px 7px' }}>💥 {u.god}</span>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, color: 'var(--td2)', background: 'var(--su2)', borderRadius: 6, padding: '2px 7px' }}>😇 {u.angel}</span>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, color: 'var(--td3)', background: 'var(--su2)', borderRadius: 6, padding: '2px 7px' }}>↔ Jumeau {u.twin}</span>
                </div>
                <p style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{u.desc}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
