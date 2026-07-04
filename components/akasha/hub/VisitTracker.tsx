'use client';
// components/akasha/hub/VisitTracker.tsx — enregistre la dernière fiche vue PAR UNIVERS
// (localStorage nika:akasha:last:<universe>) pour alimenter le bandeau « Continuer » du hub.
import { useEffect } from 'react';

export default function VisitTracker({ slug, name, universe, image }: { slug: string; name: string; universe: string | null; image: string | null }) {
  useEffect(() => {
    if (!universe) return;
    try {
      localStorage.setItem(`nika:akasha:last:${universe}`, JSON.stringify({ slug, name, image, at: Date.now() }));
    } catch { /* stockage indisponible */ }
  }, [slug, name, universe, image]);
  return null;
}
