-- supabase/migrations/akasha_interdire_relations_jsonb.sql — décision 2 du plan minimal (05/08/2026).
--
-- UNE ARÊTE VIT À UN SEUL ENDROIT : la table akasha_relations, la seule que le site interroge.
--
-- Ce qui s'est passé sans cette contrainte : jusqu'au 01/08, l'application des productions écrivait
-- les relations dans akasha_entries.attributes.relations, un champ qu'aucun composant ne lit.
-- 138 productions « historien des relations », 24 appliquées, 0 ligne de graphe — du travail
-- d'agents entièrement perdu, et personne pour s'en apercevoir puisque rien ne cassait.
--
-- Le rattrapage du 05/08 a versé 4 137 arêtes dormantes dans le graphe (ennemi ×6,5, mentor ×3,8)
-- puis vidé le champ : 0 fiche sur 7 691 le porte encore. Cette contrainte empêche qu'il revienne.
--
-- Application :
--   DB_PASSWORD=… node scripts/apply-sql.cjs supabase/migrations/akasha_interdire_relations_jsonb.sql
-- (le mot de passe est dans Supabase → Settings → Database ; il n'a pas sa place dans .env.local)
--
-- Vérification de l'état AVANT, pour que la contrainte ne casse pas sur des lignes existantes :
--   select count(*) from akasha_entries where attributes ? 'relations';   -- doit rendre 0

alter table public.akasha_entries
  drop constraint if exists akasha_entries_pas_de_relations_jsonb;

alter table public.akasha_entries
  add constraint akasha_entries_pas_de_relations_jsonb
  check (not (attributes ? 'relations'));

comment on constraint akasha_entries_pas_de_relations_jsonb on public.akasha_entries is
  'Une arête vit dans akasha_relations, jamais dans le JSONB. Voir lib/akasha/relations.ts : '
  'poserAuGraphe() est le SEUL chemin d''écriture. Contrainte posée le 05/08/2026 après avoir '
  'rapatrié 4 137 arêtes que ce champ retenait invisibles.';
