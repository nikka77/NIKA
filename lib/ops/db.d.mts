// lib/ops/db.d.ts — types des deux clients de la flotte (05/08/2026).
//
// POURQUOI CE FICHIER EXISTE
// db.mjs est du JavaScript : sans déclaration, TypeScript ne sait rien de ce que rendent
// clientOps() et clientSite(), et l'inférence retombe sur `never` dès qu'on chaîne un .from().
// Résultat concret : `app/api/ops/audit/route.ts` cassait le build sur des « implicit any » à
// chaque ligne de requête — un fichier qui compile en dev et fait échouer `next build`.
//
// On type donc les deux clients à la SOURCE plutôt que d'annoter chaque appel : une déclaration
// ici répare tous les consommateurs, présents et futurs.
//
// Le schéma reste volontairement générique : les deux bases n'ont pas les mêmes tables
// (clientOps → base de TRAVAIL sur le VPS : agent_results, ops_notes, ops_workers, la file ;
// clientSite → Supabase : akasha_entries, akasha_relations). Générer deux schémas typés serait
// utile mais ce n'est pas ce qui bloque aujourd'hui, et un type faux serait pire qu'un type large.
import type { SupabaseClient } from '@supabase/supabase-js';

/** Base de TRAVAIL (VPS, via PostgREST) : la file, les productions, les verdicts, la flotte. */
export function clientOps(): SupabaseClient;

/** Base du SITE (Supabase) : ce que les pages publiques lisent — akasha_entries, akasha_relations. */
export function clientSite(): SupabaseClient;
