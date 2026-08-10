-- ═══════════════════════════════════════════════════════════════════
-- NIKA AKASHA — Registre universel d'entités (domaine LEARN).
-- Un mini-wiki de lore : personnages, lieux, artefacts, métiers, statuts,
-- pouvoirs, compétences — réels ou fictifs — reliés entre eux.
-- Idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- RLS : lecture publique (anon), écriture réservée au service_role (v1).
-- À coller dans Supabase → SQL Editor → Run.
-- ═══════════════════════════════════════════════════════════════════

-- Recherche par nom (ILIKE) accélérée par un index trigram.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── ENTRÉES (fiches) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS akasha_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  type        text NOT NULL
    CHECK (type IN ('character','place','artifact','profession','status','power','skill')),
  name        text NOT NULL,
  is_fiction  boolean NOT NULL DEFAULT true,
  universe    text,                              -- source/univers ("One Piece", "Bleach", "Histoire / réel"…)
  summary     text,                              -- résumé court (cartes)
  description text,                              -- ⚠ COLONNE MORTE, ne rien y brancher. Le nom ment :
                                                   -- ce n'est PAS le contenu long. C'était une COPIE
                                                   -- de `summary` posée par les seeders à la création
                                                   -- (scripts/build-akasha-naruto.mjs, build-akasha-
                                                   -- universes.mjs, akasha-db-places.mjs, akasha-db-
                                                   -- cure.mjs), jamais régénérée depuis. Le contenu
                                                   -- long vit dans `attributes->>'descFr'` (7 178
                                                   -- fiches) et dans la table `akasha_sections`
                                                   -- (4 776 fiches). Aucun composant ne la lit.
                                                   -- Mesuré le 10/08/2026, lecture paginée des 7 632
                                                   -- fiches (data/audits/description-colonne-scan-
                                                   -- 2026-08-10T07-53-30-206Z.json) : 7 599 vides
                                                   -- (99,57 %) ; sur les 33 restantes, 5 redisent
                                                   -- `summary`, 23 sont des gabarits fossiles, 2 sont
                                                   -- des bugs (texte d'une autre entité : zerhogie,
                                                   -- inner-former), 3 seulement portent un vrai texte
                                                   -- distinct, déjà couvert par descFr.
  image_url   text,
  attributes  jsonb NOT NULL DEFAULT '{}',       -- attributs spécifiques au type
  rarity      text
    CHECK (rarity IS NULL OR rarity IN ('common','rare','epic','legendary')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_akasha_entries_type ON akasha_entries(type);
CREATE INDEX IF NOT EXISTS idx_akasha_entries_slug ON akasha_entries(slug);
CREATE INDEX IF NOT EXISTS idx_akasha_entries_name_trgm
  ON akasha_entries USING gin (name gin_trgm_ops);

ALTER TABLE akasha_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read akasha_entries"      ON akasha_entries;
DROP POLICY IF EXISTS "Service role all akasha_entries" ON akasha_entries;

CREATE POLICY "Public read akasha_entries"      ON akasha_entries FOR SELECT USING (true);
CREATE POLICY "Service role all akasha_entries" ON akasha_entries FOR ALL USING (auth.role() = 'service_role');

-- Vérité de la colonne `description`, pour quiconque lit le schéma sans ouvrir ce fichier.
-- Corrige le commentaire inline posé à la création (qui disait « contenu long markdown » — faux).
-- Idempotent : COMMENT ON COLUMN peut être rejoué sans risque.
--
-- ⚠ 10/08/2026 — CE COMMENT N'EST PAS APPLIQUÉ EN BASE. Vérifié via l'OpenAPI PostgREST
-- (GET <projet>/rest/v1/ avec Accept: application/openapi+json) : aucune colonne du schéma
-- entier ne porte de commentaire — akasha_entries.description non plus. Ce fichier est le
-- script de CRÉATION complet, que personne ne rejoue sur une base déjà peuplée : le commentaire
-- y est donc mort-né. Pour le poser pour de bon, coller le fichier autonome
-- supabase/migrations/akasha_commentaire_description.sql dans Supabase → SQL Editor.
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

-- ─── RELATIONS (liens entre entités) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS akasha_relations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entry uuid NOT NULL REFERENCES akasha_entries(id) ON DELETE CASCADE,
  to_entry   uuid NOT NULL REFERENCES akasha_entries(id) ON DELETE CASCADE,
  relation   text NOT NULL,                      -- possede, maitrise, exerce, habite, allie, rival, appartient…
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT akasha_relations_no_self CHECK (from_entry <> to_entry),
  CONSTRAINT akasha_relations_unique UNIQUE (from_entry, to_entry, relation)
);

CREATE INDEX IF NOT EXISTS idx_akasha_relations_from ON akasha_relations(from_entry);
CREATE INDEX IF NOT EXISTS idx_akasha_relations_to   ON akasha_relations(to_entry);

ALTER TABLE akasha_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read akasha_relations"      ON akasha_relations;
DROP POLICY IF EXISTS "Service role all akasha_relations" ON akasha_relations;

CREATE POLICY "Public read akasha_relations"      ON akasha_relations FOR SELECT USING (true);
CREATE POLICY "Service role all akasha_relations" ON akasha_relations FOR ALL USING (auth.role() = 'service_role');
