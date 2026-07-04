// lib/site.ts — URL de base du site (SEO : metadataBase, sitemap, og). Prod via NEXT_PUBLIC_APP_URL.
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
