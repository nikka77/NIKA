-- NIKA OPS — base de TRAVAIL sur le VPS (03/08/2026, incident egress Supabase).
--
-- POURQUOI CETTE BASE EXISTE
-- Le 02/08 au soir, l'usine a épuisé l'egress mensuel du plan gratuit Supabase (5,95/5 GB) :
-- projet prod sous restrictions, requête d'une ligne à 39-67 s, tout NIKA ralenti. Or ~95 %
-- de cet egress venait du BAVARDAGE de l'usine (file pgmq relue en boucle avec payloads de
-- 3-6 k caractères, relectures, exports de vagues) — pas du site. La file et les tables de
-- travail vivent donc ICI, sur le VPS Hetzner (20 TB de trafic inclus, aucun compteur) ;
-- Supabase ne garde que les fiches PUBLIÉES (akasha_entries), que les workers n'atteignent
-- plus que pour écrire une publication finale — de l'ingress, quasi gratuit.
--
-- ARCHITECTURE : PostgREST par-dessus cette base expose la même API REST que Supabase →
-- le code supabase-js existant fonctionne à l'identique, seule l'URL change (lib/ops/db.mjs).
--
-- FILE : implémentation MAISON compatible pgmq (mêmes tables, même message_record, mêmes
-- signatures). Pas d'extension à installer, rien qui casse à la prochaine version — nos
-- wrappers n'utilisent que send_batch / read / archive / metrics.

-- ── Schéma pgmq minimal ─────────────────────────────────────────────────────
create schema if not exists pgmq;

create table if not exists pgmq.q_agent_tasks (
  msg_id      bigint generated always as identity primary key,
  read_ct     int not null default 0,
  enqueued_at timestamptz not null default now(),
  vt          timestamptz not null default now(),
  message     jsonb,
  headers     jsonb
);
create index if not exists q_agent_tasks_vt_idx on pgmq.q_agent_tasks (vt, msg_id);
-- Le filtre par couloir lit message->>'type' : index d'expression pour éviter le scan complet
-- (c'est ce scan répété qui pesait sur Supabase).
create index if not exists q_agent_tasks_type_idx on pgmq.q_agent_tasks ((message->>'type'));

create table if not exists pgmq.a_agent_tasks (
  msg_id      bigint primary key,
  read_ct     int,
  enqueued_at timestamptz,
  archived_at timestamptz not null default now(),
  vt          timestamptz,
  message     jsonb,
  headers     jsonb
);

-- message_record identique à pgmq 1.5 (6 colonnes, headers inclus).
do $$ begin
  create type pgmq.message_record as (
    msg_id bigint, read_ct int, enqueued_at timestamptz, vt timestamptz, message jsonb, headers jsonb);
exception when duplicate_object then null; end $$;

create or replace function pgmq.send_batch(queue_name text, msgs jsonb[])
returns setof bigint language sql as $$
  insert into pgmq.q_agent_tasks (message) select unnest(msgs) returning msg_id;
$$;

create or replace function pgmq.read(queue_name text, p_vt integer, p_qty integer)
returns setof pgmq.message_record language plpgsql as $$
begin
  return query
  with candidats as (
    select q.msg_id from pgmq.q_agent_tasks q
    where q.vt <= now() order by q.msg_id limit p_qty
    for update skip locked)
  update pgmq.q_agent_tasks m
     set vt = now() + make_interval(secs => p_vt), read_ct = m.read_ct + 1
    from candidats c where m.msg_id = c.msg_id
  returning m.msg_id, m.read_ct, m.enqueued_at, m.vt, m.message, m.headers;
end $$;

create or replace function pgmq.archive(queue_name text, message_id bigint)
returns boolean language sql as $$
  with dep as (delete from pgmq.q_agent_tasks where msg_id = message_id returning *)
  insert into pgmq.a_agent_tasks (msg_id, read_ct, enqueued_at, vt, message, headers)
  select msg_id, read_ct, enqueued_at, vt, message, headers from dep
  returning true;
$$;

create or replace function pgmq.archive(queue_name text, message_ids bigint[])
returns setof bigint language sql as $$
  with dep as (delete from pgmq.q_agent_tasks where msg_id = any(message_ids) returning *)
  insert into pgmq.a_agent_tasks (msg_id, read_ct, enqueued_at, vt, message, headers)
  select msg_id, read_ct, enqueued_at, vt, message, headers from dep
  returning msg_id;
$$;

create or replace function pgmq.metrics(queue_name text)
returns table(queue_length bigint, total_messages bigint) language sql as $$
  select (select count(*) from pgmq.q_agent_tasks),
         (select count(*) from pgmq.q_agent_tasks) + (select count(*) from pgmq.a_agent_tasks);
$$;

-- ── Wrappers publics (identiques à Supabase — le code ne voit aucune différence) ──
create or replace function public.ops_queue_send_batch(messages jsonb[])
returns setof bigint language sql security definer set search_path = pgmq, public
as $$ select * from pgmq.send_batch('agent_tasks', messages); $$;

create or replace function public.ops_queue_read(vt integer default 120, qty integer default 1)
returns setof pgmq.message_record language sql security definer set search_path = pgmq, public
as $$ select * from pgmq.read('agent_tasks', vt, qty); $$;

create or replace function public.ops_queue_archive(message_id bigint)
returns boolean language sql security definer set search_path = pgmq, public
as $$ select pgmq.archive('agent_tasks', message_id); $$;

create or replace function public.ops_queue_archive_batch(message_ids bigint[])
returns setof bigint language sql security definer set search_path = pgmq, public
as $$ select * from pgmq.archive('agent_tasks', message_ids); $$;

create or replace function public.ops_queue_metrics()
returns table(queue_length bigint, total_messages bigint)
language sql security definer set search_path = pgmq, public
as $$ select queue_length, total_messages from pgmq.metrics('agent_tasks'); $$;

create or replace function public.ops_queue_read_couloir(
  p_vt integer default 600, p_qty integer default 12, p_types text[] default null)
returns setof pgmq.message_record language plpgsql security definer set search_path = pgmq, public
as $$
begin
  return query
  with candidats as (
    select q.msg_id from pgmq.q_agent_tasks q
    where q.vt <= now()
      and (p_types is null or q.message->>'type' = any(p_types))
    order by q.msg_id limit p_qty
    for update skip locked)
  update pgmq.q_agent_tasks m
     set vt = now() + make_interval(secs => p_vt), read_ct = m.read_ct + 1
    from candidats c where m.msg_id = c.msg_id
  returning m.msg_id, m.read_ct, m.enqueued_at, m.vt, m.message, m.headers;
end $$;

-- ── Tables de travail (colonnes = état réel Supabase au 02/08) ──────────────
create table if not exists public.agent_results (
  id bigint generated always as identity primary key,
  msg_id bigint,
  task_type text not null,
  target_slug text,
  model text,
  payload jsonb,
  result jsonb,
  status text not null default 'done',
  review_status text not null default 'pending',
  error text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  auto_verdict text, auto_motif text, auto_model text, auto_at timestamptz,
  auto2_verdict text, auto2_motif text, auto2_model text, auto2_at timestamptz,
  auto_applique boolean not null default false,
  arbitre_verdict text, arbitre_motif text, arbitre_model text, arbitre_at timestamptz
);
create index if not exists agent_results_review_idx on public.agent_results (review_status, task_type);
create index if not exists agent_results_slug_idx on public.agent_results (target_slug);

create table if not exists public.ops_notes (
  id bigint generated always as identity primary key,
  source text not null default 'ops',
  content text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ops_quotas (
  fournisseur   text primary key,
  fenetre_debut timestamptz not null default now(),
  requetes      int not null default 0,
  jetons        int not null default 0
);

create or replace function public.quota_consommer(
  p_fournisseur text, p_requetes int, p_jetons int,
  p_limite_requetes int, p_limite_jetons int, p_fenetre_secondes int
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  insert into ops_quotas (fournisseur) values (p_fournisseur)
  on conflict (fournisseur) do nothing;
  update ops_quotas
     set fenetre_debut = now(), requetes = 0, jetons = 0
   where fournisseur = p_fournisseur
     and now() - fenetre_debut > make_interval(secs => p_fenetre_secondes);
  update ops_quotas
     set requetes = requetes + p_requetes, jetons = jetons + p_jetons
   where fournisseur = p_fournisseur
     and requetes + p_requetes <= p_limite_requetes
     and jetons + p_jetons <= p_limite_jetons;
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;

create table if not exists public.ops_workers (
  id                text primary key,
  hote              text not null,
  role              text not null,
  pid               int,
  detail            text,
  derniere_activite timestamptz not null default now()
);

-- ── Entretien : purge de l'archive à 14 jours (cron système, pas pg_cron) ───
create or replace function public.ops_purge_archive()
returns bigint language sql security definer set search_path = pgmq, public as $$
  with dep as (delete from pgmq.a_agent_tasks where archived_at < now() - interval '14 days' returning 1)
  select count(*) from dep;
$$;

-- ── Droits : service_role uniquement (PostgREST impersonne via le JWT) ──────
grant usage on schema public, pgmq to service_role;
grant all on all tables in schema public, pgmq to service_role;
grant all on all sequences in schema public, pgmq to service_role;
grant execute on all functions in schema public, pgmq to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

-- ── Rattrapage 03/08 (colonnes/RPC créées jadis à la main dans le SQL Editor,
-- retrouvées par lecture du CODE — le schéma vivait en partie hors des fichiers) ──
alter table public.agent_results add column if not exists auto_score numeric;

create or replace function public.ops_queue_by_type()
returns table(task_type text, en_attente bigint)
language sql security definer set search_path = pgmq, public as $$
  select message->>'type' as task_type, count(*) as en_attente
  from pgmq.q_agent_tasks group by 1;
$$;
grant execute on function public.ops_queue_by_type() to service_role;
