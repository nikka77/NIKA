-- nika_ops_l16.sql — prérequis de la flotte multi-nœuds (28/07/2026, architecture §3).
-- 1) ops_quotas : budget LLM GLOBAL — les quotas des fournisseurs (TPM Groq, RPM Gemini)
--    sont partagés par TOUS les nœuds ; sans compteur central, N workers se partagent
--    le même 429. Consommation atomique via RPC, fenêtre glissante remise à zéro.
-- 2) ops_workers : heartbeat — savoir qui est vivant sans lire les logs de N machines.

create table if not exists ops_quotas (
  fournisseur   text primary key,
  fenetre_debut timestamptz not null default now(),
  requetes      int not null default 0,
  jetons        int not null default 0
);
alter table ops_quotas enable row level security;   -- service_role uniquement (aucune policy)

create or replace function quota_consommer(
  p_fournisseur      text,
  p_requetes         int,
  p_jetons           int,
  p_limite_requetes  int,
  p_limite_jetons    int,
  p_fenetre_secondes int
) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  insert into ops_quotas (fournisseur) values (p_fournisseur)
  on conflict (fournisseur) do nothing;

  -- fenêtre expirée → remise à zéro (le verrou de ligne sérialise les concurrents)
  update ops_quotas
     set fenetre_debut = now(), requetes = 0, jetons = 0
   where fournisseur = p_fournisseur
     and now() - fenetre_debut > make_interval(secs => p_fenetre_secondes);

  -- consommation SEULEMENT si le budget de la fenêtre le permet
  update ops_quotas
     set requetes = requetes + p_requetes,
         jetons   = jetons + p_jetons
   where fournisseur = p_fournisseur
     and requetes + p_requetes <= p_limite_requetes
     and jetons   + p_jetons   <= p_limite_jetons;

  get diagnostics v_n = row_count;
  return v_n > 0;   -- false = budget épuisé, le worker attend la fenêtre suivante
end $$;

revoke all on function quota_consommer(text, int, int, int, int, int) from public, anon, authenticated;
grant execute on function quota_consommer(text, int, int, int, int, int) to service_role;

create table if not exists ops_workers (
  id                text primary key,               -- "<hôte>:<rôle>" (chat, agents, nuit…)
  hote              text not null,
  role              text not null,
  pid               int,
  detail            text,
  derniere_activite timestamptz not null default now()
);
alter table ops_workers enable row level security;  -- service_role uniquement
