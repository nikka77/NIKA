-- ═══════════════════════════════════════════════════════════════
-- Fix RLS + Realtime + Contraintes + Colonnes RAKOMORIA
-- À exécuter dans le SQL Editor Supabase
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Enable RLS sur toutes les tables food ─────────────────
ALTER TABLE food_providers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_session_stocks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_order_items      ENABLE ROW LEVEL SECURITY;

-- ─── 2. Policies SELECT public ───────────────────────────────
DROP POLICY IF EXISTS "Public select food_providers"      ON food_providers;
DROP POLICY IF EXISTS "Public select food_items"          ON food_items;
DROP POLICY IF EXISTS "Public select food_sessions"       ON food_sessions;
DROP POLICY IF EXISTS "Public select food_session_stocks" ON food_session_stocks;
DROP POLICY IF EXISTS "Public select food_orders"         ON food_orders;
DROP POLICY IF EXISTS "Public select food_order_items"    ON food_order_items;

CREATE POLICY "Public select food_providers"      ON food_providers      FOR SELECT USING (true);
CREATE POLICY "Public select food_items"          ON food_items          FOR SELECT USING (true);
CREATE POLICY "Public select food_sessions"       ON food_sessions       FOR SELECT USING (true);
CREATE POLICY "Public select food_session_stocks" ON food_session_stocks FOR SELECT USING (true);
CREATE POLICY "Public select food_orders"         ON food_orders         FOR SELECT USING (true);
CREATE POLICY "Public select food_order_items"    ON food_order_items    FOR SELECT USING (true);

-- ─── 3. Policies INSERT public (commandes clients) ────────────
DROP POLICY IF EXISTS "Public insert food_orders"      ON food_orders;
DROP POLICY IF EXISTS "Public insert food_order_items" ON food_order_items;

CREATE POLICY "Public insert food_orders"      ON food_orders      FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert food_order_items" ON food_order_items FOR INSERT WITH CHECK (true);

-- ─── 4. Policies service_role (server actions) ────────────────
DROP POLICY IF EXISTS "Service all food_sessions"       ON food_sessions;
DROP POLICY IF EXISTS "Service all food_session_stocks" ON food_session_stocks;
DROP POLICY IF EXISTS "Service all food_orders"         ON food_orders;
DROP POLICY IF EXISTS "Service all food_providers"      ON food_providers;
DROP POLICY IF EXISTS "Service all food_items"          ON food_items;

CREATE POLICY "Service all food_sessions"       ON food_sessions       FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service all food_session_stocks" ON food_session_stocks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service all food_orders"         ON food_orders         FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service all food_providers"      ON food_providers      FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service all food_items"          ON food_items          FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service all food_order_items"    ON food_order_items    FOR ALL USING (auth.role() = 'service_role');

-- ─── 5. Realtime publication ──────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE food_session_stocks;
ALTER PUBLICATION supabase_realtime ADD TABLE food_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE food_sessions;

-- ─── 6. Contrainte unique food_sessions ──────────────────────
ALTER TABLE food_sessions
  ADD CONSTRAINT food_sessions_provider_date_unique
  UNIQUE (provider_id, date);

-- ─── 7. Colonnes RAKOMORIA (food_items) ──────────────────────
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS available_days text[]  DEFAULT NULL;
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS is_featured    boolean DEFAULT false;
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS badge          text    DEFAULT NULL;
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS min_qty        int     DEFAULT 1;
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS max_qty        int     DEFAULT NULL;

-- ─── 8. Colonnes RAKOMORIA (food_providers) ──────────────────
ALTER TABLE food_providers ADD COLUMN IF NOT EXISTS min_order_amount numeric(6,2) DEFAULT NULL;
ALTER TABLE food_providers ADD COLUMN IF NOT EXISTS delivery_zones   jsonb        DEFAULT NULL;
ALTER TABLE food_providers ADD COLUMN IF NOT EXISTS is_halal         boolean      DEFAULT false;
ALTER TABLE food_providers ADD COLUMN IF NOT EXISTS tags             text[]       DEFAULT NULL;

-- ─── 9. decrement_stock fonction (recreate avec security definer) ────
CREATE OR REPLACE FUNCTION decrement_stock(
  p_session_id uuid,
  p_item_id    uuid,
  p_qty        int
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE food_session_stocks
  SET remaining_stock = GREATEST(0, remaining_stock - p_qty)
  WHERE session_id = p_session_id AND item_id = p_item_id;

  IF NOT EXISTS (
    SELECT 1 FROM food_session_stocks
    WHERE session_id = p_session_id AND remaining_stock > 0
  ) THEN
    UPDATE food_sessions SET status = 'sold_out', closed_at = now()
    WHERE id = p_session_id;
  END IF;
END;
$$;
