# NIKA — Instructions Claude Code

## Contexte projet
NIKA est une super-app Côte d'Azur (Next.js 16 + Supabase + Tailwind).
9 domaines : FOOD, AUTO, STAY, AZUR, RENT, SERV, LEARN, SEC, NEWS.
Agent IA NIKO pour VTC/livraison/courses (Claude API streaming).

## Skills à consulter avant chaque tâche
- **Design** → `.claude/skills/NIKA_DESIGN.md` (CSS variables, fonts, grilles, conventions visuelles)
- **Architecture Next.js** → `.claude/skills/NIKA_NEXT.md` (Server vs Client, patterns RSC, SEO)
- **Supabase** → `.claude/skills/NIKA_SUPABASE.md` (schéma DB, requêtes types, RLS, env vars)
- **NIKO Agent** → `.claude/skills/NIKO_AGENT.md` (intentions, flows, system prompt, multi-canal)
- **Domaines** → `.claude/skills/NIKA_DOMAINS.md` (règles métier, monétisation, gamification)

## Règles absolues

### Design
- Utiliser **toujours** les variables CSS (`var(--az)`, `var(--td)`, etc.)
- **Jamais** de `gridTemplateColumns` dans `style={}` — utiliser `.g-2`, `.g-3`, `.g-4` (globals.css)
- **Jamais** de `onMouseEnter/Leave` dans Server Components — utiliser CSS classes

### Code
- Toujours le null guard Supabase : `supabase ? await supabase.from(...) : { data: null }`
- Pages domain = Server Components sauf exceptions (chat, map, auth)
- Ne pas ajouter de dépendances sans demande explicite

### Contenu
- Textes en **français** toujours
- Pas de lorem ipsum — données réalistes Côte d'Azur
- Prix en euros (€)

## Stack
- Next.js 16 App Router + Turbopack
- Supabase (auth + DB + storage)
- Tailwind (breakpoints responsive uniquement)
- Zustand (auth store, map store)
- Leaflet (carte interactive)
- @anthropic-ai/sdk (NIKO streaming)
- @fontsource/bebas-neue, exo-2, outfit
