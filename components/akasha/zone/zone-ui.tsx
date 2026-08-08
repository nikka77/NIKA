'use client';
// components/akasha/zone/zone-ui.tsx — primitives partagées du langage v2 « zéro carte » pour les
// zones dé-cartées du LOT 5 (C3-2 : CharacterZone, OrganizationZone). PAS une 4ᵉ zone, PAS une
// fusion des composants — l'extraction incrémentale que l'arbitrage B (tasks/akasha-architecture.md
// §1.1) autorise explicitement : les trois zones restent trois fichiers, mais elles peuvent
// partager les DEUX primitives que C3-2 nomme (le canal en région à filet supérieur, le chip en
// lien-compteur minimal) plutôt que de redupliquer un 3ᵉ objet de style identique.
// EraZone NE consomme PAS ce fichier : jugée non digne d'être touchée par C3-2 (14 fiches, 0,18 %
// du corpus, ET déjà promise à une fusion dans EntityZone « au LOT 5 » — §8 question 3 — la
// restyler maintenant serait un pari sur l'ordre d'exécution des deux chantiers du même lot).
import Link from 'next/link';

/** Canal ex-carte → région : plus de boîte (border 4 côtés + radius + fond plein), seulement le
 *  filet supérieur qui portait déjà l'accent de l'univers. Même idiome que `.ak-dossier`
 *  (globals.css) : un hairline + un padding-top, rien d'autre — le site a déjà cette grammaire
 *  ailleurs, C3-2 l'étend au canal plutôt que d'en inventer une nouvelle. */
export function CanalRegion({ accent, children }: { accent: string; children: React.ReactNode }) {
  return <div style={{ borderTop: `2px solid ${accent}`, paddingTop: 16 }}>{children}</div>;
}

/** Chip ex-pilule (border + fond + radius) → lien-compteur minimal : texte pur, l'état actif se
 *  dit par la couleur et un filet SOUS le mot — jamais une boîte, même vocabulaire que le filet du
 *  canal. Porte TOUJOURS `onClick` (re-scope du canal) ou `href` (navigation directe, ex. arsenal
 *  d'OrganizationZone) : la mécanique interactive ne change pas, seul l'habillage disparaît —
 *  arbitrage D, le canal re-scopable reste le seul levier de curiosité du site, on ne le
 *  fragilise pas ici. */
export function ChipLink({ accent, active, href, onClick, title, children }: {
  accent: string; active?: boolean; href?: string; onClick?: () => void; title?: string; children: React.ReactNode;
}) {
  // NAVIGATION PURE (href sans `active`) : ce chip n'a AUCUN état, donc sa couleur ne peut pas se
  // dire par l'activation — il porte son accent AU REPOS. Sans cette branche, `active` reste
  // toujours faux et l'accent n'est JAMAIS rendu : c'est exactement ce qui a effacé l'or #D4A017
  // de l'« Arsenal & navires » d'One Piece le 08/08 (couleur calculée, jamais peinte). Le filet
  // sous le mot, lui, reste réservé à l'état actif : il dit « c'est ceci que le canal montre ».
  const statique = href !== undefined && active === undefined;
  const style: React.CSSProperties = {
    fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700,
    padding: '2px 1px', margin: 0, border: 'none', borderRadius: 0, background: 'none',
    borderBottom: `1px solid ${active ? accent : 'transparent'}`,
    color: active || statique ? accent : 'var(--td2)', cursor: 'pointer', textDecoration: 'none',
    display: 'inline-flex', alignItems: 'center', lineHeight: 1.3,
  };
  if (href) {
    return <Link href={href} className="ak-tab" title={title} style={style}>{children}</Link>;
  }
  return (
    <button type="button" onClick={onClick} aria-pressed={!!active} className="ak-tab" title={title} style={style}>
      {children}
    </button>
  );
}
