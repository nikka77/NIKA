'use client';
// lib/akasha/useFullscreenToggle.ts — bascule plein écran d'un conteneur, reprise à l'identique
// dans OnePieceMap, DragonBallCosmos et Moveset2D (audit de précision Niveau 3).
import { useCallback, type RefObject } from 'react';

export function useFullscreenToggle(ref: RefObject<HTMLElement | null>) {
  return useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.()?.catch(() => {});
    else el.requestFullscreen?.()?.catch(() => {});
  }, [ref]);
}
