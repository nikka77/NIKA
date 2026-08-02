-- NIKA OPS — lecture de file PAR COULOIR. À coller dans le SQL Editor du dashboard Supabase.
--
-- POURQUOI (mesuré le 02/08/2026)
-- `ops_queue_read` sert les messages dans l'ordre, sans regarder leur type. Un worker spécialisé
-- (`--types=review_local`, `--types=toilettage_fr`) reçoit donc surtout des tâches qui ne sont pas
-- les siennes, et n'a que deux mauvaises options :
--   · les ignorer  → sa lecture les a réservées pour 600 s : il gèle la file pour les autres nœuds
--                    (le juge du Mac faisait tomber la flotte de 35 à 0,5 verdict/min) ;
--   · les rendre   → réémission au FOND de la file : l'ordre de priorité est détruit à chaque tour
--                    (un chantier de 23 sections mis en tête n'a jamais été servi de l'heure).
-- Deux workers de couloirs différents se renvoient ainsi la file sans jamais la vider.
--
-- La sortie est côté base : qu'un worker ne lise QUE son couloir. Le filtre remplace à lui seul
-- le tri de couloir, les réémissions et les siestes de 30 s.
--
-- C'est l'implémentation standard de pgmq.read (verrou `for update skip locked`, incrément de
-- read_ct, visibilité repoussée) avec une clause de plus sur `message->>'type'`.

create or replace function public.ops_queue_read_couloir(
  p_vt integer default 600,
  p_qty integer default 12,
  p_types text[] default null                 -- null = tous les couloirs (comportement actuel)
)
returns setof pgmq.message_record
language plpgsql
security definer
set search_path = pgmq, public
as $$
begin
  return query
  with candidats as (
    select q.msg_id
    from pgmq.q_agent_tasks q
    where q.vt <= now()
      and (p_types is null or q.message->>'type' = any(p_types))
    order by q.msg_id
    limit p_qty
    for update skip locked                     -- deux nœuds ne prennent jamais le même message
  )
  update pgmq.q_agent_tasks m
     set vt = now() + make_interval(secs => p_vt),
         read_ct = m.read_ct + 1
    from candidats c
   where m.msg_id = c.msg_id
  returning m.msg_id, m.read_ct, m.enqueued_at, m.vt, m.message;
end;
$$;

revoke all on function public.ops_queue_read_couloir(integer, integer, text[]) from public, anon, authenticated;
grant execute on function public.ops_queue_read_couloir(integer, integer, text[]) to service_role;

-- Vérification après exécution (doit renvoyer 12 lignes de type review_local, et rien d'autre) :
--   select msg_id, message->>'type' from public.ops_queue_read_couloir(1, 12, array['review_local']);
