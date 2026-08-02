-- NIKA OPS — purge planifiee de l'archive pgmq (02/08/2026). SQL Editor du dashboard.
--
-- L'archive (pgmq.a_agent_tasks) garde CHAQUE message traite, charge utile comprise —
-- production + source de 6 000 caracteres par relecture. A ~2 000 messages/jour elle
-- grossit de ~20 Mo/jour : le plafond de 500 Mo du plan gratuit serait atteint en un mois.
-- L'archive ne sert qu'au diagnostic recent : 14 jours suffisent largement.
create extension if not exists pg_cron;
select cron.schedule(
  'nika-purge-archive-pgmq',
  '15 4 * * *',
  $$ delete from pgmq.a_agent_tasks where archived_at < now() - interval '14 days' $$
);
-- Verification : select jobname, schedule, active from cron.job;
