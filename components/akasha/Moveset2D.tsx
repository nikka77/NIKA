'use client';
// components/akasha/Moveset2D.tsx — DÉMO JOUABLE temps réel (gratuit, in-house).
// Stance de COMBAT face à droite. → avancer · ← reculer · ↓ accroupi · ↑/Espace sauter
// (J/K en l'air = coup sauté) · J poing · K pied (J,J,K = combo) · double-tap ←/→ = dash
// · G garde · C charge chakra · T provoc. Idle break auto. Mannequin (poteau d'entraînement)
// à frapper, SFX chiptune (Web Audio, mutable), plein écran, aura de forme (prop `aura`).
import { useEffect, useRef, useState } from 'react';
import moveset from '@/data/akasha-moveset.json';

type Cfg = { dir: string; label?: string };
const MONO = 'ui-monospace, "SFMono-Regular", Menlo, monospace';
const scan = 'repeating-linear-gradient(0deg, rgba(0,0,0,0.30) 0px, rgba(0,0,0,0.30) 1px, transparent 2px, transparent 3px)';
const ASSET_V = '?hk13';

const LUNGE = 10, WALK_SPEED = 26, RETREAT_SPEED = 20, RUN_SPEED = 48, AIR_SPEED = 17, DASH_SPEED = 95, MAXX = 36, JUMP_H = 34, IDLE_BREAK = 5, TAP_WIN = 280;
const POST_X = 30;        // position du mannequin (en unités posX)
const RUN_FRAMES = ['run1', 'run2', 'run3', 'run4', 'run5', 'run6']; // cycle de course 6 temps

type FX = { frame: string; tx: number; ty: number; sx: number; sy: number; speed: number; shake: number; dust: number; ghost: number; aura: number };
const fx = (frame: string, o: Partial<FX> = {}): FX => ({ frame, tx: 0, ty: 0, sx: 1, sy: 1, speed: 0, shake: 0, dust: 0, ghost: 0, aura: 0, ...o });

// ── SFX chiptune (Web Audio, synthétisé — aucun fichier) ──
function playSfx(c: AudioContext | null, type: string) {
  if (!c) return; if (c.state === 'suspended') c.resume();
  const t = c.currentTime;
  const beep = (f: number, dur: number, kind: OscillatorType, gain: number, slide?: number) => {
    const o = c.createOscillator(), g = c.createGain(); o.type = kind; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur);
  };
  const noise = (dur: number, gain: number) => {
    const n = (c.sampleRate * dur) | 0, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(); s.buffer = b; const g = c.createGain(); g.gain.value = gain; s.connect(g).connect(c.destination); s.start(t);
  };
  if (type === 'punch') { beep(190, 0.11, 'square', 0.15, 90); noise(0.07, 0.1); }
  else if (type === 'kick') { beep(120, 0.15, 'square', 0.17, 60); noise(0.1, 0.12); }
  else if (type === 'jump') { beep(320, 0.16, 'square', 0.09, 760); }
  else if (type === 'dash') { beep(620, 0.11, 'sawtooth', 0.07, 1180); noise(0.05, 0.05); }
  else if (type === 'hit') { beep(880, 0.09, 'square', 0.13, 280); noise(0.09, 0.16); }
}

function punchFX(e: number): FX | null {
  let r: FX;
  if (e < 0.07) r = fx('punch_a', { tx: -2, ghost: 0.3 });
  else if (e < 0.13) r = fx('punch_b', { tx: LUNGE, speed: 1, ghost: 0.55, dust: 1, aura: 1 });
  else if (e < 0.30) { const k = (e - 0.13) / 0.17; r = fx('punch_b', { tx: LUNGE - k * 1.4, speed: Math.max(0, 1 - k * 2.4), dust: Math.max(0, 1 - k * 1.6), aura: Math.max(0, 1 - k * 1.4) }); }
  else if (e < 0.40) r = fx('punch_a', { tx: 2 });
  else if (e < 0.46) r = fx('punch_a', { tx: 1 });
  else return null;
  if (e >= 0.07 && e < 0.21) r.shake = 2.8 * (1 - (e - 0.07) / 0.14) * Math.sin(e * 150);
  return r;
}
function kickFX(e: number): FX | null {
  let r: FX;
  if (e < 0.08) r = fx('kick_a', { tx: 2, ghost: 0.4 });
  else if (e < 0.14) r = fx('kick_b', { tx: 9, speed: 1, ghost: 0.5, dust: 0.7, aura: 0.7 });
  else if (e < 0.28) { const k = (e - 0.14) / 0.14; r = fx('kick_b', { tx: 9 - k * 1.4, speed: Math.max(0, 1 - k * 2.6), dust: Math.max(0, 0.7 - k), aura: Math.max(0, 0.7 - k) }); }
  else if (e < 0.40) r = fx('kick_c', { tx: 5 });
  else if (e < 0.47) r = fx('kick_c', { tx: 2 });
  else return null;
  if (e >= 0.08 && e < 0.22) r.shake = 2.6 * (1 - (e - 0.08) / 0.14) * Math.sin(e * 150);
  return r;
}
function jumpFX(e: number): FX | null {
  if (e < 0.10) { const k = e / 0.10; return fx('crouch', { sy: 1 - 0.18 * Math.sin(k * Math.PI * 0.5) }); }
  if (e < 0.78) { const k = (e - 0.10) / 0.68, arc = Math.sin(Math.PI * k); return fx('jump', { ty: -JUMP_H * arc, sy: 1 + 0.12 * Math.cos(Math.PI * k), sx: 1 - 0.06 * Math.cos(Math.PI * k), dust: k < 0.14 ? (0.14 - k) * 5 : 0 }); }
  if (e < 0.90) { const k = (e - 0.78) / 0.12; return fx('crouch', { sy: 0.82 + 0.18 * k, dust: (1 - k) * 0.7 }); }
  return null;
}
function tauntFX(e: number): FX | null { return e < 0.9 ? fx('taunt', { ty: 0.6 * Math.sin(e * 8) }) : null; }

type Held = 'left' | 'right' | 'down' | 'guard' | 'chakra' | 'run';
type Edge = 'jump' | 'punch' | 'kick' | 'taunt';
const KEY: Record<string, Held | Edge> = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'jump', ' ': 'jump', Spacebar: 'jump',
  j: 'punch', J: 'punch', k: 'kick', K: 'kick', g: 'guard', G: 'guard', c: 'chakra', C: 'chakra', t: 'taunt', T: 'taunt', Shift: 'run',
};
const HELD = new Set<string>(['left', 'right', 'down', 'guard', 'chakra', 'run']);

type Act = 'none' | 'punch' | 'kick' | 'jump' | 'taunt' | 'dash';
type St = { action: Act; aT: number; posX: number; walkPhase: number; crouching: boolean; crouchT: number; label: string; combo: number; idleSince: number; airAtk: boolean; dashDir: number; struck: boolean; postHitT: number };

export default function Moveset2D({ slug, aura = null, caption }: { slug: string; aura?: string | null; caption?: string }) {
  const cfg = (moveset as unknown as Record<string, Cfg>)[slug];
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const actorRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const ghostRef = useRef<HTMLImageElement | null>(null);
  const speedRef = useRef<HTMLDivElement | null>(null);
  const dustRef = useRef<HTMLDivElement | null>(null);
  const auraRef = useRef<HTMLDivElement | null>(null);
  const modeAuraRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);
  const postRef = useRef<HTMLDivElement | null>(null);
  const sparkRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);

  const held = useRef({ left: false, right: false, down: false, guard: false, chakra: false, run: false });
  const want = useRef({ jump: false, punch: false, kick: false, taunt: false, dashL: false, dashR: false });
  const lastTap = useRef({ L: 0, R: 0 });
  const st = useRef<St>({ action: 'none', aT: 0, posX: 0, walkPhase: 0, crouching: false, crouchT: 0, label: '', combo: 0, idleSince: 0, airAtk: false, dashDir: 1, struck: false, postHitT: 0 });
  const t0 = useRef(0);
  const acRef = useRef<AudioContext | null>(null);
  const muteRef = useRef(false);
  const [muted, setMuted] = useState(false);
  const runToggleRef = useRef(false);          // mode course en BASCULE (mobile) ; Maj = maintien (clavier)
  const [runOn, setRunOn] = useState(false);
  const auraRefVal = useRef<string | null>(aura);
  auraRefVal.current = aura;
  const [started, setStarted] = useState(false);
  const [focused, setFocused] = useState(false);
  const startedRef = useRef(false);
  const start = () => {
    if (!acRef.current) { try { acRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); } catch { /* */ } }
    if (acRef.current && acRef.current.state === 'suspended') acRef.current.resume();
    if (!startedRef.current) { startedRef.current = true; setStarted(true); }
  };
  const sfx = (type: string) => { if (!muteRef.current) playSfx(acRef.current, type); };

  useEffect(() => {
    if (!cfg) return;
    ['idle', 'idle2', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'walk6', 'run1', 'run2', 'run3', 'run4', 'run5', 'run6', 'crouch', 'jump', 'punch_a', 'punch_b', 'kick_a', 'kick_b', 'kick_c', 'guard', 'chakra', 'taunt'].forEach((f) => { const im = new Image(); im.src = `${cfg.dir}/${f}.png${ASSET_V}`; });
  }, [cfg]);

  useEffect(() => {
    const clear = () => { const h = held.current; h.left = h.right = h.down = h.guard = h.chakra = h.run = false; };
    window.addEventListener('pointerup', clear); window.addEventListener('blur', clear);
    return () => { window.removeEventListener('pointerup', clear); window.removeEventListener('blur', clear); };
  }, []);

  useEffect(() => {
    if (!cfg) return;
    let raf = 0, prev = 0;
    const loop = (now: number) => {
      if (!t0.current) { t0.current = now; prev = now; st.current.idleSince = now; }
      const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
      const t = (now - t0.current) / 1000;
      const s = st.current;
      const adv = held.current.right, ret = held.current.left;
      const moveDir = (adv ? 1 : 0) - (ret ? 1 : 0);

      if (s.action === 'none') {
        if (want.current.taunt) { s.action = 'taunt'; s.aT = now; }
        else if (want.current.dashL || want.current.dashR) { s.action = 'dash'; s.dashDir = want.current.dashR ? 1 : -1; s.aT = now; sfx('dash'); }
        else if (want.current.punch) { s.action = 'punch'; s.aT = now; s.combo = 1; s.struck = false; sfx('punch'); }
        else if (want.current.kick) { s.action = 'kick'; s.aT = now; s.combo = 1; s.struck = false; sfx('kick'); }
        else if (want.current.jump) { s.action = 'jump'; s.aT = now; s.airAtk = false; sfx('jump'); }
      }

      let f: FX | undefined;
      if (s.action === 'punch' || s.action === 'kick') {
        let e = (now - s.aT) / 1000;
        if (e > 0.16 && (want.current.punch || want.current.kick)) {
          s.action = want.current.punch ? 'punch' : 'kick'; s.aT = now; s.combo = Math.min(9, s.combo + 1); s.struck = false; e = 0; sfx(s.action);
        }
        const r = s.action === 'punch' ? punchFX(e) : kickFX(e);
        if (!r) s.action = 'none'; else f = r;
        // impact sur le mannequin
        const impact = s.action === 'punch' ? (e >= 0.07 && e < 0.13) : (e >= 0.08 && e < 0.14);
        if (impact && !s.struck && Math.abs(s.posX - POST_X) < 13) { s.struck = true; s.postHitT = now; sfx('hit'); }
      } else if (s.action === 'jump') {
        const e = (now - s.aT) / 1000;
        if (e > 0.12 && e < 0.66 && (want.current.punch || want.current.kick) && !s.airAtk) { s.airAtk = true; sfx('kick'); }
        const r = jumpFX(e);
        if (!r) { s.action = 'none'; s.airAtk = false; }
        else { f = s.airAtk && r.frame === 'jump' ? { ...r, frame: 'kick_b', speed: 1, aura: 0.6, tx: 8 } : r; s.posX += moveDir * AIR_SPEED * dt; }
      } else if (s.action === 'taunt') {
        const r = tauntFX((now - s.aT) / 1000); if (!r) s.action = 'none'; else f = r;
      } else if (s.action === 'dash') {
        const e = (now - s.aT) / 1000;
        if (e < 0.22) { f = fx('walk1', { ghost: 0.6, speed: 1 }); s.posX += s.dashDir * DASH_SPEED * dt; } else s.action = 'none';
      }

      if (s.action === 'none') {
        if (held.current.guard) { s.combo = 0; s.idleSince = now; f = fx('guard', { ty: 0.4 * Math.sin(t * 3) }); }
        else if (held.current.chakra) { s.combo = 0; s.idleSince = now; f = fx('chakra', { ty: 0.5 * Math.sin(t * 5), aura: 0.6 + 0.4 * Math.abs(Math.sin(t * 7)), shake: 0.9 * Math.sin(t * 120), dust: 0.5 + 0.3 * Math.abs(Math.sin(t * 9)) }); }
        else if (held.current.down) {
          s.combo = 0; s.idleSince = now;
          if (!s.crouching) { s.crouching = true; s.crouchT = now; }
          const ce = (now - s.crouchT) / 1000;
          f = ce < 0.12 ? fx('crouch', { sy: 0.86 + 0.14 * (ce / 0.12), dust: (1 - ce / 0.12) * 0.5 }) : fx('crouch', { ty: 0.9 * Math.sin(t * 4.5) });
        } else if (moveDir !== 0) {
          s.combo = 0; s.idleSince = now; s.crouching = false;
          if (held.current.run || runToggleRef.current) {          // COURSE (cycle 6 frames, plus rapide, penché)
            s.walkPhase += dt / 0.075;
            const n = RUN_FRAMES.length, p = Math.floor(s.walkPhase) % n, frac = s.walkPhase - Math.floor(s.walkPhase);
            const idx = adv ? p : n - 1 - p;
            const bob = Math.abs(Math.sin((s.walkPhase * Math.PI) / 2.5));
            s.posX += (adv ? RUN_SPEED : -RUN_SPEED * 0.8) * dt;
            f = fx(RUN_FRAMES[idx], { ty: -2.2 * bob, dust: p % 2 === 0 && frac < 0.4 ? (0.4 - frac) * 0.7 : 0 });
          } else {                                                 // MARCHE (cycle 6 frames)
            s.walkPhase += dt / 0.13;
            const p = Math.floor(s.walkPhase) % 6, frac = s.walkPhase - Math.floor(s.walkPhase);
            const idx = adv ? p : 5 - p;
            const bob = Math.abs(Math.sin((s.walkPhase * Math.PI) / 3));
            s.posX += (adv ? WALK_SPEED : -RETREAT_SPEED) * dt;
            f = fx(['walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'walk6'][idx], { ty: -1.5 * bob, sy: 1 + 0.012 * bob, dust: (p === 0 || p === 3) && frac < 0.4 ? (0.4 - frac) * 0.6 : 0 });
          }
        } else {
          s.crouching = false; s.combo = 0;
          f = (now - s.idleSince) / 1000 > IDLE_BREAK ? fx('idle2', { ty: 0.8 * Math.sin(t * 2) }) : fx('idle', { ty: 1.2 * Math.sin(t * 2.2), sy: 1 + 0.012 * Math.sin(t * 2.2) });
        }
      } else { s.idleSince = now; }

      want.current.jump = want.current.punch = want.current.kick = want.current.taunt = want.current.dashL = want.current.dashR = false;
      const ff = f!;
      s.posX = Math.max(-MAXX, Math.min(MAXX, s.posX));

      const label = (s.action === 'punch' || s.action === 'kick') ? (s.combo >= 2 ? `COMBO ×${s.combo}` : s.action === 'punch' ? 'COUP DE POING' : 'COUP DE PIED')
        : s.action === 'jump' ? (s.airAtk ? 'COUP SAUTÉ' : 'SAUT') : s.action === 'taunt' ? 'PROVOCATION' : s.action === 'dash' ? 'DASH'
        : held.current.guard ? 'GARDE' : held.current.chakra ? 'CHARGE CHAKRA' : held.current.down ? 'ACCROUPI'
        : moveDir !== 0 && (held.current.run || runToggleRef.current) ? 'COURSE' : moveDir > 0 ? 'AVANCE' : moveDir < 0 ? 'RECULE' : (now - s.idleSince) / 1000 > IDLE_BREAK ? 'DÉTENTE' : 'REPOS';
      if (label !== s.label && labelRef.current) { labelRef.current.textContent = `★ ${label}`; s.label = label; }

      const screenTx = s.posX + ff.tx;
      const src = `${cfg.dir}/${ff.frame}.png${ASSET_V}`;
      if (imgRef.current && imgRef.current.getAttribute('src') !== src) imgRef.current.setAttribute('src', src);
      if (actorRef.current) actorRef.current.style.transform = `translate(${screenTx.toFixed(2)}%, ${ff.ty.toFixed(2)}%) scale(${ff.sx.toFixed(3)}, ${ff.sy.toFixed(3)})`;
      if (ghostRef.current) { ghostRef.current.style.opacity = String(ff.ghost * 0.3); if (ff.ghost > 0 && ghostRef.current.getAttribute('src') !== src) ghostRef.current.setAttribute('src', src); }
      if (speedRef.current) speedRef.current.style.opacity = String(ff.speed * 0.3);
      if (auraRef.current) auraRef.current.style.opacity = String(ff.aura * 0.4);
      // aura de forme (chakra mode) — persistante, pulsée
      if (modeAuraRef.current) modeAuraRef.current.style.opacity = auraRefVal.current ? String(0.45 + 0.25 * Math.abs(Math.sin(t * 5))) : '0';
      if (dustRef.current) { dustRef.current.style.opacity = String(ff.dust * 0.22); dustRef.current.style.transform = `scale(${(0.5 + ff.dust * 0.8).toFixed(2)})`; }
      if (stageRef.current) stageRef.current.style.transform = ff.shake ? `translate(${ff.shake.toFixed(1)}px, ${(ff.shake * 0.5).toFixed(1)}px)` : 'translate(0,0)';
      if (shadowRef.current) { const h = Math.max(0, -ff.ty) / JUMP_H; shadowRef.current.style.transform = `translateX(${s.posX.toFixed(2)}%) scaleY(${(1 - 0.5 * h).toFixed(2)})`; shadowRef.current.style.opacity = String(0.45 * (1 - 0.55 * h)); }
      // mannequin : recul + étincelle après un coup
      const he = (now - s.postHitT) / 1000;
      if (postRef.current) postRef.current.style.transform = he < 0.3 ? `rotate(${(7 * (1 - he / 0.3) * Math.sin(he * 60)).toFixed(1)}deg)` : 'rotate(0deg)';
      if (sparkRef.current) sparkRef.current.style.opacity = he < 0.18 ? String(1 - he / 0.18) : '0';

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cfg]);

  if (!cfg) return null;

  const imgStyle: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' };
  const tapDash = (side: 'left' | 'right') => {
    const now = performance.now();
    if (side === 'left') { if (now - lastTap.current.L < TAP_WIN) want.current.dashL = true; lastTap.current.L = now; }
    else { if (now - lastTap.current.R < TAP_WIN) want.current.dashR = true; lastTap.current.R = now; }
  };
  const onKey = (down: boolean) => (e: React.KeyboardEvent) => {
    const a = KEY[e.key]; if (!a) return; e.preventDefault();
    if (HELD.has(a)) { (held.current as Record<string, boolean>)[a] = down; if (down) { start(); if (a === 'left' || a === 'right') tapDash(a); } }
    else if (down && !e.repeat) { (want.current as Record<string, boolean>)[a] = true; start(); }
  };
  const hold = (k: Held) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); start(); (held.current as Record<string, boolean>)[k] = true; if (k === 'left' || k === 'right') tapDash(k); try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { } },
    onPointerUp: (e: React.PointerEvent) => { e.preventDefault(); (held.current as Record<string, boolean>)[k] = false; },
    onPointerCancel: () => { (held.current as Record<string, boolean>)[k] = false; },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
  const tap = (k: Edge) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); start(); (want.current as Record<string, boolean>)[k] = true; },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
  const toggleMute = () => { muteRef.current = !muteRef.current; setMuted(muteRef.current); };
  const toggleFull = () => { const el = wrapRef.current; if (!el) return; if (document.fullscreenElement) document.exitFullscreen?.()?.catch(() => {}); else el.requestFullscreen?.()?.catch(() => {}); };

  const padBtn: React.CSSProperties = { fontFamily: MONO, fontSize: 13, fontWeight: 800, cursor: 'pointer', userSelect: 'none', touchAction: 'none', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 11, border: '1px solid var(--bd2)', background: 'rgba(123,92,240,0.10)', color: '#9d86f5' };
  const atkBtn: React.CSSProperties = { fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 800, cursor: 'pointer', userSelect: 'none', touchAction: 'none', padding: '0 13px', height: 44, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 12, border: '1px solid rgba(240,160,30,0.5)', background: 'rgba(240,140,20,0.14)', color: '#f0a830' };
  const utilBtn: React.CSSProperties = { fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', userSelect: 'none', touchAction: 'none', padding: '0 12px', height: 38, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 20, border: '1px solid var(--bd2)', background: 'rgba(123,92,240,0.08)', color: 'var(--td2)' };
  const iconBtn: React.CSSProperties = { fontFamily: MONO, fontSize: 13, fontWeight: 700, cursor: 'pointer', userSelect: 'none', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid var(--bd2)', background: 'rgba(123,92,240,0.10)', color: 'var(--td2)' };

  return (
    <div ref={wrapRef} style={{ background: 'var(--bg2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span aria-hidden style={{ fontSize: 16 }}>🎮</span>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--td3)' }}>Entraînement — jouable</span>
        <span ref={labelRef} style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.12em', color: '#F0C040', textShadow: '0 0 8px #F0C04088' }} className="ak-blink">★ REPOS</span>
        <button type="button" aria-label={muted ? 'Activer le son' : 'Couper le son'} title={muted ? 'Son coupé' : 'Son actif'} style={iconBtn} onClick={toggleMute}>{muted ? '🔇' : '🔊'}</button>
        <button type="button" aria-label="Plein écran" title="Plein écran" style={iconBtn} onClick={toggleFull}>⛶</button>
      </div>
      {caption && (
        <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.08em', color: 'var(--td3)', marginTop: -4, marginBottom: 8 }}>{caption}</div>
      )}

      <div
        tabIndex={0} role="application" aria-label="Démo jouable Naruto — flèches bouger, J poing, K pied, G garde, C chakra, T provocation, double-tap pour foncer"
        onKeyDown={onKey(true)} onKeyUp={onKey(false)}
        onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); const h = held.current; h.left = h.right = h.down = h.guard = h.chakra = h.run = false; }}
        onPointerDown={(e) => { (e.currentTarget as HTMLElement).focus(); }}
        style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: '4 / 3', background: 'radial-gradient(120% 90% at 50% 18%, rgba(123,92,240,0.16), #0A0716)', border: `1px solid ${focused ? 'rgba(123,92,240,0.7)' : 'rgba(123,92,240,0.35)'}`, boxShadow: focused ? 'inset 0 0 30px rgba(0,0,0,0.6), 0 0 0 2px rgba(123,92,240,0.25)' : 'inset 0 0 30px rgba(0,0,0,0.6)', outline: 'none', cursor: focused ? 'default' : 'pointer' }}
      >
        <div ref={stageRef} style={{ position: 'absolute', inset: 0, willChange: 'transform' }}>
          <div aria-hidden style={{ position: 'absolute', left: '10%', right: '10%', bottom: '8%', height: 1, background: 'rgba(140,150,210,0.30)' }} />
          {/* mannequin d'entraînement (poteau en bois + cible) */}
          <div ref={postRef} aria-hidden style={{ position: 'absolute', left: `${50 + POST_X}%`, bottom: '8%', width: '7%', height: '34%', marginLeft: '-3.5%', transformOrigin: '50% 100%', willChange: 'transform' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '40% 40% 30% 30%', background: 'linear-gradient(90deg,#6b4a2b,#8a6238 45%,#5c3f24)', border: '1px solid #3a2715', boxShadow: 'inset -2px 0 0 rgba(0,0,0,0.25)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: '24%', height: '7%', background: 'repeating-linear-gradient(90deg,#caa46a 0 3px,#9c7a44 3px 6px)' }} />
            <div style={{ position: 'absolute', left: '50%', top: '34%', width: '70%', height: '22%', marginLeft: '-35%', borderRadius: '50%', border: '2px solid #d6452f', background: 'radial-gradient(circle,#e9d9b8 30%,#cf8a4a 31% 60%,#d6452f 61%)' }} />
          </div>
          <div ref={sparkRef} aria-hidden style={{ position: 'absolute', left: `${50 + POST_X}%`, bottom: '24%', width: '12%', height: '12%', marginLeft: '-6%', opacity: 0, pointerEvents: 'none', background: 'radial-gradient(circle, #fff 0%, #ffe07a 30%, rgba(255,150,30,0.5) 55%, transparent 70%)', borderRadius: '50%' }} />
          <div ref={shadowRef} aria-hidden style={{ position: 'absolute', left: '38%', right: '38%', bottom: '6%', height: 14, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,0.45), transparent 70%)', transformOrigin: 'center bottom', willChange: 'transform' }} />
          {/* acteur */}
          <div ref={actorRef} style={{ position: 'absolute', inset: 0, willChange: 'transform', transformOrigin: '50% 96%' }}>
            <div ref={modeAuraRef} aria-hidden style={{ position: 'absolute', left: '50%', top: '50%', width: '92%', height: '92%', transform: 'translate(-50%,-50%)', opacity: 0, pointerEvents: 'none', background: `radial-gradient(circle, ${aura || '#ff9c1e'}cc 0%, ${aura || '#ff9c1e'}55 42%, transparent 70%)`, filter: 'blur(1px)' }} />
            <div ref={auraRef} aria-hidden style={{ position: 'absolute', left: '50%', top: '50%', width: '85%', height: '85%', transform: 'translate(-50%,-50%)', opacity: 0, pointerEvents: 'none', background: 'radial-gradient(circle, rgba(255,150,30,0.6) 0%, rgba(255,110,10,0.28) 40%, transparent 68%)' }} />
            <div ref={speedRef} aria-hidden style={{ position: 'absolute', left: '24%', right: '6%', top: '34%', height: '18%', opacity: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, rgba(205,232,255,0.55) 0 1px, transparent 1px 11px)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 35%, #000 80%, transparent)', maskImage: 'linear-gradient(90deg, transparent, #000 35%, #000 80%, transparent)' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={ghostRef} src={`${cfg.dir}/idle.png${ASSET_V}`} alt="" aria-hidden style={{ ...imgStyle, opacity: 0, transform: 'translate(-6%, 0)' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} src={`${cfg.dir}/idle.png${ASSET_V}`} alt="Naruto" style={imgStyle} />
            <div ref={dustRef} aria-hidden style={{ position: 'absolute', left: '40%', bottom: '5%', width: '24%', height: '11%', transform: 'scale(0.5)', transformOrigin: 'center bottom', opacity: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 100%, rgba(220,210,190,0.7) 0%, rgba(200,190,170,0.25) 45%, transparent 70%)' }} />
          </div>
        </div>
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: scan, mixBlendMode: 'multiply', pointerEvents: 'none' }} />
        {!started && !focused && (
          <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'rgba(10,7,22,0.35)' }}>
            <span className="ak-blink" style={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', color: '#cdb6ff', textShadow: '0 0 12px rgba(123,92,240,0.6)' }}>▶ CLIQUE PUIS JOUE AU CLAVIER</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <button type="button" aria-label="Sauter" style={padBtn} {...tap('jump')}>↑</button>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" aria-label="Reculer" style={padBtn} {...hold('left')}>←</button>
            <button type="button" aria-label="Accroupir" style={padBtn} {...hold('down')}>↓</button>
            <button type="button" aria-label="Avancer" style={padBtn} {...hold('right')}>→</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" aria-label="Coup de poing" style={atkBtn} {...tap('punch')}>👊 Poing</button>
          <button type="button" aria-label="Coup de pied" style={atkBtn} {...tap('kick')}>🦵 Pied</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
        <button type="button" aria-pressed={runOn} aria-label="Mode course (activer/désactiver)" style={{ ...utilBtn, ...(runOn ? { background: 'rgba(240,140,20,0.18)', borderColor: 'rgba(240,160,30,0.6)', color: '#f0a830' } : {}) }} onClick={() => { runToggleRef.current = !runToggleRef.current; setRunOn(runToggleRef.current); }}>🏃 Courir{runOn ? ' ✓' : ''}</button>
        <button type="button" aria-label="Garde" style={utilBtn} {...hold('guard')}>🛡 Garde</button>
        <button type="button" aria-label="Charge chakra" style={utilBtn} {...hold('chakra')}>🌀 Chakra</button>
        <button type="button" aria-label="Provocation" style={utilBtn} {...tap('taunt')}>😎 Provoc</button>
      </div>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', textAlign: 'center', marginTop: 9, fontStyle: 'italic', lineHeight: 1.5 }}>
        Frappe le mannequin 🪵 · <b style={{ color: 'var(--td2)' }}>→</b> avancer · <b style={{ color: 'var(--td2)' }}>←</b> reculer · <b style={{ color: 'var(--td2)' }}>Maj</b> ou <b style={{ color: 'var(--td2)' }}>🏃</b> courir · <b style={{ color: 'var(--td2)' }}>↓</b> accroupir · <b style={{ color: 'var(--td2)' }}>↑</b> sauter · <b style={{ color: 'var(--td2)' }}>J</b> poing · <b style={{ color: 'var(--td2)' }}>K</b> pied · <b style={{ color: 'var(--td2)' }}>J·J·K</b> combo · <b style={{ color: 'var(--td2)' }}>double-tap</b> dash · <b style={{ color: 'var(--td2)' }}>G</b> garde · <b style={{ color: 'var(--td2)' }}>C</b> chakra · <b style={{ color: 'var(--td2)' }}>T</b> provoc
      </div>
    </div>
  );
}
