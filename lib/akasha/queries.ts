// lib/akasha/queries.ts — accès données AKASHA (Server Components uniquement).
// Lecture publique (RLS USING(true)) → le client anon serveur suffit.
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type {
  AkashaEntry,
  AkashaEntryCard,
  AkashaEntryDetail,
  AkashaType,
  RelationTarget,
  ResolvedRelation,
} from './types';
import { FAMILY_FIELD } from './types';
import { ALLOWED_FILTER_ATTRS } from './universe-taxonomy';

const PAGE_SIZE = 24;
// descFr (bio VF canon) projeté pour le FLAVOR TEXT des cartes (1re phrase, cf. lib/akasha/flavor.ts).
const CARD_COLS = 'id, slug, type, name, is_fiction, universe, summary, image_url, rarity, category:attributes->>category, descFr:attributes->>descFr';

export interface ListEntriesParams {
  type?: AkashaType;
  universe?: string;
  cat?: string;
  fam?: string;
  /** Filtre générique par axe de taxonomie (?attr=village&val=Konohagakure) — clés whitelistes. */
  attr?: string;
  val?: string;
  search?: string;
  /** Filtre RARETÉ (?rarity=legendary|epic|rare|common) — Refonte L2. */
  rarity?: string;
  page?: number;
}

export interface ListEntriesResult {
  entries: AkashaEntryCard[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Ordre d'importance des raretés (les plus rares d'abord), le reste (rareté nulle) en fin.
const RARITY_BUCKETS: (string | null)[] = ['legendary', 'epic', 'rare', 'common', null];

/** Liste filtrée (type, univers, recherche) + paginée, TRIÉE par rareté décroissante puis nom.
 *  `rarity` est une colonne texte (pas un enum) → tri impossible côté PostgREST : on pagine par
 *  « buckets » de rareté (légendaire → commun), chaque bucket ordonné par nom. Une page ne
 *  chevauche au plus que 2 buckets → 5 counts + ≤2 requêtes data. */
export async function listEntries(
  { type, universe, cat, fam, attr, val, search, rarity: rarityParam, page = 1 }: ListEntriesParams = {},
): Promise<ListEntriesResult> {
  const pageSize = PAGE_SIZE;
  const current = Math.max(1, Math.floor(page) || 1);
  const from = (current - 1) * pageSize;

  const supabase = await createClient();
  if (!supabase) {
    return { entries: [], total: 0, page: current, pageSize, totalPages: 0 };
  }

  const s = search ? search.replace(/[%,()]/g, ' ').trim() : '';
  const axisAttr = attr && val && ALLOWED_FILTER_ATTRS.has(attr) ? attr : undefined;
  // Applique les filtres communs (type / univers / recherche + le bucket de rareté) à un builder frais.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyFilters = (q: any, rarity: string | null): any => {
    if (type) q = q.eq('type', type);
    if (universe) q = q.eq('universe', universe);
    if (cat) q = q.eq('attributes->>category', cat);
    const famField = cat ? FAMILY_FIELD[cat] : undefined;
    if (fam && famField) q = q.eq(`attributes->>${famField}`, fam);
    if (axisAttr) q = q.eq(`attributes->>${axisAttr}`, val);
    // La recherche fouille AUSSI les descriptions VF canon (descFr) : « Rasengan », « Konoha »,
    // « Fruit du Démon »… remontent enfin les fiches dont seule la bio parle.
    if (s) q = q.or(`name.ilike.%${s}%,universe.ilike.%${s}%,summary.ilike.%${s}%,attributes->>descFr.ilike.%${s}%`);
    q = rarity === null ? q.is('rarity', null) : q.eq('rarity', rarity);
    return q;
  };

  // Filtre rareté actif → un seul bucket ; sinon parcours complet légendaire → commun.
  const buckets: (string | null)[] = rarityParam && ['legendary', 'epic', 'rare', 'common'].includes(rarityParam)
    ? [rarityParam]
    : RARITY_BUCKETS;

  // Comptage par bucket (HEAD, sans données) → total + navigation dans les buckets.
  const counts = await Promise.all(
    buckets.map(async (rarity) => {
      const { count } = await applyFilters(
        supabase.from('akasha_entries').select('id', { count: 'exact', head: true }),
        rarity,
      );
      return count ?? 0;
    }),
  );
  const total = counts.reduce((a, b) => a + b, 0);

  // Parcourt les buckets dans l'ordre de rareté, prélève la tranche qui recoupe la fenêtre [from, from+pageSize).
  const rows: AkashaEntryCard[] = [];
  let acc = 0;
  for (let i = 0; i < buckets.length && rows.length < pageSize; i++) {
    const start = acc;
    const end = acc + counts[i];
    acc = end;
    if (end <= from || counts[i] === 0) continue; // bucket entièrement avant la fenêtre
    if (start >= from + pageSize) break; // au-delà de la fenêtre
    const localFrom = Math.max(0, from - start);
    const need = pageSize - rows.length;
    const { data } = await applyFilters(
      supabase.from('akasha_entries').select(CARD_COLS).order('name', { ascending: true }),
      buckets[i],
    ).range(localFrom, localFrom + need - 1);
    if (data) rows.push(...(data as AkashaEntryCard[]));
  }

  return {
    entries: rows,
    total,
    page: current,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

type RawRelationRow = {
  id: string;
  relation: string;
  target: RelationTarget | RelationTarget[] | null;
};

function normalizeRelations(rows: unknown): ResolvedRelation[] {
  if (!Array.isArray(rows)) return [];
  const out: ResolvedRelation[] = [];
  for (const r of rows as RawRelationRow[]) {
    const target = Array.isArray(r.target) ? r.target[0] : r.target;
    if (target) out.push({ id: r.id, relation: r.relation, target });
  }
  return out;
}

/** Une fiche par slug + ses relations résolues (sortantes ET entrantes).
 *  `cache()` : generateMetadata + page (+ og) appellent ce fetch dans le MÊME rendu → 1 seul hit DB. */
export const getEntryBySlug = cache(async function getEntryBySlug(slug: string): Promise<AkashaEntryDetail | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: entry } = await supabase
    .from('akasha_entries')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (!entry) return null;

  const e = entry as AkashaEntry;

  // Deux FK vers la même table → désambiguïsation par le nom de contrainte.
  const [{ data: outRows }, { data: inRows }] = await Promise.all([
    supabase
      .from('akasha_relations')
      // category/is_signature projetés pour imprimer l'ATTAQUE SIGNATURE sur la face TCG (L2).
      .select('id, relation, target:akasha_entries!akasha_relations_to_entry_fkey(slug, name, type, image_url, category:attributes->>category, is_signature:attributes->>is_signature)')
      .eq('from_entry', e.id),
    supabase
      .from('akasha_relations')
      .select('id, relation, target:akasha_entries!akasha_relations_from_entry_fkey(slug, name, type, image_url)')
      .eq('to_entry', e.id),
  ]);

  return {
    ...e,
    relationsOut: normalizeRelations(outRows),
    relationsIn: normalizeRelations(inRows),
  };
});

/** Compte d'entrées par CATÉGORIE (attributes.category) dans le scope courant (univers / type).
 *  Alimente le rail « Collections » du registre. Même pagination range (plafond PostgREST 1 000). */
export async function listCategoryCounts(
  { type, universe }: { type?: AkashaType; universe?: string } = {},
): Promise<{ category: string; count: number }[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const counts = new Map<string, number>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase.from('akasha_entries').select('category:attributes->>category').range(from, from + PAGE - 1);
    if (type) q = q.eq('type', type);
    if (universe) q = q.eq('universe', universe);
    const { data } = await q;
    const rows = (data as { category: string | null }[] | null) ?? [];
    for (const row of rows) {
      const c = row.category?.trim();
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    if (rows.length < PAGE) break;
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category, 'fr'));
}

/** Compte d'entrées par SOUS-FAMILLE au sein d'une collection (cat=Jutsu → Ninjutsu/Genjutsu/… ;
 *  cat=Fruit du Démon → Paramecia/Logia/Zoan ; cat=Arme & outil → Lame/Arme de jet/…).
 *  Le champ porteur est dérivé de FAMILY_FIELD ; les collections sans 2ᵉ niveau renvoient []. */
export async function listFamilyCounts(
  { universe, cat }: { universe?: string; cat?: string } = {},
): Promise<{ fam: string; count: number }[]> {
  const field = cat ? FAMILY_FIELD[cat] : undefined;
  if (!cat || !field) return [];
  const supabase = await createClient();
  if (!supabase) return [];

  const counts = new Map<string, number>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from('akasha_entries')
      .select(`fam:attributes->>${field}`)
      .eq('attributes->>category', cat)
      .range(from, from + PAGE - 1);
    if (universe) q = q.eq('universe', universe);
    const { data } = await q;
    const rows = (data as { fam: string | null }[] | null) ?? [];
    for (const row of rows) {
      const f = row.fam?.trim();
      if (f) counts.set(f, (counts.get(f) ?? 0) + 1);
    }
    if (rows.length < PAGE) break;
  }
  return Array.from(counts.entries())
    .map(([fam, count]) => ({ fam, count }))
    .sort((a, b) => b.count - a.count || a.fam.localeCompare(b.fam, 'fr'));
}

/** MOST WANTED One Piece : tous les persos à PRIME, triés par montant décroissant.
 *  Les primes sont des chaînes (« 3000000000 Berrys ») → parsing + tri côté serveur Node. */
export async function listBounties(limit = 60): Promise<(AkashaEntryCard & { bounty: string; bountyValue: number })[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const rows: (AkashaEntryCard & { bounty: string })[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from('akasha_entries')
      .select(`${CARD_COLS}, bounty:attributes->>bounty`)
      .eq('universe', 'One Piece')
      .eq('type', 'character')
      .not('attributes->>bounty', 'is', null)
      .range(from, from + PAGE - 1);
    const batch = (data as (AkashaEntryCard & { bounty: string })[] | null) ?? [];
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  return rows
    .map((r) => ({ ...r, bountyValue: parseInt(String(r.bounty).replace(/[^\d]/g, ''), 10) || 0 }))
    .filter((r) => r.bountyValue > 0)
    .sort((a, b) => b.bountyValue - a.bountyValue)
    .slice(0, limit);
}

export interface UniverseInsights {
  total: number;
  byType: Record<string, number>;
  byRarity: Record<string, number>;
  topFav: (AkashaEntryCard & { favorites: number })[];
  recent: AkashaEntryCard[];
}

/** INSIGHTS d'un univers en UN SEUL scan paginé : total, répartition type/rareté,
 *  top popularité (favorites MAL) et derniers ajoutés (created_at). Alimente les sections
 *  « chiffres-clés », « donut rareté », « top 10 » et « derniers ajoutés » du hub. */
export async function universeInsights(universe: string): Promise<UniverseInsights> {
  const empty: UniverseInsights = { total: 0, byType: {}, byRarity: {}, topFav: [], recent: [] };
  const supabase = await createClient();
  if (!supabase) return empty;

  const byType: Record<string, number> = {};
  const byRarity: Record<string, number> = {};
  const topFav: (AkashaEntryCard & { favorites: number })[] = [];
  const recent: (AkashaEntryCard & { created_at: string })[] = [];
  let total = 0;
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from('akasha_entries')
      .select('slug, name, type, is_fiction, universe, summary, image_url, rarity, created_at, category:attributes->>category, fav:attributes->>favorites')
      .eq('universe', universe)
      .range(from, from + PAGE - 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data as any[] | null) ?? [];
    for (const r of rows) {
      total++;
      byType[r.type] = (byType[r.type] ?? 0) + 1;
      if (r.rarity) byRarity[r.rarity] = (byRarity[r.rarity] ?? 0) + 1;
      const fav = parseInt(String(r.fav ?? ''), 10);
      if (fav > 0 && r.image_url) topFav.push({ ...(r as AkashaEntryCard), favorites: fav });
      if (r.created_at && r.image_url) recent.push(r as AkashaEntryCard & { created_at: string });
    }
    if (rows.length < PAGE) break;
  }
  topFav.sort((a, b) => b.favorites - a.favorites);
  recent.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return { total, byType, byRarity, topFav: topFav.slice(0, 10), recent: recent.slice(0, 10) };
}

/** Index léger d'un univers (slug, nom, type) pour la recherche instantanée client du hub.
 *  Borné à `cap` entrées (les plus rares d'abord via l'ordre de rareté implicite du seed). */
export async function listUniverseIndex(universe: string, cap = 2500): Promise<{ s: string; n: string; t: AkashaType }[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const out: { s: string; n: string; t: AkashaType }[] = [];
  const PAGE = 1000;
  for (let from = 0; from < cap; from += PAGE) {
    const { data } = await supabase
      .from('akasha_entries')
      .select('slug, name, type')
      .eq('universe', universe)
      .range(from, Math.min(from + PAGE, cap) - 1);
    const rows = (data as { slug: string; name: string; type: AkashaType }[] | null) ?? [];
    for (const r of rows) out.push({ s: r.slug, n: r.name, t: r.type });
    if (rows.length < PAGE) break;
  }
  return out;
}

/** Pages évolutives d'un univers (entités portant `attributes.eras`) — la vitrine « Voyages dans le temps ». */
export async function listEvolutive(universe: string, limit = 8): Promise<AkashaEntryCard[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('akasha_entries')
    .select(CARD_COLS)
    .eq('universe', universe)
    .not('attributes->>eras', 'is', null)
    .limit(limit);
  return (data as AkashaEntryCard[] | null) ?? [];
}

/** Compte total d'entrées d'un univers (HEAD, sans données). `cache()` : appelé par metadata + page. */
export const countUniverse = cache(async function countUniverse(universe: string): Promise<number> {
  const supabase = await createClient();
  if (!supabase) return 0;
  const { count } = await supabase
    .from('akasha_entries')
    .select('id', { count: 'exact', head: true })
    .eq('universe', universe);
  return count ?? 0;
});

/** STARS d'un univers : personnages les plus rares (légendaire → épique → rare), avec image.
 *  Alimente le rail « Têtes d'affiche » du hub d'univers. */
export async function listStars(universe: string, limit = 12): Promise<AkashaEntryCard[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const rows: AkashaEntryCard[] = [];
  for (const rarity of ['legendary', 'epic', 'rare']) {
    if (rows.length >= limit) break;
    const { data } = await supabase
      .from('akasha_entries')
      .select(CARD_COLS)
      .eq('universe', universe)
      .eq('type', 'character')
      .eq('rarity', rarity)
      .not('image_url', 'is', null)
      .order('name', { ascending: true })
      .range(0, limit - rows.length - 1);
    if (data) rows.push(...(data as AkashaEntryCard[]));
  }
  return rows.slice(0, limit);
}

/** Fiches par slugs (piliers du hub d'univers) — l'ordre d'entrée est préservé. */
export async function getEntriesBySlugs(slugs: string[]): Promise<AkashaEntryCard[]> {
  if (!slugs.length) return [];
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase.from('akasha_entries').select(CARD_COLS).in('slug', slugs);
  const by = new Map(((data as AkashaEntryCard[] | null) ?? []).map((e) => [e.slug, e]));
  return slugs.map((s) => by.get(s)).filter(Boolean) as AkashaEntryCard[];
}

/** Compte d'entrées par VALEUR pour un axe de taxonomie (attributes.<attr>) dans un univers.
 *  Scan paginé (1 requête / 1 000 lignes de l'univers) → chips du hub avec compteurs. */
export async function listAxisCounts(universe: string, attrs: string[]): Promise<Map<string, Map<string, number>>> {
  const out = new Map<string, Map<string, number>>(attrs.map((a) => [a, new Map()]));
  if (!attrs.length) return out;
  const supabase = await createClient();
  if (!supabase) return out;
  const sel = attrs.map((a, i) => `a${i}:attributes->>${a}`).join(', ');
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from('akasha_entries')
      .select(sel)
      .eq('universe', universe)
      .range(from, from + PAGE - 1);
    const rows = (data as Record<string, string | null>[] | null) ?? [];
    for (const row of rows) {
      attrs.forEach((a, i) => {
        const v = row[`a${i}`]?.trim();
        if (v) {
          const m = out.get(a)!;
          m.set(v, (m.get(v) ?? 0) + 1);
        }
      });
    }
    if (rows.length < PAGE) break;
  }
  return out;
}

/** « Voir aussi » : entrées de la même collection (sinon même type) du même univers,
 *  hors l'entrée courante, les plus rares d'abord. */
export async function listSimilar(
  { universe, cat, type, excludeSlug, limit = 6 }: { universe: string | null; cat?: string | null; type: AkashaType; excludeSlug: string; limit?: number },
): Promise<AkashaEntryCard[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const rows: AkashaEntryCard[] = [];
  for (const rarity of ['legendary', 'epic', 'rare', 'common']) {
    if (rows.length >= limit) break;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from('akasha_entries')
      .select(CARD_COLS)
      .neq('slug', excludeSlug)
      .eq('rarity', rarity)
      .order('name', { ascending: true })
      .range(0, limit - rows.length - 1);
    if (universe) q = q.eq('universe', universe);
    if (cat) q = q.eq('attributes->>category', cat);
    else q = q.eq('type', type);
    const { data } = await q;
    if (data) rows.push(...(data as AkashaEntryCard[]));
  }
  return rows.slice(0, limit);
}

/** Carte du jour : pick déterministe (seed = date UTC) parmi les rares+ imagés. */
export async function getDailyCard(dateSeed: string): Promise<AkashaEntryCard | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base = (): any =>
    supabase
      .from('akasha_entries')
      .select(CARD_COLS, { count: 'exact' })
      .in('rarity', ['legendary', 'epic'])
      .not('image_url', 'is', null);
  const { count } = await base().range(0, 0);
  if (!count) return null;
  let h = 0;
  for (const ch of dateSeed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const idx = h % count;
  const { data } = await base().order('slug', { ascending: true }).range(idx, idx);
  return (data as AkashaEntryCard[] | null)?.[0] ?? null;
}

/** Rang de POPULARITÉ d'un perso dans son univers (#N par favoris MAL/AniList). 1 count HEAD.
 *  Comparaison JSONB numérique via l'opérateur -> (les favorites sont stockés en nombre JSON). */
export async function popularityRank(universe: string | null, favorites: number): Promise<number | null> {
  if (!universe || !favorites || favorites <= 0) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { count } = await supabase
    .from('akasha_entries')
    .select('id', { count: 'exact', head: true })
    .eq('universe', universe)
    .eq('type', 'character')
    .gt('attributes->favorites', favorites);
  return count == null ? null : count + 1;
}

/** « Le savais-tu ? » : pick déterministe (seed = date + scope) parmi les fiches à bio VF (descFr).
 *  Optionnellement scopé à un univers (hubs). Le composant extrait la prose via flavorExcerpt. */
export async function getDidYouKnow(dateSeed: string, universe?: string): Promise<AkashaEntryCard | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base = (): any => {
    let q = supabase
      .from('akasha_entries')
      .select(CARD_COLS, { count: 'exact' })
      .not('attributes->>descFr', 'is', null);
    if (universe) q = q.eq('universe', universe);
    return q;
  };
  const { count } = await base().range(0, 0);
  if (!count) return null;
  let h = 0;
  for (const ch of dateSeed + '|' + (universe ?? '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const idx = h % count;
  const { data } = await base().order('slug', { ascending: true }).range(idx, idx);
  return (data as AkashaEntryCard[] | null)?.[0] ?? null;
}

/** Compte d'entrées par univers (pour le hub du registre).
 *  ⚠ PostgREST plafonne chaque requête à 1 000 lignes (même avec .limit() supérieur) → pagination range. */
export async function listUniverseCounts(): Promise<{ universe: string; count: number }[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const counts = new Map<string, number>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase.from('akasha_entries').select('universe').range(from, from + PAGE - 1);
    const rows = (data as { universe: string | null }[] | null) ?? [];
    for (const row of rows) {
      const u = row.universe?.trim();
      if (u) counts.set(u, (counts.get(u) ?? 0) + 1);
    }
    if (rows.length < PAGE) break;
  }
  return Array.from(counts.entries()).map(([universe, count]) => ({ universe, count }));
}
