# Refonte AKASHA « zones » — plan de chantier

Direction validée par Dan (14/07/2026) : remplacer le langage « carte TCG + grilles de tuiles »
par des **zones qui canalisent la data** (réf. positive : carte interactive Naruto).
Squelette **Console du canal** (rail contexte + surface vivante + panneau canal re-scopable),
habillé selon la DA « premium ++ » choisie parmi les 4 pistes Higgsfield, moteurs spécialisés
**Emaki** (data temporelle) et **Nexus** (organisations). Concepts + critiques :
artefact `0d1e0048` (7 onglets) · analyse complète : `analyse-synthese.md` (scratchpad session).

## Décisions garder / jeter (Dan, 14/07)

- **Gardés** : icônes-médaillons (tous univers, à étendre + régénérer les incohérents), cartes
  Naruto / One Piece / cosmos Dragon Ball (à améliorer : data live, MapShell partagé, fix tactile),
  wordmarks + HUB_VISUAL, og:images, WANTED (extra OP), arbre généalogique, radar databook,
  ArcFrieze (graine du moteur temporel), fallbacks par catégorie, toute la plomberie lib/akasha.
- **Bleach** : PAS le seul cercle du Gotei → carte des **4 mondes** (Terre/Karakura, Soul Society,
  Hueco Mundo, Wandenreich) avec drill-down (Gotei DANS Soul Society, Arrancars DANS Hueco Mundo).
- **Jetés** (fait, commits c170ba5 + 7e7ad52) : gamification complète (album, quiz, vs, boosters,
  collection, streaks, rangs, seeds du jour), Moveset 2D, ContinueBanner + VisitTracker.
  La data reste intacte : Dan envisage un futur **jeu de simulation de combat IA** inter-univers.

## Chantier 0 — préparation (EN COURS)

- [x] Démolition gamification/moveset/tracking (−1 832 lignes, typecheck + live OK)
- [x] Audit médaillons 8 univers (111 fichiers, 0 404 ; rapport complet en session)
- [x] Corrections 0 crédit : 15 blasons dormants câblés (CLAN_IMG), OP_NON_CREW +9,
      filtre Kazekage, typo « Armarda » (base + build + icône), 16 dossiers vides supprimés
- [x] 4 directions artistiques générées puis **TOUTES REJETÉES par Dan (19/07)** — comme les planches
      par univers : rendu « IA » kitsch, trop chargé, injugeable en image. **DA EN PAUSE** : structure
      d'abord en style NIKA existant, habillage en DERNIER, prototypé en vrai code uniquement.
      Cible exprimée : **menu de jeu AAA × Apple/Linear** (impact + air + rigueur, zéro décoration plaquée).
- [x] Campagne médaillons (25 images livrées + câblées, commit : 5 trous P1 + 6 long-tail P2 + 14 regen core ;
      solde Higgsfield vérifié 2 100 cr — pas de top-up requis). Pattern : webp détouré 420-440 px
      (famille Naruto) / SVG détouré < 30 KB lisible à 40 px (7 autres univers), aucun texte intégré.
- [x] Blueprint technique lot 1 (ci-dessous) — Chantier 0 CLOS, lot 1 lancé le 19/07.
- ~~Tokenisation DA~~ → reportée en fin de refonte (décision Dan 19/07).

## Blueprint lot 1 — coquille + canal

- **Coquille** : `app/learn/akasha/layout.tsx` (nouveau) = rail contexte gauche fin (monogramme,
  Registre, 8 univers, déclencheur ⌘K — l'OmniSearch monte ICI, donc partout) + zone de contenu.
  Mobile < 900px : rail replié en barre horizontale compacte.
- **Canal** : `components/akasha/zone/ZoneShell.tsx` = grille 2 colonnes (surface libre |
  panneau canal ~380px sticky) + contexte React de sélection (`useZoneSelection`).
  Contrat : tout élément interactif de la surface appelle `select({kind, ...payload})` ;
  le canal affiche le détail scopé ; état par défaut = identité (rendu au premier paint → SEO ok) ;
  bouton retour ↩ dans le canal. Mobile : le canal passe sous la surface (bottom-sheet au lot 3).
- **Fiche perso v2** : `components/akasha/zone/CharacterZone.tsx` remplace CharacterView
  (carte TCG) + CharacterDossier (9 onglets) sur `[slug]/page.tsx` — surface = portrait grand
  format piloté par ArcFrieze + grappes interactives (jutsu par famille, famille, appartenances,
  radar) ; canal = identité/bio par défaut, re-scope au clic. Style : tokens NIKA existants,
  esprit AAA×Apple (grande typo, air, hairlines).
- **URLs** : aucune nouvelle route ; `?focus=` remplace `?tab=` (deep-link canal), redirection douce.

## PROTOCOLE DE REPRISE (session neuve / tokens épuisés — LIRE EN PREMIER)

1. Lire CE fichier en entier + `tasks/lessons.md`. La mémoire persistante résume le contexte
   (fiches `akasha-refonte-zones` et `da-akasha-pas-de-maquettes-ia`).
2. État = `git log --oneline -15` (tout est en commits locaux atomiques, RIEN n'est poussé —
   toujours demander à Dan avant push). Chaque étape ci-dessous ≈ 1 commit : reprendre à la
   première étape non cochée du lot en cours.
3. Vérif standard après chaque étape : `npx tsc --noEmit` + UNE page en navigateur
   (texte + erreurs console suffisent ; screenshot seulement si changement visuel majeur).
4. Env : dev server via preview (port 3000) ; Supabase = `set -a && source .env.local && set +a`.

## RÈGLES D'ÉCONOMIE DE TOKENS (demande Dan 19/07 — sans perte de qualité)

- **Pas de workflows multi-agents pour l'implémentation** (les runs d'analyse ont coûté
  ~1M tokens pièce) : exécution solo, séquentielle, sur ce plan pré-mâché. Workflows réservés
  aux audits massifs ET sur demande explicite de Dan.
- **Pas de maquettes IA, pas d'exploration spéculative** : la réflexion coûteuse est déjà
  consignée ici ; exécuter, ne pas re-concevoir.
- Lectures chirurgicales (offset/limit, grep d'abord), jamais de relecture d'un fichier connu.
- Vérification navigateur minimale (cf. protocole §3) ; commit petit et fréquent = un arrêt
  brutal ne perd jamais plus d'une étape.
- Réponses à Dan : denses, sans redites du plan (il est ici).

## Les 4 lots — étapes pré-mâchées (≈ 1 commit par case)

### Lot 1 — Coquille + fiche personnage ✅ LIVRÉ (commits 137defc→4d3fe3c)
Coquille = barre fine 44px (`layout.tsx` : AKASHA · UniverseWheel · ⌘K) ; **Roue des univers**
façon GTA (UniverseWheel.tsx, portal body — gotcha : backdrop-filter parent = containing block
des fixed) ; fiche perso = CharacterZone (surface portrait+ArcFrieze+grappes | canal re-scopable,
zone-context) ; wordmarks partout (jamais emoji/monogramme — leçon). Statut Dan : « provisoirement
acceptable ». Reste optionnel lot 1 : deep-link `?focus=`, bottom-sheet mobile du canal.

### Lot 2 — Registre-cosmos (`app/learn/akasha/page.tsx`)
- [x] 2a. Hero compacté : titre + recherche GET seuls (sans les 12 blocs sous le hero mobile).
- [x] 2b. **Portes des univers** : grille 4×2 de cartes-wordmark grand format (wordmark + compteur
      `listUniverseCounts` + teinte univers au survol) remplaçant UniverseRail sur la racine
      (UniverseRail reste utilisé en mode filtré ?universe=). Lien → hub `/u/[slug]`.
- [x] 2c. Barre de filtres UNIQUE : fusionner AkashaFilters + rails type/rareté/tri en une
      barre (type · rareté · tri) au-dessus de la grille ; CategoryRail reste en chips dessous ;
      FilterBar (récap filtres actifs) conservé tel quel.
- [x] 2d. Nettoyage : DidYouKnow garde 1 emplacement ; supprimer les redondances restantes
      signalées par l'audit (double compteurs) ; vérifier pagination inchangée (SEO).
- [ ] 2e. (option, si Dan valide le style) Tuile de mosaïque v2 sobre remplaçant AkashaCard
      sur la racine seulement (rareté = liseré fin, pas de cadre TCG) — sinon reporter lot 4.

### Lot 3 — Hubs (`app/learn/akasha/u/[slug]/page.tsx` + hub/)
- [x] 3a. Signature PLEIN CADRE : la surface signature (carte) passe en tête du hub, sections
      restantes derrière des ancres/calques ; brancher OnePieceMap et DragonBallCosmos via
      `HUB_VISUAL.signature` en config (tuer les `if slug ===` du hub).
- [x] 3b. Data live sur cartes existantes (effectifs villages Naruto + équipages Yonko ; prime cumulée → 4a) : compteurs par village (Naruto, `listAxisCounts`)
      et par île/territoire (OP : persos par region + total_prime par Yonko) affichés sur la
      surface ; réutiliser les données déjà chargées par le hub (zéro requête neuve si possible).
- [x] 3c. **Carte Bleach 4 mondes** (décision Dan) : Terre/Karakura · Soul Society (cercle
      Gotei existant imbriqué en drill-down) · Hueco Mundo · Wandenreich — composition verticale
      calculée (pattern « géométrie = taxonomie »), données `race` (100 % remplies).
- [x] 3d. Cartes calculées des 4 orphelins : roue du Nen (HxH), frise des 8 parties (JoJo),
      plateau Kira vs L (DN), tracé des cols (Initial D) — moteurs de surface config-driven.
- [ ] 3e. Gabarit compact pour univers < 250 entrées (Initial D/DN : pas de sections à 1 élément).
- [ ] 3f. Fix tactile mobile des cartes (`touchAction` Naruto) + MapShell partagé (chrome,
      légende, panneau — recodés 4× aujourd'hui).

### Lot 4 — Moteurs spécialisés & mosaïque
- [ ] 4a. Agrégats SQL (vue ou RPC) : compteurs par axe + effectifs/prime par organisation —
      prérequis 4b, allège aussi les ~20 requêtes/hub.
- [ ] 4b. Fiche organisation « organigramme-zone » (402 status) : membres en orbites
      hiérarchisées via `appartient` + attributs, prime totale en héros (OP).
- [ ] 4c. Rouleau temporel (entités à `eras`/`forms`) : généralisation d'ArcFrieze en moteur
      de surface (les 37 fiches à ères + hubs).
- [ ] 4d. Remplaçant définitif d'AkashaGrid/AkashaCard partout (retire framer-motion) +
      passerelles seiyū sur les fiches perso (voiceActors, 3 531 persos).
- [ ] 4e. Balayage final : emojis restants des anciennes surfaces, badge « ✦ Fiction »,
      og:images re-skinnées, `?focus=` deep-link canal.

## Règles transverses

Palette/typos NIKA strictes (var(--…), Bebas/Exo 2 italic/Outfit), français, aucune nouvelle
dépendance (la mort d'AkashaGrid retire framer-motion), Server Components par défaut, SEO/ISR
préservés (jamais de compteur rendu 0 sans JS), mobile 375 px + rail bas NIKA, jamais fonder
une zone sur les seules relations (35,5 % d'entrées isolées → les attributs sont des axes de
plein droit), dégradation honnête pour les pouvoirs sans images (glyphes, jamais de vignettes).
