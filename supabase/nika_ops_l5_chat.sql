-- NIKA OPS L5 — file DÉDIÉE au secrétaire WhatsApp (27/07/2026, balayage d'optimisation).
-- Pourquoi une file à part : le chat n'a ni la même urgence ni le même cycle que le lot AKASHA.
-- Dans la file commune, le démon du secrétaire renvoyait sans fin les tâches des agents (ping-pong
-- d'archivage constaté à la conception des couloirs --types) ; chacun chez soi, plus de bruit.
select pgmq.create('ops_chat');

create or replace function public.ops_chat_send_batch(messages jsonb[])
returns setof bigint language sql security definer set search_path = pgmq, public as
$$ select * from pgmq.send_batch('ops_chat', messages); $$;

create or replace function public.ops_chat_read(vt integer, qty integer)
returns setof pgmq.message_record language sql security definer set search_path = pgmq, public as
$$ select * from pgmq.read('ops_chat', vt, qty); $$;

create or replace function public.ops_chat_archive(message_id bigint)
returns boolean language sql security definer set search_path = pgmq, public as
$$ select pgmq.archive('ops_chat', message_id); $$;

-- service_role uniquement, comme les wrappers de la file principale (nika_ops_l1.sql)
revoke all on function public.ops_chat_send_batch(jsonb[]) from public, anon, authenticated;
revoke all on function public.ops_chat_read(integer, integer) from public, anon, authenticated;
revoke all on function public.ops_chat_archive(bigint) from public, anon, authenticated;
grant execute on function public.ops_chat_send_batch(jsonb[]) to service_role;
grant execute on function public.ops_chat_read(integer, integer) to service_role;
grant execute on function public.ops_chat_archive(bigint) to service_role;

notify pgrst, 'reload schema';
