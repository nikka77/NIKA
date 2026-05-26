-- ===================================================
-- NIKA — Schéma Supabase complet
-- À exécuter dans le SQL Editor de Supabase
-- ===================================================

-- Utilisateurs (étend auth.users)
create table if not exists users (
  id uuid references auth.users primary key,
  username text unique not null,
  full_name text,
  avatar_url text,
  xp integer default 0,
  level integer default 1,
  level_name text default 'Inconnu',
  nika_credits integer default 0,
  wallet_address text,
  is_pro boolean default false,
  created_at timestamptz default now()
);

-- Profils professionnels
create table if not exists pros (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  domain text not null check (domain in ('food','auto','stay','azur','rent','serv','learn','sec','news')),
  business_name text not null,
  description text,
  phone text,
  address text,
  lat double precision,
  lng double precision,
  verified boolean default false,
  active boolean default true,
  rating decimal(3,2) default 0,
  review_count integer default 0,
  google_place_id text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Listings
create table if not exists listings (
  id uuid default gen_random_uuid() primary key,
  pro_id uuid references pros(id) on delete cascade,
  domain text not null,
  title text not null,
  description text,
  price decimal(10,2),
  currency text default 'EUR',
  stock integer,
  available boolean default true,
  images text[],
  metadata jsonb default '{}',
  affil_url text,
  created_at timestamptz default now()
);

-- Commandes
create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  pro_id uuid references pros(id),
  listing_id uuid references listings(id),
  status text default 'pending' check (status in ('pending','confirmed','delivered','cancelled')),
  amount decimal(10,2),
  nika_credits_used integer default 0,
  stripe_payment_id text,
  notes text,
  created_at timestamptz default now()
);

-- Points d'intérêt
create table if not exists pois (
  id uuid default gen_random_uuid() primary key,
  creator_id uuid references users(id),
  lat double precision not null,
  lng double precision not null,
  category text not null,
  name text not null,
  description text,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  upvotes integer default 0,
  created_at timestamptz default now()
);

-- News
create table if not exists news (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references users(id),
  title text not null,
  content text not null,
  category text check (category in ('local','auto','food','sea','general')),
  ai_moderated boolean default false,
  ai_reformulation text,
  published boolean default false,
  upvotes integer default 0,
  source_url text,
  created_at timestamptz default now()
);

-- Transactions XP
create table if not exists xp_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  action text not null,
  xp_amount integer not null,
  created_at timestamptz default now()
);

-- Flash Deals
create table if not exists flash_deals (
  id uuid default gen_random_uuid() primary key,
  pro_id uuid references pros(id) on delete cascade,
  title text not null,
  description text,
  discount_type text check (discount_type in ('percent','fixed','free_item')),
  discount_value decimal(10,2),
  expires_at timestamptz not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- NIKA Credits transactions
create table if not exists credit_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  amount integer not null,
  type text check (type in ('purchase','spend','stake','reward')),
  stripe_payment_id text,
  created_at timestamptz default now()
);

-- Waitlist (bêta)
create table if not exists waitlist (
  id uuid default gen_random_uuid() primary key,
  nom text,
  email text unique not null,
  type text,
  created_at timestamptz default now()
);

-- ===================================================
-- ROW LEVEL SECURITY
-- ===================================================

-- Activer RLS
alter table users enable row level security;
alter table pros enable row level security;
alter table listings enable row level security;
alter table orders enable row level security;
alter table pois enable row level security;
alter table news enable row level security;
alter table xp_transactions enable row level security;
alter table flash_deals enable row level security;
alter table credit_transactions enable row level security;

-- USERS: chaque utilisateur voit/modifie son propre profil. Profils publics en lecture.
create policy "Public profiles" on users for select using (true);
create policy "Own profile update" on users for update using (auth.uid() = id);
create policy "Create profile on signup" on users for insert with check (auth.uid() = id);

-- PROS: lecture publique, écriture par le propriétaire
create policy "Public pros" on pros for select using (true);
create policy "Pro owner can update" on pros for update using (auth.uid() = user_id);
create policy "Pro owner can insert" on pros for insert with check (auth.uid() = user_id);
create policy "Pro owner can delete" on pros for delete using (auth.uid() = user_id);

-- LISTINGS: lecture publique, gestion par le pro
create policy "Public listings" on listings for select using (true);
create policy "Pro manages listings" on listings for all
  using (auth.uid() = (select user_id from pros where id = listings.pro_id));

-- ORDERS: l'utilisateur voit ses commandes, le pro voit les commandes le concernant
create policy "User sees own orders" on orders for select using (auth.uid() = user_id);
create policy "Pro sees own orders" on orders for select
  using (auth.uid() = (select user_id from pros where id = orders.pro_id));
create policy "User creates order" on orders for insert with check (auth.uid() = user_id);
create policy "Pro updates order status" on orders for update
  using (auth.uid() = (select user_id from pros where id = orders.pro_id));

-- POIS: lecture des approuvés, création par connectés
create policy "Public approved POIs" on pois for select using (status = 'approved' or auth.uid() = creator_id);
create policy "Authenticated can create POI" on pois for insert with check (auth.uid() = creator_id);

-- NEWS: lecture des publiées
create policy "Public news" on news for select using (published = true or auth.uid() = author_id);
create policy "Authenticated can submit news" on news for insert with check (auth.uid() = author_id);
create policy "Author can update news" on news for update using (auth.uid() = author_id);

-- FLASH DEALS: lecture publique des actifs
create policy "Public active flash deals" on flash_deals for select using (active = true);
create policy "Pro manages flash deals" on flash_deals for all
  using (auth.uid() = (select user_id from pros where id = flash_deals.pro_id));

-- XP TRANSACTIONS: lecture par l'utilisateur concerné
create policy "Own XP transactions" on xp_transactions for select using (auth.uid() = user_id);

-- CREDIT TRANSACTIONS: lecture par l'utilisateur concerné
create policy "Own credit transactions" on credit_transactions for select using (auth.uid() = user_id);

-- ===================================================
-- TRIGGERS : XP automatique sur actions Supabase
-- ===================================================

-- Trigger : XP sur première commande
create or replace function handle_new_order()
returns trigger language plpgsql security definer as $$
declare
  order_count int;
begin
  select count(*) into order_count from orders where user_id = new.user_id;
  if order_count = 1 then
    insert into xp_transactions (user_id, action, xp_amount)
    values (new.user_id, 'FIRST_ORDER', 80);
    update users set xp = xp + 80 where id = new.user_id;
  else
    insert into xp_transactions (user_id, action, xp_amount)
    values (new.user_id, 'ORDER', 30);
    update users set xp = xp + 30 where id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger on_new_order
  after insert on orders
  for each row execute function handle_new_order();

-- Trigger : XP sur POI approuvé
create or replace function handle_poi_approved()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'approved' and old.status != 'approved' then
    insert into xp_transactions (user_id, action, xp_amount)
    values (new.creator_id, 'POI_APPROVED', 40);
    update users set xp = xp + 40 where id = new.creator_id;
  end if;
  return new;
end;
$$;

create trigger on_poi_approved
  after update on pois
  for each row execute function handle_poi_approved();

-- Fonction level_name automatique via XP
create or replace function get_level_name(xp_val integer)
returns text language plpgsql as $$
begin
  return case
    when xp_val >= 60000 then 'Légende'
    when xp_val >= 35000 then 'Insider'
    when xp_val >= 20000 then 'Connaisseur'
    when xp_val >= 11000 then 'Habitué'
    when xp_val >= 6000  then 'Régulier'
    when xp_val >= 3000  then 'Ancré'
    when xp_val >= 1500  then 'Connecté'
    when xp_val >= 600   then 'Local'
    when xp_val >= 200   then 'Curieux'
    else 'Inconnu'
  end;
end;
$$;

-- ===================================================
-- INDEX pour les performances
-- ===================================================
create index if not exists idx_pros_domain on pros(domain);
create index if not exists idx_pros_active on pros(active);
create index if not exists idx_listings_domain on listings(domain);
create index if not exists idx_listings_available on listings(available);
create index if not exists idx_news_published on news(published, created_at desc);
create index if not exists idx_flash_deals_active_expires on flash_deals(active, expires_at);
create index if not exists idx_pois_status on pois(status);
create index if not exists idx_xp_user on xp_transactions(user_id, created_at desc);

-- ===================================================
-- REALTIME: activer pour les tables en temps réel
-- ===================================================
-- Dans Supabase Dashboard > Database > Replication > activer pour :
-- pros, listings, flash_deals, pois, news
