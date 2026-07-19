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

## Les 4 lots d'implémentation

1. **Coquille + fiche personnage** — le layout.tsx AKASHA manquant (rail contexte / surface /
   canal), nouvelle fiche perso (surface micro-carte + canal, remplace carte TCG + dossier 833 l.).
   Mobile : canal = bottom-sheet. Garde-fou : contenu par défaut du canal rendu serveur (SEO).
2. **Registre-cosmos** — la racine (mur de ~15 blocs → cosmos des 8 univers + mosaïque à
   surlignage in-situ, tri favorites, une seule barre de filtres, ⌘K partout).
3. **Hubs** — surface signature plein cadre dès l'arrivée, data live branchée sur les cartes
   (compteurs par village, primes par territoire), carte Bleach 4 mondes, cartes calculées pour
   les 4 univers orphelins (roue Nen, frise JoJo, plateau Kira, cols Gunma), gabarit compact
   pour univers < 250 entrées.
4. **Moteurs spécialisés** — organigramme-zone Nexus pour les 402 fiches status (+ agrégats SQL),
   rouleau Emaki pour les entités à eras/forms, passerelles seiyū inter-univers.

## Règles transverses

Palette/typos NIKA strictes (var(--…), Bebas/Exo 2 italic/Outfit), français, aucune nouvelle
dépendance (la mort d'AkashaGrid retire framer-motion), Server Components par défaut, SEO/ISR
préservés (jamais de compteur rendu 0 sans JS), mobile 375 px + rail bas NIKA, jamais fonder
une zone sur les seules relations (35,5 % d'entrées isolées → les attributs sont des axes de
plein droit), dégradation honnête pour les pouvoirs sans images (glyphes, jamais de vignettes).
