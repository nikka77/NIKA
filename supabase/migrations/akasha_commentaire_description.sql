-- ═══════════════════════════════════════════════════════════════════
-- AKASHA — poser la VÉRITÉ sur akasha_entries.description dans la base.
-- Chantier 5, 10/08/2026.
--
-- POURQUOI CE FICHIER EXISTE
-- Le COMMENT ON COLUMN écrit le 08/08 vit à l'intérieur de supabase/migrations/akasha.sql,
-- qui est le script de CRÉATION complet du registre (CREATE TABLE IF NOT EXISTS…). Personne
-- ne rejoue ce script sur une base peuplée de 7 632 fiches, donc le commentaire n'a jamais
-- atteint la base. Constaté le 10/08/2026 : l'OpenAPI PostgREST du projet ne renvoie AUCUN
-- commentaire de colonne, pour aucune table du schéma. Un schéma qui ment coûte cher — mais
-- une documentation qui n'est jamais exécutée ne coûte pas moins.
--
-- CE QUE ÇA FAIT : rien d'autre que poser un commentaire. Zéro DDL structurel, zéro donnée
-- touchée, rejouable autant de fois qu'on veut.
--
-- COMMENT L'APPLIQUER : Supabase → SQL Editor → coller ce fichier → Run.
--
-- COMMENT VÉRIFIER QUE C'EST PASSÉ (depuis le dépôt, sans SQL) :
--   node --env-file=.env.local -e "
--     const u=process.env.NIKA_SITE_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
--     const k=process.env.NIKA_SITE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
--     const j=await (await fetch(u+'/rest/v1/',{headers:{apikey:k,Authorization:'Bearer '+k,
--       Accept:'application/openapi+json'}})).json();
--     console.log(j.definitions.akasha_entries.properties.description.description ?? 'TOUJOURS VIDE');"
--   → doit imprimer le texte ci-dessous au lieu de « TOUJOURS VIDE ».
-- ═══════════════════════════════════════════════════════════════════

COMMENT ON COLUMN akasha_entries.description IS
  'COLONNE MORTE — le nom ment. Ce n''est PAS le texte long de la fiche : c''était une copie '
  'figée de summary posée par les seeders à la création, jamais régénérée depuis. Le texte long '
  'réel vit dans attributes->>''descFr'' (7178 fiches) et dans la table akasha_sections '
  '(4776 fiches). Aucun composant du front ne lit cette colonne : seul getEntryBySlug la charge, '
  'par un select(*), sans jamais la rendre. Mesuré le 10/08/2026 sur les 7632 fiches en lecture '
  'paginée (data/audits/description-colonne-scan-2026-08-10T07-53-30-206Z.json) : 7599 vides '
  '(99,57%) ; sur les 33 restantes, 5 redisent summary mot pour mot, 23 sont des gabarits '
  'fossiles du genre « Personnage secondaire de One Piece. », 2 portent le texte d''une AUTRE '
  'entité (bugs ouverts : zerhogie, inner-former), et 3 seulement portent un vrai texte distinct '
  '(getsuga-tensho, karakura, vizard), déjà couvert par descFr. Ne rien y écrire, ne rien y '
  'brancher : lire attributes->>''descFr'' ou akasha_sections.';

-- Deux voisines documentées au passage, pour que le lecteur du schéma sache où est le vrai texte.
COMMENT ON COLUMN akasha_entries.summary IS
  'Résumé COURT, une à deux phrases — c''est ce qui s''affiche sur les cartes de la grille '
  '(CARD_COLS, lib/akasha/queries.ts). Pas de markdown.';

COMMENT ON COLUMN akasha_entries.attributes IS
  'Attributs spécifiques au type (lib/akasha/schema.ts) + le TEXTE LONG de la fiche sous la clé '
  '"descFr" (bio VF canon) — c''est descFr, et non la colonne description, que la page de fiche '
  'affiche et que la recherche fouille. Le dossier détaillé (sections) vit, lui, dans la table '
  'akasha_sections depuis le 05/08/2026.';
