// app/learn/akasha/api/booster/route.ts — le BOOSTER quotidien : 3 cartes tirées au sort,
// pondérées par rareté (1 rare+ garantie), toutes imagées. Le client (DailyBooster) gère
// le rythme 1×/jour via localStorage — pas de compte requis (même esprit que le kit livreur).
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Card = { slug: string; name: string; universe: string | null; image_url: string | null; rarity: string | null };

const COLS = 'slug, name, universe, image_url, rarity';

// Tirage du palier : 4 % légendaire · 12 % épique · 34 % rare · 50 % commun.
function rollRarity(): string {
  const r = Math.random();
  if (r < 0.04) return 'legendary';
  if (r < 0.16) return 'epic';
  if (r < 0.5) return 'rare';
  return 'common';
}

export async function GET(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ cards: [] });

  // Scopé à un univers si ?u= fourni (booster ouvert depuis un hub) → ne tire que ses cartes.
  const universe = new URL(request.url).searchParams.get('u')?.trim() || null;

  const pick = async (rarity: string): Promise<Card | null> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const base = (): any => {
      let q = supabase
        .from('akasha_entries')
        .select(COLS, { count: 'exact' })
        .eq('rarity', rarity)
        .not('image_url', 'is', null);
      if (universe) q = q.eq('universe', universe);
      return q;
    };
    const { count } = await base().range(0, 0);
    if (!count) return null;
    const idx = Math.floor(Math.random() * count);
    const { data } = await base().order('id', { ascending: true }).range(idx, idx);
    return (data as Card[] | null)?.[0] ?? null;
  };

  // 3 tirages — le premier est garanti rare ou mieux (l'ouverture doit récompenser).
  const tiers = [
    ['rare', 'epic', 'legendary'][Math.floor(Math.random() * 3)],
    rollRarity(),
    rollRarity(),
  ];
  const cards: Card[] = [];
  for (const t of tiers) {
    let c = await pick(t);
    if (!c) c = await pick('common');
    if (c && !cards.some((x) => x.slug === c!.slug)) cards.push(c);
  }
  // Complète si doublon éliminé
  while (cards.length < 3) {
    const c = await pick(rollRarity());
    if (c && !cards.some((x) => x.slug === c.slug)) cards.push(c);
    else if (!c) break;
  }

  return NextResponse.json({ cards });
}
