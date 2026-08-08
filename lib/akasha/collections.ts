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
  {
    // Mesuré 08/08 : category='Jutsu' = 1408 fiches, 100% Naruto, groupées par `attributes.element`
    // (0 valeur nulle). 8 buckets couvrent 1400/1408 (99,4%) ; le reste (Interdit, Chakra,
    // Espace-temps, Feu noir, Avatar, Foudre — 8 fiches, valeurs orphelines à 1-3 occurrences)
    // tombe dans « Autres », honnêtement, plutôt que d'inventer une 9ᵉ section pour du bruit.
    slug: 'grimoire-jutsu',
    title: 'Le Grimoire des Jutsu',
    icon: '📜',
    universe: 'Naruto',
    category: 'Jutsu',
    subAttr: 'element',
    tagline: 'Plus de 1 400 techniques ninja de Naruto, classées par nature — du ninjutsu élémentaire aux invocations interdites.',
    sections: [
      { v: 'Ninjutsu', l: 'Ninjutsu', tint: '#3D7DBF', badge: '🌀' },
      { v: 'Ninjutsu élémentaire', l: 'Ninjutsu élémentaire', tint: '#2F9E8F', badge: '🌊' },
      { v: 'Taijutsu', l: 'Taijutsu', tint: '#C0455E', badge: '👊' },
      { v: 'Genjutsu', l: 'Genjutsu', tint: '#8E7CC3', badge: '👁️' },
      { v: 'Fūinjutsu', l: 'Fūinjutsu — sceaux', tint: '#C9A227', badge: '🔏' },
      { v: 'Invocation', l: 'Invocation', tint: '#6B8E3D', badge: '🐸' },
      { v: 'Senjutsu', l: 'Senjutsu — mode sennin', tint: '#4C7A4C', badge: '🍃' },
      { v: 'Ninjutsu médical', l: 'Ninjutsu médical', tint: '#3FA796', badge: '⚕️' },
    ],
  },
  {
    // Mesuré 08/08 : category='Arme & outil' = 228 fiches (Naruto 190, One Piece 21, Bleach 17).
    // `attributes.material` porte en réalité un TYPE d'arme (pas un matériau) — champ mal nommé
    // mais valeurs propres. Restreint à Naruto seul (190) : l'architecture d'une vitrine ne lit
    // qu'un seul `universe` (couleur, fil d'Ariane) — mélanger les 3 univers aurait forcé soit un
    // héritage de couleur trompeur, soit une réécriture de CollectionShowcase hors périmètre 3c.
    // Les sabres One Piece restent couverts par « armurerie-meito ». 6 sections couvrent 187/190
    // (98,4%) ; les 3 fiches hors-liste (Samehada, Sabre de Kusanagi, Gunbai — armes nommées à
    // matériau bespoke) tombent dans « Autres ».
    slug: 'arsenal-ninja',
    title: 'L’Arsenal Ninja',
    icon: '🧰',
    universe: 'Naruto',
    category: 'Arme & outil',
    subAttr: 'material',
    tagline: 'Les 190 armes et outils de l’arsenal ninja, du kunai au parchemin scellé.',
    sections: [
      { v: 'Outil ninja', l: 'Outils ninja', tint: '#7A8B99', badge: '🔪' },
      { v: 'Lame', l: 'Lames', tint: '#9AA0A6', badge: '🗡️' },
      { v: 'Arme de mêlée', l: 'Armes de mêlée', tint: '#8B4444', badge: '🪓' },
      { v: 'Arme de jet', l: 'Armes de jet', tint: '#D4792A', badge: '🎯' },
      { v: 'Parchemin & sceau', l: 'Parchemins & sceaux', tint: '#C9A227', badge: '🏷️' },
      { v: 'Consommable', l: 'Consommables', tint: '#6B8E3D', badge: '💊' },
    ],
  },
  {
    // Mesuré 08/08 : category='Stand' = 44 fiches, 100% JoJo's Bizarre Adventure, groupées par
    // `attributes.partie` (42/44, 2 nulles → Autres). Volume plus modeste que les 4 autres
    // vitrines, mais réutilise le libellé DÉJÀ curé dans UNIVERSE_TAXONOMY (axe `partie` du hub
    // JoJo) plutôt que d'en inventer un nouveau — zéro fiche en Partie 1-2 (les Stands n'existent
    // pas avant Stardust Crusaders, cohérent avec le canon). Seule vitrine hors Naruto/One Piece :
    // diversifie le registre.
    slug: 'stands-jojo',
    title: 'Les Stands',
    icon: '🌟',
    universe: "JoJo's Bizarre Adventure",
    category: 'Stand',
    subAttr: 'partie',
    tagline: 'Les 44 Stands de JoJo’s Bizarre Adventure, classés par partie — de Stardust Crusaders à JoJolion.',
    sections: [
      { v: 'Partie 3', l: '3 · Stardust Crusaders', tint: '#C9962B', badge: '⭐' },
      { v: 'Partie 4', l: '4 · Diamond is Unbreakable', tint: '#4FA8D8', badge: '💎' },
      { v: 'Partie 5', l: '5 · Golden Wind', tint: '#C9A227', badge: '🍃' },
      { v: 'Partie 6', l: '6 · Stone Ocean', tint: '#2F9E8F', badge: '🌊' },
      { v: 'Partie 7', l: '7 · Steel Ball Run', tint: '#7A8B99', badge: '🏇' },
      { v: 'Partie 8', l: '8 · JoJolion', tint: '#8E44AD', badge: '🪨' },
    ],
  },
];

export function showcaseBySlug(slug: string): CollectionShowcase | undefined {
  return COLLECTION_SHOWCASES.find((c) => c.slug === slug);
}
