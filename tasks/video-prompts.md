# NIKA — Bibliothèque de prompts Higgsfield / Seedance

> Prompts prêts à générer. Voir aussi `.claude/skills/HIGGSFIELD_SEEDANCE.md`.
> **Règle d'or** : aucun texte dans la vidéo générée (l'IA déforme les lettres) → titres/prix ajoutés en post-prod avec Bebas Neue.
> Workflow : générer l'**image clé** d'abord → puis image-to-video. Préflight coût avec `get_cost: true`.
>
> **Couleurs domaine (overlays post-prod)** : FOOD #D4A017 · AUTO #0094D4 · STAY #E07038 · AZUR #0868A0 · RENT #5A88B0 · SERV #0EA878 · LEARN #7B5CF0 · SEC #D44B24 · NEWS #5A88B0
> **Lieux réels** : Nice, Cannes, Antibes, Théoule, Îles de Lérins, Monaco, Promenade des Anglais, Cours Saleya.
> **Modèles** : `seedance_2_0` (identité/réalisme), `kling3_0` (multi-plans/mouvement), `marketing_studio_video` (pub produit).

---

## 1. BRAND — Hero d'accueil (16:9, loop)

**Objectif** : vidéo de fond hero homepage. **Modèle** : kling3_0 · **Durée** : 6-8s · **Ratio** : 16:9

```
Cinematic aerial drone shot gliding over the Côte d'Azur coastline at golden hour,
turquoise Mediterranean water meeting terracotta rooftops of Nice, palm trees along
the Promenade des Anglais, warm amber sunlight, smooth forward motion, luxury travel
film aesthetic, deep cinematic color grade, 4K, no text, no logos
```
*Post-prod : titre "TOUT CE QUI BOUGE SUR LA CÔTE D'AZUR" en Bebas Neue, accent #00C2FF.*

---

## 2. STAY — Teaser logement WOW (9:16 story)

**Objectif** : reel logement insolite. **Modèle** : seedance_2_0 (image-to-video depuis `public/images/wow/[slug]/`) · **Durée** : 5-8s · **Ratio** : 9:16

```
Slow cinematic reveal of an extraordinary [TYPE: dôme géodésique / cabane perchée /
maison flottante], nestled in [DÉCOR], golden hour Mediterranean light, smooth dolly-in
through the entrance revealing the interior, warm inviting glow from within, luxury
travel documentary style, shallow depth of field, gentle gimbal motion, 4K, no text
```
*Variables : remplacer `[TYPE]` et `[DÉCOR]` par le listing réel. Post-prod : nom du lieu + prix/nuit en bas, accent #E07038.*

---

## 3. FOOD — afroweek06 (9:16 story, cuisine africaine)

**Objectif** : promo plat du jour. **Modèle** : seedance_2_0 (image-to-video depuis photo plat) · **Durée** : 5s · **Ratio** : 9:16

```
Macro slow-motion shot of a vibrant West African dish (jollof rice, grilled chicken,
plantains), steam gently rising, rich saturated colors, dark moody background with a
single warm spotlight, hand sprinkling spices in slow motion, appetizing food
commercial aesthetic, shallow depth of field, 4K, no text
```
*Post-prod : "AFROWEEK06 · Plat du jour" + prix, accent #D85A30.*

## 3b. FOOD — RAKOMORIA (cuisine comorienne, ambiance nuit)

**Modèle** : seedance_2_0 · **Durée** : 5s · **Ratio** : 9:16

```
Macro shot of Comorian street food (triangles, samboussas, grilled meat) on a dark
slate plate, golden frying glow, steam rising, island spices scattered, deep night-time
mood with warm amber rim light, halal street food aesthetic, slow rotating motion,
shallow depth of field, 4K, no text
```
*Post-prod : "RAKOMORIA · Nuit 21h–03h · Halal" gold #F5C518 sur fond #0D0D0D.*

---

## 4. AZUR — Sortie bateau (16:9 + 9:16)

**Objectif** : teaser sortie mer. **Modèle** : kling3_0 · **Durée** : 6s · **Ratio** : 16:9 (puis recadrer 9:16)

```
Cinematic tracking shot of a luxury motorboat cutting through turquoise Mediterranean
water near the Îles de Lérins, sun-soaked passengers relaxing on deck, water spray
droplets caught in slow motion, golden sunset light, French Riviera cliffs in the
background, premium lifestyle film, smooth stabilized motion, 4K, no text, no brand
```
*Post-prod : "NAYAH BOAT · dès 200€" ou "RENTBOAT 06", accent #c9a84c.*

## 4b. AZUR — Coucher de soleil afterwork (9:16)

```
Cinematic shot from the deck of a boat at sunset, the sun melting into the
Mediterranean horizon, silhouettes of friends with drinks, warm orange and pink sky,
gentle waves, lens flare, dreamy summer-evening atmosphere, slow handheld motion, 4K, no text
```

---

## 5. NIKO — Agent IA (16:9, tech)

**Objectif** : démo de l'agent conversationnel. **Modèle** : kling3_0 · **Durée** : 6s · **Ratio** : 16:9

```
Sleek smartphone floating in dark space, glowing cyan chat bubbles appearing one by one,
neon blue accents (#0094D4), holographic map of the Côte d'Azur materializing above the
screen with glowing location pins, futuristic premium tech commercial, subtle camera
orbit, dark background with subtle grid, 4K, no text
```
*Post-prod : "NIKO ⚡ Commande par message" accent #00C2FF.*

---

## 6. AUTO / SERV / SEC — Services (9:16, rapides)

**AUTO — dépannage** (kling3_0, 5s, 9:16) :
```
Cinematic shot of a tow truck arriving on a coastal Riviera road at dusk, headlights
glowing, professional driver stepping out confidently, blue-hour lighting, sense of
fast reliable help, smooth motion, 4K, no text
```

**SERV — artisan** (seedance_2_0, 5s, 9:16) :
```
Close-up of skilled hands fixing a modern fixture, warm workshop light, tools in sharp
focus, sense of craftsmanship and trust, shallow depth of field, slow push-in, 4K, no text
```

**SEC — serrurerie 24h** (kling3_0, 5s, 9:16) :
```
Cinematic night shot of a security professional unlocking a door, focused and calm,
dramatic low-key lighting with a single warm streetlight, sense of safety and 24/7
reliability, slow push-in, 4K, no text
```

---

## Journal des générations réussies

> Capitaliser ici les `job_id` + prompts qui ont bien rendu, pour réutilisation.

| Date | Domaine | Modèle | job_id | Note |
|---|---|---|---|---|
| — | — | — | — | (à remplir) |
