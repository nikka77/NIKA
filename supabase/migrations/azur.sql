-- ═══════════════════════════════════════════════════════════════════
-- Migration : NIKA Azur — prestataires nautiques & réservations
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS azur_providers (
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

CREATE INDEX IF NOT EXISTS idx_azur_providers_slug
  ON azur_providers(slug);

CREATE INDEX IF NOT EXISTS idx_azur_providers_category
  ON azur_providers(category);

-- ─── Réservations ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS azur_bookings (
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

ALTER TABLE azur_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read azur_providers"       ON azur_providers;
DROP POLICY IF EXISTS "Service role write azur_providers" ON azur_providers;

CREATE POLICY "Public read azur_providers"
  ON azur_providers FOR SELECT USING (true);

CREATE POLICY "Service role write azur_providers"
  ON azur_providers FOR ALL USING (auth.role() = 'service_role');


ALTER TABLE azur_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert azur_bookings"    ON azur_bookings;
DROP POLICY IF EXISTS "Service role all azur_bookings" ON azur_bookings;

CREATE POLICY "Public insert azur_bookings"
  ON azur_bookings FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role all azur_bookings"
  ON azur_bookings FOR ALL USING (auth.role() = 'service_role');

-- ─── Seed : Rentboat 06 ──────────────────────────────────────────────

INSERT INTO azur_providers (
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

-- ─── Colonnes étendues (pour prestataires spéciaux) ─────────────────────────

ALTER TABLE azur_providers ADD COLUMN IF NOT EXISTS label_halal     boolean DEFAULT false;
ALTER TABLE azur_providers ADD COLUMN IF NOT EXISTS contact_snapchat text;
ALTER TABLE azur_providers ADD COLUMN IF NOT EXISTS bateaux          jsonb;
ALTER TABLE azur_providers ADD COLUMN IF NOT EXISTS formules_repas   jsonb;
ALTER TABLE azur_providers ADD COLUMN IF NOT EXISTS feux_artifice    jsonb;
ALTER TABLE azur_providers ADD COLUMN IF NOT EXISTS conditions       jsonb;
ALTER TABLE azur_providers ADD COLUMN IF NOT EXISTS accent_color     text;

-- Couleurs accent par prestataire
UPDATE azur_providers SET accent_color = '#0ea5e9' WHERE slug = 'rentboat-06';
UPDATE azur_providers SET accent_color = '#c9a84c' WHERE slug = 'nayah-boat';

-- ─── Table avis clients ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS azur_reviews (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_slug  text NOT NULL,
  author_name    text NOT NULL,
  rating         smallint CHECK (rating BETWEEN 1 AND 5),
  comment        text,
  pack_name      text,
  date_review    date DEFAULT CURRENT_DATE,
  initials_color text DEFAULT '#0ea5e9',
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_azur_reviews_slug ON azur_reviews(provider_slug);

ALTER TABLE azur_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read azur_reviews"     ON azur_reviews;
DROP POLICY IF EXISTS "Service role all azur_reviews" ON azur_reviews;

CREATE POLICY "Public read azur_reviews"
  ON azur_reviews FOR SELECT USING (true);

CREATE POLICY "Service role all azur_reviews"
  ON azur_reviews FOR ALL USING (auth.role() = 'service_role');

-- ─── Seed avis : Rentboat 06 ─────────────────────────────────────────────────

INSERT INTO azur_reviews (provider_slug, author_name, rating, comment, pack_name, date_review, initials_color) VALUES
  ('rentboat-06', 'Sophie M.', 5, 'Super expérience, skipper au top ! Les îles de Lérins sont magnifiques sous ce soleil.',  'Pack Journée', '2026-05-12', '#0ea5e9'),
  ('rentboat-06', 'Marc D.',   5, 'Sortie afterwork parfaite. Coucher de soleil sur Théoule-sur-Mer, inoubliable.',           'Afterwork',    '2026-04-28', '#f59e0b'),
  ('rentboat-06', 'Julien R.', 4, 'Bateau nickel, packs clairs, tout inclus comme promis. On reviendra cet été !',            'Pack Journée', '2026-04-10', '#7c3aed')
ON CONFLICT DO NOTHING;

-- ─── Seed avis : Nayah Boat ──────────────────────────────────────────────────

INSERT INTO azur_reviews (provider_slug, author_name, rating, comment, pack_name, date_review, initials_color) VALUES
  ('nayah-boat', 'Yasmine B.', 5, 'Formule coucher de soleil sur le Leader 805 — vue imprenable. Repas BBQ à bord, parfait !', 'Coucher de soleil', '2026-05-20', '#c9a84c'),
  ('nayah-boat', 'Karim A.',   5, 'Service impeccable, bateau propre. Le Tempest 700 pour 10 personnes, c''est énorme.',        'Journée complète',  '2026-04-30', '#4a90d9'),
  ('nayah-boat', 'Lina S.',    4, 'Bento Cake à bord pour l''anniversaire de ma sœur — une surprise réussie !',                'Demi-journée',      '2026-04-12', '#c9a84c')
ON CONFLICT DO NOTHING;

-- ─── Seed : Nayah Boat ───────────────────────────────────────────────────────

INSERT INTO azur_providers (
  slug, name, category, tagline, location,
  rating, review_count, verified,
  contact_instagram, contact_snapchat,
  label_halal,
  boat_model, capacity_max,
  inclus_default,
  photos, packs,
  bateaux, formules_repas, feux_artifice, conditions
) VALUES (
  'nayah-boat',
  'Nayah Boat',
  'nautique',
  'Sorties en mer à la carte — 6 bateaux pour tous les budgets',
  'Nice — Antibes',
  4.8,
  84,
  true,
  '@nayah-boat06',
  'NAYAH-BOAT06',
  true,
  '6 bateaux disponibles',
  10,
  ARRAY['Skipper','Carburant'],
  ARRAY[]::text[],
  '[{"name":"Coucher de soleil","price":200,"original_price":null,"hours":"19h–23h"},{"name":"Demi-journée","price":400,"original_price":null,"hours":"14h–18h"},{"name":"Journée complète","price":550,"original_price":null,"hours":"10h–18h"}]'::jsonb,
  '[
    {"id":"pacific_craft","nom":"Pacific Craft 5.70","capacite":6,"tarifs":{"coucher_soleil":200,"demi_journee":400,"journee":550}},
    {"id":"flyer_6","nom":"Flyer 6.5","capacite":8,"tarifs":{"coucher_soleil":200,"demi_journee":400,"journee":550}},
    {"id":"tempest_700","nom":"Tempest 700","capacite":10,"tarifs":{"coucher_soleil":250,"demi_journee":450,"journee":700}},
    {"id":"qs_675","nom":"Quicksilver 675","capacite":8,"tarifs":{"coucher_soleil":250,"demi_journee":450,"journee":700}},
    {"id":"cc_715","nom":"Cap Camarat 715","capacite":8,"tarifs":{"coucher_soleil":250,"demi_journee":450,"journee":700}},
    {"id":"leader_805","nom":"Leader 805","capacite":9,"tarifs":{"coucher_soleil":350,"demi_journee":600,"journee":850}}
  ]'::jsonb,
  '[
    {"key":"bbq","label":"Formule BBQ","prix":30,"unite":"pers.","emoji":"🔥"},
    {"key":"burger","label":"Formule Burger","prix":25,"unite":"pers.","emoji":"🍔"},
    {"key":"charcuterie","label":"Charcuterie & Fromages","prix":20,"unite":"pers.","emoji":"🧀"},
    {"key":"mini_sales","label":"Mini Salés","prix":1.5,"unite":"pièce","emoji":"🥗","minimum":20},
    {"key":"bento_cake","label":"Bento Cake","prix":35,"unite":"prest.","emoji":"🎂","hasCounter":false}
  ]'::jsonb,
  '[
    {"date":"14 juillet 2025","lieu":"Nice — Promenade des Anglais","heure":"22h00"},
    {"date":"24 juillet 2025","lieu":"Cannes — Baie de Cannes","heure":"22h30"},
    {"date":"15 août 2025","lieu":"Monaco — Port Hercule","heure":"21h30"}
  ]'::jsonb,
  '[
    {"icon":"⚓","title":"Acompte","desc":"200€ non remboursables (100€ bateau + 100€ équipement)"},
    {"icon":"🍽️","title":"Repas","desc":"Formules repas payées séparément, en avance"},
    {"icon":"👤","title":"Skipper","desc":"Skipper professionnel inclus dans tous les packs"},
    {"icon":"⛽","title":"Carburant","desc":"Inclus dans chaque formule"},
    {"icon":"🌤️","title":"Météo","desc":"Mauvais temps → report ou remboursement complet"},
    {"icon":"📅","title":"Annulation","desc":"Gratuite jusqu''à 48h avant la sortie"}
  ]'::jsonb
) ON CONFLICT (slug) DO NOTHING;
