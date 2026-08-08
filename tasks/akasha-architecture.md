# AKASHA — L'architecture, front et back

> Document de synthèse. Il tranche entre quatre architectures proposées et une trentaine d'avis
> de juges. Il ne les additionne pas : chaque arbitrage est écrit avec son « j'ai retenu X contre Y
> parce que ». Il remplace, pour tout ce qui concerne la STRUCTURE, les sections « Cycle 3 » de
> `tasks/refonte-akasha-zones.md` (qui reste la source des décisions historiques de Dan) et les
> constats front de `tasks/akasha-organisation.md`.
>
> **Contraintes non négociables rappelées, et respectées dans tout ce qui suit** : DA en pause
> (structure d'abord, prototype en vrai code, aucune maquette) · gamification supprimée (14/07) ·
> formes sans image = tuiles stylisées, zéro stat estimée, Luffy/Zoro gardent leur « estimé »,
> stats post-databook omises, radar réservé aux databooks canon Naruto · Bleach = carte des
> 4 mondes avec drill-down · français, variables CSS, jamais de `gridTemplateColumns` inline.

---

## 0. Ce que j'ai mesuré, et ce que ça corrige

Tout ce qui suit est mesuré ce jour par scans paginés directs (`clientSite`, `.range()` par lots
de 1000) sur les 3 tables, et par lecture du code réel — pas recopié d'un rapport.

> **Vérification finale — 08/08/2026, 17h34 CEST, recompte indépendant post-vague.**
> Corpus RE-mesuré : **7 637 fiches · 16 383 arêtes · 19 108 sections · 828 sans image ·
> 454 sans `descFr`**. Écarts vs les 7 674/16 387/19 188 mesurés en tête de ce document,
> expliqués pièce par pièce :
> - **Fiches −37** = −42 (fusion des 25 doublets de conteneurs, chantier `doublets-conteneurs`,
>   exécuté 16:29-16:42) + 5 (5 fiches-parent insérées par `parents-manquants` : Gouvernement
>   Mondial, Civil, Clan Sarutobi, Clan Kagetsu, Clan Izuno). Confirmé de façon croisée et
>   indépendante par les compteurs PAR UNIVERS affichés en direct sur `/learn/akasha`
>   (Naruto 3 305→**3 308** = +3 exactement les 3 insertions Naruto ; Bleach 386→**385** = −1
>   exactement la fusion Gotei 13 ; One Piece 2 270→**2 231** = +2 insertions −41 doublets OP,
>   soit 41 des 42 fiches perdantes hors Bleach ; Dragon Ball, JoJo, HxH, Death Note, Initial D
>   **inchangés au chiffre près**, aucun chantier ne les a touchés).
> - **Arêtes −4** = exactement les « 4 doublons d'arêtes supprimés » documentés par l'exécution
>   du chantier doublets. Aucun écart résiduel.
> - **Sections −80**, attendu −79 (79 sections de fiches perdantes supprimées par cascade,
>   61 migrées vers le survivant à effet net nul) : écart de 1, dans le bruit de l'usine qui
>   tourne en continu.
> - **Sans image −12** (840→828) : −16 (fiches perdantes qui n'avaient pas d'image, mesuré en
>   relisant `before.losers[].entry.image_url` sur les 42 fiches de la trace du chantier
>   doublets) + 5 (les 5 fiches insérées n'ont aucune, vérifié directement en base) = −11 attendu,
>   écart de 1, bruit d'usine.
> - **Sans descFr −14** (468→454) : −4 (fiches perdantes sans descFr, même méthode) + 0 (les
>   5 fiches insérées ont TOUTES un `descFr` dès la création, vérifié en base — pas d'ajout au
>   passif) = −4 attendu, **écart résiduel de 10 non expliqué par les 3 chantiers de cette vague**.
>   Hypothèse retenue, non prouvée à la minute près : l'usine (`agent-worker.mjs`) a continué
>   à écrire des `descFr` sur des fiches préexistantes pendant l'heure écoulée entre les traces
>   (16:30) et cette vérification (17:34) — cohérent avec le fait que `descFr` est le SEUL des
>   trois chantiers de cette vague dont la valeur peut être écrite en continu par un pipeline tiers
>   qui n'est jamais interrogé ni arrêté ici.
> Build (`next build`) : **309/309 pages, exit 0** — recompté indépendamment, identique au
> chiffre rapporté. `npx tsc --noEmit` : 0 erreur. `scripts/ops-sonde-schema.mjs` : conforme,
> les deux bases.

| Fait | Chiffre mesuré (au lancement du plan) | Ce que ça corrige |
|---|---|---|
| Corpus | 7 674 fiches · 16 387 arêtes · 19 188 sections · 8 univers | conforme au brief |
| Composants `components/akasha/**.tsx` | **44** (27 racine + 13 `hub/` + 4 `zone/`) | le brief dit 29 : il ne comptait pas les sous-dossiers |
| Fiches au **gabarit générique ancien** | **2 600** (33,9 %) — power 1 699, artifact 398, place 326, profession 98, skill 79 | le plan C3-3 dit « ~3 200 » : surestimé de 23 % |
| Fiches servies par `EraZone` | **14** | la recon annonçait 37 ; le moteur temporel couvre 0,2 % du corpus, pas 1 % |
| Fiches isolées (0 arête) | **970** (12,6 %) | `refonte-akasha-zones.md` dit 35,5 % : périmé depuis la vague `maitrise` du 06-07/08 — **à corriger dans ce fichier** |
| Fiches sans aucune section | 2 870 · avec 1 seule : 861 · avec ≥ 2 : 3 943 | — |
| Fiches **à la fois** isolées ET sans section | **437** (5,7 %) | c'est le seul vrai « vide », pas 970 ni 2 870 |
| Appels restants à `AkashaMosaic` (boîte-carte : `borderRadius:12`, pastilles type/rareté en absolu) | **5**, sur **3 routes** : `c/[slug]` ×2, **`u/[slug]` ×2 (piliers + évolutives)**, `[slug]` ×1 (« voir aussi ») | la recon disait les hubs « déjà au niveau visé » : **faux**, les hubs portent encore des cartes |

**Le chiffre qui décide de tout le plan.** Sur les 2 600 fiches au gabarit ancien :
**90 % ont au moins une relation** (2 347), **85 % ont une vraie biographie** (`descFr` > 120 car.,
2 198), **78 % ont une image** (2 018), 29 % ont un dossier sectionné (748).
**57 fiches seulement (2 %) n'ont ni relation, ni section, ni bio.**

Conclusion : le risque « belle vitrine sur du vide » que la mission demande d'éviter n'existe
quasiment pas sur ce lot. Ces 2 600 fiches ne sont pas pauvres — elles sont **mal rendues**.
C'est une dette de présentation, pas une dette de données.

---

## 1. La thèse, en une phrase — et ce à quoi elle renonce

> **AKASHA est UNE coquille d'univers et UNE fiche : le chrome du monde (accent, kanji, fond) ne
> quitte jamais le lecteur, et la fiche se compose des CAPACITÉS que l'entrée possède réellement
> — relations, sections, formes/ères, axes, stats databook — jamais de son type SQL ; les huit
> visages bespoke restent concentrés à un seul étage, le hub, où la duplication est un atout
> assumé et non une dette.**

### Ce à quoi elle renonce, explicitement

1. **Renonce à un gabarit par type d'entité.** Pas de `PowerZone` + `ArtifactZone` + `PlaceZone` +
   `ProfessionZone`. Une seule zone composée de modules. Un 9ᵉ univers qui introduirait une forme
   d'entité inédite ne doit coûter **aucun nouveau composant de fiche** — c'est le test de validité.
2. **Renonce à fusionner ce qui marche.** `CharacterZone`, `OrganizationZone`, `EraZone` — que Dan
   a jugées « provisoirement acceptable » puis « spectaculaire » sur la fiche Naruto — ne sont
   **jamais réécrites**. Elles seront ré-exprimées comme des compositions de modules par
   **extraction incrémentale**, en dernier, ou pas du tout.
3. **Renonce à la nouveauté de surface comme argument.** Ce plan n'ajoute aucun « nouveau moment
   waouh ». Son geste est de faire cesser un site à deux vitesses. Je l'assume et je le dis à Dan
   plutôt que de le maquiller (voir §8, question 2).
4. **Renonce à combler les vides.** 437 fiches hero-only, 840 sans image, 2 870 sans section :
   ce sont des **plafonds documentés**. Aucune relation inventée, aucune image générée en repli,
   aucune stat estimée, aucun « contenu à venir ». Un bloc sans matière **disparaît**.
5. **Renonce au graphe comme spectacle.** Pas de visualisation nœuds-liens, pas d'outil de chemin
   BFS (voir §1.1, arbitrage D). La traversée du graphe se fait **un saut à la fois**, par le canal
   re-scopable — qui est déjà l'outil de graphe le plus utilisable du site.
6. **Renonce à toute réintroduction de gamification**, même déguisée : pas d'album, pas de compteur
   de complétion, pas de série à compléter. Une collection est une **page d'axe**, pas un carnet.

### 1.1 Les arbitrages, dits

Les trois juges se sont contredits : faisabilité classe **Atlas à Trois Temps** 1ᵉʳ (9),
délice-lecteur classe **Blason** 1ᵉʳ (8,5), coût-de-duplication classe **Coquille** 1ᵉʳ (9).
Somme : Atlas 23,5 · Coquille 23,5 · Blason 21,5 · Orbites 18,5. **Égalité en tête.**

**A. J'ai retenu le CONTRAT INTERNE de la Coquille (composition par capacités) contre le dispatch
par type de l'Atlas — mais j'ai retenu le CHEMIN DE MIGRATION de l'Atlas contre celui de la
Coquille.**
Pourquoi : ce sont la même idée à deux granularités. L'Atlas gagne sur la mise en production
(un composant net-nouveau, greffé à 3 endroits vérifiés, zéro régression sur l'acquis) ; la
Coquille gagne sur le coût du 9ᵉ univers (le dispatch par `type === 'character'` oblige à
énumérer à l'avance les types qu'un nouvel univers introduira). Prendre l'un contre l'autre
aurait sacrifié soit la livraison soit la durée de vie. **Je livre l'Atlas et j'écris la Coquille
dedans** : le composant s'appelle `EntityZone`, il est branché exactement là où l'Atlas branchait
`GenericZone`, et sa sélection de modules passe par une fonction pure `deriveShape(entry)` — pas
par une cascade de `if (type === …)`.

**B. J'ai retenu `UniverseShell` du Blason, contre son `PortraitZone`.**
`UniverseShell` (extraction du bloc hero déjà écrit dans `u/[slug]/page.tsx` — accent, kanji,
dégradé, grain — en composant partagé, réutilisé sur la fiche et la collection) est la seule
idée des quatre propositions que **les trois juges** ont voulu greffer : pur déplacement de JSX,
zéro nouvelle donnée, et c'est ce qui donne l'immersion continue que la cible « menu de jeu AAA »
réclame. À l'inverse, la fusion `CharacterZone + OrganizationZone + EraZone → PortraitZone` est
rejetée : la proposition elle-même la décrit comme risquant de devenir « un second
agent-worker.mjs, un fichier unique de 2000+ lignes concentrant toute la criticité visuelle du
site ». Remplacer trois composants distribués et **validés par Dan** par un monolithe à conditions
internes est un mauvais calcul de maintenance, sans aucun gain de couverture de données.

**C. J'ai retenu la règle d'état vide de l'Atlas contre toutes les autres formulations.**
« Chaque bloc disparaît individuellement s'il n'a rien à montrer, plutôt que d'afficher un état
vide déguisé. » C'est la formulation la plus actionnable, et elle s'applique aux 437 fiches
hero-only sans jamais mentir sur ce qui manque.

**D. J'ai rejeté l'outil « Chemin » (BFS entre deux fiches) d'Orbites — contre l'avis du juge
Délice, qui en faisait le seul vrai levier de curiosité.**
Trois raisons, dans l'ordre : (1) aucun code existant à réutiliser — ni liste d'adjacence, ni
traversée, ni route, ni état « aucun chemin trouvé » — c'est une construction entièrement neuve,
que son propre auteur relègue en phase 4 ; (2) sur Hunter x Hunter (215 fiches, mesurées
aujourd'hui : **0 pouvoir**, 4 lieux, un axe `nen` à 24 %) il renverrait des chaînes longues et
anecdotiques, l'auteur le reconnaît ; (3) le canal re-scopable **est déjà** une traversée de
graphe, un saut à la fois, avec un taux de réussite de 100 % — ajouter une seconde façon de faire
la même chose en moins fiable n'est pas un gain de délice, c'est un doublon. **Je garde en revanche
la moitié bon marché d'Orbites** : le bloc « Profil relationnel du sous-ensemble » sur les pages
d'axe (agrégat des types de relation dominants d'un groupe — un chiffre qu'aucun wiki source ne
calcule), qui ne dépend d'aucun graphe préconstruit.

**E. J'ai rejeté le seuil de dispatch d'Orbites (`sections ≥ 2 OU relations ≥ 3`).**
Le corpus bouge en continu (sections +16 pendant la reconnaissance elle-même). Avec un seuil,
une fiche **change de gabarit entier** d'un jour à l'autre, sans déploiement. Avec la composition
par capacités, la même donnée qui arrive **ajoute un bloc** à une page dont la structure ne bouge
pas. C'est la différence décisive, et c'est pour ça que la composition l'emporte sur le seuil.

**F. J'ai rejeté le « budget d'ambition » étroit de la Coquille** (tout l'éclat réservé au hub +
quelques vitrines). Le juge Délice a raison : une récompense décroissante avec la curiosité est
exactement l'inverse de ce qu'on veut. `UniverseShell` est ma réponse — l'éclat descend avec le
lecteur au lieu de s'arrêter à la porte.

**G. J'ai rejeté l'ajout d'une 4ᵉ zone typée purement additive** (`PowerZone` d'Orbites à côté des
trois existantes). Le nombre de composants ne doit pas croître à chaque famille non couverte.

---

## 2. Le parcours du visiteur

**0 → 10 s — la promesse.** `/learn/akasha`. Portes des 8 univers (wordmark + compteur réel), barre
de filtres unique, `CategoryRail`, `DidYouKnow`, `⌘K` monté dans le layout donc disponible partout.
En dix secondes : « encyclopédie de 8 mondes, dense, avec un moteur qui marche ». Tout ce qui
s'affiche ici est un vrai compteur DB.

**10 s → 1 min — l'immersion.** Clic sur une porte → `/u/[slug]`. Le pic. Surface signature bespoke
plein cadre : carte des 5 nations (Naruto, drag/zoom), carte du monde à 144 îles (One Piece),
cosmos des 12 univers (Dragon Ball), **carte des 4 mondes avec drill-down Soul Society → Gotei 13**
(Bleach), roue du Nen (HxH), frise des 8 parties (JoJo), duel Kira/L (Death Note), tracé des cols
(Initial D). Sous la carte : rail d'axes, piliers, `HubInsights`.
*Aujourd'hui `HubInsights` affiche 0 sur les 7 catégories, à 20 px d'un rail qui affiche les bons
chiffres. C'est la première rupture de confiance du parcours ; c'est le tout premier ticket du
lot 1 (diagnostic et correctif exacts en §7).*

**1 → 3 min — le vocabulaire du monde.** Clic sur un point chaud ou une chip d'axe →
`/u/[slug]/[axis]/[value]` (village Konoha, division Gotei 6, partie Stardust Crusaders…).
Rangées hairline + panneau d'aperçu sticky. Nouveau : le **profil relationnel du sous-ensemble**
(« ces 440 habitants de Konoha portent 1 210 maîtrises et 88 liens de mentorat »).

**3 → 6 min — la fiche pilier.** `CharacterZone` : portrait plein cadre, typographie géante,
10 formes évolutives, 107 techniques, 24 liens typés, canal re-scopable. Le sommet — on n'y touche
pas. Le chrome de l'univers (accent, kanji en filigrane) est désormais **le même que sur le hub**.

**6 → 10 min — le rebond latéral.** Le lecteur suit une relation. Personnage → `CharacterZone`.
Organisation → `OrganizationZone`. Le canal **est** la navigation principale : pas le fil
d'Ariane, pas le retour arrière.

**10 → 15 min — LE point de rupture actuel, et le cœur de ce plan.** Le lecteur atteint, par une
relation `maitrise` ou `possede`, une fiche mineure : un jutsu non signature, un kunai, un village
secondaire. **C'est là que vivent 2 600 fiches (1 775 rien que sur Naruto)** et c'est là que le
site change de langage sans prévenir : mini-icône dans un carré, tableau « ATTRIBUTS » en boîte,
« voir aussi » en cartes à coins arrondis. `EntityZone` remplace cette bascule : même chrome
d'univers, même bandeau (nom géant, type, rareté), même canal nourri par la relation pertinente
au type (`maitrisée par` pour un pouvoir, `possédé par` pour un artefact, `exercé par` pour un
métier, `habité par` pour un lieu), même dossier en profondeur. **90 % de ces fiches ont de quoi
remplir ce canal ; 85 % ont une vraie bio.** Pour les 57 qui n'ont rien, la page s'arrête au
bandeau et à ses deux attributs peuplés — courte et honnête, jamais un squelette.

**15 → 20 min — la sortie thématique.** `/c/[slug]` (Fruits du Démon groupés par famille),
`/tops` (Les Records), `/wanted` (affiches WANTED façon parchemin, préservées telles quelles).

**20 min+ — la boucle.** « Surprends-moi » → `/random`, redirection serveur vers une fiche au
hasard. On ne repasse jamais par un menu.

---

## 3. Les surfaces

| Route | Rôle | Ce qu'elle rend | Ce qui l'alimente |
|---|---|---|---|
| `/learn/akasha` | Portail + registre filtrable + recherche | Portes des 8 univers, barre de filtres unique, `CategoryRail`, `AkashaList` (rangées + aperçu), `DidYouKnow` | `listUniverseCounts`, `listCategoryCounts`, `listEntries`, `getDidYouKnow` — ISR 3600 |
| `/learn/akasha/u/[slug]` | **Hub — le seul étage où 8 composants distincts sont un choix assumé** | `UniverseShell` (hero) + `HubSignature` → 8 surfaces bespoke + rail d'axes + piliers + `HubInsights` (à réparer) + évolutives (**en rangées, plus en cartes**) | `universeInsights`, `listAxisCounts`, `listStars`, `listEvolutive`, `countUniverse`, `HUB_VISUAL` — ISR 3600 + `generateStaticParams` |
| `/learn/akasha/u/[slug]/[axis]/[value]` | Sous-collection dans le vocabulaire canon du monde | `UniverseShell` + `AkashaList` + **profil relationnel du sous-ensemble** (nouveau) | `listAxisCounts`, `listEntries`, `UNIVERSE_TAXONOMY` — `generateStaticParams` **restreint aux axes curés** |
| `/learn/akasha/[slug]` | **La fiche — route unique pour les 7 674 entrées** | `UniverseShell` + zone choisie par `deriveShape(entry)` : `CharacterZone` (4 034) · `OrganizationZone` (367) · gabarit Attaque (659) · `EraZone` (14) · **`EntityZone` (2 600, nouveau)** | `getEntryBySlug` (relations déjà jointes, `cache()`), `akasha_sections`, `listSimilar`, `popularityRank` — ISR 3600 |
| `/learn/akasha/c/[slug]` | Vitrine thématique, groupée par sous-type canon | Hero + sections groupées en **`AkashaList`** (aujourd'hui `AkashaMosaic` = la carte bannie) | `COLLECTION_SHOWCASES` (config, 2 vitrines), `listCollectionEntries` |
| `/learn/akasha/tops` | Classements transverses | `Leaderboard` — déjà conforme au langage v2 | `listTopByAttr`, `listBounties`, `listAges` |
| `/learn/akasha/wanted` | Vitrine bespoke One Piece | Affiches parchemin — **préservée telle quelle**, modèle des futurs extras mono-univers | `listBounties`, `taxo.extras` |
| `/learn/akasha/random` | Sérendipité | `route.ts`, redirection 307 | scan aléatoire |
| `/learn/akasha/api/search` | Back de `⌘K` | JSON | `omniSearch` |
| `/learn/akasha/[slug]/opengraph-image`, `/u/[slug]/opengraph-image` | Surface silencieuse : ce que voit un tiers quand une fiche est partagée | `ImageResponse` Next, cache CDN | build / ISR |

**Aucune nouvelle route.** Le plan ne crée pas une surface de plus ; il fait tenir les dix
existantes dans un seul langage.

---

## 4. Le back : ce que produit l'usine, ce qui se calcule, ce qui se fige

### Ce que produit l'usine (`scripts/agent-worker.mjs`, files pgmq, double verdict)
`attributes.descFr` (biographie longue, via `poserSections`) · `akasha_sections` (19 188 lignes,
table dédiée — plus jamais de lire-modifier-écrire JSONB) · `attributes.*` typés par type ·
`akasha_relations` (16 387 arêtes, 15 types).

**Ce plan ne commande rien de nouveau à l'usine.** `EntityZone` consomme exactement ce qui est déjà
produit. C'est délibéré : le front ne doit pas dépendre d'un pipeline dont le double verdict est
encore dégradé (4 275 productions « done » sans premier verdict, ~45 % de rejet historique sur
63 818 productions). **Cette dette back est réelle mais orthogonale — je ne prétends pas la
résoudre ici, et je signale qu'une refonte front réussie peut donner l'illusion que le produit
avance pendant que l'usine reste fragile.**

### Ce qui se calcule au rendu (Server Components, `lib/akasha/queries.ts`, point de passage unique)
`countUniverse`, `listAxisCounts`, `listCategoryCounts`, `universeInsights`, `listStars`,
`listEvolutive`, `listSimilar`, `popularityRank`, `listCollectionEntries`, `getDidYouKnow`,
`omniSearch`. Toutes existent déjà. **`EntityZone` n'ajoute aucune requête** : `getEntryBySlug`
joint déjà les relations entrantes et sortantes, `cache()` est déjà posé.
Deux ajouts seulement, tous deux calculés et jamais stockés :
- `deriveShape(entry)` — nouveau `lib/akasha/shape.ts`, **fonction pure, testée, sans I/O** ;
- l'agrégat du profil relationnel d'une page d'axe — extension de `listAxisCounts`.

Contrainte dure héritée de l'incident d'egress du 02/08 : **timeout ferme de 20 s** sur le client
site. Si un agrégat de hub se révèle lent, le repli est `supabase/akasha_aggregates.sql` (déjà
écrit, marqué « optionnel côté runtime ») rafraîchi par cron — **pas** une requête plus grosse.

### Ce qui se fige au build
ISR `revalidate = 3600` sur les 4 gabarits · `generateStaticParams` sur les hubs et les pages d'axe
(**à restreindre explicitement aux axes curés** — ne jamais pré-générer une page pour un axe sale) ·
og:images · médaillons et wordmarks (assets versionnés) · `lib/akasha/universe-taxonomy.ts` et
`lib/akasha/collections.ts`, **config TypeScript curée à la main, jamais générée, jamais éditable
depuis /ops**.

> **Règle de non-régression architecturale** : la grammaire d'univers reste 100 % en code. Il existe
> déjà deux sources de vérité pour les axes (`lib/akasha/universe-taxonomy.ts` côté front,
> `scripts/lib/akasha-axes.mjs` côté back) qui divergent sans alerte. Ajouter une table
> `universe_grammar` en base créerait une troisième ligne de synchronisation. Non.

---

## 5. La donnée

### Ce qui suffit tel quel — ne rien toucher
- Le schéma à 3 tables, avec de vraies contraintes (CHECK `type`/`rarity`, FK CASCADE,
  UNIQUE `(entry_id, idx)` et `(from, to, relation)`, anti-boucle).
- **0 valeur `universe` parasite, 0 arête inter-univers** sur 16 387 lignes : le routage par
  univers n'a besoin d'aucun garde-fou défensif.
- Les 6 types d'arêtes exploitables en volume : `maitrise` 5 110, `appartient` 4 035, `allie`
  1 483, `ennemi` 1 432, `habite` 1 303, `famille` 1 179.
- Les attributs réellement peuplés, directement montables en facette : `status.scope` 100 %,
  `skill.discipline` 100 %, `profession.sector` 100 %, `artifact.material` 96 %,
  `place.region` 92,5 %, `power.element` 72 %, `character.role` 66,5 %.
- Les axes déjà propres à 100 % (0 valeur hors curation) : division Gotei, nen, saga DB,
  faction / fruit_type / meito_grade OP, partie JoJo, generation Naruto, camp DN, affiliation/col
  Initial D.
- 89,1 % de couverture image, 0 placeholder en base.

### Ce qu'il faut restructurer
1. **Documenter le piège `description`.** La colonne SQL `akasha_entries.description` est identique
   à `summary` sur **6 987 fiches (91 %)** — c'est un doublon inerte, malgré le commentaire de la
   migration qui la présente comme « le contenu long markdown ». **Le seul champ de biographie
   longue est `attributes->>descFr`.** Action à coût nul et immédiate : une ligne de commentaire
   correctif dans `supabase/migrations/akasha.sql`. Une vraie migration de colonne
   (`descFr → bio_long`) exigerait de toucher `agent-worker.mjs` : hors périmètre.
2. **Curer les 3 axes sales** — `clan` Naruto (39 valeurs hors curation sur 48, 114 fiches),
   `organization` Naruto (117/125, 348 fiches), `crew` One Piece (39/46, 161 fiches). L'outil
   existe (curateur d'alias, `lib/ops/agents.ts`). **Ce chantier n'est PAS bloquant pour le
   front** : je retiens le masquage silencieux du Blason contre le blocage de route d'Orbites,
   parce qu'une page absente se lit comme un recul face au wiki source, alors qu'un axe non
   proposé ne promet rien.
3. **Étendre `collections.ts`** de 2 à 4-6 vitrines sur les catégories volumineuses et propres —
   **en même temps** que le passage `AkashaMosaic → AkashaList` sur cette route, jamais après
   (sinon on refait exactement l'erreur : 2 vitrines déjà nées en carte bannie).

### Ce qu'il faut renoncer à avoir
- **Les champs Zod déclarés mais vides** : `character.alignment` 0 %, `power.range`/`cost` 1/2 359,
  `skill.level` 0 %, `profession.skills` 0 %, `place.climate`/`coordinates` 0,3 %,
  `status.rank` 0,3 %. La validation existe, la donnée ne la remplit pas. **Ne jamais construire
  d'UI dessus** ; `EntityZone` masque un attribut absent, il n'affiche pas un tiret.
- **Les 437 fiches hero-only** (isolées ET sans section) et les 840 sans image : plafonds
  documentés. Tuile stylisée = **état permanent et fréquent (1 fiche sur 9)**, pas une exception.
- **Les stats chiffrées** : 37 fiches sur 7 674 (0,48 %) portent des stats structurées, et seules
  celles de Naruto sont canon-databook. Le radar ne bouge pas.
- **Le moteur temporel généralisé** : 14 fiches ont des `eras`, 78 ont des `forms`. Il se tait
  ailleurs, proprement.
- **La couverture uniforme entre univers** : Naruto expose 5 axes exploitables, Death Note un seul.
  C'est un fait de l'œuvre, pas un retard — inventer un axe pour équilibrer serait mentir.

---

## 6. Les huit univers

Pour chacun : sa colonne vertébrale (l'axe qui organise vraiment), sa surface propre (ce qu'aucun
autre univers ne peut revendiquer), ce qu'on ne fait PAS, et la mention explicite du manque de
données quand il existe.

### 6.1 Naruto — 3 305 fiches · 1 775 au gabarit ancien (68 % du chantier `EntityZone`)
- **Colonne vertébrale : le VILLAGE.** 56,5 % du cast brut, mais **93 % du cast documenté**
  (466/501 personnages ayant ≥ 3 attributs structurés). Les 7 % restants sont des civils et des
  bijū pour qui l'absence de village est **canon**. La relation `habite` (754 arêtes) recouvre
  exactement le même ensemble : la donnée est stable, il n'y a pas de gisement caché.
- **Surface propre : la carte du continent shinobi** (`NarutoWorldMap` + `lib/akasha/naruto-world.ts`),
  pan/zoom, hotspots pays et villages, drill-down vers les pages d'axe. C'est la **référence
  positive** citée en tête du plan de refonte : toute la direction « zones » en est née. On n'y
  touche pas, sauf deux corrections data gratuites : ajouter **Takigakure** (8ᵉ village présent en
  base, absent des chips) et corriger la fiche taguée **« Konohagure »**.
- **Seconde surface, la moins chère du site : l'ÉCHELLE DES RANGS.** 7 paliers canon (Académie →
  Kage), **473 personnages classables (74,3 % du cast documenté)**, et les **7 badges sont déjà
  détourés sur disque** (`public/images/akasha/ranks/*.webp`, composant `RankBadge` existant).
  Zéro budget image. C'est le même geste que la carte — spatialiser un axe canon — en vertical.
- **On ne fait PAS** : de carte des clans ni des organisations (ni l'un ni l'autre n'a de
  territoire dans le canon — un Uchiha habite Konoha ; plaquer une géométrie que l'œuvre ne
  fournit pas est exactement le travers des 4 DA rejetées) · de filtre `generation` (9,8 % du cast
  documenté, valeurs floues) · d'extension du radar databook au-delà des 27 personnages canon ·
  de moteur « jutsu » parallèle à `EntityZone` (Naruto est le meilleur **pourvoyeur** du chantier
  générique : 100 % des powers ont un `element`, 3 186 arêtes `maitrise`).
- **Données** : rien ne manque pour ce qui précède. `organization` a > 100 valeurs réelles contre
  9 curées — **ce n'est pas un manque à combler** mais une limite à respecter : chaque petite
  équipe a déjà sa fiche-organisation.

### 6.2 One Piece — 2 270 fiches · 569 au gabarit ancien · 559 des 970 isolées du site (57 %)
- **Colonne vertébrale : la GÉOGRAPHIE DU VOYAGE**, pas l'équipage. Trois mesures convergent :
  `place.region` est à **99 %** (191/193, le mieux peuplé de l'univers) ; les 7 sagas sont nommées
  par lieu et non par équipage ; la seule surface signature déjà livrée est la carte du monde.
  L'équipage n'est qu'à 24,7 % en attribut plat et 51,8 % via le graphe : les équipages **habitent**
  la géographie, ils ne l'organisent pas.
- **Surface propre : la carte du monde** (144 îles à formes réelles, 37 POI tous liés, 13 routes de
  membres rejouables, 7 territoires Yonko). Aucun autre univers ne partage cette géométrie
  d'archipel à parcourir. Rien à reconcevoir.
- **On ne fait PAS** : de filtre sur `role` (98,6 % valent « Personnage secondaire ») · de second
  filtre `element` à côté de `fruit_type` (c'est le même texte reformulé) · de rail sabres/Meito
  (plafond tranché le 07/08 : 62 des 83 lames canon n'ont jamais eu de page wiki) · de frise
  `eras` (2 fiches) · **de classement de primes cumulées d'équipage tel quel** : sur 84 valeurs
  `total_prime`, **33 sont littéralement « inconnu Berrys » ou « aucune Berrys »** — les filtrer,
  jamais les convertir en 0 · d'index de Fruits présenté comme une collection à compléter
  (gamification supprimée) : c'est une page d'axe.
- **Données insuffisantes, et où c'est atteignable** : images **hors personnage à 48,2 %**
  (personnages : 100 %, gisement clos). Navire 62,6 %, Pouvoir 30,7 %, Lieu 65,3 %. Le canal gratuit
  `pageimages` du wiki, vérifié fonctionnel ailleurs, **n'a jamais été lancé sur les types
  non-personnage d'OP** — à épuiser avant tout crédit Higgsfield (§8, question 5).

### 6.3 Dragon Ball — 1 137 fiches · 160 au gabarit ancien
- **Colonne vertébrale : la MONTÉE EN PUISSANCE**, pas une taxonomie de camps ni une chronologie.
  44 % du corpus sont des attaques ; **57 % des 2 569 arêtes sont des `maitrise`** (1 472, contre
  1 093 pour tous les autres types réunis) ; la fiche la plus travaillée du site (Son Goku) expose
  8 formes cotées. Le hub le reconnaît déjà (`signature: 'powerscale'`).
- **Surface propre : le COSMOS DU MULTIVERS** (`db-cosmos.ts` + `DragonBallCosmos`, 12 univers
  curés, 61 planètes, hiérarchie divine à 6 paliers). Aucun autre univers n'a d'univers parallèles.
  Une carte-territoire 2D n'aurait pas de sens ici : Dragon Ball ne se raconte pas dans un espace
  continu.
- **On ne fait PAS** : d'axe `race` (19,5 %) ou `saga` (20,9 % du cast) en structure organisatrice —
  80 % des personnages resteraient invisibles du filtre · de filtre `discipline` (99 % rempli mais
  **une seule valeur constante**, « Technique ») · d'extension des frises au-delà des 19 têtes
  d'affiche (plafond canon, 11 replis motivés) · **de relance de campagne d'images** : la note
  d'audit du 07/08 (« 0/504 pouvoirs sans image ») est **périmée**, la mesure du jour donne
  **96,5 %** de couverture.
- **Donnée insuffisante mais peu coûteuse** : `race` et `saga` sont **déjà en clair dans le texte
  `descFr`** (« Race : Saïyen. Taille : 175,3 cm… ») sans jamais avoir été extraites vers
  `attributes`. Un parseur de préfixe sur ~636 fiches ferait monter la couverture sans aucun appel
  externe — sans garantie d'atteindre 60 %, car les figurants n'ont pas de texte source.
  **Point gelé** : les 60 valeurs `ki` sont des power levels non canon, 29 avec une échelle FR
  fautive — en attente d'arbitrage (§8, question 4).

### 6.4 Bleach — 386 fiches · 25 au gabarit ancien · le graphe le plus sain du site (12 % d'isolées)
- **Colonne vertébrale : la COSMOLOGIE — les 4 mondes.** Décision de Dan (14/07), déjà implémentée,
  et la mesure la confirme : la relation `habite` couvre 40 % des personnages avec **exactement 4
  cibles** (Karakura 45, Soul Society 42, Hueco Mundo 29, Las Noches 25) — un mapping plus net que
  l'attribut `race` (35 %) que le composant lit aujourd'hui.
- **Surface propre : `BleachWorldsMap` → `BleachSeireitiMap` en drill-down.** Le Gotei 13 est
  correctement **sous** Soul Society, pas en spine autonome — et c'est justifié par la donnée :
  35 des 36 Shinigami (97 %) ont une division, mais les Shinigami ne sont que 36 des 293
  personnages. Amélioration possible à coût nul : peupler les mondes depuis `habite` en complément
  de `race` (+5 points de couverture, zéro ambiguïté).
- **On ne fait PAS** : le seul cercle du Gotei (décision Dan) · **le Wandenreich en 4ᵉ pane égal** —
  il n'y a que **3 Quincy** en base (la famille Ishida), **0 Sternritter, 0 Yhwach** : le garder en
  bande imbriquée est le bon calibrage · de filtre « grade Espada » (renseigné sur 3 des 23
  Arrancar) · de filtre `role` (272/293 valent « Personnage secondaire ») · d'arbre généalogique
  (107 arêtes sur 49 personnages) · de frise `eras`/`forms` (**1 fiche sur 386**) · de recherche
  d'une carte-source pixel-exacte du Seireitei : le canon n'en fournit pas, le diagramme calculé
  est le bon niveau d'ambition.
- **Donnée insuffisante, non atteignable** : **l'arc de la Guerre de Mille Ans est absent de la
  base**. C'est un trou d'import, pas un trou d'UI — à ne pas masquer par du design.
  Irritants mineurs repérés : doublon « Gotei 13 » / « Gotei 13 (Treize Divisions de la Cour) »,
  variante « Nelliel Tu Odelschwanck » / « Oderschvank ».

### 6.5 JoJo's Bizarre Adventure — 233 fiches · 49 au gabarit ancien · descFr 100 %
- **Colonne vertébrale : la PARTIE.** **94,8 % de remplissage — le taux le plus élevé de tout le
  site**, et c'est l'organisation native de l'œuvre (chaque partie a son protagoniste-titre).
- **Surface propre, déjà livrée : la frise des 8 parties.** Ne pas y toucher.
- **Seconde surface, la seule que cet univers mérite en propre : l'ARBRE JOESTAR.** JoJo *est*
  structurellement une histoire de filiation sur un siècle. La donnée le permet réellement :
  **45 arêtes `famille`** relient Jonathan → Erina → Joseph → Holy → Jotaro → Jolyne/Josuke →
  Giorno sur six générations, plus 7 grappes secondaires attestées (Nijimura, Kawajiri,
  Higashikata, Zeppeli, Kira…). 6 fiches portent déjà un `attributes.family` curé **avec le type
  exact du lien** : les étiquettes existent, il reste à les mettre en scène. Une génération = un
  rang vertical calculé depuis le graphe — même logique « géométrie = taxonomie » que Bleach.
- **On ne fait PAS** : de filtre `role` (147/179 valent « Personnage secondaire ») ni `category`
  (44/44 des pouvoirs valent « Stand » — une tautologie, pas un filtre) · d'appariement
  Stand ↔ Porteur en surface dédiée (38/44 Stands ont un porteur : c'est une liste, pas une
  géométrie — elle vit très bien dans le canal d'`EntityZone`).
- **Donnée à corriger avant l'arbre** : 8 des 17 personnes citées dans les `family` curés n'ont pas
  de slug alors que **la fiche existe sous une autre romanisation** (« Holy Kujo » vs
  `holy-kuujou` ; « George Joestar I/II » vs `george-i-joestar`). Rapprochement par alias — le
  mode d'échec classique de ce projet, déjà documenté.

### 6.6 Hunter x Hunter — 215 fiches · **7 seulement** au gabarit ancien
*Mesuré ce jour : 203 personnages (94 %), 4 lieux, 5 status, 2 skills, 1 profession — **0 pouvoir**.
Image 100 %, descFr 93 %, `nen` sur 51 fiches (24 %).*
- **Colonne vertébrale : le NEN**, faute de tout autre candidat — et l'axe est **propre à 100 %**
  (6 valeurs curées, 6 valeurs réelles). Il ne couvre qu'un quart du corpus : c'est un axe de
  qualité, pas de couverture.
- **Surface propre : la roue du Nen** (`UniverseWheel`), déjà livrée. Elle classe 51 fiches ; c'est
  peu, mais c'est exact et l'œuvre elle-même n'en documente pas davantage.
- **On ne fait PAS** : de géographie (4 lieux en tout) · d'arsenal ni de page de pouvoirs
  (**aucune entrée de type `power`**) · de carte, de frise, de hiérarchie d'organisation.
  Cet univers est une **galerie de personnages** avec un axe de discipline — le présenter
  autrement serait un décor sur du vide.
- **Donnée insuffisante, mention explicite** : HxH ne peut rien porter d'autre aujourd'hui. Toute
  ambition supplémentaire suppose un import de pouvoirs/lieux qui n'existe pas encore.

### 6.7 Death Note — 84 fiches · **4** au gabarit ancien
*Mesuré : 74 personnages, 5 status, 2 lieux, 1 artefact. Image 99 %, descFr 95 %, `camp` sur
42 fiches (50 %), `forms` sur 2.*
- **Colonne vertébrale : le CAMP** (Kira / L / SPK / Shinigami…), axe propre, 50 % de couverture —
  le meilleur ratio possible sur un corpus aussi resserré.
- **Surface propre : le duel Kira vs L en chiffres** (`signature: 'kiraduel'`), déjà livré. C'est le
  seul univers du site qui se joue en face-à-face binaire ; aucune carte, aucune roue n'aurait de
  sens ici.
- **On ne fait PAS** : de frise (2 fiches à `forms`) · de géographie (2 lieux) · d'arsenal
  (1 artefact — le Cahier, qui est justement un pilier de fiche, pas une collection).
- **Donnée** : suffisante pour ce qui précède. Ne rien promettre de plus.

### 6.8 Initial D — 44 fiches · **11** au gabarit ancien · le plus petit corpus
*Mesuré : 26 personnages, 6 lieux, 5 artefacts, 5 status. Image 95 %, descFr 91 %, `col` sur
23 fiches (52 %), `affiliation` sur 18 (41 %).*
- **Colonne vertébrale : le COL** (52 %) — la route est le sujet de l'œuvre. `affiliation`
  (les écuries, 41 %) est un axe secondaire légitime, tous deux propres à 100 %.
- **Surface propre : le tracé des cols** (`signature: 'passes'`), déjà livré. Un univers où la
  géographie est **linéaire** (une route, une montée, une descente) et non planaire : aucun autre
  hub ne peut réutiliser cette géométrie, et elle ne peut pas non plus leur être empruntée.
- **On ne fait PAS** : de hub riche, de rails multiples, de compteurs mis en scène. 44 fiches
  demandent une page **courte et dense**, pas un gabarit de hub dimensionné pour Naruto — le
  gabarit compact (< 250 fiches : insights masqués) existe déjà et doit rester appliqué.
- **Donnée** : suffisante et clôturée. Ne pas relancer l'usine ici.

---

## 7. La migration, en lots livrables

État de départ réel : 10 routes, 44 composants, 3 zones livrées, **2 600 fiches au gabarit ancien**,
**5 appels résiduels à la boîte-carte**, un compteur de hub bloqué à 0.

---

### LOT 1 — « Le socle honnête » · **1 semaine · visible partout · aucune dépendance**

Objectif : à la fin du lot, **plus une seule boîte-carte dans AKASHA**, le chrome du monde suit le
lecteur, et aucun chiffre affiché n'est faux. Rien de neuf n'est promis : ce qui existe cesse de
se contredire.

**1a — Réparer `HubInsights` (½ jour).** Diagnostic établi en lisant le code, pas en devinant :
`components/akasha/hub/CountUp.tsx` fait `useState(0)` puis n'atteint la vraie valeur que via un
`IntersectionObserver` **côté client**. Le rendu serveur émet donc littéralement `0`, et toute
défaillance d'hydratation de ce sous-arbre (ou tout cas où l'observer ne se déclenche pas) laisse
le 0 en place définitivement — exactement le symptôme observé, à 20 px d'un rail serveur qui
affiche les bons chiffres. Ça viole aussi une règle transverse déjà écrite du projet : *« jamais de
compteur rendu 0 sans JS »*.
*Correctif* : `useState<number | null>(null)` et rendre `(n ?? to)` — la valeur est juste en SSR,
sans JS, et l'animation redevient un pur agrément. Puis vérifier la console du hub pour une erreur
d'hydratation en amont (cause probable de la panne d'observer). **Coût : 3 lignes + une vérif.**

**1b — Extraire `UniverseShell` (1,5 jour).** Le bloc hero (dégradé `heroGradient`, motif
`bgPattern`, kanji, `HubHalo`) est déjà écrit dans `u/[slug]/page.tsx`. Le sortir en composant
partagé et l'appliquer à `[slug]/page.tsx`, `c/[slug]/page.tsx` et
`u/[slug]/[axis]/[value]/page.tsx`. **Pur déplacement de JSX, zéro nouvelle donnée, zéro nouvelle
requête.** C'est le plus gros gain visuel du plan au plus bas risque, et la réponse au grief
« l'éclat s'arrête à la porte du hub ».
*Garde-fou* : ce composant devient un point de défaillance unique (8 mondes × 7 674 fiches).
Vérifier contraste et `z-index` sur les 8 univers **avant** de passer au lot suivant.

**1c — Le « zéro carte » enfin tenu (2 jours).** Les 5 appels restants à `AkashaMosaic`
(dont le `Tile()` porte bien `borderRadius: 12`, une bordure pleine et des pastilles type/rareté
en position absolue) :
- `c/[slug]/page.tsx` ×2 → `AkashaList` ;
- `[slug]/page.tsx` ×1 (« voir aussi ») → variante compacte ;
- **`u/[slug]/page.tsx` ×2 (piliers + évolutives) → variante compacte** — c'est la découverte de
  la reconnaissance : les hubs, décrits comme « déjà au niveau visé », portent encore des cartes.
*Moyen* : ajouter une prop `variant: 'list' | 'strip'` à `AkashaList` plutôt que créer un
composant de plus. Retirer au passage les emojis résiduels de `c/[slug]` (`c.icon`, `m.emoji`,
`g.badge`) — le lot 4e les avait retirés du chrome, cette route a été oubliée.

**Livrable visible** : les compteurs de tous les hubs sont justes, chaque page porte la couleur et
le kanji de son monde, aucune boîte-carte ne subsiste. Ferme **C3-4** et une partie de **C3-2**.

---

### LOT 2 — « La fiche unique » · **2 semaines · dépend de 1b** · le cœur du plan

**2a — `lib/akasha/shape.ts` : `deriveShape(entry)`**, fonction pure et testée, sans I/O. Elle
retourne la liste des modules à monter d'après les **capacités réellement présentes** :
`identity` (toujours) · `axis` (dès qu'un axe de l'univers est peuplé) · `relations` (si ≥ 1 arête)
· `sections` (si ≥ 1 ligne `akasha_sections`) · `timeline` (si `forms`/`eras` non vide) ·
`orbit` (organisation à membres denses) · `stats` (**verrouillé aux 37 fiches databook canon
Naruto**). Un module absent **n'est pas monté** — jamais un état vide déguisé.

**2b — `components/akasha/zone/EntityZone.tsx`**, monté sur le `zone-context` existant, branché
dans `app/learn/akasha/[slug]/page.tsx` **à la place de la branche fallback** (à partir de la
ligne ~196). Couverture : **2 600 fiches** — power 1 699, artifact 398, place 326, profession 98,
skill 79. Par univers : **Naruto 1 775**, One Piece 569, Dragon Ball 160, JoJo 49, Bleach 25,
Initial D 11, HxH 7, Death Note 4.
Le canal lit la relation pertinente au type (`maitrise` entrante pour un pouvoir, `possede` pour un
artefact, `exerce` pour un métier, `habite` pour un lieu) — **aucune requête nouvelle**,
`getEntryBySlug` joint déjà tout.
*Garde-fou de volume* : au-delà de 12 éléments dans une grappe, replier en « voir les N autres ».
Une tête d'affiche Naruto porte plus de 100 arêtes `maitrise` — sans seuil, on recrée le mur de
chips que ce plan prétend supprimer.

**2c — Le repli des isolées.** Pour les fiches sans aucune arête, le module `axis` prend le relais :
voisins partageant une valeur d'axe (village, crew, saga…), **construits depuis les attributs,
jamais depuis une relation inventée**, et **visuellement distincts** des vraies connexions — sinon
on transforme une architecture honnête en donnée trompeuse.
*Volumétrie honnête* : 90 % des 2 600 ont une relation, 85 % une bio ; **57 fiches (2 %) n'ont
rien** et s'arrêteront au bandeau. C'est acceptable et mesuré.

**Livrable visible** : le tiers du corpus qui « faisait second rang » entre dans le même langage.
Ferme **C3-3**, avec un périmètre plus large que prévu (tous les types orphelins, pas seulement
Power) et un volume plus juste (2 600, pas 3 200).

---

### LOT 3 — « Le vocabulaire des mondes » · **1 semaine · dépend de 1b** (parallélisable avec 2)

- **3a** — Profil relationnel du sous-ensemble sur `/u/[slug]/[axis]/[value]` (extension de
  `listAxisCounts`). Le seul apport de curiosité retenu du panel : un chiffre qu'aucun wiki source
  ne calcule.
- **3b** — `generateStaticParams` **restreint aux axes curés** ; les 3 axes sales (clan et
  organization Naruto, crew OP) ne sont **pas proposés** en chips tant qu'ils ne sont pas curés —
  masquage silencieux, **jamais un blocage de route**.
- **3c** — `collections.ts` : 2 → 4-6 vitrines (candidats propres et volumineux : Jutsu 1 408
  groupé par discipline, Attaque 659, Arme & outil 228, Métier 99 par `sector`). **Uniquement
  après 1c**, jamais avant : c'est la synchronisation manquée qui a produit les 2 vitrines en
  carte bannie.
- **3d** — Corrections data gratuites : Takigakure + typo « Konohagure » (Naruto) ; peupler les
  4 mondes Bleach depuis `habite` en complément de `race` ; dédoublonner « Gotei 13 » et
  « Nelliel ».

---

### LOT 4 — « Les surfaces propres qui manquent » · **1 semaine · dépend de 1b**

Deux surfaces seulement, choisies parce qu'elles ne coûtent **aucune image** et s'appuient sur des
données déjà mesurées comme suffisantes :
- **4a — Échelle des rangs Naruto** : 7 paliers, 473 personnages, badges déjà sur disque.
  La surface la plus proche de « prête à coder » de tout AKASHA.
- **4b — Arbre Joestar** : 6 générations, 45 arêtes `famille`, types de lien déjà curés sur
  6 fiches. **Prérequis** : rapprochement des 8 slugs manquants par alias de romanisation (3d).

---

### LOT 5 — « Dé-carter les zones validées » · **1 semaine · dépend de 2 · à faire EN DERNIER**

C3-2 : canal en région à filet supérieur, chips en liens-compteurs, portrait full-bleed sur
`CharacterZone` / `OrganizationZone` / `EraZone`. **Placé en dernier délibérément** : c'est du code
qui marche et que Dan a validé. Conditions : comparaison avant/après sur la fiche Naruto Uzumaki,
univers par univers, **et aucune fusion des trois composants** (voir §1.1, arbitrage B).

---

### LOT 6 — Back et données · **continu, parallèle, jamais bloquant**
Curation d'alias des 3 axes sales · sonde `pageimages` gratuite sur les types non-personnage
d'One Piece · commentaire correctif sur la colonne `description` dans la migration SQL ·
extraction `race`/`saga` depuis `descFr` (Dragon Ball). **Aucun lot front n'attend celui-ci.**

---

### LOT 7 — Différé, conditionnel
Repli générique de hub (« grille du monde ») pour un univers sans géographie curée, **et le test
du 9ᵉ univers** : ajouter une entrée dans `UNIVERSE_TAXONOMY` doit suffire, sans écrire un seul
composant de fiche. À construire à l'arrivée d'un 9ᵉ univers réel, pas avant (§8, question 1).
**L'outil Chemin/BFS reste parqué** (§1.1, arbitrage D).

---

### Récapitulatif des dépendances

```
LOT 1 (socle) ──┬─→ LOT 2 (EntityZone) ──→ LOT 5 (dé-cartage des zones validées)
                ├─→ LOT 3 (axes, vitrines)        [3c exige 1c]
                └─→ LOT 4 (rangs Naruto, arbre JoJo)   [4b exige 3d]

LOT 6 (back/data) ── parallèle, aucun lot front n'en dépend
LOT 7 ── conditionnel (9ᵉ univers)
```

### Ce que la migration ne touche pas
Les 8 surfaces signature de hub · `CharacterZone` / `OrganizationZone` / `EraZone` jusqu'au lot 5 ·
`/tops` · `/wanted` · `/random` · `/api/search` · les og:images · `lib/akasha/queries.ts` comme
point de passage unique · l'ISR et les `generateStaticParams` (sauf restriction en 3b) ·
le pipeline usine.

### Deux règles de conduite pour toute session qui exécute ce plan
1. **Aucun chiffre de ce document ne doit être codé en dur** dans un composant ou un texte d'état
   vide (970, 2 600, 437, 57…). Le corpus bouge en continu — interroger les vrais champs à
   l'exécution. Ce document est un instantané daté, pas une constante.
2. **Recompter avant d'estimer.** Le brief annonçait 29 composants (il y en a 44), le plan de
   refonte 3 200 fiches (il y en a 2 600) et 35,5 % d'isolées (il y en a 12,6 %). Étape 0 de tout
   lot : mesurer.

---

## 8. À trancher par Dan — questions fermées

> **08/08/2026 — Dan tranche « go tout » : les recommandations écrites ci-dessous font foi et
> sont DÉCIDÉES.** Statut d'exécution vérifié indépendamment, en clair après chaque décision.

1. **Repli générique de hub.** Le fallback « grille du monde » (pour un univers sans carte
   bespoke) : on le construit maintenant, ou à l'arrivée d'un 9ᵉ univers réel ?
   → **[Maintenant] / [À l'arrivée d'un 9ᵉ]** — *ma recommandation : à l'arrivée.*
   **DÉCIDÉ : à l'arrivée d'un 9ᵉ univers.** Rien à faire aujourd'hui (LOT 7, conditionnel) —
   vérifié : aucun composant de repli générique dans `components/akasha/` à ce jour, conforme.

2. **Le geste central.** Ce plan est un plan de **cohérence**, pas de nouveauté : il n'ajoute aucun
   nouveau moment waouh, il fait disparaître un site à deux vitesses. Est-ce bien ce que tu
   attendais, ou veux-tu qu'on réserve du budget pour une surface inédite ?
   → **[Cohérence d'abord, conforme] / [Je veux aussi une surface inédite]**
   **Pas de recommandation écrite pour celle-ci** — je ne l'ai donc pas tranchée moi-même en
   appliquant « go tout » (il n'y a rien à appliquer sans texte à suivre). **Reste ouverte,
   à trancher explicitement par Dan.**

3. **`EraZone` ne sert que 14 fiches** (et non 37). On la garde en zone autonome, ou on la fond en
   simple module `timeline` d'`EntityZone` au lot 5 ?
   → **[Garder autonome] / [Fondre en module]** — *ma recommandation : fondre, mais au lot 5.*
   **DÉCIDÉ : fondre en module `timeline`, au LOT 5** (pas avant — dépend de `EntityZone`, LOT 2,
   non encore construit). Vérifié : `EraZone` existe toujours telle quelle en composant autonome
   (`components/akasha/zone/EraZone.tsx`), conforme à « pas avant le lot 5 ».

4. **`ki` Dragon Ball** : 60 valeurs de power level non canon (fan-made), dont 29 avec une échelle
   française fautive (« Milliard/Billion »). On les marque « estimé », ou on les retire ?
   → **[Marquer « estimé »] / [Retirer]** — *ma recommandation : retirer ; les seules stats
   estimées que tu as autorisées sont Luffy/Zoro, nommément.*
   **DÉCIDÉ ET EXÉCUTÉ : retiré.** Vérifié indépendamment (chantier `sources-doubles`, point 3) :
   0 fiche Dragon Ball porte encore `attributes.ki` en base, sur 60 avant, 0 saut de concurrence
   au recomptage.

5. **Images non-personnage One Piece** (48,2 % de couverture : Navire 62,6 %, Pouvoir 30,7 %).
   On lance d'abord la sonde gratuite `pageimages` du wiki, jamais lancée sur ces types, avant tout
   crédit Higgsfield ?
   → **[Oui, sonde gratuite d'abord] / [Non, laisser en tuiles stylisées]**
   **Pas de « ma recommandation » explicite formulée ici**, mais le corps du texte (§6.2) traite
   déjà « oui, sonde gratuite d'abord » comme acquis (« à épuiser avant tout crédit Higgsfield »).
   Par cohérence interne du document, **je retiens DÉCIDÉ : oui, sonde gratuite d'abord** — **non
   exécuté à ce jour** (LOT 6, back, aucune trace d'un script `pageimages` non-personnage OP dans
   `data/audits/` ni `scripts/`).

6. **`total_prime` d'équipage One Piece** : 33 des 84 valeurs sont littéralement « inconnu Berrys ».
   Dans un classement, on masque la ligne, ou on affiche « inconnu » explicitement ?
   → **[Masquer] / [Afficher « inconnu »]** — *dans les deux cas, jamais convertir en 0.*
   **Pas de recommandation écrite entre les deux options** (seule la garde commune — jamais 0 —
   est tranchée). **Reste ouverte** ; la garde « jamais convertir en 0 » est, elle, DÉCIDÉE et à
   respecter dès l'implémentation du classement.

7. **Vitrines `/c/`** : on étend de 2 à 4-6 catégories (Jutsu, Attaque, Arme & outil, Métier), ou
   on reste à 2 et le reste passe par le registre filtrable ?
   → **[Étendre à 4-6] / [Rester à 2]**
   **Pas de « ma recommandation » écrite ici non plus**, mais LOT 3-3c traite déjà l'extension à
   4-6 comme le plan retenu (« Jutsu 1 408 … Attaque 659 … Arme & outil 228 … Métier 99 »). Par
   cohérence interne, **je retiens DÉCIDÉ : étendre à 4-6** — **non exécuté à ce jour** :
   `lib/akasha/collections.ts` porte toujours exactement 2 vitrines (`fruits-du-demon`,
   `armurerie-meito`), vérifié en lisant le fichier.

8. **Outil « Chemin » (BFS entre deux fiches d'un même univers).** Je l'ai écarté contre l'avis
   d'un juge (§1.1, arbitrage D). Tu confirmes, ou tu le veux en lot conditionnel après le lot 5 ?
   → **[Confirmé, parqué] / [Lot conditionnel après 5]**
   **DÉCIDÉ : confirmé, parqué.** Le corps du document (§1.1-D, LOT 7) traite déjà ce rejet comme
   acquis (« l'outil Chemin/BFS reste parqué ») ; aucune trace de code d'un tel outil, conforme.

### État d'exécution des LOTS, vérifié le 08/08/2026 (recompte + lecture directe du code)

- **LOT 1a (`HubInsights`/`CountUp` SSR)** — ✅ **FAIT, vérifié en HTML brut sans JS** :
  `curl http://localhost:3000/learn/akasha/u/naruto` renvoie littéralement `<span>1 337</span>`
  pour le compteur Personnages (pas `0`) dans le HTML servi, avant toute hydratation.
- **LOT 1b (`UniverseShell`)** — ✅ **FAIT**, monté et vérifié en lecture réelle sur `u/naruto`,
  `skypiea-lieu`, `gouvernement-mondial`, `clan-sarutobi` : même chrome (kanji, accent) sur les
  quatre.
- **LOT 1c (zéro carte)** — ✅ **très majoritairement fait** : `c/fruits-du-demon` ne porte plus
  aucun `borderRadius:12` (0 occurrence sur la page complète, vérifié par grep du HTML rendu).
  ⚠️ **Régression trouvée à la relecture** : la variante `strip` d'`AkashaList`
  (`components/akasha/AkashaList.tsx`, fonction `Strip`, ~ligne 90) commente
  « aucune pastille en absolu » deux lignes au-dessus d'un `position: 'absolute', top: 4, right: 4`
  bien réel sur la pastille de rareté — code non modifié depuis la dernière revue, **toujours
  présent** à cette vérification.
- **LOT 2 (`EntityZone`, `deriveShape`)** — ❌ **non commencé** : ni `lib/akasha/shape.ts` ni
  `components/akasha/zone/EntityZone.tsx` n'existent dans le dépôt à ce jour.
- **LOT 3a (profil relationnel du sous-ensemble)** — ❌ **non fait** : aucune occurrence de
  « profil relationnel » dans le code de la page d'axe ni de `listAxisCounts`.
- **LOT 3c (extension des vitrines)** — ❌ **non fait**, voir Q7 ci-dessus.
- **LOT 3d (Takigakure, typo Konohagure, Bleach 4 mondes, dédoublonnage Gotei 13/Nelliel)** —
  **partiel** : la fiche mal orthographiée « Konohagure » n'existe plus en base (seule
  « Konohagakure » existe) — conforme, sans certitude sur si c'était déjà le cas avant ce plan.
  Gotei 13 dédoublonné (confirmé, via le chantier `doublets-conteneurs`, Q1 de
  `akasha-hierarchies.md`). **Takigakure n'est toujours pas dans les chips de l'axe `village`**
  (7 valeurs curées, pas 8) malgré une fiche `takigakure` existante en base — non fait.
