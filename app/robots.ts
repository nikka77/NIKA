// app/robots.ts — indexe les hubs/fiches/axes utiles, écarte les endpoints techniques.
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/learn/akasha/random', '/learn/akasha/api/'] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
