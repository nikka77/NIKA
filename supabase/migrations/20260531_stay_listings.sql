-- ===================================================
-- NIKA STAY — Tables stay_listings & stay_reviews
-- Coller dans : Supabase Dashboard > SQL Editor > New query
-- ===================================================

-- Table principale des logements WOW
create table if not exists stay_listings (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  name text not null,
  tagline text,
  type text,
  description text,
  country text,
  region text,
  city text,
  lat double precision,
  lng double precision,
  max_guests integer,
  bedrooms integer,
  bathrooms integer,
  price_per_night integer,
  currency text default 'EUR',
  booking_type text,
  affil_url text,
  wow_score integer default 0,
  nika_score integer default 0,
  status text default 'pending',
  featured boolean default false,
  source text,
  source_id text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Avis sur les logements WOW
create table if not exists stay_reviews (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references stay_listings(id) on delete cascade,
  score_overall integer,
  text text,
  source text,
  source_author text,
  source_date date,
  verified_stay boolean default false,
  created_at timestamptz default now(),
  unique(listing_id, source_author, source_date)
);

-- Index performances
create index if not exists idx_stay_listings_slug on stay_listings(slug);
create index if not exists idx_stay_listings_type on stay_listings(type);
create index if not exists idx_stay_listings_status on stay_listings(status);
create index if not exists idx_stay_listings_featured on stay_listings(featured, wow_score desc);
create index if not exists idx_stay_reviews_listing on stay_reviews(listing_id);

-- RLS
alter table stay_listings enable row level security;
alter table stay_reviews enable row level security;

-- Lecture publique
create policy "Public stay listings" on stay_listings for select using (true);
create policy "Public stay reviews" on stay_reviews for select using (true);
