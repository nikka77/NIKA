# HIGGSFIELD / SEEDANCE — Génération vidéo IA pour NIKA

> Skill à consulter quand Dan demande une vidéo marketing, un teaser, une story ou une pub NIKA.
> Plateforme : [higgsfield.ai](https://higgsfield.ai) · Modèle principal : **Seedance 1.0** (ByteDance) — text-to-video et image-to-video.

## Quand utiliser ce skill

- Teaser d'un logement **STAY WOW** (22 listings vérifiés dans `data/wow_listings.json`)
- Promo **FOOD** : afroweek06 (plats africains), RAKOMORIA (comorien halal, nuit 21h–03h)
- Story **AZUR** : sorties bateau (Rentboat 06, Nayah Boat), coucher de soleil, feux d'artifice
- Pub **NIKO** : démo de l'agent IA (commande VTC/livraison par chat)
- Lancement d'un nouveau domaine ou d'une feature NIKA

## Formats à produire

| Usage | Ratio | Durée | Notes |
|---|---|---|---|
| Stories / Reels / TikTok | 9:16 | 5–10 s | Hook dans la première seconde |
| Hero site web | 16:9 | 5–8 s | Loop discret, pas de texte incrusté |
| Carré feed | 1:1 | 5–8 s | Sujet centré |

## Structure de prompt vidéo (Seedance)

Toujours composer dans cet ordre :

```
[SUJET précis] + [ACTION] + [MOUVEMENT CAMÉRA] + [LUMIÈRE] + [AMBIANCE/STYLE] + [LIEU Côte d'Azur]
```

**Mouvements caméra efficaces :** slow dolly-in, orbit lent, drone pullback, handheld léger, tilt-up révélation.

**Lumières signature NIKA :** golden hour méditerranéenne, bleu nuit profond (#050C17) avec néons, reflets mer turquoise.

## Templates par domaine

**STAY WOW (teaser logement) :**
```
Cinematic drone pullback revealing [logement insolite], golden hour,
Mediterranean coastline, warm amber light, luxury travel film aesthetic,
smooth gimbal motion, 4K, no text
```

**FOOD (promo plat) :**
```
Macro slow-motion shot of [plat], steam rising, vibrant colors,
dark moody restaurant background, overhead spotlight,
appetizing food commercial style, shallow depth of field
```

**AZUR (sortie mer) :**
```
Cinematic shot of a speedboat cutting through turquoise Mediterranean water,
Côte d'Azur cliffs in background, sunset golden light, spray droplets in slow motion,
luxury lifestyle film, smooth tracking shot
```

**NIKO (tech/agent IA) :**
```
Sleek smartphone floating in dark space, glowing blue chat bubbles appearing,
neon cyan accents (#0094D4), futuristic UI animation, subtle camera orbit,
premium tech commercial aesthetic
```

## Workflow recommandé

1. **Image clé d'abord** : générer ou choisir une image cover (cohérence brand) → utiliser **image-to-video** plutôt que text-to-video pur. Pour STAY, partir des vraies photos `public/images/wow/[slug]/`.
2. **Pas de texte dans la vidéo générée** — l'IA déforme les lettres. Ajouter titres/prix en post-prod (CapCut, After Effects) avec les fonts NIKA (Bebas Neue pour titres).
3. **Brancher les couleurs NIKA** en post : overlays et titres selon le domaine (FOOD `#D4A017`, AUTO `#0094D4`, STAY `#E07038`, AZUR `#0868A0`).
4. **Déclinaisons** : générer le 16:9 master, puis recadrer/regénérer en 9:16 pour les stories.
5. **Prix en euros** et textes en français sur tous les overlays.

## Règles

- Jamais de visages reconnaissables de vraies personnes sans accord
- Pas de logos tiers (Airbnb, marques de bateaux) dans les prompts
- Données réalistes Côte d'Azur (lieux : Nice, Cannes, Antibes, Théoule, Lérins, Monaco)
- Conserver les prompts qui fonctionnent dans `tasks/video-prompts.md` (les capitaliser)

---

## Arsenal complet Higgsfield (MCP `33a482bb-…`) — audit 05/07/2026

> Le « supercomputer » de Dan = Higgsfield en MCP. `generate_image`/`generate_video`/`generate_audio`/`generate_3d` + preflight `get_cost:true` (coût AVANT job). Solde/plan via `balance`. Solde au 05/07 : **1,72 cr (plan Plus) → top-up requis**. Packs 500/1000/2000/4000.

### IMAGE — génération
| Modèle | Pour | Coût préflighté |
|---|---|---|
| `recraft_v4_1` (model_type=`vector`, `colors[]`, `background_color`) | **LOGOS / ICÔNES / BLASONS flat vectoriels, palette + fond contrôlés** — LE modèle pour les emblèmes AKASHA | à préflighter |
| `nano_banana_pro`, `gpt_image_2`, `openai_hazel` | **texte/typo/kanji/chiffres nets** (logos univers, bagues Akatsuki, numéros Espada), 4K | nano_pro = 2 cr |
| `soul_2` | perso/UGC/portrait/éditorial réaliste | 0,12 cr |
| `soul_cinematic`, `cinematic_studio_2_5` | concept art / stills ciné (héros de section) | — |
| `soul_location` | décors/environnements (cartes, lieux) | — |
| `soul_cast` (+ Soul-ID) | **identité perso CONSTANTE** entre générations | — |
| `seedream_v4_5` (4K/6K), `flux_2`, `flux_kontext`, `grok_image`, `kling_omni`, `z_image` (budget), `image_auto` | polyvalents / édition / rapide | — |

### IMAGE — édition & finition (post-génération)
`flux_kontext`/`seedream`/`openai_hazel` (édition par instruction, style transfer) · `remove_background` (**détourage → icônes transparentes**) · `outpaint` (étendre le cadre) · `reframe` (recadrer un ratio) · upscale `topaz_image`/`bytedance_image_upscale`/`topaz_image_generative` (2K/4K, face enhance) · `autosprite` (image perso → **sprite sheet game-ready** idle/walk/run/attack/jump + 8 dir iso).

### VIDEO
Génération : `veo3_1` (top ciné + audio), `kling3_0` (multi-shot, audio sync, motion transfer), `seedance_2_0` (référence-driven, identité consistante, 4K, start/end frame), `minimax_hailuo` (physique/émotion), `cinematic_studio_3_0`, `wan2_7` (audio sync perso), `grok_video`, `gemini_omni`. Image→vidéo via `higgsfield_preset` (presets_show). · **Marketing Studio Video** (pubs UGC TikTok/Reels one-click : hooks/settings/avatars/ad_reference). · **Clipify** (1 YouTube → 10-20 shorts sous-titrés, face-track, font Bebas Neue dispo). · **Explainer Video** (blocs + voix + sous-titres). Post : upscale/deflicker/background-remover vidéo.

### AUDIO / VOIX
`text2speech_v2` (moteurs ElevenLabs/MiniMax/Seed/Vibe/Cozy), **voix FR** (Alain, Hélène, Mathieu, Étienne) · `create_voice` (**clonage → voix NIKO signature**) · `sonilo_music` (musique) + `mirelo_text_to_audio` (**SFX** — arcade) · `dubbing`, `voice_change`.

### 3D
`sam_3_3d` (Meta, image→GLB) · `image_to_3d`/`multi_image_to_3d` (Meshy — **1-4 vues = meilleure géométrie, résout les artefacts mono-vue qui gataient l'onglet 3D**) : texturing, PBR, auto-rig humanoïde, animation depuis **lib 678 clips** (idle 0/walk 30/run 16/jump 466/dance 64…) · `tripo_3d` (texte→3D) · `3d_rigging` (rigger un GLB existant).

### STUDIOS & PIPELINES
Marketing Studio (brand kit + produits + avatars + styles d'ad) · Shorts Studio · **Website builder** (create/deploy/publish, `website_db`, secrets, repo) · **Game pipeline** (`deploy_game`/`publish_game` + autosprite + sonilo + mirelo → déployer l'arcade AKASHA) · **Virality Predictor** (score viralité) · Soul training (`show_characters` action=train : 5-20 photos → Soul-ID réutilisable).

### GESTION (indispensable pour l'auto-QC)
`get_cost` (preflight) · `balance`/`transactions`/`show_plans_and_credits` · `media_upload`/`media_import_url` (réfs i2i) · **`job_display`/`show_generations`/`show_medias`** (récupérer la sortie rendue → je la LIS → j'analyse vs critères QC → je régénère les ratés) · `models_explore`/`presets_show`/`show_reference_elements`.

### Ce que ça change pour AKASHA (décisions)
1. **Emblèmes/icônes/blasons → `recraft_v4_1` vector** (palette + fond plats, SVG-like) plutôt que soul_2 : plus net en petit, détourable, cohérent. soul_2 reste pour les héros/portraits.
2. **Texte canon (logos, kanji Akatsuki, chiffres Espada) → `nano_banana_pro`/`openai_hazel`**.
3. **Cohérence de set** : générer 1 emblème « hero », le passer en `medias`/image-ref (i2i) aux frères du set → même style. Ou Soul-ID pour un perso récurrent.
4. **Finition systématique** : `remove_background` (transparent) → `upscale` si besoin.
5. **Auto-QC** : après chaque `generate_image`, `job_display` → lire l'image → comparer aux `qc_criteria` → régénérer si erreur (mauvais kanji/chiffre, symbole générique, flou).
6. **Débloquables** : onglet 3D (multi_image_to_3d), SFX arcade #52 (mirelo/sonilo), voix NIKO (create_voice), vidéos marketing (skill ci-dessus).
