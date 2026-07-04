// app/learn/akasha/random/route.ts — « Surprends-moi » : redirige vers une fiche AU HASARD
// (pondérée vers les entrées imagées pour l'effet wow). Pick par offset aléatoire — pas de
// tri SQL RANDOM() disponible via PostgREST.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = await createClient();
  const fallback = new URL('/learn/akasha', request.url);
  if (!supabase) return NextResponse.redirect(fallback);

  // 3 tirages sur 4 parmi les entrées imagées (fiches plus spectaculaires), sinon tout le registre.
  const imagedOnly = Math.random() < 0.75;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base = (): any => {
    let q = supabase.from('akasha_entries').select('slug', { count: 'exact' });
    if (imagedOnly) q = q.not('image_url', 'is', null);
    return q;
  };
  const { count } = await base().range(0, 0);
  if (!count) return NextResponse.redirect(fallback);

  const idx = Math.floor(Math.random() * count);
  const { data } = await base().order('id', { ascending: true }).range(idx, idx);
  const slug = (data as { slug: string }[] | null)?.[0]?.slug;
  return NextResponse.redirect(slug ? new URL(`/learn/akasha/${slug}`, request.url) : fallback);
}
