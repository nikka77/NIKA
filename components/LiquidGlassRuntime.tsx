'use client';
// components/LiquidGlassRuntime.tsx — moteur liquid glass de toute l'app (skill ~/.claude/skills/liquid-glass).
// Monté UNE fois dans app/layout.tsx. Applique la réfraction (lib vendorisée lib/liquid-glass.js) à tout
// élément portant data-liquid-glass="bar|capsule|panel" — les Server Components n'ont donc qu'à poser
// l'attribut HTML — plus les sélecteurs tiers (chrome rendu par MapLibre, sans JSX à taguer).
// MutationObserver : couvre les montées/démontées (dropdowns, AnimatePresence, navigations App Router).
import { useEffect } from 'react';
import type { LiquidGlassHandle, LiquidGlassOptions } from '@/lib/liquid-glass';

const PRESETS: Record<string, LiquidGlassOptions> = {
  bar: { scale: -70, chroma: 5, blur: 12, saturate: 1.5 },      // barres bord-à-bord (nav, sticky, topbars)
  capsule: { scale: -90, chroma: 6, blur: 10, saturate: 1.6 },  // capsules/pilules flottantes
  panel: { scale: -60, chroma: 4, blur: 12, saturate: 1.4 },    // panneaux, widgets, dropdowns, dialogues
};
const EXTRA_SELECTORS = '.maplibregl-ctrl-group';

export default function LiquidGlassRuntime() {
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let mo: MutationObserver | null = null;
    const handles = new Map<Element, LiquidGlassHandle>();

    const scan = () => {
      const lg = window.liquidGlass;
      if (!lg) return;
      handles.forEach((h, el) => { if (!el.isConnected) { h.destroy(); handles.delete(el); } });
      document.querySelectorAll(`[data-liquid-glass], ${EXTRA_SELECTORS}`).forEach(el => {
        if (handles.has(el)) return;
        const preset = PRESETS[(el as HTMLElement).dataset?.liquidGlass ?? ''] ?? PRESETS.panel;
        handles.set(el, lg(el, preset));
      });
    };

    import('@/lib/liquid-glass.js').then(() => {
      if (!alive || !window.liquidGlass) return;
      scan();
      mo = new MutationObserver(() => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(scan, 120);
      });
      mo.observe(document.body, { childList: true, subtree: true });
    });

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      mo?.disconnect();
      handles.forEach(h => h.destroy());
      handles.clear();
    };
  }, []);

  return null;
}
