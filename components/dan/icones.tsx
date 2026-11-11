// components/dan/icones.tsx — pictos trait (24×24, stroke = currentColor) des cartes DAN.
import type { IconeService, UniversGout } from '@/lib/dan/cartes';

const P: Record<IconeService, React.ReactNode> = {
  cube: <><path d="M12 2 21 7v10L12 22 3 17V7Z" /><path d="M3 7l9 5 9-5" /><path d="M12 12v10" /></>,
  porte: <><rect x="6" y="3" width="12" height="18" rx="1" /><path d="M6 12h12" /><circle cx="15.3" cy="16.2" r="1.2" fill="#FFC24B" stroke="none" /></>,
  colis: <><path d="M3 8l9-5 9 5v8l-9 5-9-5Z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" /><path d="M7.5 5.5l9 5" opacity=".6" /></>,
  cle: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
  badge: <><rect x="3" y="5" width="18" height="14" rx="2" /><rect x="6" y="9" width="4" height="3" stroke="#FFC24B" /><path d="M15 13.5h4M17 11.5v4" stroke="#3BF06A" /></>,
  volant: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /><path d="M3.5 10.5h6M14.5 10.5h6M12 14.5V21" /></>,
  carton: <><path d="M3 7h18v13H3z" /><path d="M3 7l2-4h14l2 4" /><path d="M10 11h4" /></>,
  assiette: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3.5" opacity=".6" /><path d="M2 4v6M2 7h1.5M22 4v16" /></>,
  toque: <><path d="M6 14a4 4 0 0 1 1-7.9A5 5 0 0 1 17 6.1 4 4 0 0 1 18 14Z" /><path d="M7 14v6h10v-6" /><path d="M7 17h10" opacity=".6" /></>,
  outil: <><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4Z" /></>,
  velo: <><circle cx="6" cy="16" r="4" /><circle cx="18" cy="16" r="4" /><path d="M6 16l4-8h5l3 8M10 8l2 8h-6M14 5h3" /></>,
  livre: <><path d="M4 4h6a3 3 0 0 1 2 1 3 3 0 0 1 2-1h6v15h-6a2 2 0 0 0-2 1 2 2 0 0 0-2-1H4Z" /><path d="M12 5v15" /></>,
  micro: <><rect x="9" y="2.5" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" /></>,
  boussole: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5Z" /></>,
  lit: <><path d="M3 18V7M3 14h18v4M21 14v-2.5a3 3 0 0 0-3-3h-7v5.5" /><circle cx="7" cy="11" r="1.8" /></>,
  eclair: <path d="M13 2 4 14h7l-1 8 9-12h-7Z" />,
  goutte: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />,
  etiquette: <><path d="M3 12V3h9l9 9-9 9Z" /><circle cx="7.5" cy="7.5" r="1.5" /></>,
  voiture: <><path d="M3 16v-4l2-5h14l2 5v4Z" /><circle cx="7" cy="16.5" r="1.8" /><circle cx="17" cy="16.5" r="1.8" /><path d="M3 12h18" opacity=".6" /></>,
  cloche: <><path d="M4 17h16M6 17a6 6 0 0 1 12 0M12 9V7M10 7h4M3 20h18" /></>,
  diamant: <><path d="M6 3h12l3 6-9 12L3 9Z" /><path d="M3 9h18M9 3l3 18 3-18" opacity=".6" /></>,
  stetho: <><path d="M6 3v6a4 4 0 0 0 8 0V3" /><path d="M10 13v3a4 4 0 0 0 8 0v-2" /><circle cx="18" cy="12" r="2" /></>,
  balance: <><path d="M12 3v18M7 21h10M5 7h14" /><path d="M5 7l-3 7a3 3 0 0 0 6 0Zm14 0-3 7a3 3 0 0 0 6 0Z" /></>,
  bulle: <><path d="M4 5h16v11H9l-5 4Z" /><path d="M8 9.5h8M8 12.5h5" opacity=".6" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
};

export function IconeTrait({ nom, taille = 16 }: { nom: IconeService; taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      {P[nom]}
    </svg>
  );
}

const U: Record<UniversGout['cle'], React.ReactNode> = {
  ali: <><path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10" /><path d="M17 21V3c-2 1.5-3 4-3 7h3" /></>,
  mus: <><path d="M9 18V5l11-2v13" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></>,
  fil: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9.5v5l4-2.5Z" /></>,
  act: <><circle cx="13" cy="4.5" r="1.8" /><path d="M7 21l3-6 3 2v4M10 15l1-6 4 3h3M11 9l-4 2" /></>,
  lie: <><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></>,
  jeu: <><rect x="2.5" y="7" width="19" height="10" rx="5" /><path d="M7 10.5v3M5.5 12h3" /><circle cx="15.5" cy="11" r=".9" fill="currentColor" /><circle cx="17.8" cy="13.2" r=".9" fill="currentColor" /></>,
};

export function IconeUnivers({ cle }: { cle: UniversGout['cle'] }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      {U[cle]}
    </svg>
  );
}

// ── Pictos voxel des 3 portes (pixel art 3px, extrudé en 3 couches qui tournent) ──
// Chaque grille : '#' = pixel plein, 'h' = reflet, 'o' = ombre.
const GRILLES = {
  coeur: [
    '..##...##..',
    '.#hh#.####.',
    '#hh#######.',
    '#h#########',
    '.#########.',
    '..#######..',
    '...ooooo...',
    '....ooo....',
    '.....o.....',
  ],
  moi: [
    '.h##.',
    '.h##.',
    '.....',
    '.h##.',
    '.h##.',
    '.h##.',
    '.h##.',
    '.hoo.',
    '.hoo.',
  ],
  jouer: [
    '...hhh...',
    '...###...',
    '...###...',
    'hhhhhhhhh',
    '#########',
    'ooooooooo',
    '...###...',
    '...###...',
    '...ooo...',
  ],
} as const;

const TEINTES = {
  coeur: { '#': '#FF4D8D', h: '#FFB3CF', o: '#D6336C', dos: '#8A1F4B', mid: '#B82A5E' },
  moi: { '#': '#4CA6FF', h: '#B3DBFF', o: '#2E7FD6', dos: '#1B4F8A', mid: '#25659F' },
  jouer: { '#': '#FFD84B', h: '#FFF0B3', o: '#E0B02E', dos: '#8A6A12', mid: '#B8901E' },
} as const;

function ombres(grille: readonly string[], couleur: (c: string) => string) {
  const out: string[] = [];
  grille.forEach((ligne, y) => [...ligne].forEach((c, x) => {
    if (c !== '.') out.push(`${x * 3}px ${y * 3}px ${couleur(c)}`);
  }));
  return out.join(',');
}

export function Voxel({ forme, classe, decalage }: { forme: keyof typeof GRILLES; classe: string; decalage: number }) {
  const g = GRILLES[forme];
  const t = TEINTES[forme];
  const largeur = g[0].length * 3;
  const couches: [number, string][] = [
    [-3, ombres(g, () => t.dos)],
    [-1.5, ombres(g, () => t.mid)],
    [0, ombres(g, () => t.mid)],
    [1.5, ombres(g, c => t[c as '#' | 'h' | 'o'] ?? t['#'])],
    [3, ombres(g, c => t[c as '#' | 'h' | 'o'] ?? t['#'])],
  ];
  return (
    <div className={classe} style={{ width: largeur, height: g.length * 3, animationDelay: `${decalage}s` }}>
      {couches.map(([z, sh]) => (
        <i key={z} style={{ transform: `translateZ(${z}px)`, boxShadow: sh }} />
      ))}
    </div>
  );
}
