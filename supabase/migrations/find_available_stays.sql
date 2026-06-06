-- ═══════════════════════════════════════════════════════
-- Migration : smart search disponibilités STAY
-- Coller dans l'éditeur SQL Supabase et exécuter
-- ═══════════════════════════════════════════════════════

-- 1. Colonnes manquantes sur stay_listings pour la fonction
ALTER TABLE stay_listings
  ADD COLUMN IF NOT EXISTS rating     decimal(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cover_image text;

-- 2. Index partiel sur disponibilités (perf smart search)
CREATE INDEX IF NOT EXISTS idx_stay_avail_avail_date
  ON stay_availability(available, date) WHERE available = true;

-- 3. Fonction smart search (N nuits consécutives dans une fenêtre)
CREATE OR REPLACE FUNCTION find_available_stays(
  p_nights  integer,
  p_from    date DEFAULT CURRENT_DATE,
  p_to      date DEFAULT CURRENT_DATE + INTERVAL '60 days'
)
RETURNS TABLE (
  slug             text,
  first_date       date,
  last_date        date,
  consecutive_days bigint,
  name             text,
  wow_score        integer,
  rating           numeric,
  listing_type     text,
  country          text,
  cover_image      text
)
LANGUAGE sql STABLE AS $$
  WITH
  -- Numéroter les jours disponibles par listing
  numbered AS (
    SELECT
      sa.slug,
      sa.date,
      -- Astuce : si les dates sont consécutives, date - row_number est constante
      (sa.date - (
        ROW_NUMBER() OVER (
          PARTITION BY sa.slug
          ORDER BY sa.date
        ) * INTERVAL '1 day'
      )::integer)::date AS grp
    FROM stay_availability sa
    WHERE sa.available = true
      AND sa.date >= p_from
      AND sa.date <= p_to
  ),
  -- Regrouper les blocs consécutifs
  blocks AS (
    SELECT
      slug,
      grp,
      MIN(date)  AS first_date,
      COUNT(*)   AS consecutive_days
    FROM numbered
    GROUP BY slug, grp
    HAVING COUNT(*) >= p_nights
  )
  SELECT
    b.slug,
    b.first_date::date,
    (b.first_date + (p_nights - 1) * INTERVAL '1 day')::date  AS last_date,
    b.consecutive_days,
    COALESCE(sl.name,        b.slug)    AS name,
    COALESCE(sl.wow_score,   0)         AS wow_score,
    COALESCE(sl.rating,      0)         AS rating,
    COALESCE(sl.type,        'Unknown') AS listing_type,
    COALESCE(sl.country,     '')        AS country,
    sl.cover_image
  FROM blocks b
  LEFT JOIN stay_listings sl ON sl.slug = b.slug
  ORDER BY b.first_date ASC, sl.wow_score DESC NULLS LAST;
$$;

-- Test rapide après le scrape initial :
-- SELECT * FROM find_available_stays(3, '2026-07-01', '2026-07-31');
-- SELECT * FROM find_available_stays(7);  -- 7 nuits dans les 60 prochains jours
