// app/sitemap.ts — sitemap dynamique : hubs d'univers, pages spéciales, axes long-tail à fort
// potentiel SEO, et toutes les fiches AKASHA. Découvrable par Google (aucun sitemap n'existait).
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { UNIVERSE_TAXONOMY } from '@/lib/akasha/universe-taxonomy';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 86400; // 1 jour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const out: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/learn/akasha`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/learn/akasha/wanted`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];

  // Hubs + axes long-tail (?universe=&attr=&val=) — les pages de niche les plus partageables.
  for (const u of UNIVERSE_TAXONOMY) {
    out.push({ url: `${SITE_URL}/learn/akasha/u/${u.slug}`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 });
    for (const axis of u.axes) {
      for (const val of axis.values) {
        const p = new URLSearchParams({ universe: u.name, attr: axis.attr, val: val.v });
        out.push({ url: `${SITE_URL}/learn/akasha?${p.toString()}`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 });
      }
    }
  }

  // Toutes les fiches (slugs paginés, plafond PostgREST 1000).
  const supabase = await createClient();
  if (supabase) {
    for (let from = 0; ; from += 1000) {
      const { data } = await supabase.from('akasha_entries').select('slug').range(from, from + 999);
      const rows = (data as { slug: string }[] | null) ?? [];
      for (const r of rows) out.push({ url: `${SITE_URL}/learn/akasha/${r.slug}`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 });
      if (rows.length < 1000) break;
    }
  }
  return out;
}
