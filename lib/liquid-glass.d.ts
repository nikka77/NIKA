// Types du module vendorisé lib/liquid-glass.js (IIFE → window.liquidGlass).
export {};

export interface LiquidGlassOptions {
  scale?: number;
  chroma?: number;
  border?: number;
  mapBlur?: number;
  blur?: number;
  saturate?: number;
  radius?: number | null;
  fallbackBlur?: number;
}

export interface LiquidGlassHandle {
  supported: boolean;
  refresh: () => void;
  destroy: () => void;
}

declare global {
  interface Window {
    liquidGlass?: (el: Element, opts?: LiquidGlassOptions) => LiquidGlassHandle;
  }
}
