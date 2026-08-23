// app/robots.ts — indexe les hubs/fiches/axes utiles, écarte les endpoints techniques.
// Vague C (23/08/2026, migration en zones) : DEUX sitemaps, tous deux sous le domaine du cœur —
// le sien (app/sitemap.ts, désormais sans AKASHA) et celui de la zone nika-akasha, servi ici via le
// rewrite /learn/akasha de next.config.js (donc /learn/akasha/sitemap.xml répond depuis CE domaine,
// même si le contenu vient de nika-akasha.vercel.app). Les disallow AKASHA restent : la zone sert
// le même /learn/akasha/random et /learn/akasha/api/ à travers le même préfixe public.
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/learn/akasha/random', '/learn/akasha/api/'] },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/learn/akasha/sitemap.xml`],
  };
}
