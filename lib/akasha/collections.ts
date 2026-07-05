// lib/akasha/collections.ts — VITRINES de collection (Refonte L7). Une vitrine = une catégorie
// d'entités mise en scène en sections par sous-type canon (Fruits par type, épées par grade Meito…).
// Config-driven : la page /learn/akasha/c/[slug] se génère d'ici, zéro composant par collection.

export interface CollectionShowcase {
  slug: string;
  title: string;
  icon: string;
  universe: string;
  category: string;      // attributes.category
  subAttr: string | null; // sous-type de regroupement (fruit_type, meito_grade…)
  requireSub?: boolean;   // ne garder que les entrées portant le sous-attribut
  /** Ordre + libellé + teinte des sections (les valeurs hors liste vont dans « Autres »). */
  sections: { v: string; l: string; tint: string; badge?: string }[];
  tagline: string;
}

export const COLLECTION_SHOWCASES: CollectionShowcase[] = [
  {
    slug: 'fruits-du-demon',
    title: 'Les Fruits du Démon',
    icon: '🍎',
    universe: 'One Piece',
    category: 'Fruit du Démon',
    subAttr: 'fruit_type',
    tagline: 'Les 200+ pouvoirs légendaires de One Piece, classés par famille.',
    sections: [
      { v: 'Paramecia', l: 'Paramecia', tint: '#C0455E', badge: '🌀' },
      { v: 'Logia', l: 'Logia', tint: '#E0762A', badge: '🔥' },
      { v: 'Zoan', l: 'Zoan', tint: '#6B8E3D', badge: '🐾' },
      { v: 'Zoan Antique', l: 'Zoan Antique', tint: '#8A6D3B', badge: '🦕' },
      { v: 'Zoan Mythique', l: 'Zoan Mythique', tint: '#B8912F', badge: '🐉' },
      { v: 'Smile', l: 'SMILE (artificiel)', tint: '#8E7CC3', badge: '😀' },
      { v: 'Clone', l: 'Clone', tint: '#5A88B0', badge: '🧬' },
    ],
  },
  {
    slug: 'armurerie-meito',
    title: 'L’Armurerie Meito',
    icon: '⚔️',
    universe: 'One Piece',
    category: 'Arme & outil',
    subAttr: 'meito_grade',
    requireSub: true,
    tagline: 'Les sabres classés de One Piece, du plus légendaire au plus rare.',
    sections: [
      { v: 'Saijo Ô Wazamono', l: 'Saijō Ō Wazamono — 12 Suprêmes', tint: '#C9A227', badge: '👑' },
      { v: 'Ô Wazamono', l: 'Ō Wazamono — 21 Grandes', tint: '#9AA0A6', badge: '🥈' },
      { v: 'Ryo Wazamono', l: 'Ryō Wazamono — 50 Bonnes', tint: '#8A6D3B', badge: '🥉' },
    ],
  },
];

export function showcaseBySlug(slug: string): CollectionShowcase | undefined {
  return COLLECTION_SHOWCASES.find((c) => c.slug === slug);
}
