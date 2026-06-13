-- ═══════════════════════════════════════════════════════════════════
-- Migration CORE : tables fondamentales NIKA
-- users, pros, listings, orders, flash_deals, pois, news, reviews,
-- gamification (xp), wallet (credits), waitlist, contact, sms
-- + stay_issues / stay_stats (reviews IA)
-- Idempotente : IF NOT EXISTS partout, ON CONFLICT sur les seeds.
-- ═══════════════════════════════════════════════════════════════════

-- ─── USERS (miroir public de auth.users) ─────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username       text UNIQUE NOT NULL,
  full_name      text,
  avatar_url     text,
  xp             int NOT NULL DEFAULT 0,
  level          int NOT NULL DEFAULT 1,
  level_name     text NOT NULL DEFAULT 'Inconnu',
  nika_credits   int NOT NULL DEFAULT 0,
  wallet_address text,
  is_pro         boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read users"        ON users;
DROP POLICY IF EXISTS "Self insert users"        ON users;
DROP POLICY IF EXISTS "Self update users"        ON users;
DROP POLICY IF EXISTS "Service role all users"   ON users;

CREATE POLICY "Public read users"      ON users FOR SELECT USING (true);
CREATE POLICY "Self insert users"      ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Self update users"      ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role all users" ON users FOR ALL USING (auth.role() = 'service_role');

-- ─── PROS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pros (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES users(id) ON DELETE SET NULL,
  domain          text NOT NULL,
  business_name   text UNIQUE NOT NULL,
  description     text,
  phone           text,
  address         text,
  lat             double precision,
  lng             double precision,
  verified        boolean NOT NULL DEFAULT false,
  active          boolean NOT NULL DEFAULT true,
  rating          numeric(3,2) NOT NULL DEFAULT 0,
  review_count    int NOT NULL DEFAULT 0,
  rating_count    int NOT NULL DEFAULT 0,
  google_place_id text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pros_domain ON pros(domain) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_pros_user   ON pros(user_id);

ALTER TABLE pros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read pros"      ON pros;
DROP POLICY IF EXISTS "Owner insert pros"     ON pros;
DROP POLICY IF EXISTS "Owner update pros"     ON pros;
DROP POLICY IF EXISTS "Service role all pros" ON pros;

CREATE POLICY "Public read pros"      ON pros FOR SELECT USING (true);
CREATE POLICY "Owner insert pros"     ON pros FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update pros"     ON pros FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role all pros" ON pros FOR ALL USING (auth.role() = 'service_role');

-- ─── LISTINGS ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS listings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id      uuid NOT NULL REFERENCES pros(id) ON DELETE CASCADE,
  domain      text NOT NULL,
  title       text NOT NULL,
  description text,
  price       numeric(10,2),
  currency    text NOT NULL DEFAULT 'EUR',
  stock       int,
  available   boolean NOT NULL DEFAULT true,
  images      text[],
  metadata    jsonb,
  affil_url   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listings_pro    ON listings(pro_id);
CREATE INDEX IF NOT EXISTS idx_listings_domain ON listings(domain) WHERE available = true;

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read listings"      ON listings;
DROP POLICY IF EXISTS "Owner write listings"      ON listings;
DROP POLICY IF EXISTS "Service role all listings" ON listings;

CREATE POLICY "Public read listings" ON listings FOR SELECT USING (true);
CREATE POLICY "Owner write listings" ON listings FOR ALL
  USING (EXISTS (SELECT 1 FROM pros WHERE pros.id = listings.pro_id AND pros.user_id = auth.uid()));
CREATE POLICY "Service role all listings" ON listings FOR ALL USING (auth.role() = 'service_role');

-- ─── ORDERS ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES users(id) ON DELETE SET NULL,
  pro_id            uuid REFERENCES pros(id) ON DELETE SET NULL,
  listing_id        uuid REFERENCES listings(id) ON DELETE SET NULL,
  status            text NOT NULL DEFAULT 'pending',
  amount            numeric(10,2) NOT NULL DEFAULT 0,
  nika_credits_used int NOT NULL DEFAULT 0,
  stripe_payment_id text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_pro  ON orders(pro_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own read orders"         ON orders;
DROP POLICY IF EXISTS "Own insert orders"       ON orders;
DROP POLICY IF EXISTS "Pro read orders"         ON orders;
DROP POLICY IF EXISTS "Service role all orders" ON orders;

CREATE POLICY "Own read orders"   ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own insert orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Pro read orders"   ON orders FOR SELECT
  USING (EXISTS (SELECT 1 FROM pros WHERE pros.id = orders.pro_id AND pros.user_id = auth.uid()));
CREATE POLICY "Service role all orders" ON orders FOR ALL USING (auth.role() = 'service_role');

-- ─── FLASH DEALS ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS flash_deals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id         uuid REFERENCES pros(id) ON DELETE CASCADE,
  title          text NOT NULL,
  description    text,
  discount_type  text NOT NULL DEFAULT 'percent',
  discount_value numeric(10,2) NOT NULL DEFAULT 0,
  expires_at     timestamptz NOT NULL,
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flash_deals_active ON flash_deals(expires_at) WHERE active = true;

ALTER TABLE flash_deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read flash_deals"      ON flash_deals;
DROP POLICY IF EXISTS "Owner write flash_deals"      ON flash_deals;
DROP POLICY IF EXISTS "Service role all flash_deals" ON flash_deals;

CREATE POLICY "Public read flash_deals" ON flash_deals FOR SELECT USING (true);
CREATE POLICY "Owner write flash_deals" ON flash_deals FOR ALL
  USING (EXISTS (SELECT 1 FROM pros WHERE pros.id = flash_deals.pro_id AND pros.user_id = auth.uid()));
CREATE POLICY "Service role all flash_deals" ON flash_deals FOR ALL USING (auth.role() = 'service_role');

-- ─── POIS (carte communautaire) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS pois (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id  uuid REFERENCES users(id) ON DELETE SET NULL,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  category    text NOT NULL DEFAULT 'general',
  name        text NOT NULL,
  description text,
  status      text NOT NULL DEFAULT 'pending',
  upvotes     int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pois_status ON pois(status);

ALTER TABLE pois ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read approved pois" ON pois;
DROP POLICY IF EXISTS "Auth insert pois"          ON pois;
DROP POLICY IF EXISTS "Service role all pois"     ON pois;

CREATE POLICY "Public read approved pois" ON pois FOR SELECT USING (status = 'approved' OR auth.uid() = creator_id);
CREATE POLICY "Auth insert pois"          ON pois FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Service role all pois"     ON pois FOR ALL USING (auth.role() = 'service_role');

-- ─── NEWS + COMMENTAIRES ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS news (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id        uuid REFERENCES users(id) ON DELETE SET NULL,
  title            text NOT NULL,
  content          text NOT NULL,
  category         text DEFAULT 'general',
  ai_moderated     boolean NOT NULL DEFAULT false,
  ai_reformulation text,
  published        boolean NOT NULL DEFAULT false,
  upvotes          int NOT NULL DEFAULT 0,
  source_url       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_published ON news(created_at DESC) WHERE published = true;

ALTER TABLE news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published news" ON news;
DROP POLICY IF EXISTS "Auth insert news"           ON news;
DROP POLICY IF EXISTS "Service role all news"      ON news;

CREATE POLICY "Public read published news" ON news FOR SELECT USING (published = true OR auth.uid() = author_id);
CREATE POLICY "Auth insert news"           ON news FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Service role all news"      ON news FOR ALL USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS news_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id    uuid NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_comments_news ON news_comments(news_id);

ALTER TABLE news_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read news_comments"      ON news_comments;
DROP POLICY IF EXISTS "Auth insert news_comments"      ON news_comments;
DROP POLICY IF EXISTS "Service role all news_comments" ON news_comments;

CREATE POLICY "Public read news_comments" ON news_comments FOR SELECT USING (true);
CREATE POLICY "Auth insert news_comments" ON news_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role all news_comments" ON news_comments FOR ALL USING (auth.role() = 'service_role');

-- ─── REVIEWS (avis pros) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reviews (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id     uuid NOT NULL REFERENCES pros(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  rating     smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_pro ON reviews(pro_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read reviews"      ON reviews;
DROP POLICY IF EXISTS "Auth insert reviews"      ON reviews;
DROP POLICY IF EXISTS "Service role all reviews" ON reviews;

CREATE POLICY "Public read reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Auth insert reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role all reviews" ON reviews FOR ALL USING (auth.role() = 'service_role');

-- ─── XP & CRÉDITS ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS xp_transactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action     text NOT NULL,
  xp_amount  int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_user ON xp_transactions(user_id, created_at DESC);

ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own read xp"             ON xp_transactions;
DROP POLICY IF EXISTS "Service role all xp"     ON xp_transactions;

CREATE POLICY "Own read xp"         ON xp_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role all xp" ON xp_transactions FOR ALL USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS credit_transactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount            int NOT NULL,
  type              text NOT NULL DEFAULT 'purchase',
  stripe_payment_id text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credits_user ON credit_transactions(user_id, created_at DESC);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own read credits"         ON credit_transactions;
DROP POLICY IF EXISTS "Service role all credits" ON credit_transactions;

CREATE POLICY "Own read credits"         ON credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role all credits" ON credit_transactions FOR ALL USING (auth.role() = 'service_role');

-- ─── WAITLIST / CONTACT / SMS ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS waitlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom        text,
  email      text NOT NULL,
  type       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert waitlist"      ON waitlist;
DROP POLICY IF EXISTS "Service role all waitlist"   ON waitlist;

CREATE POLICY "Public insert waitlist"    ON waitlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role all waitlist" ON waitlist FOR ALL USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS contact_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text NOT NULL,
  subject    text,
  message    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role all contact" ON contact_messages;
CREATE POLICY "Service role all contact" ON contact_messages FOR ALL USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS sms_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      text,
  body       text,
  intent     text,
  response   text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role all sms" ON sms_logs;
CREATE POLICY "Service role all sms" ON sms_logs FOR ALL USING (auth.role() = 'service_role');

-- ─── STAY ISSUES & STATS (reviews IA — manquantes) ───────────────────

CREATE TABLE IF NOT EXISTS stay_issues (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        uuid NOT NULL,
  category          text NOT NULL,
  description       text,
  severity          text NOT NULL DEFAULT 'low',
  keywords          text[],
  mention_count     int NOT NULL DEFAULT 1,
  status            text NOT NULL DEFAULT 'open',
  last_mentioned_at date,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stay_issues_listing ON stay_issues(listing_id, status);

ALTER TABLE stay_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read stay_issues"      ON stay_issues;
DROP POLICY IF EXISTS "Service role all stay_issues" ON stay_issues;

CREATE POLICY "Public read stay_issues"      ON stay_issues FOR SELECT USING (true);
CREATE POLICY "Service role all stay_issues" ON stay_issues FOR ALL USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS stay_stats (
  listing_id             uuid PRIMARY KEY,
  review_count           int NOT NULL DEFAULT 0,
  avg_rating             numeric(4,2) NOT NULL DEFAULT 0,
  avg_nika_score         numeric(4,1) NOT NULL DEFAULT 0,
  sentiment_distribution jsonb,
  updated_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stay_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read stay_stats"      ON stay_stats;
DROP POLICY IF EXISTS "Service role all stay_stats" ON stay_stats;

CREATE POLICY "Public read stay_stats"      ON stay_stats FOR SELECT USING (true);
CREATE POLICY "Service role all stay_stats" ON stay_stats FOR ALL USING (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════════
-- SEEDS — données réalistes Côte d'Azur
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO pros (domain, business_name, description, phone, address, lat, lng, verified, active, rating, review_count, rating_count) VALUES
  ('food', 'Chez Marco',             'Pizzeria au feu de bois depuis 1987 — pâte maison, produits italiens.', '+33493000001', '12 rue Masséna, Nice',            43.6961, 7.2719, true, true, 4.8, 127, 127),
  ('food', 'Le Comptoir Niçois',     'Cuisine niçoise authentique : socca, pissaladière, petits farcis.',     '+33493000002', '4 cours Saleya, Nice',            43.6953, 7.2754, true, true, 4.7,  89,  89),
  ('food', 'Sakura Sushi',           'Sushis et makis frais, poisson de la criée d''Antibes.',                '+33493000003', '8 bd d''Aguillon, Antibes',       43.5808, 7.1239, true, true, 4.6,  64,  64),
  ('auto', 'AutoNice Dépannage',     'Dépannage auto 24h/24 sur Nice et alentours. ETA garanti 30 min.',      '+33493000004', '45 route de Turin, Nice',         43.7245, 7.2890, true, true, 4.9, 203, 203),
  ('auto', 'Riviera VTC',            'Chauffeurs privés certifiés — aéroport, soirées, longue distance.',     '+33493000005', 'Promenade des Anglais, Nice',     43.6950, 7.2650, true, true, 4.8, 156, 156),
  ('serv', 'Plomberie Azur',         'Plombier chauffagiste — urgences fuites, installations, rénovation.',   '+33493000006', '23 av. de la République, Nice',   43.7035, 7.2785, true, true, 4.7,  78,  78),
  ('serv', 'Clean Riviera',          'Ménage à domicile et fin de location saisonnière. Produits éco.',       '+33493000007', '5 rue de France, Nice',           43.6948, 7.2580, true, true, 4.6,  45,  45),
  ('rent', 'RentRiviera Matériel',   'Location vélos électriques, paddle, matériel de plage et outillage.',   '+33493000008', '18 quai des États-Unis, Nice',    43.6942, 7.2740, true, true, 4.7,  52,  52),
  ('learn', 'Nice Surf School',      'Cours de surf et paddle toute l''année — moniteurs diplômés d''État.',  '+33493000009', 'Plage de Carras, Nice',           43.6810, 7.2310, true, true, 4.9,  94,  94),
  ('learn', 'Atelier Cuisine Niçoise','Apprenez la socca et les farcis avec une cheffe locale. Max 8 pers.',  '+33493000010', '31 rue Pairolière, Nice',         43.6990, 7.2770, true, true, 4.8,  37,  37),
  ('sec',  'Serrurier Nice 24h',     'Ouverture de porte sans dégât, blindage, coffres. Agréé assurances.',   '+33493000011', '67 bd Gambetta, Nice',            43.7000, 7.2560, true, true, 4.8, 112, 112),
  ('sec',  'Azur Gardiennage',       'Agents de sécurité événementiel et gardiennage de villas.',             '+33493000012', '2 av. Jean Médecin, Nice',        43.7010, 7.2680, true, true, 4.7,  41,  41)
ON CONFLICT (business_name) DO NOTHING;

-- Listings (rattachés par business_name pour idempotence)
INSERT INTO listings (pro_id, domain, title, description, price, available)
SELECT p.id, v.domain, v.title, v.description, v.price, true
FROM (VALUES
  ('RentRiviera Matériel',    'rent',  'Vélo électrique ville',      'Autonomie 70 km, casque et antivol inclus.',           25.00),
  ('RentRiviera Matériel',    'rent',  'Stand-up paddle gonflable',  'Pagaie + leash + pompe. Idéal baie des Anges.',        15.00),
  ('RentRiviera Matériel',    'rent',  'Perceuse-visseuse pro',      'Coffret embouts complet, 2 batteries.',                12.00),
  ('Nice Surf School',        'learn', 'Cours de surf découverte',   '1h30, planche et combinaison fournies.',               45.00),
  ('Atelier Cuisine Niçoise', 'learn', 'Atelier socca & farcis',     '3h en petit groupe, dégustation incluse.',             35.00),
  ('Riviera VTC',             'auto',  'Transfert aéroport Nice',    'Berline, prise en charge bagages, suivi de vol.',      39.00)
) AS v(business_name, domain, title, description, price)
JOIN pros p ON p.business_name = v.business_name
WHERE NOT EXISTS (
  SELECT 1 FROM listings l WHERE l.pro_id = p.id AND l.title = v.title
);

-- Flash deals (expirations relatives à l'exécution → toujours actifs)
INSERT INTO flash_deals (pro_id, title, discount_type, discount_value, expires_at, active)
SELECT p.id, v.title, v.dtype, v.dval, now() + v.dur, true
FROM (VALUES
  ('Chez Marco',          'Pizza Reine -20% ce soir',        'percent', 20.0, interval '6 hours'),
  ('AutoNice Dépannage',  'Lavage offert dès 50€',           'free_item', 0.0, interval '12 hours'),
  ('Nice Surf School',    '-10€ sur le cours découverte',    'fixed',  10.0, interval '24 hours')
) AS v(business_name, title, dtype, dval, dur)
JOIN pros p ON p.business_name = v.business_name
WHERE NOT EXISTS (
  SELECT 1 FROM flash_deals f WHERE f.pro_id = p.id AND f.title = v.title
);

-- POIs Nice (approuvés, sans créateur)
INSERT INTO pois (lat, lng, category, name, description, status, upvotes)
SELECT v.lat, v.lng, v.category, v.name, v.description, 'approved', v.upvotes
FROM (VALUES
  (43.6950, 7.2650, 'general', 'Promenade des Anglais', 'L''emblème de Nice — 7 km face à la baie des Anges.', 42),
  (43.6961, 7.2754, 'food',    'Cours Saleya',          'Marché aux fleurs le matin, restaurants le soir.',     35),
  (43.7054, 7.2873, 'general', 'Port Lympia',           'Le port de Nice et ses façades colorées.',             28),
  (43.6917, 7.2790, 'general', 'Colline du Château',    'Meilleure vue sur Nice. Cascade et parc ombragé.',     51),
  (43.7102, 7.2620, 'food',    'Marché de la Libération','Le marché des Niçois — produits locaux et poisson.',  19),
  (43.6938, 7.2840, 'azur',    'Castel Plage',          'Plage au pied du château, eau turquoise.',             24)
) AS v(lat, lng, category, name, description, upvotes)
WHERE NOT EXISTS (SELECT 1 FROM pois x WHERE x.name = v.name);

-- News locales (publiées, modérées IA)
INSERT INTO news (title, content, category, ai_moderated, published, upvotes)
SELECT v.title, v.content, v.category, true, true, v.upvotes
FROM (VALUES
  ('La ligne 4 du tram avance vers Saint-Isidore',
   'Les travaux de la ligne 4 du tramway niçois progressent : la mise en service du tronçon ouest est confirmée pour 2027. Les riverains constatent déjà la pose des premiers rails près du stade Allianz Riviera.',
   'local', 14),
  ('Nice Jazz Festival : la programmation dévoilée',
   'Le Nice Jazz Festival revient en juillet au Théâtre de Verdure et sur la scène Masséna. Au programme : têtes d''affiche internationales et scène locale azuréenne. Billetterie ouverte cette semaine.',
   'local', 23),
  ('Baignade : trois nouvelles plages labellisées Pavillon Bleu',
   'La métropole annonce trois nouveaux sites labellisés Pavillon Bleu entre Nice et Cagnes-sur-Mer, récompensant la qualité des eaux de baignade et la gestion environnementale du littoral.',
   'sea', 17)
) AS v(title, content, category, upvotes)
WHERE NOT EXISTS (SELECT 1 FROM news n WHERE n.title = v.title);
