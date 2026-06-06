-- Migration Supabase : table disponibilités STAY
-- À exécuter dans l'éditeur SQL Supabase

CREATE TABLE IF NOT EXISTS stay_availability (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug          text NOT NULL,
  airbnb_id     text NOT NULL,
  date          date NOT NULL,
  available     boolean NOT NULL DEFAULT false,
  min_nights    integer,
  price_native  decimal(10,2),
  currency      text,
  fetched_at    timestamptz DEFAULT now(),
  UNIQUE(slug, date)
);

-- Index pour requêtes rapides par slug + mois
CREATE INDEX IF NOT EXISTS idx_stay_avail_slug_date
  ON stay_availability(slug, date);

-- RLS : lecture publique, écriture service role uniquement
ALTER TABLE stay_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read availability"
  ON stay_availability FOR SELECT
  USING (true);

CREATE POLICY "Service role write"
  ON stay_availability FOR ALL
  USING (auth.role() = 'service_role');

-- Vue pratique : prochains 90 jours disponibles par listing
CREATE OR REPLACE VIEW stay_next_available AS
SELECT
  slug,
  airbnb_id,
  array_agg(date ORDER BY date) FILTER (WHERE available = true) AS available_dates,
  count(*) FILTER (WHERE available = true) AS available_count,
  max(fetched_at) AS last_sync
FROM stay_availability
WHERE date >= CURRENT_DATE
  AND date <= CURRENT_DATE + INTERVAL '90 days'
GROUP BY slug, airbnb_id;
