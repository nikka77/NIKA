// components/akasha/UniverseShell.tsx — chrome hero partagé du monde : dégradé signature, motif
// canon en filigrane, kanji, halo qui suit le pointeur, grain de film + vignette. PUR DÉPLACEMENT
// (lot 1b) du bloc hero déjà écrit dans u/[slug]/page.tsx — zéro donnée neuve, zéro requête neuve :
// chaque appelant passe ce qu'il calcule déjà (universeMeta, hubVisual, taxonomyByName/Slug).
// Objectif : le chrome du monde suit le lecteur du hub jusqu'à la fiche la plus mineure, sans que
// ce composant ne décide jamais QUOI afficher dedans — ça reste le contenu de chaque route.
import type { ReactNode } from 'react';
import HubHalo from './hub/HubHalo';

export default function UniverseShell({
  color,
  heroGradient,
  bgPattern,
  kanji,
  banner,
  padding = 'clamp(2.2rem,5vw,3.6rem) 1.4rem 1.8rem',
  halo = true,
  children,
}: {
  /** Couleur d'accent de l'univers (universeMeta(name).color) — seule valeur obligatoire. */
  color: string;
  /** Dégradé bi-teinte du hero (HubVisual.heroGradient). Repli : dégradé uni depuis `color`. */
  heroGradient?: string;
  /** Motif SVG canon en data-URI (HubVisual.bgPattern). Absent → pas de motif. */
  bgPattern?: string;
  /** Kanji/glyphe en filigrane (UniverseTaxonomy.kanji). Absent → pas de filigrane. */
  kanji?: string;
  /** Bannière d'ambiance plein cadre (universeBanner(name)). Absent → pas de bannière. */
  banner?: string | null;
  /** Le hero du hub est plus haut que ceux des fiches/pages d'axe — chaque appelant garde le sien. */
  padding?: string;
  /** Halo qui suit le pointeur (desktop fin) — coupé sur les heros compacts si besoin. */
  halo?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="ak-hub-grain"
      style={{
        background: heroGradient ?? `linear-gradient(180deg, ${color}2E 0%, ${color}0C 55%, var(--bg) 100%)`,
        borderBottom: '1px solid var(--bd)',
        padding,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {banner && (
        <>
          <div
            aria-hidden
            style={{ position: 'absolute', inset: 0, backgroundImage: `url(${banner})`, backgroundSize: 'cover', backgroundPosition: 'center 32%', zIndex: 0 }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              background:
                'linear-gradient(90deg, color-mix(in srgb, var(--bg) 94%, transparent) 0%, color-mix(in srgb, var(--bg) 66%, transparent) 40%, color-mix(in srgb, var(--bg) 20%, transparent) 72%, transparent 100%), linear-gradient(180deg, color-mix(in srgb, var(--bg) 64%, transparent) 0%, transparent 32%, color-mix(in srgb, var(--bg) 82%, transparent) 84%, var(--bg) 100%)',
            }}
          />
        </>
      )}
      {bgPattern && <div className="ak-hub-pattern" aria-hidden style={{ ['--ak-bg' as string]: bgPattern, zIndex: 1 }} />}
      {halo && <HubHalo color={color} />}
      {kanji && (
        <div
          className="ak-kanji-drift"
          aria-hidden
          style={{
            position: 'absolute',
            top: '-0.3em',
            right: '-0.05em',
            fontFamily: 'var(--fe)',
            fontSize: 'clamp(120px,26vw,300px)',
            fontWeight: 900,
            color: `${color}14`,
            lineHeight: 1,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {kanji}
        </div>
      )}
      <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
    </div>
  );
}
