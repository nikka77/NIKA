-- NIKA OPS — archivage PAR LOT (02/08/2026). A coller dans le SQL Editor du dashboard Supabase.
--
-- pgmq expose nativement archive(queue, msg_ids bigint[]) — l'overload tableau existe depuis
-- toujours, seul notre wrapper l'ignorait. Consequence mesurable : rendre 50 messages a la
-- flotte (tri de couloir, reordonnancement) coutait 50 allers-retours REST vers Francfort a
-- ~40 ms piece, soit 2 s de pure latence reseau la ou UN appel suffit. ops-prioriser-file
-- archive jusqu'a 750 messages : 30 s d'attente evitables a chaque reordonnancement.
--
-- Meme modele de securite que les autres wrappers : service_role uniquement.

create or replace function public.ops_queue_archive_batch(message_ids bigint[])
returns setof bigint
language sql security definer set search_path = pgmq, public
as $$ select * from pgmq.archive('agent_tasks', message_ids); $$;

revoke all on function public.ops_queue_archive_batch(bigint[]) from public, anon, authenticated;
grant execute on function public.ops_queue_archive_batch(bigint[]) to service_role;

-- Verification apres execution (doit renvoyer 0 ligne sur un tableau vide, sans erreur) :
--   select * from public.ops_queue_archive_batch(array[]::bigint[]);
