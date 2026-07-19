// components/akasha/glyphs.tsx — glyphes typographiques du module AKASHA (ZÉRO emoji).
// Monogrammes façon Linear : pastille arrondie, initiales Exo 2 italic 900 dans la couleur
// d'univers. Utilisables en Server et Client Components (purs, sans état).
import { universeMeta } from '@/lib/akasha/types';

// Codes courts par univers — 1-2 lettres, uniques, lisibles à 22 px.
const CODES: Record<string, string> = {
  'Naruto': 'N',
  'One Piece': 'OP',
  'Dragon Ball': 'DB',
  'Bleach': 'BL',
  'Hunter x Hunter': 'HH',
  "JoJo's Bizarre Adventure": 'JJ',
  'Initial D': 'ID',
  'Death Note': 'DN',
};
export const universeCode = (name: string): string => CODES[name] ?? name.slice(0, 1).toUpperCase();

function Mono({ code, color, size }: { code: string; color: string; size: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size, height: size, borderRadius: Math.round(size * 0.3), flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: `${color}14`, border: `1px solid ${color}50`, color,
        fontFamily: 'var(--fe)', fontWeight: 900, fontStyle: 'italic',
        fontSize: Math.round(size * (code.length > 1 ? 0.42 : 0.54)),
        lineHeight: 1, letterSpacing: '-0.02em',
      }}
    >
      {code}
    </span>
  );
}

/** Monogramme d'un univers (pastille couleur + initiales). */
export function UniverseGlyph({ name, size = 26 }: { name: string; size?: number }) {
  return <Mono code={universeCode(name)} color={universeMeta(name).color} size={size} />;
}

/** Monogramme du module AKASHA (violet LEARN). */
export function AkashaGlyph({ size = 26 }: { size?: number }) {
  return <Mono code="AK" color="#7B5CF0" size={size} />;
}

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
