// app/sitemap.ts — sitemap du CŒUR : ses pages publiques, et plus rien d'AKASHA.
//
// Vague C (23/08/2026, migration en zones) : ce fichier ne listait QUE des URL AKASHA (8 019 sur
// 8 019, vérifié contre le sitemap de la zone avant extraction) — la zone nika-akasha sert désormais
// son propre /learn/akasha/sitemap.xml, déclaré par app/robots.ts en plus de celui-ci. Le jour de la
// fusion, ce fichier était vide : un sitemap vide déclaré dans robots.txt dit aux moteurs « ce site
// n'a pas de page », ce qui est faux. On liste ici ce qui est RÉELLEMENT public et stable : les
// pages de domaine, les outils, l'éditorial/légal, les 41 logements STAY (données locales,
// pré-rendus par generateStaticParams) et leurs thèmes. Ni tableaux de bord, ni auth, ni pro, ni
// ops : ces pages n'ont rien à faire dans un index.
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import wowData from '@/data/wow_listings.json';

export const revalidate = 86400; // 1 jour

/** Thèmes STAY — les 21 clés de THEME_META (app/stay/theme/[theme]/page.tsx, constante locale à la
 *  page, non exportée) : recopiées ici, relues au 23/08/2026. Une clé absente ici = une page non
 *  indexée, une clé en trop = un 404 dans le sitemap. */
const STAY_THEMES = ['silo-bunker', 'maison-flottante', 'avion', 'sous-marin', 'grotte', 'maison-terre',
  'maison-hobbit', 'cabane-arbres', 'tiny-house', 'bambou', 'villa-bali', 'train-reconverti',
  'tour-observation', 'bulle-transparente', 'thematique', 'france', 'moulin-reconverti',
  'grange-reconvertie', 'sous-eau', 'capsule-spatiale', 'grue-industrielle',
  // + le thème agrégé lié depuis /stay (hors THEME_META, rendu par repli) — répond 200, relu le 23/08.
  'architecture-surrealiste'];

const PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/food', priority: 0.9, changeFrequency: 'daily' },
  { path: '/auto', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/auto/vtc', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/auto/location', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/auto/depannage', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/stay', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/azur', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/rent', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/serv', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/learn', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/sec', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/news', priority: 0.7, changeFrequency: 'daily' },
  { path: '/carte', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/tools', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/tools/meteo', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/tools/livraison', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/tools/convertisseur', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/tools/numeros', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/comment-ca-marche', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/press', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/pro', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/affilies', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/cgu', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/confidentialite', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/cookies', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/mentions-legales', priority: 0.2, changeFrequency: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages = PAGES.map((p) => ({ url: `${SITE_URL}${p.path}`, lastModified: now, changeFrequency: p.changeFrequency, priority: p.priority }));
  const stays = wowData.listings.map((l) => ({
    url: `${SITE_URL}/stay/${l.slug}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7,
  }));
  const themes = STAY_THEMES.map((t) => ({
    url: `${SITE_URL}/stay/theme/${t}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.6,
  }));
  return [...pages, ...stays, ...themes];
}
