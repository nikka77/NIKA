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

const PAGE_SIZE = 24;
const CARD_COLS = 'id, slug, type, name, is_fiction, universe, summary, image_url, rarity';

export interface ListEntriesParams {
  type?: AkashaType;
  universe?: string;
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

/** Liste filtrée (type, univers, recherche plein-texte sur nom/univers/résumé) + paginée. */
export async function listEntries(
  { type, universe, search, page = 1 }: ListEntriesParams = {},
): Promise<ListEntriesResult> {
  const pageSize = PAGE_SIZE;
  const current = Math.max(1, Math.floor(page) || 1);
  const from = (current - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  if (!supabase) {
    return { entries: [], total: 0, page: current, pageSize, totalPages: 0 };
  }

  let query = supabase
    .from('akasha_entries')
    .select(CARD_COLS, { count: 'exact' })
    .order('name', { ascending: true })
    .range(from, to);

  if (type) query = query.eq('type', type);
  if (universe) query = query.eq('universe', universe);

  if (search) {
    // Neutralise les caractères qui casseraient la syntaxe `.or(...)` de PostgREST.
    const s = search.replace(/[%,()]/g, ' ').trim();
    if (s) query = query.or(`name.ilike.%${s}%,universe.ilike.%${s}%,summary.ilike.%${s}%`);
  }

  const { data, count } = await query;
  const total = count ?? 0;

  return {
    entries: (data as AkashaEntryCard[] | null) ?? [],
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

/** Compte d'entrées par univers (pour le hub du registre). ~150 lignes → un select léger suffit. */
export async function listUniverseCounts(): Promise<{ universe: string; count: number }[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase.from('akasha_entries').select('universe').limit(2000);
  const counts = new Map<string, number>();
  for (const row of (data as { universe: string | null }[] | null) ?? []) {
    const u = row.universe?.trim();
    if (u) counts.set(u, (counts.get(u) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([universe, count]) => ({ universe, count }));
}
