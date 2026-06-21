-- ===================================================
-- NIKA — Colmatage fuite PII sur food_orders
-- ---------------------------------------------------
-- food_orders garde une policy RLS « Public select using(true) » nécessaire au
-- suivi de commande ANONYME (le client n'a pas de compte) et au Realtime du statut.
-- Mais using(true) + clé `anon` publique (présente dans le bundle) = n'importe qui
-- peut faire `food_orders.select('*')` et aspirer nom / téléphone / adresse de TOUS
-- les clients (fuite PII en masse, RGPD).
--
-- Parade (niveau colonne, pas ligne) : retirer le SELECT global du rôle `anon` et
-- ne ré-accorder QUE les colonnes non sensibles. Conséquences :
--   • page de suivi anonyme  → lit la commande via le client ADMIN (service-role)
--     par son UUID (jeton non devinable). Voir track/[orderId]/page.tsx.
--   • checkout (anon)         → `.insert(...).select('id')` : `id` reste accordé. OK.
--   • Realtime statut (anon)  → `status` reste accordé. OK.
--   • dashboard / dispatch    → rôle `authenticated` : SELECT complet conservé. OK.
--
-- LIMITE CONNUE : un utilisateur `authenticated` quelconque peut encore lire les PII
-- (RLS using(true)). Fermeture totale = RLS par propriétaire (food_providers.owner_id),
-- à faire avec le modèle multi-tenant (cf. note food_deliveries dans nika_rls_hardening).
--
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- ===================================================

-- On ne peut pas révoquer des colonnes une à une tant qu'un GRANT SELECT « table
-- entière » existe → on retire le grant global puis on ré-accorde les colonnes sûres.
revoke select on food_orders from anon;

grant select (
  id, session_id, provider_id, scheduled_time, payment_method,
  status, total, delivery_fee, created_at
) on food_orders to anon;

-- Colonnes volontairement NON accordées à anon (PII) :
--   customer_name, customer_phone, delivery_address, delivery_lat, delivery_lng, notes
