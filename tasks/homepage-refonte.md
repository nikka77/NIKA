# Refonte totale — Page d'accueil NIKA · Plan maître

> Source unique de vérité pour la refonte home. Mise à jour au fil des phases.
> Catalogue composants : `design/21st-components/CATALOG.md`. Design system : `.claude/skills/NIKA_DESIGN.md`.

---

## 0. Vision & direction artistique

- **Objectif** : une home qui ressemble à une **app premium vivante**, originale et agréable —
  pas une landing SaaS générique. On garde le look bespoke déjà premium et on l'amplifie.
- **Style visuel** : illustré **stylisé 3D (type Pixar) / anime léger**, cohérent avec les assets
  z_image déjà générés. **Pas de photoréalisme**, pas de fond vidéo plage (rejeté).
- **Mouvement** : animations au scroll (Framer Motion, déjà installé), parallax léger sur les
  éléments illustrés, micro-interactions au survol. Toujours sous garde `prefers-reduced-motion`.
- **Ton** : français, Côte d'Azur (Nice · Antibes · Cannes), données réalistes, prix en €.

## 1. Décisions clés (⚠️ à valider avant code)

| # | Décision | Recommandation | Alternative |
|---|---|---|---|
| D1 | **Approche d'intégration** des composants 21st.dev | **Réimplémenter** les mécaniques en style NIKA (inline + vars CSS + Framer Motion) pour garder le look bespoke. N'installer via `shadcn add` que les libs complexes (carte, globe, timeline orbitale). | Tout installer via `shadcn add` puis re-skinner (plus rapide, risque "générique") |
| D2 | **Carte du Hero** | Carte **illustrée** Côte d'Azur (SVG/canvas dessiné, pins animés) → on-brand "dessin" | Vraie carte interactive `mapcn` (tuiles) — réservée plutôt à la section Carte |
| D3 | **Pièce Token $NIKA** | **Garder `coin3d`** (double-face webp, déjà validé) et rendre la section interactive autour | Scène 3D Spline `serafim/splite` (plus lourd, asset externe) |
| D4 | **Ordre des sections** | Adopter le nouvel ordre §2 (value-first) | Conserver l'ordre actuel |

## 2. Nouvel ordre des sections (avant → après)

| Ordre actuel | Nouvel ordre proposé | Action |
|---|---|---|
| Hero | **1. Hero** — carte vivante + NIKO | ♻️ Rebuild (A+C) |
| LiveActivity | **2. Live ticker** | ⬆️ Upgrade |
| StatsBar | ~~StatsBar~~ | ❌ Supprimer |
| TokenSection | **3. Domaines explorer** | ♻️ Remplace DomainsCarousel (A+B) |
| FlashDeals | **4. Flash Deals** | ♻️ Rebuild (cartes + countdown) |
| Onboarding | **5. Carte interactive** (MapSection) | ✅ Garder (upgrade optionnel) |
| DomainsCarousel | **6. Comment ça marche** (Onboarding) | ⬆️ Upgrade illustré |
| MapSection | **7. Gamification** — parcours + défis | ♻️ Rebuild (A+C, sans leaderboard) |
| Gamification | **8. Token $NIKA** — hub interactif | ♻️ Rebuild |
| NewsTeaser | **9. News** | ⬆️ Upgrade léger |
| AccessCTA | **10. CTA final** | ⬆️ Upgrade (glow) |
| Footer | **11. Footer** | ✅ Garder |

## 3. Spécification par section

### 1 — HERO · « Carte vivante + NIKO » (A+C) ♻️
- **Avant** : `components/Hero.tsx` — fond ScrollVideo plage + scrim, titre, search→/niko, 3 CTA, pulse live, teaser XP.
- **Après** : pleine hauteur. Fond **ciel azur animé** (aurora/beams réimplémenté). À gauche : pill « Nouveau · 9 univers » + titre Bebas + **barre de recherche à actions** (suggestions VTC/resto/logement) + **entrée NIKO** (mini-chat). À droite/centre : **carte illustrée Côte d'Azur** avec pins animés (Nice/Antibes/Cannes) qui pulsent et font apparaître une activité live (VTC qui roule, bateau, deal qui pop).
- **Réf 21st** : `aceternity/aurora-background` · `kokonutd/beams-background` · `kokonutd/action-search-bar` · `kokonutd/v0-ai-chat` · `originui/hero-pill` · `magicui/animated-shiny-text`.
- **Visuels à générer** (z_image) : carte illustrée Côte d'Azur stylisée (côte Nice→Cannes), réutiliser NIKO avatar + pins domaines existants (`visual('domains', …)`).
- **Données** : statique + `useMapStore` (openMap existant). Search → `/niko?q=`.
- **Motion** : pins en boucle (pulse/float), apparition activité timée, parallax léger carte au scroll.

### 2 — LIVE TICKER ⬆️
- **Avant** : `components/LiveActivity.tsx` — marquee 1 ligne, 8 items texte.
- **Après** : garder la mécanique `.marquee`. Enrichir : pastille couleur par domaine, petite icône/avatar, éventuellement 2 lignes en sens opposés. Items plus crédibles.
- **Réf 21st** : `lukacho/marquee`.
- **Données** : statique enrichi (plus tard : flux events Supabase).

### 3 — DOMAINES EXPLORER (A+B) ♻️ (remplace DomainsCarousel — détesté)
- **Avant** : `components/DomainsCarousel.tsx` — carrousel 3D `Spin360` (rejeté).
- **Après** : **sélecteur de domaine** (onglets extensibles / scroll horizontal des 9 univers) + **panneau d'aperçu live** du domaine choisi.
  - Ex. **FOOD** → grille des food trucks actifs + **plat du jour de Rakomoria** + raccourcis (livraison, brunch…).
  - **STAY** → 3 logements WOW (`data/wow_listings.json`). **AZUR** → bateaux dispo. Autres → aperçu générique soigné.
- **Réf 21st** : `victorwelander/expandable-tabs` (sélecteur) · `kokonutd/bento-grid` (grille) · `Codehagen/display-cards` (cartes contenu) · `ayushmxxn/tubelight-navbar` (variante switch).
- **Données** : Supabase par domaine avec **null guard** (`supabase ? … : { data:null }`) + fallback démo réaliste. FOOD = référence à brancher en premier (vérifier tables food/Rakomoria — cf. lessons #30).
- **Fichiers** : `components/home/DomainsExplorer.tsx` (+ sous-composants `DomainPreviewFood`, etc.). Supprimer `DomainsCarousel.tsx` et `Spin360.tsx` si plus utilisés.
- **Motion** : transition de panneau (crossfade/slide) au changement de domaine.

### 4 — FLASH DEALS ♻️ (Dan : « pas compris »)
- **Avant** : `components/FlashDeals.tsx` — fin bandeau horizontal de mini-puces (peu lisible).
- **Après** : vraie section. Titre « ⚡ Flash Deals — ça part vite ». Rangée/carrousel de **cartes deal illustrées** : visuel, commerce, **réduction en gros**, **compte à rebours** (réutiliser `Timer` actuel), CTA « J'en profite ». Bandeau d'alerte optionnel en haut.
- **Réf 21st** : `lavikatiyar/offers-carousel` · `kokonutd/x-gradient-card` · `Codehagen/display-cards` · `lavikatiyar/alert-banner`.
- **Données** : table `flash_deals` (null guard) + `DEMO_DEALS` existants. **Garder la logique `Timer`** (bonne).
- **Fichiers** : réécrire `components/FlashDeals.tsx` (garder `Timer`).

### 5 — CARTE INTERACTIVE ✅ (garder, upgrade optionnel)
- **Avant/Après** : `components/MapSection.tsx` — conservé tel quel pour la v1 de la refonte.
- **Upgrade futur (optionnel)** : suite `mapcn/*` (carte stylée azur, pins, clusters, popups) en remplacement Leaflet. **Hors périmètre v1** sauf demande.

### 6 — COMMENT ÇA MARCHE ⬆️ (Onboarding)
- **Avant** : `components/Onboarding.tsx` — « En 4 étapes » avec emojis 👤🗺️⚡🔓.
- **Après** : étapes **illustrées**. 1. Crée ton profil · 2. Explore la carte · 3. Commande/réserve avec NIKO · 4. Gagne de l'XP & débloque. Visuel par étape + liaison animée.
- **Réf 21st** : `jatin-yadav05/radial-orbital-timeline` (étapes en orbite) ou `svg-ui/cpu-architecture` (flux animé) ou stepper horizontal illustré.
- **Visuels** : 4 illustrations d'étape (z_image), ou réutiliser badges/visuels existants.

### 7 — GAMIFICATION (A+C) ♻️ (détesté — sans leaderboard)
- **Avant** : `components/Gamification.tsx` — bloc XP + **leaderboard** + 3 quêtes.
- **Après** : **supprimer le leaderboard**. Garder : (A) **parcours de niveaux** 1→10 visualisé (orbite/chemin) avec les **badges existants** (`LEVELS[].badge`) + (C) **défis du jour/semaine** en cartes.
- **Réf 21st** : `jatin-yadav05/radial-orbital-timeline` (parcours 10 niveaux) · `Codehagen/display-cards` (défis) · `Ali-Hussein-dev/card-with-grid-pattern`.
- **Données** : `lib/constants.ts` `LEVELS` (badges webp déjà là), `visual('ranks', …)`. Défis statiques v1.
- **Fichiers** : réécrire `components/Gamification.tsx`. Retirer dépendance leaderboard.

### 8 — TOKEN $NIKA ♻️ (Dan : « peux mieux faire »)
- **Avant** : `components/TokenSection.tsx` — texte + 3 features + pièce `coin3d`.
- **Après** : **hub interactif**. Pièce `coin3d` (gardée) qui tourne plus vite au survol + **solde animé** (compteur) + onglets **Gagner / Dépenser** (cartes interactives) + **faisceaux** convergents vers la pièce + mini-aperçu wallet.
- **Réf 21st** : `aceternity/pulse-beams` · `mikolajdobrucki/glow` · compteur (catégorie Numbers) — réimplémentés.
- **Fichiers** : réécrire `components/TokenSection.tsx` (garder `.coin3d`).

### 9 — NEWS ⬆️
- **Avant** : `components/NewsTeaser.tsx` — 3 cartes hardcodées.
- **Après** : cartes type `display-cards`, brancher table `news` (null guard) + fallback. Léger.
- **Réf 21st** : `Codehagen/display-cards` · `shadcnblockscom/gallery6`.

### 10 — CTA FINAL ⬆️
- **Avant** : `components/AccessCTA.tsx`.
- **Après** : bloc CTA avec **halo** + bouton magnétique/particules + tracés animés en fond.
- **Réf 21st** : `mikolajdobrucki/cta-with-glow` · `kokonutd/magnetize-button` · `kokonutd/particle-button` · `kokonutd/background-paths`.

## 4. Prérequis techniques

- ✅ `framer-motion` installé · ✅ tokens CSS (`globals.css`) · ✅ `FadeIn`, `ConfirmDialog`, `coin3d`.
- ⚠️ Si on installe des composants 21st (D1) : `npx shadcn@latest init` (si pas de `components.json`), util `cn` (`clsx` + `tailwind-merge`), `lucide-react`.
- 🎨 Visuels : génération Higgsfield **z_image** (stylisé 3D, ~0.15 cr) — vérifier `balance` avant un batch.
- 🧱 Build : Turbopack uniquement, ne **pas** builder pendant le dev (lessons #27/#28), `distDir` reste `.next.nosync` (lessons #29).

## 5. Phases de build (ordre d'exécution)

- **Phase 0 — Setup** : valider D1–D4, nettoyer `app/page.tsx` (retirer StatsBar, réordonner), créer `components/home/`.
- **Phase 1 — HERO** (donne le ton, à valider en premier) : fond animé + search à actions + entrée NIKO + carte illustrée + pins animés.
- **Phase 2 — DOMAINES EXPLORER** (le plus gros) : sélecteur + aperçu FOOD (food trucks + plat du jour Rakomoria) en référence, puis STAY/AZUR, puis le reste.
- **Phase 3 — FLASH DEALS** : cartes illustrées + countdown.
- **Phase 4 — GAMIFICATION** : parcours niveaux + défis (sans leaderboard).
- **Phase 5 — TOKEN $NIKA** : hub interactif autour de coin3d.
- **Phase 6 — COMMENT ÇA MARCHE + LIVE TICKER + NEWS + CTA** : upgrades.
- **Phase 7 — Polish** : motion/parallax, responsive (Pilier 1), a11y `prefers-reduced-motion`, perf.
- **Phase 8 — Visuels** : génération/intégration des assets illustrés (peut être fait en parallèle des phases).
- **Phase 9 — Commit + déploiement** (sur demande de Dan) : push GitHub + `npx vercel --prod`.

## 6. Système — rappels (NIKA_DESIGN + lessons)

- **Toujours** `var(--…)` ; **jamais** `gridTemplateColumns` inline → `.g-2/.g-3/.g-4`.
- Server Components par défaut ; `'use client'` seulement si interaction (search, tabs, timer, motion).
- **Jamais** `onMouseEnter/Leave` en Server Component → CSS `:hover`.
- Baseline globale en `:where()` (spécificité 0) ; hover sous `@media (hover:hover)`.
- Null guard Supabase systématique ; vérifier l'existence des tables avant de débugger un « vide » (lessons #30).
- Avant de créer une classe CSS : `grep` qu'elle n'existe pas déjà (lessons #34).
- iCloud : re-vérifier `git status` après tout `rm` (fichiers qui réapparaissent — lessons #26).

## 7. Definition of Done (par section)

- [ ] Rendu conforme direction artistique (illustré stylisé, premium, pas générique).
- [ ] Tokens NIKA + typos respectés, textes FR, données réalistes Côte d'Azur, prix €.
- [ ] Responsive mobile-first OK (≥320px) ; `prefers-reduced-motion` respecté.
- [ ] Null guards Supabase + fallback démo ; aucun crash si table absente.
- [ ] Vérifié dans le preview (console sans erreur, snapshot/screenshot).
- [ ] `tasks/lessons.md` mis à jour si une correction de Dan survient.

## 8. Risques / pièges connus (lessons applicables)

- Tables core potentiellement absentes (food/Rakomoria, flash_deals, news) → vérifier avant de brancher (lessons #30).
- Ne pas mélanger paradigmes de style sans contrôle (D1).
- Mélange `next build` / dev server = chunks corrompus (lessons #27).
- Suppressions annulées par la sync iCloud (lessons #26).
