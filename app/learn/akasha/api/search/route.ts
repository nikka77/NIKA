// app/learn/akasha/api/search/route.ts — endpoint de l'OMNI-SEARCH (L8). Renvoie des résultats
// groupés par type, avec un extrait descFr autour du terme (pour surlignage côté client).
import { NextResponse } from 'next/server';
import { omniSearch } from '@/lib/akasha/queries';
import { TYPE_META } from '@/lib/akasha/types';

/** Extrait de ~120 car. centré sur la 1re occurrence du terme dans la bio VF. */
function snippet(descFr: string | null | undefined, q: string): string | null {
  if (!descFr) return null;
  const i = descFr.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return null;
  const start = Math.max(0, i - 45);
  const raw = (start > 0 ? '…' : '') + descFr.slice(start, i + q.length + 75).trim() + '…';
  return raw.replace(/\s+/g, ' ');
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim();
  if (q.length < 2) return NextResponse.json({ groups: [] });
  const results = await omniSearch(q, 30);

  // Groupe par type, dans l'ordre TYPE_META.
  const byType = new Map<string, typeof results>();
  for (const r of results) {
    const arr = byType.get(r.type) ?? [];
    arr.push(r);
    byType.set(r.type, arr);
  }
  const groups = [...byType.entries()].map(([type, items]) => ({
    type,
    label: TYPE_META[type as keyof typeof TYPE_META]?.plural ?? type,
    icon: TYPE_META[type as keyof typeof TYPE_META]?.icon ?? '✦',
    items: items.slice(0, 8).map((r) => ({
      slug: r.slug, name: r.name, universe: r.universe, image_url: r.image_url, rarity: r.rarity,
      snippet: snippet(r.descFr, q),
    })),
  }));

  return NextResponse.json({ groups, total: results.length });
}
