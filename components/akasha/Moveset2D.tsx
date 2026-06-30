'use client';
// components/akasha/Moveset2D.tsx — moveset 2D JOUABLE (gratuit, in-house).
// Sprites 16-bit (réf carte) détourés/recalés ; mouvement + effets pilotés par code (rAF).
// Coup de poing = 5 clés en ping-pong 1-2-3-4-5-4-3-2-1. Effets (code) : speed lines (poussée),
// hit-stop (maintien), screen-shake, poussière aux pieds, after-image, aura orange. Aucune vidéo.
import { useEffect, useRef, useState } from 'react';
import moveset from '@/data/akasha-moveset.json';

type Cfg = { dir: string; label?: string };
const MONO = 'ui-monospace, "SFMono-Regular", Menlo, monospace';
const scan = 'repeating-linear-gradient(0deg, rgba(0,0,0,0.30) 0px, rgba(0,0,0,0.30) 1px, transparent 2px, transparent 3px)';
const ASSET_V = '?hk8';
const LUNGE = 10; // pas en avant à l'impact (%)

const MOVES = [
  { k: 'idle', label: 'Repos' },
  { k: 'walk', label: 'Marche' },
  { k: 'crouch', label: 'Accroupi' },
  { k: 'jump', label: 'Saut' },
  { k: 'punch', label: 'Coup de poing' },
  { k: 'kick', label: 'Coup de pied' },
] as const;
type MoveKey = (typeof MOVES)[number]['k'];

type FX = { frame: string; tx: number; ty: number; sx: number; sy: number; speed: number; shake: number; dust: number; ghost: number; aura: number };

function compute(move: MoveKey, t: number): FX {
  let frame = 'idle', tx = 0, ty = 0, sx = 1, sy = 1, speed = 0, shake = 0, dust = 0, ghost = 0, aura = 0;
  const idleBob = 1.2 * Math.sin(t * 2.2);
  if (move === 'idle') {
    frame = 'idle'; ty = idleBob; sy = 1 + 0.012 * Math.sin(t * 2.2);
  } else if (move === 'walk') {
    // marche sur place : cycle 4 temps (contact A → passing → contact B → passing)
    // + rebond vertical SYNCHRO (corps bas au contact, haut au passing) + balancement + poussière de pas
    const cyc = 0.13, seq = ['walk_a', 'pass', 'walk_b', 'pass'];
    const phase = t / cyc, idx = Math.floor(phase) % 4, frac = phase - Math.floor(phase);
    frame = seq[idx];
    const bob = Math.abs(Math.sin((phase * Math.PI) / 2)); // 0 au contact, 1 au passing
    ty = -2.4 * bob;
    tx = 1.5 * Math.sin((phase * Math.PI) / 2);
    sy = 1 + 0.02 * bob;
    if ((idx === 0 || idx === 2) && frac < 0.5) dust = (0.5 - frac) * 0.5; // pouf au poser de pied
  } else if (move === 'crouch') {
    // s'accroupit (squash + poussière) → tient en respirant → se relève → boucle
    const T = 1.8, p = (t % T) / T;
    if (p < 0.16) { frame = 'idle'; ty = idleBob; }
    else if (p < 0.26) { const e = (p - 0.16) / 0.10; frame = 'crouch'; sy = 0.86 + 0.14 * e; dust = (1 - e) * 0.6; }
    else if (p < 0.74) { frame = 'crouch'; ty = 0.9 * Math.sin(t * 4.5); }
    else if (p < 0.84) { const e = (p - 0.74) / 0.10; frame = 'crouch'; ty = -3 * e; }
    else { frame = 'idle'; ty = idleBob; }
  } else if (move === 'jump') {
    // saut complet : attente → anticipation (accroupi) → détente (étirement+poussière)
    // → vol parabolique → atterrissage (squash+poussière) → récup. Boucle.
    const T = 1.5, p = (t % T) / T, H = 34;
    if (p < 0.14) { frame = 'idle'; ty = idleBob; }
    else if (p < 0.24) { const e = (p - 0.14) / 0.10; frame = 'crouch'; sy = 1 - 0.18 * Math.sin(e * Math.PI * 0.5); } // anticipation
    else if (p < 0.66) {                                                                                               // vol
      const e = (p - 0.24) / 0.42, arc = Math.sin(Math.PI * e);
      frame = 'jump'; ty = -H * arc; sy = 1 + 0.12 * Math.cos(Math.PI * e); sx = 1 - 0.06 * Math.cos(Math.PI * e);
      if (e < 0.18) dust = (0.18 - e) * 4;                                                                            // poussière au décollage
    }
    else if (p < 0.76) { const e = (p - 0.66) / 0.10; frame = 'crouch'; sy = 0.82 + 0.18 * e; dust = (1 - e) * 0.8; } // réception (squash)
    else if (p < 0.86) { const e = (p - 0.76) / 0.10; frame = 'idle'; ty = idleBob * e; }                             // récup
    else { frame = 'idle'; ty = idleBob; }
  } else if (move === 'punch') {
    // 5 clés sec : repos → armé → mi → quasi → tendu(IMPACT) → MAINTIEN → retour
    const T = 1.3, p = (t % T) / T;
    if (p < 0.05) { frame = 'idle'; }
    else if (p < 0.09) { frame = 'punch_wind'; tx = -2; ghost = 0.25; }
    else if (p < 0.12) { frame = 'punch2'; tx = 4; speed = 0.6; ghost = 0.5; }
    else if (p < 0.15) { frame = 'punch_near'; tx = 8; speed = 1; ghost = 0.6; }
    else if (p < 0.18) { frame = 'punch'; tx = LUNGE; speed = 1; ghost = 0.5; dust = 1; aura = 1; }
    else if (p < 0.36) { const e = (p - 0.18) / 0.18; frame = 'punch'; tx = LUNGE - e * 1.2; speed = Math.max(0, 1 - e * 2.6); dust = Math.max(0, 1 - e * 1.6); aura = Math.max(0, 1 - e * 1.4); }
    else if (p < 0.40) { frame = 'punch_near'; tx = 8; }
    else if (p < 0.44) { frame = 'punch2'; tx = 4; }
    else if (p < 0.48) { frame = 'punch_wind'; tx = -1; }
    else if (p < 0.52) { frame = 'idle'; }
    else { frame = 'idle'; ty = idleBob; }
    if (p >= 0.15 && p < 0.27) { const amp = 2.6 * (1 - (p - 0.15) / 0.12); shake = amp * Math.sin(t * 150); }
  } else if (move === 'kick') {
    // 1-2-3-2-1 : repos → genou levé (chambre) → jambe tendue (impact) → maintien → retour
    const T = 1.2, p = (t % T) / T;
    if (p < 0.06) { frame = 'idle'; }
    else if (p < 0.12) { frame = 'kick_wind'; tx = 2; ghost = 0.4; }
    else if (p < 0.16) { frame = 'kick'; tx = 9; speed = 1; ghost = 0.4; }
    else if (p < 0.34) { const e = (p - 0.16) / 0.18; frame = 'kick'; tx = 9 - e * 1.2; speed = Math.max(0, 1 - e * 2.4); }
    else if (p < 0.40) { frame = 'kick_wind'; tx = 2; }
    else if (p < 0.46) { frame = 'idle'; }
    else { frame = 'idle'; ty = idleBob; }
    if (p >= 0.12 && p < 0.24) { const amp = 2.6 * (1 - (p - 0.12) / 0.12); shake = amp * Math.sin(t * 150); }
  }
  return { frame, tx, ty, sx, sy, speed, shake, dust, ghost, aura };
}

export default function Moveset2D({ slug }: { slug: string }) {
  const cfg = (moveset as unknown as Record<string, Cfg>)[slug];
  const imgRef = useRef<HTMLImageElement | null>(null);
  const ghostRef = useRef<HTMLImageElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const speedRef = useRef<HTMLDivElement | null>(null);
  const dustRef = useRef<HTMLDivElement | null>(null);
  const auraRef = useRef<HTMLDivElement | null>(null);
  const [move, setMove] = useState<MoveKey>('idle');
  const moveRef = useRef<MoveKey>('idle');
  const t0Ref = useRef(0);

  useEffect(() => {
    if (!cfg) return;
    ['idle', 'walk_a', 'pass', 'walk_b', 'crouch', 'jump', 'punch_wind', 'punch2', 'punch_near', 'punch', 'kick_wind', 'kick'].forEach((f) => {
      const im = new Image(); im.src = `${cfg.dir}/${f}.png${ASSET_V}`;
    });
  }, [cfg]);

  useEffect(() => {
    if (!cfg) return;
    let raf = 0;
    const loop = (now: number) => {
      if (!t0Ref.current) t0Ref.current = now;
      const t = (now - t0Ref.current) / 1000;
      const { frame, tx, ty, sx, sy, speed, shake, dust, ghost, aura } = compute(moveRef.current, t);
      const src = `${cfg.dir}/${frame}.png${ASSET_V}`;
      const img = imgRef.current;
      if (img) {
        if (img.getAttribute('src') !== src) img.setAttribute('src', src);
        img.style.transform = `translate(${tx}%, ${ty}%) scale(${sx}, ${sy})`;
      }
      const gh = ghostRef.current;       // after-image (traînée derrière)
      if (gh) {
        gh.style.opacity = String(ghost * 0.3);
        if (ghost > 0) { if (gh.getAttribute('src') !== src) gh.setAttribute('src', src); gh.style.transform = `translate(${(tx - 6).toFixed(1)}%, ${ty}%) scale(${sx}, ${sy})`; }
      }
      if (stageRef.current) stageRef.current.style.transform = shake ? `translate(${shake.toFixed(1)}px, ${(shake * 0.5).toFixed(1)}px)` : 'translate(0,0)';
      if (speedRef.current) speedRef.current.style.opacity = String(speed * 0.3);
      if (auraRef.current) auraRef.current.style.opacity = String(aura * 0.38);
      if (dustRef.current) {
        dustRef.current.style.opacity = String(dust * 0.22);
        dustRef.current.style.transform = `translate(${(tx * 0.8).toFixed(1)}%, 0) scale(${(0.5 + dust * 0.8).toFixed(2)})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cfg]);

  if (!cfg) return null;
  const choose = (k: MoveKey) => { moveRef.current = k; t0Ref.current = 0; setMove(k); };
  const imgStyle: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated', willChange: 'transform', transformOrigin: '50% 96%' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span aria-hidden style={{ fontSize: 16 }}>🎮</span>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--td3)' }}>Moveset — Jouable</span>
        <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.12em', color: '#F0C040', textShadow: '0 0 8px #F0C04088' }} className="ak-blink">★ {MOVES.find((m) => m.k === move)?.label.toUpperCase()}</span>
      </div>

      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: '4 / 3', background: 'radial-gradient(120% 90% at 50% 18%, rgba(123,92,240,0.16), #0A0716)', border: '1px solid rgba(123,92,240,0.35)', boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6)' }}>
        <div ref={stageRef} style={{ position: 'absolute', inset: 0, willChange: 'transform' }}>
          <div aria-hidden style={{ position: 'absolute', left: '12%', right: '12%', bottom: '8%', height: 1, background: 'rgba(140,150,210,0.35)' }} />
          <div aria-hidden style={{ position: 'absolute', left: '32%', right: '32%', bottom: '6%', height: 14, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,0.45), transparent 70%)' }} />
          {/* aura orange (chakra) derrière le perso */}
          <div ref={auraRef} aria-hidden style={{ position: 'absolute', left: '50%', top: '50%', width: '80%', height: '80%', transform: 'translate(-50%,-50%)', opacity: 0, pointerEvents: 'none', background: 'radial-gradient(circle, rgba(255,150,30,0.55) 0%, rgba(255,110,10,0.25) 40%, transparent 68%)' }} />
          {/* speed lines */}
          <div ref={speedRef} aria-hidden style={{ position: 'absolute', left: '24%', right: '6%', top: '34%', height: '18%', opacity: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, rgba(205,232,255,0.55) 0 1px, transparent 1px 11px)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 35%, #000 80%, transparent)', maskImage: 'linear-gradient(90deg, transparent, #000 35%, #000 80%, transparent)' }} />
          {/* after-image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={ghostRef} src={`${cfg.dir}/idle.png${ASSET_V}`} alt="" aria-hidden style={{ ...imgStyle, opacity: 0 }} />
          {/* sprite principal */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imgRef} src={`${cfg.dir}/idle.png${ASSET_V}`} alt="Naruto" style={imgStyle} />
          {/* poussière aux pieds */}
          <div ref={dustRef} aria-hidden style={{ position: 'absolute', left: '40%', bottom: '5%', width: '24%', height: '11%', transform: 'translate(0,0) scale(0.5)', transformOrigin: 'center bottom', opacity: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 100%, rgba(220,210,190,0.7) 0%, rgba(200,190,170,0.25) 45%, transparent 70%)' }} />
        </div>
        {/* scanlines CRT (fixes) */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: scan, mixBlendMode: 'multiply', pointerEvents: 'none' }} />
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 10 }}>
        {MOVES.map((m) => {
          const on = m.k === move;
          return (
            <button key={m.k} type="button" onClick={() => choose(m.k)}
              style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', padding: '5px 11px', borderRadius: 20, border: `1px solid ${on ? '#7B5CF0' : 'var(--bd2)'}`, background: on ? 'rgba(123,92,240,0.18)' : 'transparent', color: on ? '#9d86f5' : 'var(--td2)' }}>
              {m.label}
            </button>
          );
        })}
      </div>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', textAlign: 'center', marginTop: 8, fontStyle: 'italic' }}>
        Sprites 16-bit · animés par code · prêts pour un mini-jeu
      </div>
    </div>
  );
}
