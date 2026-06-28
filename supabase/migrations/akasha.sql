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
  description text,                              -- contenu long (markdown)
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
