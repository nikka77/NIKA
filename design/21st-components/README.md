# 21st.dev — Composants sélectionnés pour NIKA

Catalogue de composants React/Tailwind/Framer-Motion repérés sur
[21st.dev/community/components](https://21st.dev/community/components), triés et
mappés aux sections de NIKA (home + autres pages).

> Source de vérité : **[CATALOG.md](./CATALOG.md)** (sélection curatée par section NIKA)
> Listes brutes par catégorie : **[RAW_BY_CATEGORY.md](./RAW_BY_CATEGORY.md)**

---

## Comment installer un composant

21st.dev s'installe via le **registry shadcn**. Le format est toujours :

```bash
npx shadcn@latest add https://21st.dev/r/<author>/<slug>
```

Exemple :

```bash
npx shadcn@latest add https://21st.dev/r/kokonutd/shape-landing-hero
```

- Page de démo (preview + code) : `https://21st.dev/community/components/<author>/<slug>/default`
- Le composant arrive dans `components/ui/` (config shadcn). On le **re-skinne ensuite**
  aux tokens NIKA — ne jamais laisser les couleurs/typos par défaut.

## Prérequis (déjà OK dans NIKA, à vérifier)

| Dépendance | État NIKA |
|---|---|
| Tailwind | ✅ installé |
| `framer-motion` | ✅ installé (session précédente) |
| shadcn (`components.json`) | ⚠️ à init si absent : `npx shadcn@latest init` |
| `clsx` + `tailwind-merge` (util `cn`) | ⚠️ requis par la plupart des composants |
| `lucide-react` (icônes) | ⚠️ souvent requis |

## Règles de re-skin NIKA (obligatoire après `add`)

Voir `.claude/skills/NIKA_DESIGN.md`. En résumé, remplacer systématiquement :

- couleurs → `var(--az)` `#0094D4`, `var(--gold)` `#D4A017`, fond `var(--bg)` `#050C17`
- titres → font **Bebas Neue** (`var(--fn)`) ; accents → **Exo 2 italic** (`var(--fe)`) ; texte → **Outfit** (`var(--fo)`)
- grilles → classes `.g-2/.g-3/.g-4` (jamais `gridTemplateColumns` inline)
- respecter `prefers-reduced-motion`
- textes en **français**, prix en **€**, données réalistes Côte d'Azur

## Top 12 à installer en priorité (refonte home)

| # | Composant | `author/slug` | Section NIKA |
|---|---|---|---|
| 1 | Aurora Background | `aceternity/aurora-background` | Hero (ciel azur) |
| 2 | mapcn (suite carte) | `mapcn/mapcn-map` (+ markers/cluster/route) | Hero carte vivante + Map |
| 3 | COBE Globe | `shuding/cobe-globe-interactive` | Hero (globe Côte d'Azur) |
| 4 | Action Search Bar | `kokonutd/action-search-bar` | Hero (recherche) |
| 5 | v0 AI Chat | `kokonutd/v0-ai-chat` | Entrée NIKO |
| 6 | Bento Grid | `kokonutd/bento-grid` | Domaines explorer |
| 7 | Expandable Tabs | `victorwelander/expandable-tabs` | Domaines (switch) |
| 8 | Display Cards | `Codehagen/display-cards` | Aperçus live domaines / défis |
| 9 | Offers Carousel | `lavikatiyar/offers-carousel` | FlashDeals |
| 10 | Spline Scene (3D) | `serafim/splite` | Token $NIKA (pièce 3D) |
| 11 | Radial Orbital Timeline | `jatin-yadav05/radial-orbital-timeline` | Gamification (parcours) |
| 12 | Large Name Footer | `arihantcodes_1f7b8c4d/large-name-footer` | Footer (wordmark NIKA) |

> Note : certains handles d'auteur contiennent des suffixes/caractères inhabituels
> (ex. `arihantcodes_1f7b8c4d`). Toujours copier la commande exacte depuis la page du
> composant si un `add` échoue.
