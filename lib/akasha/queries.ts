// lib/akasha/queries.ts — accès données AKASHA (Server Components uniquement).
// Lecture publique (RLS USING(true)) → le client anon serveur suffit.
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

const PAGE_SIZE = 24;
const CARD_COLS = 'id, slug, type, name, is_fiction, universe, summary, image_url, rarity, category:attributes->>category';

export interface ListEntriesParams {
  type?: AkashaType;
  universe?: string;
  cat?: string;
  fam?: string;
  search?: string;
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
  { type, universe, cat, fam, search, page = 1 }: ListEntriesParams = {},
): Promise<ListEntriesResult> {
  const pageSize = PAGE_SIZE;
  const current = Math.max(1, Math.floor(page) || 1);
  const from = (current - 1) * pageSize;

  const supabase = await createClient();
  if (!supabase) {
    return { entries: [], total: 0, page: current, pageSize, totalPages: 0 };
  }

  const s = search ? search.replace(/[%,()]/g, ' ').trim() : '';
  // Applique les filtres communs (type / univers / recherche + le bucket de rareté) à un builder frais.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyFilters = (q: any, rarity: string | null): any => {
    if (type) q = q.eq('type', type);
    if (universe) q = q.eq('universe', universe);
    if (cat) q = q.eq('attributes->>category', cat);
    const famField = cat ? FAMILY_FIELD[cat] : undefined;
    if (fam && famField) q = q.eq(`attributes->>${famField}`, fam);
    if (s) q = q.or(`name.ilike.%${s}%,universe.ilike.%${s}%,summary.ilike.%${s}%`);
    q = rarity === null ? q.is('rarity', null) : q.eq('rarity', rarity);
    return q;
  };

  // Comptage par bucket (HEAD, sans données) → total + navigation dans les buckets.
  const counts = await Promise.all(
    RARITY_BUCKETS.map(async (rarity) => {
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
  for (let i = 0; i < RARITY_BUCKETS.length && rows.length < pageSize; i++) {
    const start = acc;
    const end = acc + counts[i];
    acc = end;
    if (end <= from || counts[i] === 0) continue; // bucket entièrement avant la fenêtre
    if (start >= from + pageSize) break; // au-delà de la fenêtre
    const localFrom = Math.max(0, from - start);
    const need = pageSize - rows.length;
    const { data } = await applyFilters(
      supabase.from('akasha_entries').select(CARD_COLS).order('name', { ascending: true }),
      RARITY_BUCKETS[i],
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

/** Une fiche par slug + ses relations résolues (sortantes ET entrantes). */
export async function getEntryBySlug(slug: string): Promise<AkashaEntryDetail | null> {
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
      .select('id, relation, target:akasha_entries!akasha_relations_to_entry_fkey(slug, name, type, image_url)')
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
}

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
