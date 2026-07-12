// lib/akasha/types.ts — types & métadonnées du registre AKASHA (domaine LEARN).
// Source de vérité : table akasha_entries (cf. supabase/migrations/akasha.sql).

export const AKASHA_TYPES = [
  'character',
  'place',
  'artifact',
  'profession',
  'status',
  'power',
  'skill',
] as const;
export type AkashaType = (typeof AKASHA_TYPES)[number];

export const AKASHA_RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;
export type AkashaRarity = (typeof AKASHA_RARITIES)[number];

/** Ligne brute de la table akasha_entries. */
export interface AkashaEntry {
  id: string;
  slug: string;
  type: AkashaType;
  name: string;
  is_fiction: boolean;
  universe: string | null;
  summary: string | null;
  description: string | null;
  image_url: string | null;
  attributes: Record<string, unknown>;
  rarity: AkashaRarity | null;
  created_at: string;
}

/** Projection légère pour les cartes de la grille (+ catégorie extraite du JSONB, sans l'embarquer). */
export type AkashaEntryCard = Pick<
  AkashaEntry,
  'id' | 'slug' | 'type' | 'name' | 'is_fiction' | 'universe' | 'summary' | 'image_url' | 'rarity'
> & { category?: string | null; descFr?: string | null };

/** Cible résolue d'une relation (entité liée). category/is_signature : projetés sur les relations
 *  SORTANTES uniquement (impression de l'attaque signature sur la carte — Refonte L2). */
export interface RelationTarget {
  slug: string;
  name: string;
  type: AkashaType;
  image_url: string | null;
  category?: string | null;
  is_signature?: string | null;
  favorites?: string | null;
}

export interface ResolvedRelation {
  id: string;
  relation: string;
  target: RelationTarget;
}

/** Fiche complète : entrée + relations sortantes/entrantes résolues. */
export interface AkashaEntryDetail extends AkashaEntry {
  relationsOut: ResolvedRelation[];
  relationsIn: ResolvedRelation[];
}

// ─── Métadonnées d'affichage (FR) ────────────────────────────────────

interface TypeMeta {
  label: string;
  plural: string;
  icon: string;
  /** Couleur d'accent (tokens NIKA existants) — palette « cosmique » par catégorie. */
  color: string;
}

export const TYPE_META: Record<AkashaType, TypeMeta> = {
  character:  { label: 'Personnage', plural: 'Personnages', icon: '👤', color: '#7B5CF0' },
  place:      { label: 'Lieu',       plural: 'Lieux',       icon: '🗺️', color: '#0EA878' },
  artifact:   { label: 'Artefact',   plural: 'Artefacts',   icon: '🗡️', color: '#D4A017' },
  profession: { label: 'Métier',     plural: 'Métiers',     icon: '⚒️', color: '#0094D4' },
  status:     { label: 'Statut',     plural: 'Statuts',     icon: '🎖️', color: '#E07038' },
  power:      { label: 'Pouvoir',    plural: 'Pouvoirs',    icon: '⚡', color: '#D44B24' },
  skill:      { label: 'Compétence', plural: 'Compétences', icon: '🌀', color: '#12B8CC' },
};

export const RARITY_META: Record<AkashaRarity, { label: string; color: string }> = {
  common:    { label: 'Commun',     color: '#7A90A8' },
  rare:      { label: 'Rare',       color: '#0094D4' },
  epic:      { label: 'Épique',     color: '#7B5CF0' },
  legendary: { label: 'Légendaire', color: '#D4A017' },
};

/** Univers connus du registre : ordre d'affichage curé + identité visuelle (emoji, couleur).
 *  Un univers seedé mais absent d'ici apparaît quand même (fallback ✦ violet, après les connus). */
export const UNIVERSE_META: { name: string; emoji: string; color: string }[] = [
  { name: 'Naruto',                    emoji: '🍥', color: '#E8623A' },
  { name: 'One Piece',                 emoji: '👒', color: '#D63C3C' },
  { name: 'Dragon Ball',               emoji: '🐉', color: '#F2A93B' },
  { name: 'Bleach',                    emoji: '⚔️', color: '#5A88B0' },
  { name: 'Hunter x Hunter',           emoji: '🎣', color: '#3FA35C' },
  { name: "JoJo's Bizarre Adventure",  emoji: 'ゴ',  color: '#8E44AD' },
  { name: 'Initial D',                 emoji: '🏁', color: '#0094D4' },
  { name: 'Death Note',                emoji: '📓', color: '#8A8F98' },
];

export function universeMeta(name: string): { name: string; emoji: string; color: string } {
  return UNIVERSE_META.find((u) => u.name === name) ?? { name, emoji: '✦', color: '#7B5CF0' };
}

// Wordmarks illustrés maison (dessin original par univers, Higgsfield) — fond transparent.
const UNIVERSE_WORDMARK: Record<string, string> = {
  'Naruto': '/images/akasha/universes/naruto.webp',
  'One Piece': '/images/akasha/universes/one-piece.webp',
  'Dragon Ball': '/images/akasha/universes/dragon-ball.webp',
  'Bleach': '/images/akasha/universes/bleach.webp',
  'Hunter x Hunter': '/images/akasha/universes/hxh.webp',
  "JoJo's Bizarre Adventure": '/images/akasha/universes/jojo.webp',
  'Initial D': '/images/akasha/universes/initial-d.webp',
  'Death Note': '/images/akasha/universes/death-note.webp',
};
export function universeWordmark(name: string): string | null {
  return UNIVERSE_WORDMARK[name] ?? null;
}

// Bannières héros (illustration d'ambiance maison en fond du bandeau de hub) — fond opaque.
const UNIVERSE_BANNER: Record<string, string> = {
  'Naruto': '/images/akasha/universes/banners/naruto.webp',
  'One Piece': '/images/akasha/universes/banners/one-piece.webp',
  'Dragon Ball': '/images/akasha/universes/banners/dragon-ball.webp',
  'Bleach': '/images/akasha/universes/banners/bleach.webp',
  'Hunter x Hunter': '/images/akasha/universes/banners/hxh.webp',
  "JoJo's Bizarre Adventure": '/images/akasha/universes/banners/jojo.webp',
  'Initial D': '/images/akasha/universes/banners/initial-d.webp',
  'Death Note': '/images/akasha/universes/banners/death-note.webp',
};
export function universeBanner(name: string): string | null {
  return UNIVERSE_BANNER[name] ?? null;
}

/** Sous-familles navigables à l'intérieur d'une collection : catégorie → champ JSONB porteur.
 *  (Jutsu → element = Ninjutsu/Genjutsu/Taijutsu… ; Fruits → element = « Fruit du Démon · Logia » ;
 *  Armes → material = Lame/Arme de jet…). Les autres collections n'ont pas de 2ᵉ niveau. */
export const FAMILY_FIELD: Record<string, string> = {
  'Jutsu': 'element',
  'Fruit du Démon': 'element',
  'Arme & outil': 'material',
};

/** Libellé court d'une sous-famille (« Fruit du Démon · Logia » → « Logia »). */
export function familyLabel(value: string): string {
  const i = value.lastIndexOf('·');
  return i >= 0 ? value.slice(i + 1).trim() || value : value;
}

/** Libellés FR des relations connues (fallback : la chaîne brute). */
export const RELATION_LABELS: Record<string, string> = {
  possede: 'possède',
  maitrise: 'maîtrise',
  exerce: 'exerce',
  habite: 'habite',
  allie: 'allié de',
  rival: 'rival de',
  appartient: 'appartient à',
};

export function relationLabel(relation: string): string {
  return RELATION_LABELS[relation] ?? relation.replace(/_/g, ' ');
}

/** Champs d'attributs affichés par type (clé jsonb → libellé FR), dans l'ordre. */
export const ATTRIBUTE_FIELDS: Record<AkashaType, { key: string; label: string }[]> = {
  character: [
    { key: 'role', label: 'Rôle' },
    { key: 'race', label: 'Espèce / Race' },
    { key: 'affiliation', label: 'Affiliation' },
    { key: 'alignment', label: 'Alignement' },
  ],
  place: [
    { key: 'region', label: 'Région' },
    { key: 'climate', label: 'Climat' },
    { key: 'coordinates', label: 'Coordonnées' },
  ],
  artifact: [
    { key: 'material', label: 'Matière' },
    { key: 'origin', label: 'Origine' },
    { key: 'power_level', label: 'Puissance' },
  ],
  profession: [
    { key: 'sector', label: 'Secteur' },
    { key: 'skills', label: 'Compétences clés' },
  ],
  status: [
    { key: 'rank', label: 'Rang' },
    { key: 'scope', label: 'Portée' },
  ],
  power: [
    { key: 'range', label: 'Portée' },
    { key: 'cost', label: 'Coût' },
    { key: 'element', label: 'Élément' },
  ],
  skill: [
    { key: 'discipline', label: 'Discipline' },
    { key: 'level', label: 'Niveau' },
  ],
};

/** Garde-fou : caste une string en AkashaType ou undefined. */
export function asAkashaType(value: string | undefined | null): AkashaType | undefined {
  return value && (AKASHA_TYPES as readonly string[]).includes(value)
    ? (value as AkashaType)
    : undefined;
}
