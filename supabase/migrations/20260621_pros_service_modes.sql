-- supabase/migrations/20260621_pros_service_modes.sql
-- Modes de service FOOD pour les pros (Livraison / Sur place / À emporter).
-- La roulette du FoodModule (components/home/FoodModule.tsx) filtre les pros par mode ;
-- jusqu'ici lib/food.ts mappait TOUS les pros aux 3 modes faute de colonne dédiée.
--
-- Prérequis : la table `pros` doit exister (voir supabase/migrations/core.sql).
-- Idempotent : ré-exécutable sans effet de bord.

-- 1) Colonne (NULL/vide = non renseigné → l'app retombe sur les 3 modes)
ALTER TABLE pros
  ADD COLUMN IF NOT EXISTS service_modes text[];

-- 2) Validation : uniquement un sous-ensemble des 3 modes autorisés
ALTER TABLE pros DROP CONSTRAINT IF EXISTS pros_service_modes_valid;
ALTER TABLE pros
  ADD CONSTRAINT pros_service_modes_valid
  CHECK (
    service_modes IS NULL
    OR service_modes <@ ARRAY['livraison', 'surplace', 'emporter']::text[]
  );

-- 3) Index GIN pour filtrer par mode (ex: WHERE service_modes @> '{livraison}')
CREATE INDEX IF NOT EXISTS idx_pros_service_modes
  ON pros USING gin (service_modes);

COMMENT ON COLUMN pros.service_modes IS
  'Modes de service (domaine food) : sous-ensemble de {livraison, surplace, emporter}. NULL/vide = les trois (fallback applicatif lib/food.ts).';
