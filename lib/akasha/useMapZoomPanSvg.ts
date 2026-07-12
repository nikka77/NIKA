'use client';
// lib/akasha/useMapZoomPanSvg.ts — pan/zoom partagé pour les cartes SVG en viewBox pixel-space
// (OnePieceMap, NarutoWorldMap). Extrait après stabilisation des 2 cartes (L19, dernier du lot
// Niveau 2) pour éviter les régressions : logique reprise à l'identique, aucun comportement changé
// — seul le pincement multi-touch (déjà présent côté One Piece) profite désormais aussi à Naruto.
import { useEffect, useRef, useState } from 'react';

export type MapView = { x: number; y: number; w: number; h: number };

export function useMapZoomPanSvg({ w, h, minW, maxW = w }: { w: number; h: number; minW: number; maxW?: number }) {
  const FULL: MapView = { x: 0, y: 0, w, h };
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<MapView>(FULL);

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const pinch = useRef<{ dist: number } | null>(null);

  const clamp = (v: MapView): MapView => {
    const vw = Math.min(v.w, w), vh = Math.min(v.h, h);
    return { w: vw, h: vh, x: Math.max(0, Math.min(v.x, w - vw)), y: Math.max(0, Math.min(v.y, h - vh)) };
  };

  // Zoom molette (Ctrl/⌘).
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width, py = (e.clientY - rect.top) / rect.height;
      setView((v) => {
        const f = e.deltaY < 0 ? 0.82 : 1.22;
        const nw = Math.min(maxW, Math.max(minW, v.w * f));
        const k = nw / v.w;
        const cx = v.x + px * v.w, cy = v.y + py * v.h;
        return clamp({ x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k, w: nw, h: v.h * k });
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, minW, maxW]);

  const zoomAround = (f: number, px = 0.5, py = 0.5) => setView((v) => {
    const nw = Math.min(maxW, Math.max(minW, v.w * f)), k = nw / v.w;
    const cx = v.x + px * v.w, cy = v.y + py * v.h;
    return clamp({ x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k, w: nw, h: v.h * k });
  });

  const reset = () => setView(FULL);

  // Pointeurs : 1 = pan, 2 = pinch (mobile).
  const svgPt = (cx: number, cy: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { fx: (cx - r.left) / r.width, fy: (cy - r.top) / r.height, rw: r.width, rh: r.height };
  };
  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (pointers.current.size === 1) drag.current = { x: e.clientX, y: e.clientY, moved: false };
    else if (pointers.current.size === 2) { drag.current = null; const p = [...pointers.current.values()]; pinch.current = { dist: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) }; }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !svgRef.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && pinch.current) {
      const p = [...pointers.current.values()];
      const dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      const midX = (p[0].x + p[1].x) / 2, midY = (p[0].y + p[1].y) / 2;
      const { fx, fy } = svgPt(midX, midY);
      const f = pinch.current.dist / (dist || 1);
      pinch.current = { dist };
      setView((v) => { const nw = Math.min(maxW, Math.max(minW, v.w * f)), k = nw / v.w; const cx = v.x + fx * v.w, cy = v.y + fy * v.h; return clamp({ x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k, w: nw, h: v.h * k }); });
      return;
    }
    if (!drag.current) return;
    const { rw, rh } = svgPt(e.clientX, e.clientY);
    const dx = (e.clientX - drag.current.x) * (view.w / rw);
    const dy = (e.clientY - drag.current.y) * (view.h / rh);
    if (Math.abs(e.clientX - drag.current.x) + Math.abs(e.clientY - drag.current.y) > 3) drag.current.moved = true;
    drag.current = { x: e.clientX, y: e.clientY, moved: drag.current.moved };
    setView((v) => clamp({ ...v, x: v.x - dx, y: v.y - dy }));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
    if (pointers.current.size === 1) { const [p] = [...pointers.current.values()]; drag.current = { x: p.x, y: p.y, moved: true }; }
    else if (pointers.current.size === 0) drag.current = null;
  };

  return { view, setView, svgRef, clamp, zoomAround, reset, dragRef: drag, onPointerDown, onPointerMove, onPointerUp };
}
