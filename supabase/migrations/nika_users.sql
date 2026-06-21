-- ===================================================
-- NIKA — Numérotation séquentielle (#0,#1…) + badges HxH + KYC tokenisé
-- GREFFÉ sur la table `users` existante (pas de table parallèle nika_members :
-- `users` est déjà la table d'identité, référencée partout dans l'app).
-- À exécuter dans le SQL Editor de Supabase (après schema.sql).
-- ===================================================

-- Séquence des numéros NIKA. #0-#9 réservés fondateurs → la séquence démarre à 10.
create sequence if not exists nika_number_seq start 10;

-- ── Colonnes NIKA sur users ─────────────────────────
-- (number via default volatile nextval → les lignes existantes sont rétro-numérotées.)
alter table users add column if not exists number       integer unique default nextval('nika_number_seq');
alter table users add column if not exists badge_tier   text default 'member' check (badge_tier in ('founder','pioneer','initie','member'));
alter table users add column if not exists kyc_level     smallint default 0 check (kyc_level in (0,1,2,3));
alter table users add column if not exists is_verified   boolean default false;
alter table users add column if not exists verified_at   timestamptz;
alter table users add column if not exists pro_domains   text[] default '{}';
alter table users add column if not exists city          text;
alter table users add column if not exists bio           text;
alter table users add column if not exists updated_at    timestamptz default now();

-- Numéro permanent et obligatoire (les existants ont été numérotés par le default).
alter table users alter column number set not null;

-- ── badge_tier auto selon le numéro ─────────────────
create or replace function assign_badge_tier()
returns trigger language plpgsql as $$
begin
  new.badge_tier := case
    when new.number < 10   then 'founder'
    when new.number < 100  then 'pioneer'
    when new.number < 1000 then 'initie'
    else 'member'
  end;
  return new;
end;
$$;

drop trigger if exists set_badge_tier on users;
create trigger set_badge_tier
  before insert or update of number on users
  for each row execute function assign_badge_tier();

-- Backfill du badge_tier pour les membres déjà numérotés.
update users set badge_tier = case
  when number < 10   then 'founder'
  when number < 100  then 'pioneer'
  when number < 1000 then 'initie'
  else 'member'
end;

-- ── updated_at automatique ──────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
  before update on users
  for each row execute function set_updated_at();

-- ── Prochain numéro (CTA « Rejoindre #N ») ──────────
-- Renvoie le numéro que nextval attribuera ensuite (sans le consommer).
create or replace function get_next_number()
returns integer language sql stable as $$
  select (last_value + case when is_called then 1 else 0 end)::int from nika_number_seq;
$$;

-- ── Création auto de la ligne users au signup ───────
-- Robuste : marche même sous confirmation email (le client n'a pas encore de session
-- pour insérer sous RLS). Idempotent (on conflict do nothing) → pas de doublon si
-- l'app insère aussi. number + badge_tier posés par default + trigger ci-dessus.
-- Les métadonnées (username/full_name/is_pro) viennent de signUp({ options:{ data }}).
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, username, full_name, is_pro, level, level_name, nika_credits)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username',''),
             split_part(new.email,'@',1) || '_' || substr(replace(new.id::text,'-',''),1,4)),
    nullif(new.raw_user_meta_data->>'full_name',''),
    coalesce((new.raw_user_meta_data->>'is_pro')::boolean, false),
    1, 'Inconnu', 0
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── RLS ─────────────────────────────────────────────
-- Déjà active sur `users` (schema.sql) : « Public profiles » (select true) +
-- « Own profile update » (auth.uid() = id). Les nouvelles colonnes en héritent.

-- ── Fondateurs #0-#9 ────────────────────────────────
-- Le trigger handle_new_user auto-numérote TOUT le monde (séquence ≥ 10). Pour poser
-- un fondateur, créer le compte normalement puis RÉATTRIBUER le numéro :
--   update users set number = 0 where id = '<auth_user_uuid>';
-- (set_badge_tier repasse alors badge_tier à 'founder'). #0-#9 n'étant jamais
-- produits par la séquence, ils restent libres pour cette réattribution.
