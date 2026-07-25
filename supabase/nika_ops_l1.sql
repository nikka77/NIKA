-- NIKA OPS — L1 : file de tâches pgmq + résultats d'agents + notes.
-- À exécuter dans le SQL Editor du dashboard Supabase (une seule fois).
-- Les wrappers vivent dans le schéma public (exposé par défaut à PostgREST) et ne sont
-- exécutables QUE par service_role : la file est interne, jamais accessible côté client.

-- 1) Extension pgmq + création de la file
create extension if not exists pgmq;
select pgmq.create('agent_tasks');

-- 2) Wrappers RPC (schéma public, service_role uniquement)
create or replace function public.ops_queue_send_batch(messages jsonb[])
returns setof bigint
language sql security definer set search_path = pgmq, public
as $$ select * from pgmq.send_batch('agent_tasks', messages); $$;

create or replace function public.ops_queue_read(vt integer default 120, qty integer default 1)
returns setof pgmq.message_record
language sql security definer set search_path = pgmq, public
as $$ select * from pgmq.read('agent_tasks', vt, qty); $$;

create or replace function public.ops_queue_archive(message_id bigint)
returns boolean
language sql security definer set search_path = pgmq, public
as $$ select pgmq.archive('agent_tasks', message_id); $$;

create or replace function public.ops_queue_metrics()
returns table(queue_length bigint, total_messages bigint)
language sql security definer set search_path = pgmq, public
as $$ select queue_length, total_messages from pgmq.metrics('agent_tasks'); $$;

revoke all on function public.ops_queue_send_batch(jsonb[]) from public, anon, authenticated;
revoke all on function public.ops_queue_read(integer, integer) from public, anon, authenticated;
revoke all on function public.ops_queue_archive(bigint) from public, anon, authenticated;
revoke all on function public.ops_queue_metrics() from public, anon, authenticated;
grant execute on function public.ops_queue_send_batch(jsonb[]) to service_role;
grant execute on function public.ops_queue_read(integer, integer) to service_role;
grant execute on function public.ops_queue_archive(bigint) to service_role;
grant execute on function public.ops_queue_metrics() to service_role;

-- 3) Résultats d'agents (review par Claude/Dan AVANT toute écriture en base réelle)
create table if not exists public.agent_results (
  id bigint generated always as identity primary key,
  msg_id bigint,
  task_type text not null,
  target_slug text,
  model text,
  payload jsonb,
  result jsonb,
  status text not null default 'done',          -- done | failed | refused
  review_status text not null default 'pending', -- pending | approved | rejected
  error text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists agent_results_review_idx on public.agent_results (review_status, task_type);
alter table public.agent_results enable row level security;
-- aucune policy : seul service_role (bypass RLS) lit/écrit

-- 4) Notes rapides (future entrée WhatsApp — L5)
create table if not exists public.ops_notes (
  id bigint generated always as identity primary key,
  source text not null default 'ops',            -- ops | whatsapp | claude
  content text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.ops_notes enable row level security;
