# NIKA — Visuels gamifiés (remplacement des emojis)

> Objectif : remplacer **tous** les emojis/placeholders par des visuels 3D cohérents,
> avec effet **360° au survol/sélection**. Voir aussi `.claude/skills/HIGGSFIELD_SEEDANCE.md`.
> Préflight coût systématique avec `get_cost: true` avant toute génération.

---

## ✅ Recette validée (pilote 2026-06-13)

**Pipeline image clé** (testé sur token, plat, icône — rendu excellent) :
1. `generate_image` — **NE PAS** écrire « transparent background » dans le prompt :
   nano_banana **peint un faux damier**. Demander un fond neutre/sombre uni.
   Modèles : `nano_banana` (photoréal, 1 cr) · `z_image` (icône stylisée, 0,15 cr).
2. `remove_background` (media_type image) → **vrai alpha RGBA** (~2 cr). Récupère même le damier.
3. Télécharger le PNG, convertir en **webp alpha** (`Image.thumbnail 512 → WEBP q88`), placer dans `public/images/<groupe>/<slug>.webp`.
4. Ajouter `<groupe>/<slug>` à `GENERATED` dans `lib/visuals.ts` (et à `VIDEOS_360` si loop .webm).

**Coût réel par asset** : icône ≈ 0,15 + 2 = **~2,15 cr** · photo ≈ 1 + 2 = **~3 cr**.
→ Site complet en images alpha ≈ **~450 cr** (large dans le forfait PLUS 1200).

**Alternative éco** (si budget serré) : générer sur fond **charcoal #0D0D0D** (sans détourage) → blend direct dans le podium sombre. ~105 cr mais léger risque de disque visible au recadrage rond.

Conso pilote : 3 gen + 3 remove_bg ≈ **~5 cr** (1210 → 1204,85).

---

## ⚙️ Technique 360° (pipeline par asset)

Pour chaque item, 2 fichiers :
1. **Image clé statique** — `generate_image` (modèle `seedance` image ou `nano_banana`/flux selon catalogue). Sert d'affichage par défaut + de référence.
2. **Loop 360°** — `generate_video` en image-to-video depuis l'image clé, prompt de rotation `smooth 360° turntable rotation, seamless loop`. Export en `.webm`/`.mp4` léger, joué au survol/clic.
   - *Alternative true-3D* : `generate_3d` depuis l'image clé → modèle GLB pour rotation interactive réelle (plus lourd, réserver aux items hero).

**Intégration web** : `<video>` muet, `loop`, `playsInline`, `preload="none"`, déclenché au hover/select ; poster = l'image clé. Composant générique `<Spin360 src poster />` à créer dans `components/`.

---

## 🎨 Direction artistique commune (BASE STYLE)

> Décisions validées : **mix** (photoréal pour plats & bateaux, 3D stylisé pour icônes) +
> **fond transparent** (le podium circulaire CSS `.spin360` reste visible derrière).
> Chaque item = BASE approprié + sa ligne sujet. Format 1:1, sujet centré avec marge.

**BASE_PHOTO** (plats, bateaux, repas, options, fruits) :
```
"isolated on a fully transparent background (alpha cutout, no backdrop), soft studio
softbox lighting, subtle soft contact shadow beneath the subject, photorealistic, slight
15° top-down hero angle, centered with even margin, hyper-detailed, appetizing
product-shot quality, designed for a seamless 360° turntable rotation, 4K, PNG with
transparency, no text, no logos, no extra props, no plate rim cropped"
```

**BASE_ICON** (icônes domaines + catégories) :
```
"a glossy stylized 3D game-asset icon, soft rounded forms, punchy saturated colors,
smooth matte-and-gloss materials, clean Pixar-like render, isolated on a fully
transparent background (alpha cutout), subtle soft contact shadow, centered, designed
for a seamless 360° turntable rotation, 4K, PNG with transparency, no text"
```

- **Plats** (recette affinée 2026-06-13) : `served on a DARK slate/charcoal ceramic plate
  (jamais blanche → détourage rate les bords), the ENTIRE plate fully visible and centered
  with generous empty margin all around (no cropping), slight 3/4 top-down angle façon
  "thiéboli yapp", light steam, rich saturated appetizing colors`.
- **Boissons maison** : bouteille artisanale (swing-top + étiquette kraft + ficelle), pas un verre.
- **Bateaux** : `3/4 front hero view, premium realistic model, glossy hull`.
- **Icônes** : la couleur d'accent (rim-light) est portée par le podium CSS → inutile de la cuire dans l'image ; garder juste un léger glow interne assorti.
- **Fond transparent** : exporter en **PNG alpha** (image clé) ; pour le loop 360°, **WebM VP9 alpha** (transparence préservée) ou séquence PNG.

**Convention de sortie** : `public/images/<groupe>/<slug>.webp` (image clé) + `<slug>-360.webm` (loop).

---

## A. Icônes des 9 domaines  → `public/images/domains/`

Rim-light = couleur domaine. Style : icône 3D glossy façon trophée de jeu, fond #0D0D0D.

| slug | rim-light | Sujet (à concaténer après BASE STYLE) |
|---|---|---|
| food | #D4A017 | `a glossy 3D golden fork and knife crossed over a glowing plate, warm gold rim-light` |
| auto | #0094D4 | `a sleek glossy 3D blue compact car icon, cyan rim-light, game-asset style` |
| stay | #E07038 | `a glossy 3D stylized geodesic dome cabin, warm orange rim-light` |
| azur | #0868A0 | `a glossy 3D speedboat icon on a tiny wave, deep blue rim-light` |
| rent | #5A88B0 | `a glossy 3D cardboard delivery box with a circular arrow, steel-blue rim-light` |
| serv | #0EA878 | `a glossy 3D crossed wrench and screwdriver, emerald-green rim-light` |
| learn | #7B5CF0 | `a glossy 3D stack of books with a graduation cap, violet rim-light` |
| sec | #D44B24 | `a glossy 3D shield with a keyhole, red rim-light` |
| news | #5A88B0 | `a glossy 3D satellite dish broadcasting waves, slate-blue rim-light` |

---

## B. FOOD — afroweek06 (7 plats)  → `public/images/food/afroweek06/`

Rim-light chaud #D85A30. Assiette ronde, vapeur légère.

| slug | Sujet |
|---|---|
| thieboudienne | `a Senegalese thiéboudienne: red tomato jollof-style rice with a whole fried fish, carrots, cassava and cabbage, on a round plate` |
| poulet-yassa | `a Senegalese poulet yassa: grilled chicken thighs smothered in golden caramelized onions, green olives and lemon, over white rice` |
| mafe | `a West-African mafé: tender beef chunks in a rich glossy peanut groundnut sauce, served with white rice` |
| vermicelles | `sautéed African vermicelli noodles with onions and slow-cooked beef, glossy and steaming` |
| thieboli-yapp | `thiéboli yapp: seasoned rice with roasted meat and seasonal vegetables, vibrant colors` |
| pastels | `five golden Senegalese pastels (fried stuffed pastry turnovers) stacked, with a small bowl of spicy red sauce` |
| bissap | `a tall glass of deep-magenta hibiscus bissap juice, condensation droplets, ice cubes, fresh mint leaf` |

---

## C. FOOD — RAKOMORIA (16 items)  → `public/images/food/rakomoria/`

Rim-light gold #F5C518, ambiance nuit chaude (cuisine comorienne halal).

**Plats (main) :**
| slug | Sujet |
|---|---|
| couscousma | `Comorian couscousma: handmade flatbread, savory tomato sauce, breaded chicken escalope and fragrant vegetables, on a round plate` |
| riz-sauce-rouge-boeuf | `white rice with house red tomato sauce, tender beef chunks, peas and carrots` |
| foutra-burger | `a Comorian "Foutra" burger: handmade flatbread bun, juicy steaks, creamy sauces, melted cheese` |
| riz-viande-rougai | `coconut rice with tomato rougail and island-spiced slow-cooked beef` |
| gratin-pates | `a generous baked pasta gratin with savory sauce, minced meat and bubbling melted mozzarella` |
| riz-legumes-boeuf | `rice with fresh vegetables and tender beef, Comorian spices, vibrant and steaming` |
| tacos-tenders | `a French-style gratinated tacos wrap with crispy chicken tenders, house sauce, melted cheese, halved` |
| tacos-viande-hachee | `a French-style gratinated tacos wrap with minced beef, house sauce, melted cheese, halved` |
| cheese-burger | `a juicy cheeseburger with melting cheese, soft brioche bun, glossy and appetizing` |
| chicken-burger | `a crispy chicken burger, house sauce, soft brioche bun` |
| tasty-croust | `basmati rice bowl with crispy chicken tenders, sweet-and-sour sauce, sriracha mayo, fried onions, fresh basil` |

**Accompagnements (side) :**
| slug | Sujet |
|---|---|
| triangle | `two golden Comorian flaky pastry triangles (stuffed turnovers), crisp and glossy` |
| wrakos | `Comorian wrakos fritters, golden and fluffy, stacked` |
| samboussa | `five crispy triangular samboussas (stuffed fried pastries), stacked` |

**Boissons (drink) :**
| slug | Sujet |
|---|---|
| jus-tamarin | `a glass of cloudy amber tamarind juice, condensation, ice` |
| jus-gingembre | `a glass of vivid ginger juice "le jus de bagarre", fresh ginger root beside it, energetic glow` |

---

## D. FOOD — icônes catégories (8)  → `public/images/food/cats/`

Style icône 3D glossy, rim-light gold #D4A017.
`restaurant` → glossy plate+cloche · `fastfood` → 3D burger · `pizzeria` → pizza slice · `boulangerie` → croissant+baguette · `sushi` → sushi set on board · `vegan` → fresh salad bowl · `foodtruck` → cute 3D food truck · `cave` → wine bottle+glass.

---

## E. AZUR — bateaux (7)  → `public/images/azur/boats/`

Vue 3/4 avant, maquette réaliste premium, reflets d'eau, rim-light bleu #0868A0.

| slug | Sujet |
|---|---|
| pacific_craft | `a Pacific Craft 5.70 open motorboat, white hull, 6-seater day boat, 3/4 front view` |
| flyer_6 | `a Beneteau Flyer 6.5 sport motorboat, modern white-and-grey hull, 8-seater, 3/4 front view` |
| tempest_700 | `a Capelli Tempest 700 RIB inflatable boat, grey tubes, sporty, 10-seater, 3/4 front view` |
| qs_675 | `a Quicksilver 675 cabin motorboat, navy-and-white hull, 3/4 front view` |
| cc_715 | `a Jeanneau Cap Camarat 7.15 walkaround motorboat, white hull, 3/4 front view` |
| leader_805 | `a Jeanneau Leader 805 cabin cruiser, sleek white hull, premium, 3/4 front view` |
| cap_camarat_9wa | `a Jeanneau Cap Camarat 9.0 WA, twin 250hp engines, large white sport cruiser, 3/4 front view` |

---

## F. AZUR — formules repas à bord (5)  → `public/images/azur/repas/`

Présentation à bord, lumière dorée mer en arrière-plan flou. Rim-light or #c9a84c.
`bbq` → grilled merguez+chicken platter · `burger` → gourmet burger+fries box · `charcuterie` → charcuterie & cheese board · `mini_sales` → assortment of mini savory bites · `bento_cake` → personalized bento birthday cake.

---

## G. AZUR — options & activités (6)  → `public/images/azur/options/`

| slug | Sujet |
|---|---|
| seabob | `a Seabob F5S underwater scooter, sleek black-and-yellow watercraft, splashing` |
| jetski | `a modern jet ski watercraft, dynamic 3/4 view, water spray` |
| plateforme | `a large floating sea platform / inflatable pontoon on turquoise water` |
| piscine | `a floating anti-jellyfish sea pool net beside a boat, turquoise water` |
| hookah | `an elegant shisha hookah on a boat deck at sunset` |
| fruits | `a luxury fresh fruit platter (watermelon, pineapple, grapes) on a boat table` |

---

## H. AZUR — ambiances / packs (5)  → `public/images/azur/packs/`

Cinématique, paysage (pas turntable — image clé + léger parallax loop optionnel).
`coucher_soleil` → boat at Mediterranean sunset · `demi_journee` → midday cruise turquoise water · `journee` → full-day Lérins islands anchorage · `afterwork` → evening boat with lights Théoule bay · `feu_artifice` → fireworks over Cannes bay seen from a boat.

---

## I. Autres icônes catégories (lot optionnel)  → `public/images/<dom>/cats/`

Même style icône 3D glossy, rim-light = couleur domaine.

- **AUTO** (#0094D4) : depannage (tow truck), vtc (premium sedan), location (key+car), carburant (fuel can), lavage (foam sponge), mecanique (engine+wrench).
- **RENT** (#5A88B0) : sport (ski+paddle), bricolage (drill), photo (camera+drone), camping (tent), materiel (event speaker), vehicule (van).
- **SERV** (#0EA878) : plomberie (pipe wrench), electricite (lightning plug), menage (broom+spray), jardinage (hedge shears), demenagement (boxes+dolly), informatique (laptop), serrurerie (key), peinture (paint roller).
- **LEARN** (#7B5CF0) : sport (dumbbell), langue (speech globe), musique (electric guitar), cuisine (chef hat+pan), code (terminal brackets), art (palette), surf (surfboard), yoga (lotus figure).
- **SEC** (#D44B24) : gardiennage (security guard badge), serrurerie (key), alarme (cctv camera), coffre (safe vault), protection (shield+suit), cybersecu (padlock circuit).

---

---

# 🆕 ENRICHISSEMENT — lots J → P (analyse complète du site)

> Nouvelles surfaces visuelles repérées sur tout le site, encore en emoji/CSS/gradient.
> 3 nouveaux blocs de base à composer comme BASE_PHOTO/BASE_ICON :

**BASE_HERO** (fonds de section cinématiques) :
```
"cinematic wide establishing shot, Côte d'Azur atmosphere, dramatic moody color grade,
deep shadows on the left third for text overlay, volumetric light, photoreal, 21:9 or
16:9, no people in focus, no text, no logos"
```
**BASE_BADGE** (médailles / niveaux de jeu) :
```
"a premium 3D game rank emblem / medallion, ornate beveled edges, centered, isolated on
a fully transparent background (alpha), subtle inner glow, collectible trophy quality,
soft studio light, designed for a gentle hover tilt, 4K, PNG with transparency, no text"
```
**BASE_CARD** (cartes phygitales NFC) :
```
"a premium matte-black NFC smart card, 3/4 floating angle, soft studio reflections,
embossed glossy icon and a thin accent-colored edge light, fintech product render,
isolated on transparent background (alpha), 4K, PNG with transparency, no text, no numbers"
```

---

## J. Héros de section par domaine (9 + 3 sous-pages AUTO)  → `public/images/heroes/`

> ✅ **9 héros FAITS** (2026-06-14) — `public/images/heroes/{food,auto,stay,azur,rent,serv,learn,sec,news}.webp` (nano_banana 21:9, sans removebg). Composant `components/DomainHero.tsx` (image plein cadre + double scrim lisibilité) câblé sur les 8 pages domaine (le filigrane emoji est supprimé). STAY garde son `HeroSlideshow` (asset dispo si besoin). Sous-pages AUTO : à faire.

Fond cinématique derrière le titre (remplace le gradient + emoji filigrane). BASE_HERO + sujet. Format 21:9.

| slug | Sujet |
|---|---|
| food | `a vibrant Mediterranean food spread on a dark table, warm golden light, Niçoise market vibe` |
| auto | `a sleek car on a coastal Riviera road at blue hour, headlights glowing, motion blur` |
| stay | `an extraordinary cliffside cabin glowing at dusk over the sea, dreamy travel mood` |
| azur | `a luxury motorboat anchored in a turquoise Mediterranean cove at golden hour` |
| rent | `outdoor adventure gear (paddle, bike, drone) arranged on sand at sunset, lifestyle` |
| serv | `a craftsman's tools neatly laid on dark wood, warm workshop light, trustworthy mood` |
| learn | `a sunny coastal workshop scene, surfboards and books, inspiring learning atmosphere` |
| sec | `a calm secured villa at night, soft warm window light, safe and reassuring mood` |
| news | `the Nice cityscape at dawn, Promenade des Anglais, fresh editorial news mood` |
| auto/depannage | `a tow truck helping a car on a scenic Riviera roadside, dusk, reliable mood` |
| auto/vtc | `interior of a premium black sedan cruising the Promenade des Anglais at night` |
| auto/location | `a row of clean rental cars by the sea, bright Mediterranean daylight` |

---

## K. Gamification — 10 badges de niveau + 3 médailles  → `public/images/levels/` · `public/images/ranks/`

> ✅ **10 badges niveaux FAITS** (2026-06-14) — `public/images/levels/{1-inconnu…10-legende}.webp`, champ `badge` sur `LEVELS` + helper `levelBadge(name)` dans `lib/constants.ts`. Câblés : dashboard (carte XP), leaderboard (ligne joueur), accueil (`Gamification.tsx`). Médailles classement `ranks/` (or/argent/bronze) : à faire.

BASE_BADGE + sujet. Progression de matière (pierre → diamant). Format 1:1, transparent.

| niveau | nom | Sujet (matière + emblème) |
|---|---|---|
| 1 | Inconnu | `a rough carved stone badge, faint engraving, humble` |
| 2 | Curieux | `a polished wood-and-copper badge, small compass motif` |
| 3 | Local | `a bronze badge with a tiny map-pin emblem` |
| 4 | Connecté | `a bronze-and-teal badge with interlinked rings` |
| 5 | Ancré | `a silver badge with an anchor emblem` |
| 6 | Régulier | `a brushed-silver badge with a laurel wreath` |
| 7 | Habitué | `a gold badge with a star emblem` |
| 8 | Connaisseur | `an ornate gold badge with gemstone accents` |
| 9 | Insider | `a platinum-and-sapphire badge, glowing blue core` |
| 10 | Légende | `a radiant diamond crown badge, legendary golden glow, particles` |

**Médailles classement** (`ranks/`) : `or` → glossy gold first-place medal · `argent` → silver second-place medal · `bronze` → bronze third-place medal (ruban, BASE_BADGE).

---

## L. Token $NIKA — coin 3D (hero, 360° parfait)  → `public/images/token/nika-coin`

BASE_PHOTO + :
```
a luxurious 3D golden coin embossed with a stylized "N" monogram, brushed-gold and
deep-amber metal, intricate milled edge, soft cinematic reflections, premium crypto-token
render, slowly catching light — built for a seamless 360° spin
```
*Le meilleur candidat pour un vrai loop 360° (un token qui tourne). Remplace l'anneau CSS de TokenSection.*

---

## M. Cartes phygitales NFC (20)  → `public/images/nfc/`

> ✅ **20 cartes FAITES** (2026-06-14) — `public/images/nfc/<slug>.webp`, z_image fond gris clair + removebg. Manifest `lib/visuals.ts` (`nfc/<slug>`). Câblées sur `app/nfc/[slug]/page.tsx` et `app/nfc/[slug]/[id]/page.tsx` (carte flottante + glow couleur, fallback emoji). NB : éviter "medal/coin" dans le prompt (→ forme ronde), forcer "flat rectangular card".

BASE_CARD + emblème embossé selon le service, edge-light = couleur de la carte. Format 3:2.

| slug | nom | accent | emblème embossé |
|---|---|---|---|
| depanneur | Dépanneur | #0094D4 | a tow-hook / key |
| vtc | VTC | #0094D4 | a steering wheel |
| fidelite | Fidélité | #D4A017 | a star |
| caution-free | Caution-Free | #F0C040 | an open padlock |
| skipper | Skipper | #0868A0 | a ship's anchor |
| beach | Beach Club | #E07038 | a sun & wave |
| serrurier | Serrurier | #D44B24 | an antique key |
| pass | NIKA Pass | #F0C040 | a medal ribbon |
| foodtruck | Food Truck | #D4A017 | a food truck |
| wellness | Wellness | #7B5CF0 | a lotus flower |
| aqua | Aqua Dive | #0868A0 | a diving mask |
| boulangerie | Boulangerie | #D4A017 | a croissant |
| stay | Stay Insolite | #E07038 | a tiny house |
| artisan | Artisan | #0EA878 | a hammer |
| watertaxi | Water Taxi | #0868A0 | a small boat |
| coach | Coach Sport | #0EA878 | a dumbbell |
| legacy | Legacy | #F0C040 | a crown |
| sommelier | Sommelier | #7B5CF0 | a wine glass |
| concierge | Concierge | #0094D4 | a service bell |
| bbq | BBQ Board | #D44B24 | a grill / flame |

---

## N. Icônes thèmes STAY (21)  → `public/images/stay/themes/`

> ✅ **7 thèmes FAITS** (2026-06-14) — seuls 7 thèmes (`WOW_EXCLUSIFS` dans `app/stay/page.tsx`) sont réellement affichés, pas 21. Générés : silo-bunker, sous-marin, maison-hobbit, tour-observation, bulle-transparente, architecture-surrealiste, maison-terre. `public/images/stay/themes/<slug>.webp` (z_image + removebg), câblés sur les cartes WOW. Les 14 autres thèmes de la liste n'ont pas de page → non générés.

BASE_ICON + sujet (petite scène 3D stylisée du logement insolite). Accent ambré #E07038.

| slug | Sujet |
|---|---|
| silo-bunker | `a converted missile silo bunker home, concrete hatch` |
| maison-flottante | `a cozy floating house / houseboat on water` |
| avion | `a converted airplane turned into a tiny home` |
| sous-marin | `a yellow submarine converted into lodging` |
| grotte | `a cave dwelling carved into rock` |
| maison-terre | `an earth house with grass roof` |
| maison-hobbit | `a round hobbit earthship door in a green hill` |
| cabane-arbres | `a perched wooden cabin on stilts` |
| tiny-house | `a minimalist tiny house on wheels` |
| bambou | `a bamboo jungle eco-lodge` |
| villa-bali | `a luxury Bali-style villa with infinity pool` |
| train-reconverti | `a vintage train carriage converted into lodging` |
| tour-observation | `a tall observation tower cabin / birdbox` |
| bulle-transparente | `a transparent bubble dome room under stars` |
| thematique | `a whimsical themed fantasy house` |
| france | `a charming unusual French countryside dwelling` |
| moulin-reconverti | `a converted stone windmill home` |
| grange-reconvertie | `a converted rustic barn / farmhouse loft` |
| sous-eau | `an underwater bedroom with fish behind glass` |
| capsule-spatiale | `a futuristic space capsule pod room` |
| grue-industrielle | `an industrial crane converted into a suite` |

---

## O. NIKO — avatar de l'agent IA  → `public/images/niko/`

> ✅ **FAIT** (2026-06-14) — `public/images/niko/{niko-idle,niko-active}.webp` (z_image mascotte robot cyan + removebg). Câblé sur `app/niko/NikoChat.tsx` : header (40px, active si `loading`), idle hero (96px, anim `nikofloat`), avatar message (active sur le message en cours). Médailles classement `ranks/{or,argent,bronze}.webp` aussi faites → leaderboard top 3 + Gamification accueil.

```
BASE_ICON + "a friendly futuristic AI assistant orb mascot, glowing cyan-to-blue
gradient core (#0094D4 → #00C2FF), soft holographic particles, smooth rounded form,
expressive but minimal, premium tech mascot, designed for a gentle idle float/rotation"
```
*2 variantes : `niko-idle` (calme) et `niko-active` (lueur intense, en train de répondre).*

---

## P. Pins de carte par catégorie (7)  → `public/images/map/pins/` (optionnel)

BASE_ICON, forme de goutte/pin 3D, couleur domaine, mini-emblème : `food` 🍽️ gold · `auto` 🚗 azur · `azur` 🛥️ deep-blue · `stay` 🏡 amber · `serv` 🔧 green · `secu` 🔒 red · `news` 📡 slate. Remplace les marqueurs emoji de `MapOverlay`.

---

## 📋 Récap quantités

| Lot | Items | Priorité |
|---|---|---|
| A. Icônes domaines | 9 | ⭐ haute (visible partout) |
| B. afroweek06 plats | 7 | ⭐ haute |
| C. RAKOMORIA plats | 16 | ⭐ haute |
| E. Bateaux AZUR | 7 | ⭐ haute |
| D. Cats FOOD | 8 | moyenne |
| F. Repas AZUR | 5 | moyenne |
| G. Options AZUR | 6 | moyenne |
| H. Packs AZUR | 5 | moyenne |
| I. Cats AUTO/RENT/SERV/LEARN/SEC | 34 | basse |
| J. Héros de section (+3 sous-pages AUTO) | 12 | ⭐ haute (gros impact) |
| K. Badges niveaux + médailles | 13 | ⭐ haute (gamification) |
| L. Token $NIKA (coin 3D) | 1 | ⭐ haute (360° parfait) |
| M. Cartes NFC | 20 | moyenne |
| N. Icônes thèmes STAY | 21 | moyenne |
| O. Avatar NIKO (idle + active) | 2 | moyenne |
| P. Pins de carte | 7 | basse |
| **TOTAL images clés** | **~173** | + loops 360° sur les items "wow" |

> Chaque image clé = 1 génération ; chaque loop 360° = 1 génération vidéo.

### 💳 Coûts réels (préflightés via get_cost, 2026-06-13)

| Type | Modèle | Coût |
|---|---|---|
| Icône stylisée 3D | `z_image` | **0,15 cr** |
| Plat / bateau photoréal | `nano_banana` | **1 cr** (nano_banana_2 = 1,5) |
| Loop 360° vidéo 4s | `veo3_1_lite` (sans audio) | **4 cr** (plancher) |
| Loop 360° vidéo 5s | `kling3_0` (sound off) | 7,5 cr |

**Décompte** (avec lots J→P) : ~81 icônes/pins/thèmes (0,15) + ~92 visuels riches —
plats, bateaux, héros, cartes NFC, badges, token (1) = **~173 images clés ≈ 105 cr**.

| Scénario | Contenu | ~Crédits |
|---|---|---|
| **1 — Images seules** ⭐ | les ~173 visuels rendus (spin emoji CSS en attendant la vidéo) | **~105** |
| **3 — Hybride** | images partout + loop 360° sur plats, bateaux & token (~31) | **~230** |
| **2 — Full 360°** | images + loop 360° sur les 173 | **~800** |

> Démarrage malin : **lot pilote** (1 token + 1 plat + 1 icône ≈ 2 cr) pour valider le style,
> puis lots ⭐ haute priorité (héros + gamification + token + plats ≈ 60 cr) avant le reste.

> Plan free = 10 cr. Packs Higgsfield : 500 / 1000 / 2000 / 4000. Un pack 500 couvre le scénario 1, 3 ou même 2. Prévoir +15-20 % de marge (retries / count>1 pour choisir le meilleur rendu).

---

## Journal des assets générés

| Date | Lot | slug | job_id image | job_id 360° | Statut |
|---|---|---|---|---|---|
| — | — | — | — | — | (à remplir) |
