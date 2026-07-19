// components/akasha/MoreUniverseIcons.tsx — icônes-médaillon bespoke des axes des univers
// Bleach / Hunter × Hunter / JoJo / Initial D / Death Note (Partie 3, lot final).
// Jeu maison flat (recraft vectoriel, SVG transparent) + sceaux numérotés du Gotei 13 rendus en code.
// Consommé par le hub /learn/akasha/u/[slug] (mêmes boutons-médaillon que Naruto/One Piece/Dragon Ball).
import type { ReactNode } from 'react';
import Image from 'next/image';

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
      'Shinigami': 'shinigami.svg', 'Hollow': 'hollow.webp', 'Arrancar': 'arrancar.svg', 'Quincy': 'quincy.svg',
      'Humain': 'humain.svg', 'Fullbringer': 'fullbringer.svg', 'Visored': 'visored.webp',
    },
  },
  'hunter-x-hunter': {
    nen: {
      'Renforcement': 'renforcement.svg', 'Émission': 'emission.webp', 'Transformation': 'transformation.svg',
      'Matérialisation': 'materialisation.svg', 'Manipulation': 'manipulation.svg', 'Spécialisation': 'specialisation.svg',
    },
  },
  jojo: {
    partie: {
      'Partie 1-2': 'partie-1-2.svg', 'Partie 3': 'partie-3.svg', 'Partie 4': 'partie-4.svg',
      'Partie 5': 'partie-5.svg', 'Partie 7': 'partie-7.webp', 'Partie 8': 'partie-8.webp', 'Partie 6': 'partie-6.svg',
    },
  },
  'initial-d': {
    affiliation: {
      'Project D': 'project-d.svg', 'Akagi RedSuns': 'akagi-redsuns.svg', 'Myogi NightKids': 'myogi-nightkids.svg',
      'Akina SpeedStars': 'akina-speedstars.svg', 'Impact Blue': 'impact-blue.svg', 'Team Emperor': 'team-emperor.svg',
    },
    col: {
      'Mont Akina': 'mont-akina.svg', 'Mont Akagi': 'mont-akagi.svg', 'Mont Myōgi': 'mont-myogi.svg',
      'Col d’Usui': 'col-usui.webp', 'Irohazaka': 'irohazaka.svg',
    },
  },
  'death-note': {
    camp: {
      'Kira': 'kira.svg', 'Cellule d’enquête': 'cellule-enquete.svg', 'SPK': 'spk.svg',
      'Wammy’s House': 'wammys-house.svg', 'Yotsuba': 'yotsuba.svg', 'Shinigami': 'shinigami.svg',
    },
  },
};

/** Sceau numéroté d'une division du Gotei 13 (rendu en code, cohérent quel que soit le numéro). */
function GoteiSeal({ value, size }: { value: string; size: number }) {
  const n = value.match(/\d+/)?.[0] ?? '?';
  return (
    <span aria-hidden style={{
      width: size, height: size, display: 'inline-flex.svg', alignItems: 'center.svg', justifyContent: 'center.svg',
      borderRadius: '50%', border: '2px solid #5A88B0', background: 'radial-gradient(circle at 50% 35%, #12314D, #0A1A2A)',
      color: '#BFE0F5', fontFamily: 'var(--fe)', fontWeight: 900, fontStyle: 'italic.svg',
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
    <Image src={`${BASE}/${FOLDER[slug]}/${file}`} alt={value} width={size} height={size} unoptimized
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }} />
  );
}
