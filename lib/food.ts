// lib/food.ts — récupère les vrais pros FOOD (Supabase) et les mappe au format du FoodModule.
//  - modes  → colonne `pros.service_modes` (sous-ensemble de livraison/surplace/emporter) ;
//             fallback sur les 3 modes si NULL/vide (cf. migration 20260621_pros_service_modes.sql)
//  - emoji/couleur → dérivés du nom/description
//  - dishes → les `listings` du pro (title + price)
import { createClient } from '@/lib/supabase/server';
import type { Mode, Pro } from '@/components/home/FoodModule';
import type { NightProvider } from '@/components/food/NightProviderCard';

const ALL_MODES: Mode[] = ['livraison', 'surplace', 'emporter'];
const PALETTE = ['#D4A017', '#E07038', '#0EA878', '#D44B24', '#7B5CF0', '#0094D4', '#0868A0', '#5A88B0'];

function emojiFor(s: string): string {
  const t = (s || '').toLowerCase();
  if (/pizza|pizzeria/.test(t)) return '🍕';
  if (/sushi|jap|poke|poké|ramen/.test(t)) return '🍣';
  if (/burger|fast|tacos|kebab/.test(t)) return '🍔';
  if (/boulang|pain|pâtiss|patiss|viennois/.test(t)) return '🥐';
  if (/glac|sorbet|ice/.test(t)) return '🍦';
  if (/vegan|bio|salad|veggie/.test(t)) return '🥗';
  if (/socca|niçois|nicois|trattoria|pasta|pâtes|pates/.test(t)) return '🫓';
  if (/vin|cave|wine|bar/.test(t)) return '🍷';
  if (/truck/.test(t)) return '🚚';
  if (/sushi|poisson|mer|fruits de mer/.test(t)) return '🐟';
  return '🍽️';
}

function areaFrom(address?: string | null): string {
  if (!address) return 'Nice';
  const parts = address.split(',').map(s => s.trim()).filter(Boolean);
  const seg = [...parts].reverse().find(p => /[a-zA-ZÀ-ÿ]/.test(p) && !/^\d/.test(p));
  return ((seg || parts[0] || 'Nice').replace(/\d{4,5}/g, '').trim()) || 'Nice';
}

function priceFmt(price: unknown): string {
  const n = typeof price === 'number' ? price : Number(price);
  if (!Number.isFinite(n) || n <= 0) return '';
  return Number.isInteger(n) ? `${n} €` : `${n.toFixed(2).replace('.', ',')} €`;
}

type RawListing = { title?: string | null; price?: number | null; available?: boolean | null };
type RawPro = {
  id: string; business_name?: string | null; description?: string | null;
  address?: string | null; rating?: number | null; service_modes?: string[] | null;
  listings?: RawListing[] | null;
};

/** Vrais pros FOOD au format FoodModule. Retourne [] si pas de Supabase / aucun pro. */
export async function getFoodPros(limit = 8): Promise<Pro[]> {
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase
        .from('pros')
        .select('id, business_name, description, address, rating, service_modes, listings(title, price, available)')
        .eq('domain', 'food')
        .eq('active', true)
        .order('rating', { ascending: false })
        .limit(limit)
    : { data: null };

  if (!data) return [];

  return (data as RawPro[]).map((p, i): Pro => {
    const dishes = (p.listings || [])
      .filter(l => l && l.title && l.available !== false)
      .slice(0, 3)
      .map(l => ({ name: l.title as string, price: priceFmt(l.price), emoji: emojiFor(l.title as string) }));
    const key = `${p.business_name || ''} ${p.description || ''}`;
    // Modes lus depuis la colonne service_modes, filtrés aux valeurs connues et remis
    // en ordre canonique ; fallback sur les 3 modes si NULL/vide/non renseigné.
    const dbModes = Array.isArray(p.service_modes) ? p.service_modes : [];
    const modes = ALL_MODES.filter(m => dbModes.includes(m));
    return {
      id: p.id,
      name: p.business_name || 'Établissement',
      emoji: emojiFor(key),
      cuisine: (p.description || 'Restaurant').slice(0, 42),
      rating: typeof p.rating === 'number' ? p.rating : 0,
      area: areaFrom(p.address),
      color: PALETTE[i % PALETTE.length],
      modes: modes.length ? modes : ALL_MODES,
      dishes,
    };
  });
}

// Mise en avant éditoriale pour le widget d'accès rapide.
export type Featured = 'sponsored' | 'popular' | 'favorite';

export type NightEntry = {
  provider: NightProvider;
  status: 'open' | 'closed' | 'sold_out';
  modes: Mode[];
  category: string;       // filtre de l'annuaire (réactivé quand le volume le justifie)
  featured?: Featured;    // mise en avant : widget « accès rapide » (sponsorisé / populaire / favori)
  rank: number;           // ordre d'affichage
};

// ── ARCHITECTURE FOOD (2 chemins) ───────────────────────────────────────────
//  • getFeaturedEstablishments() → WIDGET « Commander » (home + /food) : sous-ensemble
//    CURÉ (sponsorisé / populaire / favori), accès rapide.
//  • getDirectoryEstablishments() → section « Établissements » (/food) : ANNUAIRE COMPLET,
//    tous les commerces, pour explorer. Destiné à grandir.
//  Les deux lisent la même source enrichie ; ils diffèrent par le filtrage/tri.
//
// Métadonnées éditoriales par enseigne (override par slug, même pattern que NIGHT_THEMES).
// À terme : colonnes DB food_providers.category / featured / rank (puis fusion avec `pros`).
const PROVIDER_META: Record<string, { category: string; featured?: Featured; rank: number }> = {
  afroweek06: { category: 'monde', featured: 'sponsored', rank: 1 },
  rakomoriafood: { category: 'monde', featured: 'popular', rank: 2 },
};

/** Tous les établissements actifs, enrichis (statut du soir + méta éditoriale). Source commune. */
async function fetchEstablishments(): Promise<NightEntry[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data: providers } = await supabase
    .from('food_providers')
    .select('id, slug, name, description, city, opens_at, closes_at, instagram')
    .eq('active', true)
    .order('opens_at');
  if (!providers?.length) return [];
  const ids = (providers as { id: string }[]).map(p => p.id);
  const today = new Date().toISOString().split('T')[0];
  const { data: sessions } = await supabase
    .from('food_sessions')
    .select('provider_id, status')
    .eq('date', today)
    .in('provider_id', ids);
  const statusById: Record<string, string> = {};
  for (const s of (sessions || []) as { provider_id: string; status: string }[]) statusById[s.provider_id] = s.status;
  return (providers as NightProvider[]).map((p, i) => {
    const meta = PROVIDER_META[p.slug] ?? { category: 'autre', rank: 50 + i };
    return {
      provider: p,
      status: (statusById[p.id] as 'open' | 'closed' | 'sold_out') ?? 'closed',
      modes: ['livraison'] as Mode[],
      category: meta.category,
      featured: meta.featured,
      rank: meta.rank,
    };
  });
}

/** WIDGET d'accès rapide : enseignes mises en avant (sponsorisé / populaire / favori). */
export async function getFeaturedEstablishments(): Promise<NightEntry[]> {
  const all = await fetchEstablishments();
  const featured = all.filter(e => e.featured);
  return (featured.length ? featured : all).sort((a, b) => a.rank - b.rank);
}

/** ANNUAIRE complet : tous les établissements, pour explorer (section « Établissements »). */
export async function getDirectoryEstablishments(): Promise<NightEntry[]> {
  const all = await fetchEstablishments();
  return all.sort((a, b) => a.rank - b.rank);
}

/** @deprecated Utiliser getFeaturedEstablishments (widget) ou getDirectoryEstablishments (annuaire). */
export async function getNightPros(): Promise<NightEntry[]> {
  return getFeaturedEstablishments();
}
