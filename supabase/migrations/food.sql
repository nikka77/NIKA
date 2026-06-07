-- supabase/migrations/food.sql
-- NIKKA Food — module livraison nuit · @afroweek06

-- ─── Prestataires food ───────────────────────────────────────────────────────

create table if not exists food_providers (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  description text,
  city        text default 'Nice',
  instagram   text,
  active      boolean default true,
  opens_at    time,
  closes_at   time,
  created_at  timestamptz default now()
);

-- ─── Catalogue produits ───────────────────────────────────────────────────────

create table if not exists food_items (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid references food_providers(id) on delete cascade,
  slug        text not null,
  name        text not null,
  description text,
  price       numeric(6,2) not null,
  category    text check (category in ('main','side','drink')),
  emoji       text,
  active      boolean default true,
  created_at  timestamptz default now(),
  unique(provider_id, slug)
);

-- ─── Sessions de soir ────────────────────────────────────────────────────────

create table if not exists food_sessions (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid references food_providers(id) on delete cascade,
  date        date not null default current_date,
  status      text default 'open' check (status in ('open','closed','sold_out')),
  opened_at   timestamptz default now(),
  closed_at   timestamptz,
  notes       text
);

-- ─── Stocks par session ───────────────────────────────────────────────────────

create table if not exists food_session_stocks (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid references food_sessions(id) on delete cascade,
  item_id         uuid references food_items(id) on delete cascade,
  initial_stock   int not null default 0,
  remaining_stock int not null default 0,
  unique(session_id, item_id)
);

-- ─── Commandes clients ───────────────────────────────────────────────────────

create table if not exists food_orders (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid references food_sessions(id),
  provider_id      uuid references food_providers(id),
  customer_name    text,
  customer_phone   text,
  delivery_address text,
  delivery_lat     numeric(9,6),
  delivery_lng     numeric(9,6),
  scheduled_time   time,
  payment_method   text check (payment_method in ('nikka','card','applepay','cash')),
  status           text default 'pending' check (status in ('pending','confirmed','preparing','delivering','delivered','cancelled')),
  total            numeric(8,2),
  delivery_fee     numeric(5,2) default 2.00,
  notes            text,
  created_at       timestamptz default now()
);

-- ─── Lignes de commande ───────────────────────────────────────────────────────

create table if not exists food_order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid references food_orders(id) on delete cascade,
  item_id    uuid references food_items(id),
  quantity   int not null,
  unit_price numeric(6,2) not null
);

-- ─── RLS policies (lecture publique) ─────────────────────────────────────────

create policy "Public select" on food_providers for select using (true);
create policy "Public select" on food_items for select using (true);
create policy "Public select" on food_sessions for select using (true);
create policy "Public select" on food_session_stocks for select using (true);
create policy "Public select" on food_orders for select using (true);
create policy "Public insert" on food_orders for insert with check (true);
create policy "Public select" on food_order_items for select using (true);
create policy "Public insert" on food_order_items for insert with check (true);

-- ─── Realtime ────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table food_session_stocks;
alter publication supabase_realtime add table food_orders;

-- ─── Décrémentation stock avec auto-fermeture ────────────────────────────────

create or replace function decrement_stock(
  p_session_id uuid,
  p_item_id    uuid,
  p_qty        int
) returns void language plpgsql security definer as $$
begin
  update food_session_stocks
  set remaining_stock = greatest(0, remaining_stock - p_qty)
  where session_id = p_session_id and item_id = p_item_id;

  -- Auto sold_out si tous les stocks épuisés
  if not exists (
    select 1 from food_session_stocks
    where session_id = p_session_id and remaining_stock > 0
  ) then
    update food_sessions
    set status = 'sold_out', closed_at = now()
    where id = p_session_id;
  end if;
end;
$$;
