# AKASHA — Plan d'organisation

Synthèse du 05/08/2026 — 8 audits univers + back-end + front commun + rapport du réparateur.
Dépôt canonique : `/Users/macbookprom1pro/dev/NIKA`. Règle d'or : ne JAMAIS mesurer les dossiers
via `attributes.sections` (purgé) — toujours joindre `akasha_sections` par `entry_id`.

## 1. Où on en est

- **7 691 fiches publiées, 8 univers** (Naruto 3 318, One Piece 2 270, Dragon Ball 1 141, Bleach 386, JoJo 233, HxH 215, Death Note 84, Initial D 44) ; descFr 7 043 (92 %).
- Le schéma du 05/08 est en place et la base est **propre** : 19 545 sections dans `akasha_sections` (4 645 fiches), 16 605 arêtes dans `akasha_relations`, 0 fiche ne porte plus sections/relations en JSONB.
- Mais **quatre chemins de code sont restés sur l'ancien JSONB, dont deux écrivains actifs** : `agent-worker.mjs` (sections ⚡) et les deux poseurs de `patch.relations` — « Appliquer » une production relations est cassé à 100 % côté console.
- Le graphe est riche mais pollué : **215 arêtes inter-univers** par homonymes (OP→Naruto 118, DB→Naruto 61, HxH 11, Bleach 10, Naruto→OP 10…) — la fiche OP de Yamato « maîtrise » le Mokuton, visible en prod.
- **791 fiches ont un dossier en base que leur gabarit n'affiche jamais** (637 gabarit générique, 141 OrganizationZone, 13 EraZone) — du contenu déjà payé, invisible.
- **484 fiches entièrement vides** (ni descFr ni section) : Naruto 255, OP 175, DB 33, Bleach 16, JoJo 3, Initial D 2 — surtout powers/artefacts.
- **Déjà réparé le 05/08 (non commité, build vert 301/301)** : jauges « avecDossier » de la console, filtres « sans dossier » de `ops-blitz-export` et `ops-fill-sections-local`, `/tops` (height_cm = 0 fiche → « Doyens/Benjamins » via `listAges`), compteur du hub dynamisé, 2 classes CSS, suppression du cluster mort CharacterView/PlaceView (7 fichiers, 1 600 lignes).
- Reste le plus urgent côté back : worker → `poserSections`, débrancher `patch.relations`, neutraliser `ops-reposer-sections` (bombe : ~19 000 repositions JSONB s'il est relancé).
- Les audits détaillés couvrent Naruto/OP/DB ; pour Bleach, JoJo, HxH, Death Note et Initial D, l'état ci-dessous vient de sondes DB directes du 05/08 (+ contrôle qualité DN du 02/08 : confiance 58 %).
- Aucune écriture en base ni commit à ce stade : tout ce plan part d'un état mesuré, pas estimé.

## 2. Chantiers transversaux

### Back (serveur, scripts, données transverses)

| P | Chantier | Effort | Fichiers |
|---|---|---|---|
| P1 | **Worker → poserSections** : l'auto-application ⚡ (`fiche_section`, `toilettage_fr`) écrit encore `attributes.sections` — la section part dans le JSONB purgé et devient invisible (lireSections préfère la table). Panne silencieuse dès la prochaine tâche. | moyen | `scripts/agent-worker.mjs`, `lib/akasha/sections.ts` |
| P1 | **Débrancher `patch.relations` ×2** : la contrainte SQL rejette l'update → côté console « Appliquer » toute production relations échoue à 100 % ; côté worker échec silencieux (fiche marquée appliquée, écriture perdue). | faible | `app/api/ops/state/route.ts` (l.355), `scripts/agent-worker.mjs` (l.1726) |
| P1 | **Neutraliser/archiver `ops-reposer-sections`** : toutes les ~19 000 sections approuvées lui paraissent « manquantes » — le relancer repolluerait le JSONB en masse. Sa raison d'être (course d'écriture) a disparu avec la table. | faible | `scripts/ops-reposer-sections.mjs` |
| P1 | **Purger les 215 arêtes inter-univers** (DELETE joint sur universe≠universe) + garde-fou anti-inter-univers dans le poseur. Touche 6 univers, pur calcul, zéro appel externe. | faible | table `akasha_relations`, `lib/akasha/relations.ts` |
| P2 | **Rebrancher les 4 lecteurs éteints** sur `akasha_sections` : toilettage FR des dossiers, francisation des titres (réécriture complète, écrivain de données), contrôle final qualité, purge des sections étrangères (→ `lireSections`/`retirerSections`). | moyen | `scripts/ops-fill-toilettage.mjs`, `ops-titres-sections-fr.mjs`, `ops-controle-final.mjs`, `ops-purger-sections-etrangeres.mjs` |
| P2 | **Annulation d'audit** : un `fiche_section` jugé « faux » supprime aujourd'hui descFr au lieu de la section — brancher `retirerSections` (0 appelant à ce jour). | faible | `app/api/ops/audit/route.ts`, `lib/akasha/sections.ts` |
| P2 | **Remplir les ~484 fiches vides** (usine Fandom existante : intro → descFr, découpage → sections ; liste recalculable en une requête). | moyen | `scripts/ops-remplir-auto.mjs`, `scripts/lib/fandom.mjs` |
| P3 | **`queries.ts`** : 7 fonctions refont chacune un scan paginé complet (12-16 requêtes par rendu de hub) — poser `cache()`, fusionner `getEntriesBySlugs`/`getFullEntriesBySlugs`, `listStars`/`listSimilar` en 1 requête. | moyen | `lib/akasha/queries.ts` |
| P3 | **Archiver les scripts soldés** : `ops-migrer-sections`, `ops-verser-relations-jsonb`, `ops-liberer-bloquees-ancrage`, grappe dédup (5 scripts). | faible | `scripts/` |

### Front commun

| P | Chantier | Effort | Fichiers |
|---|---|---|---|
| P1 | **Dossier des 791 fiches muettes** : factoriser le bloc sections (dupliqué entre gabarit Attaque et CharacterZone, markup divergent) en composant partagé, le monter dans le gabarit générique, OrganizationZone et EraZone. `getEntryBySlug` fournit déjà les sections — zéro requête neuve. | moyen | `app/learn/akasha/[slug]/page.tsx`, `components/akasha/zone/{Organization,Era,Character}Zone.tsx` |
| P3 | **Omni-search** : le placeholder promet « fouille aussi les biographies » mais seul descFr est indexé — fouiller aussi les 19 545 sections. | moyen | `lib/akasha/queries.ts` (omniSearch), `app/learn/akasha/api/search` |
| P3 | **Pages d'axe minces pré-générées** (DB Majin 1/Angel 4, Bleach 13 divisions à 2-6 fiches, Initial D Team Emperor 1, JoJo Parties 7-8) : dé-curer sous 5 entrées ou étoffer la donnée. | faible | `lib/akasha/universe-taxonomy.ts` |

## 3. Par univers

### Naruto — 3 318 fiches
Le plus gros et le plus dense : graphe à 97 % de couverture (8 124 arêtes), carte des villages 100 % vivante, personnages quasi parfaits (descFr 99,9 %, dossiers 84 %). Mais 255 fiches vides, jutsu dossiérés à 11,8 % seulement, axe clan éclaté sur 50 valeurs sales, et l'axe organization existe côté agents mais pas côté site : Akatsuki (12 fiches) est invisible et sa page fait 404. Gestes signature de fiche inertes (forms 7, nindō 7, stats 0 — le radar databook ne se rend jamais).
1. **Surfacer l'axe organization** (taxonomy + `BELONG_ATTRS`) — front, faible, P1.
2. **descFr des 255 fiches vides** via l'usine Fandom — data, moyen.
3. **Normaliser l'axe clan** (fusion des graphies, promotion des groupes ≥ 5 : Sarutobi, Aburame, Funato…) — data, moyen. (+ micro-fixes front groupés au backlog : pilier `clan-uchiha`→`uchiha`, onglet Métiers, chips Oto/Ame.)

### One Piece — 2 270 fiches
Le hub le mieux servi (carte 144 îles, 180/180 slugs résolus, primes réelles) et les meilleurs dossiers personnages (90 %). Mais le plus touché par la pollution inter-univers (118 arêtes vers Naruto, techniques Mokuton sur la fiche Yamato), 175 fiches vides, pouvoirs dossiérés à 26 % alors que les Fruits (211) sont la collection n°1, axe crew pollué (87 groupes : apostrophes, « Marine · 29 », lieux), maitrise sur 10 % des persos seulement.
1. **Purge inter-univers** (chantier transversal P1) **+ normaliser crew** (87 → ~30, table de renommage + `OP_NON_CREW`) — data, faible.
2. **175 fiches vides + sections des 309 pouvoirs** (Fruits d'abord, puis Attaques) — data, moyen.
3. **Relier les 98 fiches Attaque à leurs porteurs** (arêtes maitrise depuis les infobox « Users ») — data, moyen.

### Dragon Ball — 1 141 fiches
Globalement sain (descFr 93 %, dossiers 71 %, graphe riche avec natures divines posées) et hub très équipé (cosmos statique 0 lien mort, signature saga pleine). Mais le carrousel TCG expose les doublons freeza/freezer et muten-roushi/kame-sennin côte à côte, anton-the-great trône en #5 avec 3 786 favoris suspects (gotcha cache mal_id), le type skill est le parent pauvre (16 % descFr, 15 vides/45) et 0/504 pouvoirs ont une image.
1. **Fusionner les 2 doublons du top-20** (pipeline dedup existant : alias, re-routage arêtes+sections, somme des favorites) — data, faible.
2. **Corriger les favorites d'anton-the-great** (recouper Jikan, scanner les autres aberrants) — data, faible.
3. **Remplir les 15 skills vides + descFr des transformations** (7/45) ; au passage dé-curer Majin/Angel (pages d'axe à 1 et 4) — data, moyen.

### Bleach — 386 fiches *(sondes 05/08 — audit détaillé non reçu)*
descFr 93 %, dossiers 71 %, 16 fiches vides, 1 120 arêtes. Axe race rempli sur 100/293 persos avec 3 valeurs hors canon (Soul, Modified Soul, Zanpakutō Spirit) ; axe division rempli sur 48 fiches : les 13 pages Gotei pré-générées font toutes 2 à 6 fiches. Décision du 14/07 : la carte des 4 mondes reste à construire (signature `gotei` en attendant).
1. **Étoffer race** (100/293) et purger les 3 valeurs hors canon — data, faible.
2. **16 fiches vides** via l'usine — data, faible.
3. **Trancher les 13 pages division minces** : dé-curer ou regrouper en page Gotei unique — front, faible.

### JoJo's Bizarre Adventure — 233 fiches *(sondes 05/08)*
descFr 93 %, dossiers 84 %, 3 fiches vides, 557 arêtes. L'axe partie est le mieux rempli du site (221/233) mais Partie 7 (4) et Partie 8 (2) sont quasi vides — deux pages d'axe minces pré-générées.
1. **Étoffer Parties 7-8** (persos Steel Ball Run/JoJolion manquants) ou retirer ces valeurs curées — data/front, faible.
2. **3 fiches vides** — data, faible.
3. Rien d'autre d'urgent : univers en bon état.

### Hunter x Hunter — 215 fiches *(sondes 05/08)*
L'univers le plus sain : descFr 99 %, dossiers 90 %, **0 fiche vide**. Axe nen rempli sur 48/203 mais les 6 types canon sont tous ≥ 5 (pages d'axe saines). 11 arêtes parasites vers Naruto (couvertes par la purge transversale).
1. **Compléter nen** sur les persos majeurs restants — data, faible.
2. (purge inter-univers via le chantier transversal.)
3. Rien d'autre : servir de témoin qualité.

### Death Note — 84 fiches *(sondes 05/08 + contrôle qualité 02/08)*
descFr 100 %, dossiers 92 % — sur le papier le meilleur. Mais le contrôle qualité du 02/08 donne **58 % de confiance** (moyenne 6,2/10 sur 12 fiches) : textes tronqués en pleine phrase (george-sairas, roger-ruvie, kurou-otoharada, mello), fiche noriko qui confond deux personnes, interprétations non sourcées. Axe camp rempli sur 35/74.
1. **Reprendre les fiches notées < 7/10** et toutes les troncatures — data, faible (volume minuscule).
2. **Compléter camp** (35/74) — data, faible.
3. **Re-passer un contrôle final** une fois `ops-controle-final` rebranché sur les sections (chantier back P2).

### Initial D — 44 fiches *(sondes 05/08)*
Univers vitrine, quasi parfait : descFr 95 %, dossiers 95 %, 2 fiches vides. Axe affiliation rempli sur 17 (Team Emperor 1, Impact Blue 2 → chips/pages minces), col sur 23.
1. **2 fiches vides** — data, trivial.
2. **Dé-curer les écuries < 3** ou compléter les rosters — front/data, faible.
3. Rien d'autre.

## 4. Backlog unifié

Toutes couches confondues, dédupliqué (même fichier + même problème = une entrée, priorité la plus haute). Les entrées 1-3 sont des **casses actives ou imminentes**, à faire avant toute relance de l'usine.

1. **Worker → poserSections** — l'auto-application ⚡ écrit encore les sections dans le JSONB purgé : perte silencieuse dès la prochaine tâche (`scripts/agent-worker.mjs` + import `lib/akasha/sections.ts`).
2. **Débrancher `patch.relations`** (route state l.355 + worker l.1726) — la contrainte SQL casse « Appliquer » à 100 % côté console, échec silencieux côté worker.
3. **Neutraliser `ops-reposer-sections`** — relancé, il repolluerait le JSONB avec ~19 000 sections ; sa raison d'être a disparu avec la table.
4. **Purger les 215 arêtes inter-univers + garde-fou dans le poseur** — techniques Naruto visibles sur les fiches OP/DB/HxH/Bleach (DELETE joint + refus inter-univers dans `lib/akasha/relations.ts`).
5. **Afficher le dossier des 791 fiches muettes** — composant sections partagé monté dans le gabarit générique, OrganizationZone et EraZone.
6. **Surfacer l'axe organization Naruto** — Akatsuki (12) invisible, page 404, appartenance absente des fiches (`universe-taxonomy.ts` + `BELONG_ATTRS` + backfill depuis les arêtes appartient).
7. **Remplir les ~484 fiches entièrement vides** (Naruto 255, OP 175, DB 33, Bleach 16, JoJo 3, ID 2) — usine Fandom existante, liste recalculable en une requête.
8. **Assainir le top Dragon Ball** — fusionner freeza→freezer et muten-roushi→kame-sennin (pipeline dedup), corriger les favorites d'anton-the-great et scanner les aberrants.
9. **Rebrancher les 4 lecteurs éteints** sur `akasha_sections` (toilettage FR, titres FR, contrôle final, purge sections étrangères) + brancher `retirerSections` dans l'annulation d'audit.
10. **Normaliser l'axe crew OP** (87 → ~30 : apostrophes, coquille Hearth, lieux hors crew) + compléter `OP_NON_CREW` en attendant.
11. **Normaliser l'axe clan Naruto** (50 valeurs → canon, promouvoir les 6 groupes ≥ 5) — miroir dans `akasha-axes.mjs`.
12. **Micro-fixes front Naruto** (une PR) : pilier `clan-uchiha`→`uchiha`, onglet Métiers (94 fiches orphelines), chips Oto/Ame sous la carte.
13. **Dossiers des pouvoirs** — Naruto : top jutsu par degré entrant (11,8 % → 20 %) ; OP : les 211 Fruits puis les 98 Attaques (26 % → 50 %). Usine sections existante.
14. **Relier les 98 attaques OP à leurs porteurs** (arêtes maitrise depuis les infobox « Users » — la grappe Techniques est absente de 90 % des fiches OP).
15. **Reprendre les fiches Death Note < 7/10** (troncatures, confusion noriko) — volume minuscule, gain de confiance 58 % → 90 %+.
16. **Pages d'axe minces des petits univers** — dé-curer sous 5 ou étoffer : DB Majin/Angel, Bleach 13 divisions, JoJo P7-8, ID écuries.
17. **`queries.ts` perf** — `cache()`, fusion des doublons de fonctions, `listStars` en 1 requête (12-16 scans par rendu de hub aujourd'hui).
18. **Omni-search sur les sections** — indexer les 19 545 sections que le placeholder promet déjà.
19. **Forms/nindō/stats des têtes d'affiche** — Naruto 30 stars (databooks Fandom), OP ~15 (Mugiwara/Yonko + rang de prime en geste de repli), DB étendre DB_FORMS — lourd, par lots de 5.
20. **Compléter les sabres Meito OP** (14/83 classés) + reclasser S-rank/Head Ninja/Sannin côté Naruto — curation fine.
21. **Rail « Voyages dans le temps » OP** — seuil ≥ 3 court terme, curer eras de ~6 lieux majeurs ensuite.
22. **Archiver les scripts soldés** (`ops-migrer-sections`, `ops-verser-relations-jsonb`, `ops-liberer-bloquees-ancrage`, grappe dédup).

## 5. Ce qu'on décide de NE PAS faire

- **Classements taille/poids (`height_cm`)** — donnée structurellement absente (0/7 691) ; `/tops` a déjà été rebranché sur l'âge. On ne lance PAS de mining de tailles : coût/valeur défavorable.
- **« Migrer » `ops-migrer-sections`** — c'est l'outil de migration lui-même, il lit le JSONB par construction et son travail est terminé (0 fiche) : on l'archive tel quel, on ne le réécrit pas.
- **Restaurer le cluster CharacterView/PlaceView/Character3D** — supprimé le 05/08 (aucun import externe). Sa suppression acte l'abandon de l'onglet 3D (mesh Meshy à artefacts, surface déjà gatée) ; git garde l'historique si le pipeline 3D reprend.
- **Colonne `rarity_rank` (DDL) pour le tri de `listEntries`** — gain réel mais c'est du DDL sur la base du site : reporté après la reprise Supabase, hors du périmètre « fixes sûrs ».
- **Généraliser le radar databook hors Naruto** — les stats chiffrées canon n'existent que dans les databooks Naruto ; pour OP/DB on donne un geste de repli (rang de prime, frise de formes), pas de fausses stats.
- **Doter les 1 337 ninjas de forms/nindō** — on se limite aux ~30 stars par favorites ; au-delà, coût de curation sans lectorat.
- **Gonfler Sannin (3), Takigakure (1), Kara (3)** — valeurs canon-complètes ou chips à faible count assumées : le rail ne montre que count > 0, c'est le comportement voulu.
- **Campagne d'images des pouvoirs/artefacts** (~2 700 manquantes : DB 504, OP 786, Naruto 1 400+) — dépend du solde Higgsfield (1,72 cr, top-up requis) ; c'est le Chantier B images, découplé de ce plan data/code.
- **L'angle mort de `ops-fill-sections-local`** (« ne sait pas qui a un dossier » quand la base site est injoignable) — assumé : revers du plan C egress, doublons bénins par contrainte (entry_id, idx).
- **Le « 8 univers » en dur du hero** — dérive impossible tant qu'un 9ᵉ univers n'existe pas ; à dynamiser seulement si on retouche le fichier pour autre chose.
