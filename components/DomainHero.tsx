// components/DomainHero.tsx — fond cinématique de section domaine (Higgsfield).
// Remplace l'ancien filigrane emoji. Image plein cadre + scrim pour la lisibilité
// du titre. Retombe sur rien (le gradient de la section reste visible) si l'asset
// n'existe pas encore dans lib/visuals.ts.
import { visual } from '@/lib/visuals';
import ScrollVideo from '@/components/ScrollVideo';

export default function DomainHero({ slug }: { slug: string }) {
  const asset = visual('heroes', slug);
  if (!asset.poster) return null;
  return (
    <>
      <ScrollVideo
        poster={asset.poster}
        video={asset.video}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5, zIndex: 0 }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background:
            'linear-gradient(180deg, rgba(5,12,23,0.55) 0%, rgba(5,12,23,0.25) 45%, var(--bg) 100%), ' +
            'linear-gradient(90deg, var(--bg) 0%, rgba(5,12,23,0.40) 45%, transparent 82%)',
        }}
      />
    </>
  );
}
