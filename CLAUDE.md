# NIKA — Instructions Claude Code

## Contexte projet
NIKA est une super-app Côte d'Azur (Next.js 16 + Supabase + Tailwind).
9 domaines : FOOD, AUTO, STAY, AZUR, RENT, SERV, LEARN, SEC, NEWS.
Agent IA NIKO pour VTC/livraison/courses (Claude API streaming).

## SELF-LEARNING

### Protocole obligatoire

1. **Début de chaque session** — lire `tasks/lessons.md` en entier avant de toucher au code.
2. **Appliquer chaque règle** listée dans `tasks/lessons.md` avant d'écrire ou modifier quoi que ce soit.
3. **Après chaque correction de Dan** — ajouter immédiatement une entrée dans `tasks/lessons.md` au format :

```
| YYYY-MM-DD | Ce qui s'est mal passé | Règle à suivre la prochaine fois |
```

### Quand ajouter une entrée

- Dan corrige une erreur de code, de design ou de comportement
- Une approche a été rejetée ou refaite
- Un bug a persisté après un premier fix
- Une convention a été rappelée (ex : variables CSS, grid classes)

### Principe

Chaque correction ne doit arriver qu'une seule fois. Si la même erreur se répète, c'est un échec du système.

## Carte du projet (graphify)

Avant de lire des fichiers, consulte d'abord `graphify-out/GRAPH_REPORT.md` pour comprendre la structure et n'ouvrir que le strict nécessaire. Pour mettre à jour la carte après des changements : `node scripts/graphify.mjs --update`.

## Skills à consulter avant chaque tâche
- **Design** → `.claude/skills/NIKA_DESIGN.md` (CSS variables, fonts, grilles, conventions visuelles)
- **Architecture Next.js** → `.claude/skills/NIKA_NEXT.md` (Server vs Client, patterns RSC, SEO)
- **Supabase** → `.claude/skills/NIKA_SUPABASE.md` (schéma DB, requêtes types, RLS, env vars)
- **NIKO Agent** → `.claude/skills/NIKO_AGENT.md` (intentions, flows, system prompt, multi-canal)
- **Domaines** → `.claude/skills/NIKA_DOMAINS.md` (règles métier, monétisation, gamification)
- **STAY WOW** → `.claude/skills/NIKA_STAY_WOW.md` (inventaire logements extraordinaires, scoring WOW, SEO insolite, stratégie affiliation/direct)
- **Reviews & Tracking** → `.claude/skills/NIKA_REVIEWS_TRACKING.md` (système avis IA, issues tracking, NIKA Score)

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

## Données WOW STAY (CRITIQUE)

Le fichier `data/wow_listings.json` contient les **22 logements WOW** vérifiés, enrichis avec descriptions NIKA, histoire, avis, hôtes.

**Quand tu travailles sur le module STAY :**
1. Lire `data/wow_listings.json` — source de vérité pour les 22 listings WOW
2. Utiliser `description_nika` (jamais la description Airbnb brute)
3. Utiliser `history` pour la section "L'histoire de ce lieu"
4. Utiliser `sample_reviews` pour afficher les avis
5. Utiliser `review_categories` pour les stats initiales
6. Ne jamais modifier ce fichier manuellement — l'enrichir via les API

**Pour importer les 22 listings en base :**
```bash
npx ts-node scripts/import-wow-listings.ts
npx ts-node scripts/import-wow-listings.ts --dry-run
npx ts-node scripts/import-wow-listings.ts --id=wow-001
```

**Pages SEO :** chaque listing a une page statique à `/stay/[slug]` générée depuis le JSON.

## Stack
- Next.js 16 App Router + Turbopack
- Supabase (auth + DB + storage)
- Tailwind (breakpoints responsive uniquement)
- Zustand (auth store, map store)
- Leaflet (carte interactive)
- @anthropic-ai/sdk (NIKO streaming)
- @fontsource/bebas-neue, exo-2, outfit
