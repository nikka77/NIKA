# NIKA Next.js Architecture

## Stack
- Next.js 16 App Router + Turbopack
- Supabase (auth + DB)
- Tailwind (responsive uniquement, pas de layout)
- TypeScript strict

## Structure App Router
```
app/
├── layout.tsx          ← Nav + Footer + Loader + MapOverlay (global)
├── page.tsx            ← Homepage (Server Component, importe composants)
├── globals.css         ← Variables CSS, reset, classes utilitaires
├── food/page.tsx       ← Domain pages (Server Components avec Supabase)
├── auto/page.tsx
├── stay/page.tsx
├── azur/page.tsx
├── niko/page.tsx       ← Client Component (chat SSE)
├── api/niko/route.ts   ← API Route streaming Claude
├── api/gmb/route.ts    ← Google My Business import
├── connexion/page.tsx  ← Auth page (Client Component)
├── inscription/page.tsx← Register multi-step (Client Component)
├── dashboard/page.tsx  ← User dashboard (Server Component)
├── pro/
│   ├── inscription/page.tsx ← 4-step pro form (Client)
│   ├── register/page.tsx    ← redirect → /pro/inscription
│   └── dashboard/page.tsx
└── ...

components/
├── Nav.tsx             ← Client (useAuthStore, mobile menu)
├── Footer.tsx          ← Server
├── AuthModal.tsx       ← Client (modal auth)
├── MapOverlay.tsx      ← Client (Leaflet, lazy)
├── StatsBar.tsx        ← Client (IntersectionObserver countup)
├── Gamification.tsx    ← Client (FadeIn scroll)
├── Hero.tsx            ← Client (FadeIn)
└── ...
```

## Règles Server vs Client Components
- Server Components : pages de données (fetch Supabase), composants statiques
- Client Components : `'use client'` — hooks, events, stores Zustand, Leaflet
- **Jamais** `onMouseEnter/Leave` dans Server Components → utiliser CSS classes
- **Jamais** event handlers dans RSC → extraire en Client Component

## Supabase pattern
```tsx
// Server Component
const supabase = await createClient(); // @/lib/supabase/server
const { data } = supabase
  ? await supabase.from('table').select('*')
  : { data: null };

// Client Component
const supabase = createClient(); // @/lib/supabase/client
if (!supabase) { /* handle no env */ return; }
```

## Store Zustand
```tsx
import { useAuthStore, useMapStore } from '@/lib/store';
const user = useAuthStore(s => s.user);    // { id, username, level_name, is_pro, xp, nika_credits }
const setUser = useAuthStore(s => s.setUser);
const { openMap } = useMapStore();
```

## SEO Pattern
```tsx
// Server Component avec metadata statique
export const metadata: Metadata = {
  title: 'Page — NIKA',
  description: 'Description unique 150-160 chars',
  keywords: ['mot-clé 1', 'mot-clé 2'],
};

// Page dynamique avec generateMetadata
export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} — NIKA`, description: '...' };
}
```

## API Routes (streaming Claude)
```tsx
// app/api/niko/route.ts
export async function POST(req: Request) {
  return new Response(new ReadableStream({ ... }), {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
  });
}
```

## Conventions naming
- Pages : `kebab-case/` folders
- Components : `PascalCase.tsx`
- Lib : `camelCase.ts`
- Types Supabase : inline dans les pages (pas de types globaux séparés sauf constants.ts)
