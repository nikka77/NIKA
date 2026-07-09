// components/akasha/MoreUniverseIcons.tsx — icônes-médaillon bespoke des axes des univers
// Bleach / Hunter × Hunter / JoJo / Initial D / Death Note (Partie 3, lot final).
// Jeu maison flat (recraft vectoriel, SVG transparent) + sceaux numérotés du Gotei 13 rendus en code.
// Consommé par le hub /learn/akasha/u/[slug] (mêmes boutons-médaillon que Naruto/One Piece/Dragon Ball).
import type { ReactNode } from 'react';

const BASE = '/images/akasha/universes';

// slug d'univers → sous-dossier d'icônes.
const FOLDER: Record<string, string> = {
  bleach: 'bleach-icons',
  'hunter-x-hunter': 'hxh-icons',
  jojo: 'jojo-icons',
  'initial-d': 'initiald-icons',
  'death-note': 'deathnote-icons',
};

// slug → axe → { valeur de taxonomy : nom de fichier SVG }.
const REGISTRY: Record<string, Record<string, Record<string, string>>> = {
  bleach: {
    race: {
      'Shinigami': 'shinigami', 'Hollow': 'hollow', 'Arrancar': 'arrancar', 'Quincy': 'quincy',
      'Humain': 'humain', 'Fullbringer': 'fullbringer', 'Visored': 'visored',
    },
  },
  'hunter-x-hunter': {
    nen: {
      'Renforcement': 'renforcement', 'Émission': 'emission', 'Transformation': 'transformation',
      'Matérialisation': 'materialisation', 'Manipulation': 'manipulation', 'Spécialisation': 'specialisation',
    },
  },
  jojo: {
    partie: {
      'Partie 1-2': 'partie-1-2', 'Partie 3': 'partie-3', 'Partie 4': 'partie-4',
      'Partie 5': 'partie-5', 'Partie 6': 'partie-6',
    },
  },
  'initial-d': {
    affiliation: {
      'Project D': 'project-d', 'Akagi RedSuns': 'akagi-redsuns', 'Myogi NightKids': 'myogi-nightkids',
      'Akina SpeedStars': 'akina-speedstars', 'Impact Blue': 'impact-blue', 'Team Emperor': 'team-emperor',
    },
    col: {
      'Mont Akina': 'mont-akina', 'Mont Akagi': 'mont-akagi', 'Mont Myōgi': 'mont-myogi',
      'Col d’Usui': 'col-usui', 'Irohazaka': 'irohazaka',
    },
  },
  'death-note': {
    camp: {
      'Kira': 'kira', 'Cellule d’enquête': 'cellule-enquete', 'SPK': 'spk',
      'Wammy’s House': 'wammys-house', 'Yotsuba': 'yotsuba', 'Shinigami': 'shinigami',
    },
  },
};

/** Sceau numéroté d'une division du Gotei 13 (rendu en code, cohérent quel que soit le numéro). */
function GoteiSeal({ value, size }: { value: string; size: number }) {
  const n = value.match(/\d+/)?.[0] ?? '?';
  return (
    <span aria-hidden style={{
      width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '50%', border: '2px solid #5A88B0', background: 'radial-gradient(circle at 50% 35%, #12314D, #0A1A2A)',
      color: '#BFE0F5', fontFamily: 'var(--fe)', fontWeight: 900, fontStyle: 'italic',
      fontSize: size * (n.length > 1 ? 0.42 : 0.54), lineHeight: 1, boxShadow: 'inset 0 0 0 3px rgba(90,136,176,0.18)',
    }}>{n}</span>
  );
}

/** Icône-médaillon d'un chip d'axe (Bleach/HxH/JoJo/Initial D/Death Note), ou null si non mappé. */
export function moreAxisIcon(slug: string, attr: string, value: string, size = 48): ReactNode {
  if (slug === 'bleach' && attr === 'division') return <GoteiSeal value={value} size={size} />;
  const file = REGISTRY[slug]?.[attr]?.[value];
  if (!file) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`${BASE}/${FOLDER[slug]}/${file}.svg`} alt={value} width={size} height={size}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }} />
  );
}
