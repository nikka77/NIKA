// components/akasha/glyphs.tsx — glyphes SVG du module AKASHA (ZÉRO emoji).
// Les identités d'univers passent par leurs WORDMARKS canon (universeWordmark) — décision Dan :
// ni emoji, ni monogramme typographique. Ici ne vivent que les glyphes utilitaires.

/** Loupe de recherche — trait SVG hairline, hérite de currentColor. */
export function SearchGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}
