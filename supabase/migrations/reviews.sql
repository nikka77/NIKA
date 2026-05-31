-- ===================================================
-- NIKA STAY — Reviews & Tracking Intelligent
-- À exécuter dans le SQL Editor de Supabase
-- ===================================================

-- Table des logements STAY (enrichissement du schéma listings existant)
-- Si stay_listings est un alias/vue des listings avec domain='stay', ignorer cette table
-- et utiliser directement la table listings avec les colonnes ajoutées ci-dessous.
create table if not exists stay_listings (
  id uuid default gen_random_uuid() primary key,
  pro_id uuid references pros(id),
  title text not null,
  theme text not null,
  description text,
  wow_score integer default 0 check (wow_score >= 0 and wow_score <= 25),
  price_from integer,
  currency text default 'EUR',
  country text,
  images text[],
  affil_url text,
  direct_booking boolean default false,
  active boolean default true,
  created_at timestamptz default now()
);

-- Table des avis
create table if not exists stay_reviews (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references stay_listings(id) on delete cascade,
  author_name text not null default 'Anonyme',
  rating numeric(3,1) check (rating >= 0 and rating <= 10),
  text text not null,
  source text not null default 'direct' check (source in ('direct', 'airbnb_import', 'booking_import', 'google_import')),
  source_ref text,                          -- e.g. Airbnb confirmation code (for dedup)
  review_date timestamptz default now(),

  -- Claude analysis output
  analysis_status text default 'pending' check (analysis_status in ('pending', 'done', 'error')),
  sentiment text check (sentiment in ('positif', 'negatif', 'mitige', 'neutre')),
  language text,
  summary text,
  highlights text[],
  score_global numeric(4,2),               -- 0-10
  score_nika numeric(5,2),                 -- 0-25 NIKA formula
  categories jsonb,                        -- {proprete,confort,localisation,communication,rapport_qualite_prix,esthetique,wow_factor,authenticite}

  created_at timestamptz default now()
);

create index if not exists stay_reviews_listing_id on stay_reviews(listing_id);
create index if not exists stay_reviews_source_ref on stay_reviews(source_ref) where source_ref is not null;
create unique index if not exists stay_reviews_dedup on stay_reviews(listing_id, source_ref) where source_ref is not null;

-- Table des problèmes détectés
create table if not exists stay_issues (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references stay_listings(id) on delete cascade,
  category text not null check (category in (
    'proprete', 'bruit', 'wifi', 'equipements',
    'hote', 'localisation', 'rapport_qualite_prix', 'securite'
  )),
  description text not null,
  severity text not null default 'low' check (severity in ('low', 'medium', 'high')),
  keywords text[],
  mention_count integer default 1,
  status text not null default 'open' check (status in ('open', 'resolved', 'ignored')),
  resolved_at timestamptz,
  resolved_note text,
  last_mentioned_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists stay_issues_listing_id on stay_issues(listing_id);
create index if not exists stay_issues_status on stay_issues(status);

-- Table des stats agrégées par logement
create table if not exists stay_stats (
  listing_id uuid references stay_listings(id) on delete cascade primary key,
  review_count integer default 0,
  avg_rating numeric(4,2) default 0,
  avg_nika_score numeric(4,1) default 0,
  sentiment_distribution jsonb default '{}',  -- {positif: N, negatif: N, mitige: N, neutre: N}
  updated_at timestamptz default now()
);

-- ===================================================
-- RLS Policies
-- ===================================================

alter table stay_listings enable row level security;
alter table stay_reviews enable row level security;
alter table stay_issues enable row level security;
alter table stay_stats enable row level security;

-- stay_listings: lecture publique, écriture pro propriétaire
create policy "stay_listings_public_read" on stay_listings
  for select using (active = true);

create policy "stay_listings_pro_write" on stay_listings
  for all using (
    pro_id in (select id from pros where user_id = auth.uid())
  );

-- stay_reviews: lecture publique des avis analysés
create policy "stay_reviews_public_read" on stay_reviews
  for select using (analysis_status = 'done');

create policy "stay_reviews_insert_anon" on stay_reviews
  for insert with check (source = 'direct');

create policy "stay_reviews_pro_all" on stay_reviews
  for all using (
    listing_id in (
      select sl.id from stay_listings sl
      join pros p on p.id = sl.pro_id
      where p.user_id = auth.uid()
    )
  );

-- stay_issues: lecture/écriture pro propriétaire seulement
create policy "stay_issues_pro_all" on stay_issues
  for all using (
    listing_id in (
      select sl.id from stay_listings sl
      join pros p on p.id = sl.pro_id
      where p.user_id = auth.uid()
    )
  );

-- stay_stats: lecture publique
create policy "stay_stats_public_read" on stay_stats
  for select using (true);

create policy "stay_stats_pro_write" on stay_stats
  for all using (
    listing_id in (
      select sl.id from stay_listings sl
      join pros p on p.id = sl.pro_id
      where p.user_id = auth.uid()
    )
  );

-- ===================================================
-- Service role bypass for API routes (Claude analysis)
-- ===================================================
-- Les API routes utilisent le service role key pour
-- contourner RLS lors de l'analyse async Claude.
-- Créer une policy séparée ou utiliser supabaseAdmin.
