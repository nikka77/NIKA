// lib/akasha/curated-duels.ts — sélection de duels /vs/[a]/[b] pré-générés pour le SEO (sitemap +
// generateStaticParams) : 2 duels par univers (le champion contre le 2e et le 3e du classement
// popularité) + les champions des 4 plus gros univers croisés entre eux. Les autres combinaisons
// de slugs restent accessibles à la demande (dynamicParams non désactivé), seule cette sélection
// est explicitement découvrable par les moteurs.
// ⚠ N'utilise PAS lib/akasha/queries.ts (client cookie-aware via lib/supabase/server) : cette
// fonction tourne dans generateStaticParams, un contexte build-time où `cookies()` est interdit
// (« used cookies() inside generateStaticParams »). Client anonyme direct, sans session.
import { createClient } from '@supabase/supabase-js';
import { UNIVERSE_META } from '@/lib/akasha/types';

const CROSS_UNIVERSE = ['Naruto', 'One Piece', 'Dragon Ball', 'Bleach'];

async function topFavorites(universe: string, limit: number): Promise<{ slug: string }[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await sb.from('akasha_entries').select('slug')
    .eq('universe', universe).eq('type', 'character')
    .not('attributes->>favorites', 'is', null)
    .order('attributes->favorites', { ascending: false, nullsFirst: false })
    .range(0, limit - 1);
  return (data as { slug: string }[] | null) ?? [];
}

export async function getCuratedDuels(): Promise<{ a: string; b: string }[]> {
  const pairs: { a: string; b: string }[] = [];
  const champion: Record<string, string> = {};

  for (const u of UNIVERSE_META) {
    const top = await topFavorites(u.name, 3);
    if (top.length >= 2) pairs.push({ a: top[0].slug, b: top[1].slug });
    if (top.length >= 3) pairs.push({ a: top[0].slug, b: top[2].slug });
    if (top.length >= 1) champion[u.name] = top[0].slug;
  }

  for (let i = 0; i < CROSS_UNIVERSE.length; i++) {
    for (let j = i + 1; j < CROSS_UNIVERSE.length; j++) {
      const a = champion[CROSS_UNIVERSE[i]], b = champion[CROSS_UNIVERSE[j]];
      if (a && b) pairs.push({ a, b });
    }
  }

  return pairs;
}
