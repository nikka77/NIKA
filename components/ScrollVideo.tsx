'use client';
// components/ScrollVideo.tsx — média de fond intelligent.
// Affiche le poster (image) instantanément ; si une vidéo existe ET que les
// conditions le permettent, elle se lit en boucle muette UNIQUEMENT quand le
// bloc est visible (IntersectionObserver) puis se met en pause en sortie.
// Respecte prefers-reduced-motion + Data Saver / connexion lente → poster seul.
import { useEffect, useRef, useState } from 'react';

interface ScrollVideoProps {
  poster: string;
  video?: string;
  style?: React.CSSProperties;
  className?: string;
}

export default function ScrollVideo({ poster, video, style, className }: ScrollVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);

  // Décide une seule fois si on autorise la vidéo (sinon : poster seul)
  useEffect(() => {
    if (!video) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const slow = !!conn && (conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType || ''));
    if (!reduced && !slow) setEnabled(true);
  }, [video]);

  // Lecture/pause selon visibilité
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) el.play().catch(() => {});
          else el.pause();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);

  if (video && enabled) {
    return (
      <video
        ref={ref}
        src={video}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
        tabIndex={-1}
        className={className}
        style={style}
      />
    );
  }
  return <img src={poster} alt="" aria-hidden className={className} style={style} />;
}
