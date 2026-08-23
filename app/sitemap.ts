// app/sitemap.ts — sitemap du CŒUR. Vague C (23/08/2026, migration en zones) : ce fichier ne
// listait QUE des URL AKASHA (8 019 sur 8 019, vérifié contre le sitemap de la zone avant
// extraction) — la zone nika-akasha sert désormais son propre /learn/akasha/sitemap.xml (déclaré
// par app/robots.ts, en plus de celui-ci). Rien n'a jamais remplacé ces URL par des pages du cœur
// (FOOD, STAY…) : ce fichier reste donc vide tant que personne ne le demande — l'ajouter serait
// écrire une fonctionnalité non demandée, pas amaigrir. Import { SITE_URL } gardé prêt pour le jour
// où le cœur voudra lister ses propres pages ici.
import type { MetadataRoute } from 'next';

export const revalidate = 86400; // 1 jour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [];
}
