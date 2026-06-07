-- supabase/migrations/food_delivery.sql
-- NIKKA Food — Module Livraison
-- Coller dans Supabase SQL Editor → Run

-- Livreurs
create table if not exists food_drivers (
  id              uuid primary key default gen_random_uuid(),
  provider_id     uuid references food_providers(id),
  name            text not null,
  phone           text,
  mode            text default 'independent' check (mode in ('provider','independent')),
  vehicle         text check (vehicle in ('bike','scooter','car','foot')),
  active          boolean default false,
  current_lat     numeric(9,6),
  current_lng     numeric(9,6),
  last_seen_at    timestamptz,
  created_at      timestamptz default now()
);

-- Livraisons (1 par commande)
create table if not exists food_deliveries (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid references food_orders(id) on delete cascade unique,
  driver_id       uuid references food_drivers(id),
  status          text default 'pending' check (
                    status in ('pending','dispatching','accepted','picking_up',
                               'picked_up','delivering','delivered','failed')
                  ),
  dispatched_at   timestamptz,
  accepted_at     timestamptz,
  picked_up_at    timestamptz,
  delivered_at    timestamptz,
  eta_seconds     int,
  distance_km     numeric(5,2),
  driver_note     text,
  created_at      timestamptz default now()
);

-- Positions GPS livreur (time-series)
create table if not exists food_driver_positions (
  id              uuid primary key default gen_random_uuid(),
  driver_id       uuid references food_drivers(id) on delete cascade,
  delivery_id     uuid references food_deliveries(id),
  lat             numeric(9,6) not null,
  lng             numeric(9,6) not null,
  heading         numeric(5,2),
  speed_kmh       numeric(5,2),
  recorded_at     timestamptz default now()
);

-- Zones de livraison
create table if not exists food_zones (
  id              uuid primary key default gen_random_uuid(),
  provider_id     uuid references food_providers(id) on delete cascade,
  name            text not null,
  center_lat      numeric(9,6) not null,
  center_lng      numeric(9,6) not null,
  radius_km       numeric(4,2) default 3.0,
  active          boolean default true
);

-- Realtime
alter publication supabase_realtime add table food_deliveries;
alter publication supabase_realtime add table food_driver_positions;
alter publication supabase_realtime add table food_drivers;

-- RLS
alter table food_drivers enable row level security;
alter table food_deliveries enable row level security;
alter table food_driver_positions enable row level security;
alter table food_zones enable row level security;

create policy "Public select" on food_drivers for select using (true);
create policy "Public select" on food_deliveries for select using (true);
create policy "Public select" on food_driver_positions for select using (true);
create policy "Public select" on food_zones for select using (true);
create policy "Public insert" on food_driver_positions for insert with check (true);
create policy "Public update" on food_deliveries for update using (true);
create policy "Public update" on food_drivers for update using (true);
create policy "Public insert" on food_deliveries for insert with check (true);

-- Mettre à jour position courante + historique
create or replace function update_driver_position(
  p_driver_id   uuid,
  p_lat         numeric,
  p_lng         numeric,
  p_heading     numeric default null,
  p_speed       numeric default null,
  p_delivery_id uuid default null
) returns void language plpgsql as $$
begin
  insert into food_driver_positions (driver_id, delivery_id, lat, lng, heading, speed_kmh)
  values (p_driver_id, p_delivery_id, p_lat, p_lng, p_heading, p_speed);
  update food_drivers
  set current_lat = p_lat, current_lng = p_lng, last_seen_at = now()
  where id = p_driver_id;
end;
$$;

-- Nettoyer positions > 24h
create or replace function cleanup_old_positions() returns void language plpgsql as $$
begin
  delete from food_driver_positions where recorded_at < now() - interval '24 hours';
end;
$$;

-- Zone afroweek06 par défaut (Nice centre, rayon 5km)
insert into food_zones (provider_id, name, center_lat, center_lng, radius_km)
select id, 'Nice centre', 43.7102, 7.2620, 5.0
from food_providers where slug = 'afroweek06'
on conflict do nothing;
