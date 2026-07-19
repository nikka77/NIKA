-- supabase/akasha_aggregates.sql — AGRÉGATS AKASHA (refonte zones, lot 4a).
-- Optionnel côté runtime (les pages ont des replis applicatifs) : matérialise les compteurs
-- que les hubs recalculent aujourd'hui par scans paginés (~20 requêtes PostgREST par rendu).
-- À exécuter dans le SQL Editor Supabase. Rafraîchir après chaque reseed :
--   refresh materialized view akasha_org_stats;

-- Effectifs par organisation (relations « appartient » entrantes).
create materialized view if not exists akasha_org_stats as
select
  o.id          as org_id,
  o.slug        as org_slug,
  o.name        as org_name,
  o.universe    as universe,
  count(r.id)   as members
from akasha_entries o
left join akasha_relations r on r.to_entry = o.id and r.relation = 'appartient'
where o.type = 'status'
group by o.id, o.slug, o.name, o.universe;

create unique index if not exists akasha_org_stats_org_id on akasha_org_stats (org_id);

-- Compteurs par valeur d'attribut (les « axes » des hubs) — RPC générique.
create or replace function akasha_axis_counts(p_universe text, p_attr text)
returns table (value text, n bigint)
language sql stable as $$
  select attributes->>p_attr as value, count(*) as n
  from akasha_entries
  where universe = p_universe and attributes->>p_attr is not null
  group by 1 order by 2 desc;
$$;
