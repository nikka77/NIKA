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
