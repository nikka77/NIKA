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

-- (vue stay_next_available retirée — inutilisée ; la route /api/calendar/[slug]
--  interroge directement la table, et la recherche par dates passe par le RPC
--  find_available_stays.)
