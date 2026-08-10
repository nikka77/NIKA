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
import { lireSections } from './sections';
import { ALLOWED_FILTER_ATTRS, axisValueLabel, taxonomyByName } from './universe-taxonomy';
import { libelle } from './relation-labels';

const PAGE_SIZE = 24;
// descFr (bio VF canon) projeté pour le FLAVOR TEXT des cartes (1re phrase, cf. lib/akasha/flavor.ts).
const CARD_COLS = 'id, slug, type, name, is_fiction, universe, summary, image_url, rarity, category:attributes->>category, descFr:attributes->>descFr';

// ── SCAN D'UNIVERS MUTUALISÉ (perf hub, 06/08) ──────────────────────────────
// Le hub d'univers déclenchait 4 scans paginés COMPLETS des mêmes lignes
// (listAxisCounts, listCategoryCounts, universeInsights, listUniverseIndex)
// + 2-3 requêtes listStars → 23 allers-retours mesurés sur /u/naruto.
// scanUniverse fait UN SEUL passage (pages parallèles, bornées par le count
// HEAD déjà caché) qui projette l'union des colonnes dont ces lectures ont
// besoin ; cache() le partage entre toutes dans un même rendu.
// descFr (bios VF, ~360 o/ligne) est volontairement EXCLU du scan (egress) :
// les lectures qui affichent du flavor text (piliers, évolutives) gardent
// leur requête CARD_COLS dédiée.
const SCAN_COLS = 'id, slug, name, type, is_fiction, universe, summary, image_url, rarity, created_at, category:attributes->>category, fav:attributes->>favorites';

type ScanRow = {
  id: string; slug: string; name: string; type: AkashaType; is_fiction: boolean;
  universe: string | null; summary: string | null; image_url: string | null;
  rarity: AkashaEntryCard['rarity']; created_at: string | null; category: string | null; fav: string | null;
} & Record<string, string | null | boolean>;

/** Projection carte d'une ligne de scan (sans descFr — voir note SCAN_COLS). */
const toCard = (r: ScanRow): AkashaEntryCard => ({
  id: r.id, slug: r.slug, type: r.type, name: r.name, is_fiction: r.is_fiction,
  universe: r.universe, summary: r.summary, image_url: r.image_url, rarity: r.rarity,
  category: r.category ?? null,
});

const scanUniverse = cache(async function scanUniverse(universe: string): Promise<ScanRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const total = await countUniverse(universe); // caché → gratuit quand la page l'appelle aussi
  if (!total) return [];
  // Les axes canon de CET univers (village, clan… — jamais ceux des autres mondes),
  // projetés `ax_<attr>` pour listAxisCounts.
  const attrs = taxonomyByName(universe)?.axes.map((a) => a.attr) ?? [];
  const cols = SCAN_COLS + attrs.map((a) => `, ax_${a}:attributes->>${a}`).join('');
  const PAGE = 1000; // plafond PostgREST par requête
  const pages = Math.ceil(total / PAGE);
  // Ordre PK explicite : la pagination PARALLÈLE exige des fenêtres stables.
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      supabase
        .from('akasha_entries')
        .select(cols)
        .eq('universe', universe)
        .order('id', { ascending: true })
        .range(i * PAGE, (i + 1) * PAGE - 1),
    ),
  );
  return results.flatMap(({ data }) => (data as unknown as ScanRow[] | null) ?? []);
});
// ────────────────────────────────────────────────────────────────────────────

export interface ListEntriesParams {
  type?: AkashaType;
  universe?: string;
  cat?: string;
  fam?: string;
  /** Filtre générique par axe de taxonomie (?attr=village&val=Konohagakure) — clés whitelistes. */
  attr?: string;
  val?: string;
  /** 2ᵉ filtre d'axe combiné (?attr=village&val=Konohagakure + attr2=clan&val2=Uchiha) — clés whitelistes. */
  attr2?: string;
  val2?: string;
  search?: string;
  /** Filtre RARETÉ (?rarity=legendary|epic|rare|common) — Refonte L2. */
  rarity?: string;
  /** Tri (?sort=pop|alpha) — défaut : rareté décroissante (buckets). Refonte L3. */
  sort?: string;
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
  { type, universe, cat, fam, attr, val, attr2, val2, search, rarity: rarityParam, sort: sortParam, page = 1 }: ListEntriesParams = {},
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
  const axisAttr2 = attr2 && val2 && ALLOWED_FILTER_ATTRS.has(attr2) ? attr2 : undefined;
  // Applique les filtres communs (type / univers / recherche + le bucket de rareté) à un builder frais.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyFilters = (q: any, rarity: string | null | undefined): any => {
    if (type) q = q.eq('type', type);
    if (universe) q = q.eq('universe', universe);
    if (cat) q = q.eq('attributes->>category', cat);
    const famField = cat ? FAMILY_FIELD[cat] : undefined;
    if (fam && famField) q = q.eq(`attributes->>${famField}`, fam);
    if (axisAttr) q = q.eq(`attributes->>${axisAttr}`, val);
    if (axisAttr2) q = q.eq(`attributes->>${axisAttr2}`, val2);
    // La recherche fouille AUSSI les descriptions VF canon (descFr) : « Rasengan », « Konoha »,
    // « Fruit du Démon »… remontent enfin les fiches dont seule la bio parle.
    if (s) q = q.or(`name.ilike.%${s}%,universe.ilike.%${s}%,summary.ilike.%${s}%,attributes->>descFr.ilike.%${s}%`);
    if (rarity !== undefined) q = rarity === null ? q.is('rarity', null) : q.eq('rarity', rarity);
    return q;
  };

  // ── TRI NATIF (?sort=pop|alpha) : un seul range paginé, pas de buckets (Refonte L3). ──
  if (sortParam === 'pop' || sortParam === 'alpha') {
    let q = applyFilters(supabase.from('akasha_entries').select(CARD_COLS, { count: 'exact' }), rarityParam);
    q = sortParam === 'pop'
      ? q.order('attributes->favorites', { ascending: false, nullsFirst: false }).order('name', { ascending: true })
      : q.order('name', { ascending: true });
    const { data, count } = await q.range(from, from + pageSize - 1);
    const totalSorted = count ?? 0;
    return {
      entries: (data as AkashaEntryCard[] | null) ?? [],
      total: totalSorted,
      page: current,
      pageSize,
      totalPages: Math.max(1, Math.ceil(totalSorted / pageSize)),
    };
  }

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
  // Les fenêtres sont dérivées des counts déjà connus → les ≤2 fetchs partent en PARALLÈLE (avant : séquentiels).
  const windows: { rarity: string | null; localFrom: number; take: number }[] = [];
  let acc = 0;
  let taken = 0;
  for (let i = 0; i < buckets.length && taken < pageSize; i++) {
    const start = acc;
    const end = acc + counts[i];
    acc = end;
    if (end <= from || counts[i] === 0) continue; // bucket entièrement avant la fenêtre
    if (start >= from + pageSize) break; // au-delà de la fenêtre
    const localFrom = Math.max(0, from - start);
    const take = Math.min(pageSize - taken, counts[i] - localFrom);
    if (take <= 0) continue;
    windows.push({ rarity: buckets[i], localFrom, take });
    taken += take;
  }
  const slices = await Promise.all(
    windows.map((w) =>
      applyFilters(
        supabase.from('akasha_entries').select(CARD_COLS).order('name', { ascending: true }),
        w.rarity,
      ).range(w.localFrom, w.localFrom + w.take - 1),
    ),
  );
  const rows: AkashaEntryCard[] = slices.flatMap(({ data }) => (data as AkashaEntryCard[] | null) ?? []);

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

  // `select('*')` : SEUL point du front qui charge la colonne `description` — et rien en aval ne la
  // consomme. Elle est simplement sérialisée dans la charge RSC de chaque fiche, sans jamais être
  // rendue (constaté sur /learn/akasha/vizard le 10/08/2026 : le texte n'est présent que dans le
  // flight payload). Colonne morte, cf. lib/akasha/types.ts — ne pas la brancher, la retirer d'ici
  // le jour où l'on remplacera `*` par une liste de colonnes explicite.
  const { data: entry } = await supabase
    .from('akasha_entries')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (!entry) return null;

  const e = entry as AkashaEntry;

  // SECTIONS (05/08) — elles vivent désormais dans la table akasha_sections, une ligne chacune.
  // On les résout ICI, au point unique où la fiche est assemblée, et on les réinjecte dans
  // `attributes.sections` : les deux composants qui les affichent (la page générique et
  // CharacterZone, qui est un composant CLIENT et ne peut pas interroger la base) continuent de
  // lire le même champ sans être touchés. lireSections replie sur le JSONB tant que la migration
  // n'a pas tourné — voir lib/akasha/sections.ts.
  // Deux FK vers la même table → désambiguïsation par le nom de contrainte.
  const [sections, { data: outRows }, { data: inRows }] = await Promise.all([
    lireSections(supabase, e.id, e.attributes as Record<string, unknown>),
    supabase
      .from('akasha_relations')
      // category/is_signature projetés pour imprimer l'ATTAQUE SIGNATURE sur la face TCG (L2).
      .select('id, relation, target:akasha_entries!akasha_relations_to_entry_fkey(slug, name, type, image_url, category:attributes->>category, is_signature:attributes->>is_signature)')
      .eq('from_entry', e.id),
    supabase
      .from('akasha_relations')
      // favorites projeté pour trier « Maîtrisée par » (gabarit fiche Attaque — L4) par popularité.
      .select('id, relation, target:akasha_entries!akasha_relations_from_entry_fkey(slug, name, type, image_url, favorites:attributes->>favorites)')
      .eq('to_entry', e.id),
  ]);

  return {
    ...e,
    attributes: { ...(e.attributes as Record<string, unknown>), sections },
    relationsOut: normalizeRelations(outRows),
    relationsIn: normalizeRelations(inRows),
  };
});

/** Socle commun des deux lectures « par slugs » (fusion doublons, audit perf) :
 *  1 requête `.in`, ordre d'entrée préservé. */
async function fetchBySlugs<T extends { slug: string }>(slugs: string[], cols: string): Promise<T[]> {
  if (!slugs.length) return [];
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase.from('akasha_entries').select(cols).in('slug', slugs);
  const bySlug = new Map((((data as unknown) as T[] | null) ?? []).map((e) => [e.slug, e]));
  return slugs.map((s) => bySlug.get(s)).filter((e): e is T => !!e);
}

/** Entités COMPLÈTES (avec `attributes`, donc les `forms`) pour une liste de slugs, dans l'ordre
 *  demandé — alimente les cartes TCG du hub (CharacterCard a besoin des attributs). */
export async function getFullEntriesBySlugs(slugs: string[]): Promise<AkashaEntry[]> {
  return fetchBySlugs<AkashaEntry>(slugs, '*');
}

/** Compte d'entrées par CATÉGORIE (attributes.category) dans le scope courant (univers / type).
 *  Alimente le rail « Collections » du registre. Même pagination range (plafond PostgREST 1 000). */
export async function listCategoryCounts(
  { type, universe }: { type?: AkashaType; universe?: string } = {},
): Promise<{ category: string; count: number }[]> {
  // Fast-path hub : univers seul → agrégat sur le scan mutualisé (0 requête propre).
  if (universe && !type) {
    const counts = new Map<string, number>();
    for (const row of await scanUniverse(universe)) {
      const c = row.category?.trim();
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category, 'fr'));
  }

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

/** LES ÂGES : l'âge canon est une chaîne (« 12–13 », « 30 ans », « 13 (Kakashi Gaiden) »)
 *  → parsing du premier nombre + tri côté serveur Node, même traitement que les primes.
 *  Branché en remplacement de height_cm (0 fiche au 05/08) — 733 fiches portent un âge, vérifié. */
export async function listAges(): Promise<(AkashaEntryCard & { age: string; ageValue: number })[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const rows: (AkashaEntryCard & { age: string })[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from('akasha_entries')
      .select(`${CARD_COLS}, age:attributes->>age`)
      .eq('type', 'character')
      .not('attributes->>age', 'is', null)
      .order('slug')
      .range(from, from + PAGE - 1);
    const batch = (data as (AkashaEntryCard & { age: string })[] | null) ?? [];
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  return rows
    .map((r) => ({ ...r, ageValue: parseInt(String(r.age).match(/\d+/)?.[0] ?? '', 10) || 0 }))
    .filter((r) => r.ageValue > 0)
    .sort((a, b) => b.ageValue - a.ageValue);
}

export interface UniverseInsights {
  total: number;
  byType: Record<string, number>;
  byRarity: Record<string, number>;
  topFav: (AkashaEntryCard & { favorites: number })[];
  recent: AkashaEntryCard[];
}

/** INSIGHTS d'un univers : total, répartition type/rareté, top popularité (favorites MAL)
 *  et derniers ajoutés (created_at). Agrégats calculés sur le scan MUTUALISÉ du hub
 *  (0 requête propre — avant : son propre scan paginé complet). */
export async function universeInsights(universe: string): Promise<UniverseInsights> {
  const byType: Record<string, number> = {};
  const byRarity: Record<string, number> = {};
  const topFav: (AkashaEntryCard & { favorites: number })[] = [];
  const recent: (AkashaEntryCard & { created_at: string })[] = [];
  let total = 0;
  for (const r of await scanUniverse(universe)) {
    total++;
    byType[r.type] = (byType[r.type] ?? 0) + 1;
    if (r.rarity) byRarity[r.rarity] = (byRarity[r.rarity] ?? 0) + 1;
    const fav = parseInt(String(r.fav ?? ''), 10);
    if (fav > 0 && r.image_url) topFav.push({ ...toCard(r), favorites: fav });
    if (r.created_at && r.image_url) recent.push({ ...toCard(r), created_at: r.created_at });
  }
  topFav.sort((a, b) => b.favorites - a.favorites);
  recent.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return { total, byType, byRarity, topFav: topFav.slice(0, 10), recent: recent.slice(0, 10) };
}

/** Index léger d'un univers (slug, nom, type) pour la recherche instantanée client du hub.
 *  Borné à `cap` entrées, triées par nom pour un ordre stable (le plus gros univers, Naruto,
 *  en compte 3319 — cap volontairement large pour ne jamais tronquer un univers réel). */
export async function listUniverseIndex(universe: string, cap = 6000): Promise<{ s: string; n: string; t: AkashaType }[]> {
  // Projection du scan mutualisé (0 requête propre — avant : son propre scan paginé complet).
  return (await scanUniverse(universe))
    .map((r) => ({ s: r.slug, n: r.name, t: r.type }))
    .sort((a, b) => a.n.localeCompare(b.n, 'fr'))
    .slice(0, cap);
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
 *  Tiré du scan mutualisé du hub (0 requête propre — avant : 1 requête par rareté).
 *  Sans descFr (voir SCAN_COLS) : le hub ne s'en sert que pour le garde-fou + le JSON-LD. */
export async function listStars(universe: string, limit = 12): Promise<AkashaEntryCard[]> {
  const bucket: Record<string, number> = { legendary: 0, epic: 1, rare: 2 };
  return (await scanUniverse(universe))
    .filter((r) => r.type === 'character' && r.image_url && r.rarity != null && r.rarity in bucket)
    .sort((a, b) => bucket[a.rarity as string] - bucket[b.rarity as string] || a.name.localeCompare(b.name, 'fr'))
    .slice(0, limit)
    .map(toCard);
}

/** Fiches par slugs (piliers du hub d'univers) — l'ordre d'entrée est préservé.
 *  CARD_COLS (avec descFr) : les piliers s'affichent en mosaïque avec flavor text. */
export async function getEntriesBySlugs(slugs: string[]): Promise<AkashaEntryCard[]> {
  return fetchBySlugs<AkashaEntryCard>(slugs, CARD_COLS);
}

/** Compte d'entrées par VALEUR pour un axe de taxonomie (attributes.<attr>) dans un univers.
 *  Scan paginé (1 requête / 1 000 lignes de l'univers) → chips du hub avec compteurs. */
export async function listAxisCounts(
  universe: string, attrs: string[], filterAttr?: string, filterVal?: string,
): Promise<Map<string, Map<string, number>>> {
  const out = new Map<string, Map<string, number>>(attrs.map((a) => [a, new Map()]));
  if (!attrs.length) return out;

  // Fast-path hub : sans 2ᵉ filtre et sur les axes canon de l'univers → agrégat sur le scan
  // mutualisé (0 requête propre). Le chemin filtré (pages d'axe, lignes déjà réduites) reste
  // sur sa requête dédiée : un scan complet y coûterait PLUS cher.
  const taxoAttrs = new Set(taxonomyByName(universe)?.axes.map((a) => a.attr) ?? []);
  if (!filterAttr && attrs.every((a) => taxoAttrs.has(a))) {
    for (const row of await scanUniverse(universe)) {
      for (const a of attrs) {
        const v = (row[`ax_${a}`] as string | null | undefined)?.trim();
        if (v) {
          const m = out.get(a)!;
          m.set(v, (m.get(v) ?? 0) + 1);
        }
      }
    }
    return out;
  }

  const supabase = await createClient();
  if (!supabase) return out;
  const sel = attrs.map((a, i) => `a${i}:attributes->>${a}`).join(', ');
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from('akasha_entries').select(sel).eq('universe', universe);
    if (filterAttr && filterVal) q = q.eq(`attributes->>${filterAttr}`, filterVal);
    const { data } = await q.range(from, from + PAGE - 1);
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

// ── PROFIL RELATIONNEL DU SOUS-ENSEMBLE (LOT 3a) ────────────────────────────
// Restreint aux 6 relations « sociales » perso→perso : les autres natures (maitrise/possede/
// exerce/habite/appartient) pointent vers des fiches qui ne portent quasi jamais l'axe consulté
// (un pouvoir n'a pas de village) — les compter gonflerait le total sans rien dire de la mise en
// relation du sous-ensemble.
const SOCIAL_RELATIONS = ['allie', 'ennemi', 'rival', 'famille', 'mentor', 'eleve'];
// Sous ce total d'arêtes, le chiffre est trop creux pour être « parlant » — même logique que le
// seuil de page d'axe (tasks/akasha-hierarchies.md, « une valeur curée à moins de 5 fiches ne
// reçoit pas de route L2 ») : un chiffre creux vaut moins que pas de chiffre.
const REL_PROFILE_MIN_TOTAL = 5;

export interface AxisRelationalProfile {
  /** Arêtes sociales DISTINCTES touchant le sous-ensemble (dédupliquées, une seule fois même si
   *  les deux bouts appartiennent au sous-ensemble). */
  total: number;
  /** Dont les deux bouts restent DANS le sous-ensemble (cohésion interne). */
  internal: number;
  internalPct: number;
  /** Les natures de lien les plus fréquentes, libellé FR direction-correct (lib/akasha/relation-labels.ts). */
  types: { label: string; count: number }[];
  /** Les AUTRES valeurs du MÊME axe les plus atteintes (« vers qui ») — jamais le sous-ensemble lui-même. */
  external: { value: string; label: string; count: number; pct: number }[];
}

type RelProbeRow = { id: string; relation: string; other: { v: string | null } | null };

/** Profil relationnel du sous-ensemble d'une page d'axe (`/u/[slug]/[axis]/[value]`) — extension
 *  de la famille de requêtes autour de `listAxisCounts` : pour un sous-ensemble filtré (ex. les
 *  92 ninjas de Kumogakure), QUELLES relations le traversent, VERS QUI (quelles autres valeurs du
 *  même axe), en quelle DENSITÉ. Le seul chiffre du LOT 3 qu'aucun wiki source ne calcule.
 *
 *  Fonction SŒUR de `listAxisCounts`, pas une greffe dans son CORPS : `listAxisCounts` est sur le
 *  chemin chaud du hub (fast-path `scanUniverse`, mutualisé et caché, réparé la veille) — y ajouter
 *  une jointure sur `akasha_relations` y coûterait pour une page (le hub) qui ne le demande jamais.
 *  Cette fonction n'est appelée QUE par la page d'axe.
 *
 *  Coût mesuré 08/08/2026 (probe direct, hors rendu) sur la plus grosse valeur d'axe du corpus —
 *  village Konohagakure, 1 867 fiches — : 2 requêtes PARALLÈLES (~250 ms cumulées), ~900 lignes de
 *  8 colonnes chacune (~110 Ko) — jamais un scan de `akasha_entries`, jamais l'IN d'une liste
 *  d'identifiants (filtre poussé côté PostgREST via l'embed `!inner`).
 *
 *  Direction NON décorative (lib/akasha/relation-labels.ts) : une arête où le sous-ensemble est
 *  `from_entry` se lit « sortante » (entrant=false), une où il est `to_entry` se lit « entrante »
 *  (entrant=true) — jamais le même libellé dans les deux sens. */
export async function axisRelationalProfile(
  universe: string, attr: string, val: string,
): Promise<AxisRelationalProfile | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  // Deux requêtes : le sous-ensemble en `from_entry` (arêtes « sortantes ») et en `to_entry`
  // (« entrantes »). `!inner` pousse le filtre attribut côté serveur ; `other` projette juste la
  // valeur du MÊME axe côté opposé (jamais l'attribut complet — coût minimal).
  const outSel = `id, relation, other:akasha_entries!akasha_relations_to_entry_fkey(v:attributes->>${attr}), source:akasha_entries!akasha_relations_from_entry_fkey!inner(_x:id)`;
  const inSel = `id, relation, other:akasha_entries!akasha_relations_from_entry_fkey(v:attributes->>${attr}), target:akasha_entries!akasha_relations_to_entry_fkey!inner(_x:id)`;

  const [{ data: outRows }, { data: inRows }] = await Promise.all([
    supabase.from('akasha_relations').select(outSel)
      .eq('source.universe', universe).eq(`source.attributes->>${attr}`, val)
      .in('relation', SOCIAL_RELATIONS),
    supabase.from('akasha_relations').select(inSel)
      .eq('target.universe', universe).eq(`target.attributes->>${attr}`, val)
      .in('relation', SOCIAL_RELATIONS),
  ]);

  // Dédup par id d'arête : une arête interne (les deux bouts dans le sous-ensemble) apparaît dans
  // les DEUX requêtes — ne jamais la compter deux fois.
  const merged = new Map<string, { relation: string; entrant: boolean; other: string | null }>();
  for (const r of (outRows as unknown as RelProbeRow[] | null) ?? [])
    merged.set(r.id, { relation: r.relation, entrant: false, other: r.other?.v ?? null });
  for (const r of (inRows as unknown as RelProbeRow[] | null) ?? [])
    if (!merged.has(r.id)) merged.set(r.id, { relation: r.relation, entrant: true, other: r.other?.v ?? null });

  const total = merged.size;
  if (total < REL_PROFILE_MIN_TOTAL) return null; // trop creux — on renonce plutôt que d'afficher un chiffre qui ne dit rien

  let internal = 0;
  const typeCounts = new Map<string, number>();
  const externalCounts = new Map<string, number>();
  for (const { relation, entrant, other } of merged.values()) {
    const label = libelle(relation, entrant);
    typeCounts.set(label, (typeCounts.get(label) ?? 0) + 1);
    if (other === val) internal++;
    else if (other) externalCounts.set(other, (externalCounts.get(other) ?? 0) + 1);
  }

  const types = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, count]) => ({ label, count }));

  const external = [...externalCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([value, count]) => ({
      value, label: axisValueLabel(universe, attr, value), count,
      pct: Math.round((count / total) * 100),
    }));

  return { total, internal, internalPct: Math.round((internal / total) * 100), types, external };
}
// ─────────────────────────────────────────────────────────────────────────────

/** « Voir aussi » : entrées de la même collection (sinon même type) du même univers,
 *  hors l'entrée courante, les plus rares d'abord. */
export async function listSimilar(
  { universe, cat, type, excludeSlug, limit = 6 }: { universe: string | null; cat?: string | null; type: AkashaType; excludeSlug: string; limit?: number },
): Promise<AkashaEntryCard[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  // Les 4 buckets partent en PARALLÈLE (avant : séquentiels avec arrêt anticipé) —
  // 1 aller-retour de latence au lieu de 4 ; on tronque ensuite dans l'ordre de rareté.
  const slices = await Promise.all(
    ['legendary', 'epic', 'rare', 'common'].map((rarity) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase
        .from('akasha_entries')
        .select(CARD_COLS)
        .neq('slug', excludeSlug)
        .eq('rarity', rarity)
        .order('name', { ascending: true })
        .range(0, limit - 1);
      if (universe) q = q.eq('universe', universe);
      if (cat) q = q.eq('attributes->>category', cat);
      else q = q.eq('type', type);
      return q;
    }),
  );
  return slices
    .flatMap(({ data }: { data: AkashaEntryCard[] | null }) => data ?? [])
    .slice(0, limit);
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

/** Passerelle seiyū (lot 4d) : personnages TOUS UNIVERS partageant le doubleur JP donné —
 *  le seul pont naturel entre les 8 mondes (voiceActors rempli à 87 %). */
export async function listSharedVoice(jp: string, excludeSlug: string): Promise<{ slug: string; name: string; universe: string | null; image_url: string | null }[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('akasha_entries')
    .select('slug,name,universe,image_url')
    .eq('type', 'character')
    .neq('slug', excludeSlug)
    .contains('attributes->voiceActors->jp', JSON.stringify([jp]))
    .order('attributes->favorites', { ascending: false, nullsFirst: false })
    .limit(6);
  return (data as { slug: string; name: string; universe: string | null; image_url: string | null }[] | null) ?? [];
}

/** « Le savais-tu ? » : pick déterministe (seed = date + scope) parmi les fiches à bio VF (descFr).
 *  Optionnellement scopé à un univers (hubs). Le composant extrait la prose via flavorExcerpt. */
export async function getDidYouKnow(dateSeed: string, universe?: string): Promise<AkashaEntryCard | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base = (head = false): any => {
    let q = supabase
      .from('akasha_entries')
      .select(CARD_COLS, { count: 'exact', head })
      .not('attributes->>descFr', 'is', null);
    if (universe) q = q.eq('universe', universe);
    return q;
  };
  const { count } = await base(true); // HEAD : le count seul, sans ligne de données
  if (!count) return null;
  let h = 0;
  for (const ch of dateSeed + '|' + (universe ?? '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const idx = h % count;
  const { data } = await base().order('slug', { ascending: true }).range(idx, idx);
  return (data as AkashaEntryCard[] | null)?.[0] ?? null;
}

/** OMNI-SEARCH (L8) : recherche instantanée nom + bio VF, avec extrait descFr pour le surlignage. */
export async function omniSearch(query: string, limit = 24): Promise<(AkashaEntryCard & { descFr?: string | null })[]> {
  const s = query.replace(/[%,()]/g, ' ').trim();
  if (s.length < 2) return [];
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('akasha_entries')
    .select(`${CARD_COLS}`)
    .or(`name.ilike.%${s}%,attributes->>descFr.ilike.%${s}%`)
    .limit(limit);
  return (data as (AkashaEntryCard & { descFr?: string | null })[] | null) ?? [];
}

/** VITRINE d'une collection (L7) : toutes les entrées d'une catégorie (cap), avec un sous-attribut
 *  projeté (fruit_type, meito_grade, boat_class…) pour le regroupement en sections. `requireSub` ne
 *  garde que celles qui portent le sous-attribut (ex. épées classées Meito). */
export async function listCollectionEntries(
  category: string,
  subAttr: string | null,
  { universe, requireSub = false, cap = 400 }: { universe?: string; requireSub?: boolean; cap?: number } = {},
): Promise<(AkashaEntryCard & { sub?: string | null })[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const cols = subAttr ? `${CARD_COLS}, sub:attributes->>${subAttr}` : CARD_COLS;

  let countQ = supabase.from('akasha_entries').select('id', { count: 'exact', head: true }).eq('attributes->>category', category);
  if (universe) countQ = countQ.eq('universe', universe);
  if (requireSub && subAttr) countQ = countQ.not(`attributes->>${subAttr}`, 'is', null);
  const { count } = await countQ;
  const total = Math.min(count ?? 0, cap);
  if (!total) return [];

  // PostgREST plafonne CHAQUE requête à 1000 lignes quel que soit le `.range()` demandé (même
  // limite que `scanUniverse` ci-dessus) : au-delà, une seule requête tronquait en silence
  // (08/08 — le Grimoire des Jutsu, 1408 fiches, coupait à 1000 avant ce correctif, cap ou pas).
  // Pagination parallèle par fenêtres de 1000 sur un ordre stable (id) ; tri par nom réappliqué
  // après concaténation (PostgREST ne garantit l'ordre que DANS une fenêtre, pas entre elles).
  const PAGE = 1000;
  const pages = Math.ceil(total / PAGE);
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) => {
      let q = supabase.from('akasha_entries').select(cols).eq('attributes->>category', category);
      if (universe) q = q.eq('universe', universe);
      if (requireSub && subAttr) q = q.not(`attributes->>${subAttr}`, 'is', null);
      return q.order('id', { ascending: true }).range(i * PAGE, Math.min((i + 1) * PAGE, total) - 1);
    }),
  );
  const rows = results.flatMap((r) => (r.data as (AkashaEntryCard & { sub?: string | null })[] | null) ?? []);
  return rows.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

/** CLASSEMENT (L7) : top N par un attribut NUMÉRIQUE stocké en JSONB (favorites, ki…). Carte + valeur. */
export async function listTopByAttr(
  numAttr: string,
  { universe, type = 'character' as AkashaType, limit = 20 }: { universe?: string; type?: AkashaType; limit?: number } = {},
): Promise<(AkashaEntryCard & { metric: number })[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  let q = supabase
    .from('akasha_entries')
    .select(`${CARD_COLS}, metric:attributes->>${numAttr}`)
    .not(`attributes->>${numAttr}`, 'is', null);
  if (universe) q = q.eq('universe', universe);
  if (type) q = q.eq('type', type);
  q = q.order(`attributes->${numAttr}`, { ascending: false, nullsFirst: false }).range(0, limit - 1);
  const { data } = await q;
  return ((data as (AkashaEntryCard & { metric: string })[] | null) ?? []).map((e) => ({ ...e, metric: Number(e.metric) || 0 }));
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
