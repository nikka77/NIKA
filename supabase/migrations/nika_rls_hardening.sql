-- ===================================================
-- NIKA — Durcissement RLS / écritures privilégiées
-- ---------------------------------------------------
-- Les policies RLS « Own profile update » (auth.uid()=id) et « Pro owner can
-- update » (auth.uid()=user_id) sont AVEUGLES AUX COLONNES : elles autorisent la
-- LIGNE, pas le détail des colonnes. Un client peut donc s'auto-créditer
-- (nika_credits), se faire passer pour vérifié (is_verified/kyc_level), changer
-- son numéro/badge, ou gonfler la note d'un pro.
--
-- Parade : triggers BEFORE qui REMETTENT les colonnes sensibles à leur ancienne
-- valeur pour tout appelant non « service_role ». Les écritures légitimes passent
-- toutes par le service-role (routes /api/* admin) → autorisées. Les écritures
-- de profil ordinaires (full_name, bio, avatar, is_pro, pro_domains…) restent
-- libres car non listées ici.
--
-- À exécuter dans le SQL Editor de Supabase (après schema.sql + nika_users.sql).
-- Idempotent.
-- ===================================================

-- ── Appelant de confiance ? ─────────────────────────
-- true si le rôle JWT = service_role, OU s'il n'y a pas de JWT du tout
-- (accès SQL direct / migrations / psql) → on ne se bloque pas nous-mêmes.
create or replace function nika_is_trusted_writer()
returns boolean
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    'service_role'
  ) = 'service_role';
$$;

-- ── users : colonnes argent + identité protégées ────
create or replace function guard_users_privileged()
returns trigger language plpgsql as $$
begin
  if not nika_is_trusted_writer() then
    new.nika_credits := old.nika_credits;
    new.xp           := old.xp;
    new.level        := old.level;
    new.level_name   := old.level_name;
    new.number       := old.number;
    new.badge_tier   := old.badge_tier;
    new.kyc_level    := old.kyc_level;
    new.is_verified  := old.is_verified;
    new.verified_at  := old.verified_at;
  end if;
  return new;
end;
$$;

-- Préfixe « a_ » pour passer AVANT set_badge_tier / trg_users_updated_at
-- (ordre alphabétique des triggers de même timing). Idempotent.
drop trigger if exists guard_users_privileged   on users;  -- ancien nom éventuel
drop trigger if exists a_guard_users_privileged on users;
create trigger a_guard_users_privileged
  before update on users
  for each row execute function guard_users_privileged();

-- ── pros : signaux de confiance protégés ────────────
create or replace function guard_pros_privileged()
returns trigger language plpgsql as $$
begin
  if not nika_is_trusted_writer() then
    new.verified     := coalesce(old.verified, false);
    new.rating       := coalesce(old.rating, 0);
    new.review_count := coalesce(old.review_count, 0);
  end if;
  return new;
end;
$$;

drop trigger if exists guard_pros_privileged on pros;
create trigger guard_pros_privileged
  before insert or update on pros
  for each row execute function guard_pros_privileged();

-- ── Idempotence Stripe : 1 paiement = 1 crédit ──────
-- NULL multiples autorisés (lignes spend/reward) ; unicité sur les vrais paiements.
create unique index if not exists credit_tx_stripe_payment_id_uniq
  on credit_transactions (stripe_payment_id);

-- Crédite UNE seule fois par paiement (rejouable sans double-crédit).
create or replace function grant_purchase_credits(p_user uuid, p_amount int, p_payment_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare rows_ins int;
begin
  if p_amount is null or p_amount <= 0 or p_payment_id is null then
    return false;
  end if;
  insert into credit_transactions (user_id, amount, type, stripe_payment_id)
    values (p_user, p_amount, 'purchase', p_payment_id)
    on conflict (stripe_payment_id) do nothing;
  get diagnostics rows_ins = row_count;
  if rows_ins > 0 then
    update users set nika_credits = nika_credits + p_amount where id = p_user;
    return true;
  end if;
  return false;  -- évènement déjà traité
end;
$$;

-- ── Dépense atomique de crédits (commande payée en crédits) ──
-- Décrément protégé contre le solde négatif + les courses concurrentes ;
-- journalise la dépense dans credit_transactions.
create or replace function spend_nika_credits(p_user uuid, p_amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare new_bal int;
begin
  if p_amount is null or p_amount <= 0 then
    return (select nika_credits from users where id = p_user);
  end if;
  update users
    set nika_credits = nika_credits - p_amount
    where id = p_user and nika_credits >= p_amount
    returning nika_credits into new_bal;
  if new_bal is null then
    raise exception 'Solde de crédits insuffisant';
  end if;
  insert into credit_transactions (user_id, amount, type)
    values (p_user, -p_amount, 'spend');
  return new_bal;
end;
$$;

-- ── Verrouillage des RPC : appelables seulement par le serveur ──
revoke execute on function grant_purchase_credits(uuid, int, text) from anon, authenticated;
revoke execute on function spend_nika_credits(uuid, int)            from anon, authenticated;
grant  execute on function grant_purchase_credits(uuid, int, text) to service_role;
grant  execute on function spend_nika_credits(uuid, int)            to service_role;

-- ===================================================
-- NOTE — food_deliveries / food_drivers : la policy « Public update » (anon)
-- reste en place VOLONTAIREMENT : le flux livreur (dashboard, dispatch) écrit
-- encore côté client. Risque = intégrité du statut de livraison sur le pilote
-- mono-tenant (afroweek06) — ni argent ni PII. À durcir (driver_id / owner_id)
-- quand le modèle d'auth livreur sera construit. Voir tasks/lessons.md.
-- ===================================================
