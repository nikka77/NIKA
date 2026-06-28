-- NIKA — Rattrapage CIBLÉ : les 8 tables manquantes en base live (vérifiées 404 le 2026-06-28).
-- contact_messages, reviews, news_comments, sms_logs, stay_issues, stay_stats, devis, devis_lignes.
-- FK cibles (pros, users, news) confirmées présentes. Idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- Appliqué via Supabase Management API (POST /v1/projects/{ref}/database/query).
-- =====================================================================

-- ─── CONTACT MESSAGES ────────────────────────────────────────────────
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

-- ─── NEWS COMMENTS ───────────────────────────────────────────────────
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

-- ─── SMS LOGS ────────────────────────────────────────────────────────
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

-- ─── STAY ISSUES (reviews IA) ────────────────────────────────────────
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

-- ─── STAY STATS (reviews IA) ─────────────────────────────────────────
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

-- ─── DEVIS (en-tête) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reference text NOT NULL UNIQUE,
  statut text NOT NULL DEFAULT 'brouillon'
    CHECK (statut IN ('brouillon','envoye','accepte','refuse','expire')),
  artisan_id uuid NOT NULL REFERENCES pros(id) ON DELETE CASCADE,
  client_id uuid REFERENCES users(id) ON DELETE SET NULL,
  client_nom text,
  client_adresse text,
  date_emission date NOT NULL DEFAULT current_date,
  date_validite date NOT NULL,
  date_debut_travaux date,
  artisan_siret text,
  assurance_decennale_assureur text,
  assurance_decennale_police text,
  assurance_rc_pro_assureur text,
  assurance_rc_pro_police text,
  tva_regime text NOT NULL DEFAULT 'reel' CHECK (tva_regime IN ('reel','franchise_base')),
  mention_tva text,
  conditions_paiement text,
  acompte_pourcent numeric(5,2)
    CHECK (acompte_pourcent IS NULL OR (acompte_pourcent >= 0 AND acompte_pourcent <= 100)),
  frais_deplacement numeric(10,2) NOT NULL DEFAULT 0 CHECK (frais_deplacement >= 0),
  frais_deplacement_tva numeric(5,2) NOT NULL DEFAULT 20
    CHECK (frais_deplacement_tva >= 0 AND frais_deplacement_tva <= 100),
  total_ht numeric(12,2),
  total_tva numeric(12,2),
  total_ttc numeric(12,2),
  tva_par_taux jsonb NOT NULL DEFAULT '[]',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT devis_dates_validite CHECK (date_validite >= date_emission),
  CONSTRAINT devis_accepte_total CHECK (statut <> 'accepte' OR (total_ttc IS NOT NULL AND total_ttc >= 0))
);

-- ─── DEVIS LIGNES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devis_lignes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  devis_id uuid NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  type text NOT NULL CHECK (type IN ('materiel','main_oeuvre')),
  designation text NOT NULL,
  quantite numeric(10,3) NOT NULL CHECK (quantite > 0),
  unite text NOT NULL,
  prix_unitaire_ht numeric(12,2) NOT NULL CHECK (prix_unitaire_ht >= 0),
  montant_ht numeric(12,2) GENERATED ALWAYS AS (round(quantite * prix_unitaire_ht, 2)) STORED,
  taux_tva numeric(5,2) NOT NULL DEFAULT 20 CHECK (taux_tva >= 0 AND taux_tva <= 100),
  provenance text NOT NULL DEFAULT 'saisi_pro' CHECK (provenance IN ('saisi_pro','suggere_ia')),
  valide_par_pro boolean NOT NULL DEFAULT false,
  lien_fournisseur text,
  a_acheter boolean NOT NULL DEFAULT false,
  taux_horaire numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT devis_ligne_materiel CHECK (
    type <> 'materiel' OR taux_horaire IS NULL
  ),
  CONSTRAINT devis_ligne_main_oeuvre CHECK (
    type <> 'main_oeuvre' OR (
      unite = 'heures'
      AND taux_horaire IS NOT NULL
      AND taux_horaire = prix_unitaire_ht
      AND a_acheter = false
      AND lien_fournisseur IS NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_devis_artisan ON devis(artisan_id);
CREATE INDEX IF NOT EXISTS idx_devis_client ON devis(client_id);
CREATE INDEX IF NOT EXISTS idx_devis_statut ON devis(statut);
CREATE INDEX IF NOT EXISTS idx_devis_lignes_devis ON devis_lignes(devis_id, position);
CREATE INDEX IF NOT EXISTS idx_devis_lignes_achat ON devis_lignes(devis_id)
  WHERE type = 'materiel' AND a_acheter = true;

-- updated_at automatique
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_devis_updated_at ON devis;
CREATE TRIGGER trg_devis_updated_at
  BEFORE UPDATE ON devis
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Règle métier : l'IA propose, le pro valide.
CREATE OR REPLACE FUNCTION devis_enforce_ia_validation()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  n_non_valide integer;
BEGIN
  IF new.statut IN ('envoye','accepte') THEN
    SELECT count(*) INTO n_non_valide
    FROM devis_lignes l
    WHERE l.devis_id = new.id
      AND l.provenance = 'suggere_ia'
      AND l.valide_par_pro = false;
    IF n_non_valide > 0 THEN
      RAISE EXCEPTION
        'Devis %: % ligne(s) IA non validee(s) par le pro — validation requise avant le statut "%"',
        new.reference, n_non_valide, new.statut
        USING errcode = 'check_violation';
    END IF;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_devis_ia_validation ON devis;
CREATE TRIGGER trg_devis_ia_validation
  BEFORE INSERT OR UPDATE OF statut ON devis
  FOR EACH ROW EXECUTE FUNCTION devis_enforce_ia_validation();

-- RLS devis + devis_lignes
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis_lignes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "devis_artisan_all" ON devis;
CREATE POLICY "devis_artisan_all" ON devis
  FOR ALL
  USING (artisan_id IN (SELECT id FROM pros WHERE user_id = auth.uid()))
  WITH CHECK (artisan_id IN (SELECT id FROM pros WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "devis_client_read" ON devis;
CREATE POLICY "devis_client_read" ON devis
  FOR SELECT USING (client_id = auth.uid());

DROP POLICY IF EXISTS "devis_lignes_artisan_all" ON devis_lignes;
CREATE POLICY "devis_lignes_artisan_all" ON devis_lignes
  FOR ALL
  USING (
    devis_id IN (
      SELECT d.id FROM devis d
      JOIN pros p ON p.id = d.artisan_id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    devis_id IN (
      SELECT d.id FROM devis d
      JOIN pros p ON p.id = d.artisan_id
      WHERE p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "devis_lignes_client_read" ON devis_lignes;
CREATE POLICY "devis_lignes_client_read" ON devis_lignes
  FOR SELECT USING (
    devis_id IN (SELECT id FROM devis WHERE client_id = auth.uid())
  );
