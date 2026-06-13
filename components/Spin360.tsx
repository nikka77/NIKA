'use client';
// components/Spin360.tsx — visuel gamifié avec rotation 360° au survol/clic
//
// 3 niveaux de rendu, du plus riche au fallback :
//   1. video (loop 360°) + poster  → joué au survol/focus
//   2. poster seul (image clé)      → image statique
//   3. emoji                        → podium + spin pseudo-3D au survol (zéro asset)
//
// Toujours sûr à rendre depuis un Server Component (props sérialisables only).

import { useRef } from 'react';

interface Spin360Props {
  emoji?: string;
  poster?: string;
  video?: string;
  alt: string;
  /** Couleur du rim-light (défaut bleu azur). */
  accent?: string;
  /** Diamètre en px (défaut 64). */
  size?: number;
}

export default function Spin360({
  emoji,
  poster,
  video,
  alt,
  accent = 'var(--az2)',
  size = 64,
}: Spin360Props) {
  const ref = useRef<HTMLVideoElement>(null);

  const play = () => {
    const v = ref.current;
    if (v) { v.currentTime = 0; v.play().catch(() => {}); }
  };
  const stop = () => {
    const v = ref.current;
    if (v) { v.pause(); v.currentTime = 0; }
  };

  return (
    <span
      className="spin360"
      style={{ width: size, height: size, ['--spin-accent' as string]: accent }}
      onMouseEnter={video ? play : undefined}
      onMouseLeave={video ? stop : undefined}
      onFocus={video ? play : undefined}
      onBlur={video ? stop : undefined}
      tabIndex={video ? 0 : undefined}
    >
      {video ? (
        <video
          ref={ref}
          className="spin360-media"
          poster={poster}
          muted
          loop
          playsInline
          preload="none"
          aria-label={alt}
        >
          <source src={video} type="video/webm" />
        </video>
      ) : poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="spin360-media" src={poster} alt={alt} loading="lazy" />
      ) : (
        <span className="spin360-emoji" role="img" aria-label={alt} style={{ fontSize: size * 0.46 }}>
          {emoji}
        </span>
      )}
    </span>
  );
}
