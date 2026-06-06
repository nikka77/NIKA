-- ═══════════════════════════════════════════════════════════════════
-- Migration : Riviera — prestataires nautiques & réservations
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS riviera_providers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text UNIQUE NOT NULL,
  name             text NOT NULL,
  category         text,
  tagline          text,
  description      text,
  location         text,
  rating           numeric(3,2),
  review_count     int DEFAULT 0,
  verified         boolean DEFAULT false,
  contact_whatsapp text,
  contact_instagram text,
  photos           text[],
  packs            jsonb,
  options          jsonb,
  inclus_default   text[],
  promo_social     text,
  boat_model       text,
  capacity_max     int,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_riviera_providers_slug
  ON riviera_providers(slug);

CREATE INDEX IF NOT EXISTS idx_riviera_providers_category
  ON riviera_providers(category);

-- ─── Réservations ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS riviera_bookings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_slug  text NOT NULL,
  pack_name      text,
  options        jsonb,
  total          numeric(10,2),
  acompte        numeric(10,2),
  payment_method text,      -- 'card' | 'cash' | 'nika_token'
  status         text DEFAULT 'pending',
  date           date,
  persons        int,
  created_at     timestamptz DEFAULT now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────

ALTER TABLE riviera_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read riviera_providers"   ON riviera_providers;
DROP POLICY IF EXISTS "Service role write riviera_providers" ON riviera_providers;

CREATE POLICY "Public read riviera_providers"
  ON riviera_providers FOR SELECT USING (true);

CREATE POLICY "Service role write riviera_providers"
  ON riviera_providers FOR ALL USING (auth.role() = 'service_role');


ALTER TABLE riviera_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert riviera_bookings"      ON riviera_bookings;
DROP POLICY IF EXISTS "Service role all riviera_bookings"   ON riviera_bookings;

CREATE POLICY "Public insert riviera_bookings"
  ON riviera_bookings FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role all riviera_bookings"
  ON riviera_bookings FOR ALL USING (auth.role() = 'service_role');

-- ─── Seed : Rentboat 06 ──────────────────────────────────────────────

INSERT INTO riviera_providers (
  slug, name, category, tagline, location,
  rating, review_count, verified,
  contact_whatsapp, contact_instagram,
  boat_model, capacity_max,
  inclus_default, promo_social,
  photos, packs, options
) VALUES (
  'rentboat-06',
  'Rentboat 06',
  'nautique',
  'Vivez la mer autrement',
  'Cannes Marina',
  4.9,
  127,
  true,
  '+33XXXXXXXXX',
  '@rentboat06',
  'Cap Camarat 9WA — 2×250 CV',
  10,
  ARRAY['Skipper','Essence','Sono','Frigo','Masques'],
  'Barbecue offert si vous partagez votre sortie en story Instagram en nous notifiant',
  ARRAY[]::text[],
  '[
    {"name":"Pack Journée","price":990,"original_price":1140,"hours":"10h00–18h00","destination":"Îles de Lérins ou Baie de Théoule","inclus":["Skipper","Essence","Sono","Frigo","Paddle","Masques"]},
    {"name":"Afterwork","price":590,"original_price":790,"hours":"19h00–22h00","destination":"Baie de Théoule-sur-Mer","inclus":["Skipper","Essence","Sono","Hookah","Frigo"]},
    {"name":"Feu d''Artifices","price":790,"original_price":950,"hours":"19h00–23h00","destination":"Baie de Cannes","inclus":["Skipper","Essence","Sono","Frigo"]}
  ]'::jsonb,
  '[
    {"key":"bbq","label":"Barbecue","description":"Mise à disposition — viande à prévoir","price":150},
    {"key":"seabob","label":"Seabob","description":"Scooter sous-marin électrique","price":200},
    {"key":"jetski","label":"Jetski à l''heure","description":"Permis bateau obligatoire","price":150},
    {"key":"plateforme","label":"Plateforme flottante géante","description":"Bain de soleil à côté du bateau","price":300},
    {"key":"piscine","label":"Piscine anti-méduses","description":"3,5 × 5 mètres","price":300},
    {"key":"fruits","label":"Plateau de fruits","description":"Sur demande","price":null}
  ]'::jsonb
) ON CONFLICT (slug) DO NOTHING;
