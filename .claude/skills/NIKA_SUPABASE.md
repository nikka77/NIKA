# NIKA Supabase Schema

## Tables principales

### users
```sql
id uuid PK (= auth.users.id)
username text UNIQUE
full_name text
xp integer DEFAULT 0
level integer DEFAULT 1
level_name text DEFAULT 'Inconnu'
nika_credits integer DEFAULT 0
is_pro boolean DEFAULT false
created_at timestamptz
```

### pros (partenaires professionnels)
```sql
id uuid PK
user_id uuid FK → users.id
domain text  -- 'food' | 'auto' | 'stay' | 'azur' | 'rent' | 'serv' | 'learn' | 'sec' | 'news'
business_name text
description text
phone text
address text
lat float8
lng float8
google_place_id text
rating float4 DEFAULT 0
rating_count integer DEFAULT 0
verified boolean DEFAULT false
active boolean DEFAULT true
is_pro boolean DEFAULT true
created_at timestamptz
```

### listings (offres, hébergements, véhicules)
```sql
id uuid PK
pro_id uuid FK → pros.id
title text
description text
price numeric
available boolean DEFAULT true
domain text
affil_url text     -- lien affilié Airbnb/Booking
metadata jsonb     -- ex: { theme: 'maison-flottante', guests: 4 }
created_at timestamptz
```

### orders (commandes clients)
```sql
id uuid PK
user_id uuid FK → users.id
pro_id uuid FK → pros.id
listing_id uuid FK → listings.id
status text  -- 'pending' | 'confirmed' | 'delivered' | 'cancelled'
amount numeric
notes text
created_at timestamptz
```

### flash_deals (promotions temporaires)
```sql
id uuid PK
pro_id uuid FK → pros.id
title text
discount_type text  -- 'percent' | 'fixed' | 'free'
discount_value numeric
expires_at timestamptz
active boolean DEFAULT true
created_at timestamptz
```

### xp_transactions
```sql
id uuid PK
user_id uuid FK → users.id
action text  -- 'order_placed' | 'review_left' | 'poi_added' | etc.
xp_amount integer
created_at timestamptz
```

### pois (Points of Interest pour la carte)
```sql
id uuid PK
name text
category text
lat float8
lng float8
description text
pro_id uuid FK → pros.id (nullable)
verified boolean DEFAULT false
created_at timestamptz
```

### news_articles
```sql
id uuid PK
title text
content text
category text
author_id uuid FK → users.id
votes integer DEFAULT 0
published boolean DEFAULT false
created_at timestamptz
```

## Requêtes types

### Fetch pros avec listings
```tsx
await supabase.from('pros')
  .select('*, listings(*)')
  .eq('domain', 'food')
  .eq('active', true)
  .order('rating', { ascending: false })
```

### Flash deals actifs
```tsx
await supabase.from('flash_deals')
  .select('*, pros(id, business_name)')
  .eq('active', true)
  .gt('expires_at', new Date().toISOString())
  .limit(6)
```

### Profil user complet
```tsx
await supabase.from('users')
  .select('*')
  .eq('id', user.id)
  .single()
```

## RLS Rules (Row Level Security)
- `users` : lecture publique des profils, écriture owner uniquement
- `pros` : lecture publique si `active=true`, écriture owner + admin
- `orders` : lecture/écriture owner uniquement
- `flash_deals` : lecture publique, écriture pros owner + admin
- `listings` : lecture publique si `available=true`, écriture pro owner

## Env vars requis
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...  ← pour NIKO
```

## null guard pattern (toujours utiliser)
```tsx
const supabase = await createClient();
const { data } = supabase
  ? await supabase.from('table').select('*')
  : { data: null };
```
