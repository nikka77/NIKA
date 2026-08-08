# AKASHA — Le modèle des hiérarchies

> Document de référence. Il tranche : chaque fois que deux volets d'analyse se contredisaient,
> une des deux options a été **retenue contre** l'autre, avec le motif. Une synthèse qui additionne
> n'en est pas une.
>
> **Mesures** : 08/08/2026, `clientSite()`, scans paginés complets (le `head` PostgREST plafonne à
> 1 000 lignes — toujours passer par `range()`). 7 674 fiches · 16 387 arêtes · 19 183 sections ·
> 8 univers. Aucune écriture. Les chiffres ci-dessous ont été **recomptés indépendamment** des
> rapports d'analyse ; les écarts sont signalés.
>
> **Cadre non négociable** (rappels Dan) : DA en pause, structure d'abord, prototypage en vrai code.
> Gamification supprimée. Zéro stat estimée non badgée. Bleach = 4 mondes. Français. Variables CSS.
> **Une personne aidée d'agents tient ce projet : toute règle qui repose sur la discipline humaine
> est déjà cassée. Elle doit tenir dans un script.**
>
> ⚠ Une vague parallèle travaille sur les SURFACES et le PARCOURS. Ce document traite les
> HIÉRARCHIES et la STRUCTURE INTERNE. Points de contact signalés par ⚠ **COLLISION**.

> **Vérification finale — 08/08/2026, 17h34 CEST.** Recompte indépendant : **7 637 fiches ·
> 16 383 arêtes · 19 108 sections**, 8 univers. Écarts vs les 7 674/16 387/19 183 (ou 19 188 selon
> `akasha-architecture.md` — **incohérence entre les deux documents, notée ici** : les deux ont été
> mesurés « ce jour » à des instants différents, l'écart de 5 sections entre eux est dans le même
> ordre de grandeur que la dérive continue de l'usine documentée partout dans ce fichier) tous
> expliqués et recoupés de façon croisée dans `akasha-architecture.md` §0. Détail par univers,
> vérifié en direct sur `/learn/akasha` : Naruto 3 305→**3 308**, One Piece 2 270→**2 231**,
> Bleach 386→**385**, Dragon Ball/JoJo/HxH/Death Note/Initial D **inchangés**. `npx tsc --noEmit` :
> 0 erreur. `next build` : 309/309 pages, exit 0. `scripts/ops-sonde-schema.mjs` : conforme.

---

## 0. Les sept arbitrages, en une page

| # | Le conflit | Retenu | Écarté | Motif décisif |
|---|---|---|---|---|
| A1 | Une valeur qui désigne une fiche : attribut ou arête ? | **L'axe reste attribut** | « toute valeur → arête, sans exception » | L'axe est un index de **filtrage SQL** (`.eq('attributes->>attr', val)`), pas un lien de graphe. Le migrer viderait `ALLOWED_FILTER_ATTRS`, les pages d'axe L2 et `HUB_VISUAL`. |
| A2 | Prédicat d'impasse : arêtes vides, ou arêtes vides + pas de conteneur ? | **Arêtes vides, et repli ADDITIF** | prédicat composite via `containerOf()` | Mesuré : sur 970 fiches sans arête, **6** ont un conteneur résolu par axe. Le prédicat savant coûte un import partout pour 0,08 % du corpus. Le dilemme disparaît si « Voir aussi » s'ajoute au lieu de remplacer. |
| A3 | Un 2ᵉ cran de contenance : segment d'URL ou query string ? | **Query string, piloté par `drillInto`** | 5ᵉ segment de path | 121 fiches sur 7 674 ont un 2ᵉ cran, dont 76 % Naruto. Un segment de plus multiplie `generateStaticParams` pour 1,6 % du corpus. |
| A4 | « Zéro littéral d'univers » : grep à 0, ou pas ? | **Grep à 0 sur le DISPATCH seulement** | grep à 0 partout | Le `switch` qui choisit quel composant bespoke rendre est un défaut. Le JS *interne* de `BleachWorldsMap` qui connaît ses divisions est légitime. Sinon la règle est violée par le plan censé la servir. |
| A5 | Sections fusionnées dans `attributes` : contrainte SQL ou correction du code ? | **Correction du code d'abord, contrainte en filet** | contrainte SQL seule | La contrainte porte sur l'**écriture** ; la fusion a lieu **en mémoire à la lecture** (`queries.ts` l.262). La contrainte ne peut pas atteindre le bug qu'elle prétend corriger. |
| A6 | Exclure `appartient` char→char, ou toute arête char→char ? | **Toute arête char→char** | exclusion par étiquette | Mesuré : **7 relations** portent du char→char — `appartient` 1198, `allie` 1336, `ennemi` 1334, `mentor` 246, `rival` 192, `eleve` 48, **`possede` 15**. Lister les étiquettes est perdant d'avance. |
| A7 | Un maillon de fil d'Ariane pointe vers une fiche ou vers une route ? | **Vers SA route** (L2 ou L3) | vers une fiche du registre | Sinon la navigation pousse à créer des fiches que le modèle de contenance refuse délibérément (Bleach `division` 0/13, JoJo `partie` 0/179). |

**Deux trouvailles neuves**, absentes des analyses reçues, mesurées ici :

- **25 groupes de conteneurs en doublon, dont 23 One Piece** : chaque grande île existe **deux
  fois**, une fois typée `place`, une fois typée `status`, avec les arêtes de membres réparties au
  hasard entre les deux (`east-blue` place = 77 entrantes / `east-blue-one-piece` status = 0 ;
  `alabasta` status = 11 / `alabasta-lieu` place = 0). Le cas « Dressrosa mal typé » n'est pas un
  accident isolé : c'est **un doublet d'import systématique**. Détail en §2.5.
- **142 des 152 fiches `status` One Piece portent `category = "Équipage"`** — îles comprises. Le
  gabarit organigramme rend donc Dressrosa, Skypiea et Impel Down comme des équipages pirates.

---

## 1. La règle de placement

### La règle, en quatre lignes

1. **COLONNE** — un fait vrai pour **les 7 674 fiches**, sur lequel on trie, pagine ou fait un
   `count`. Fermé : `id, slug, type, name, universe, summary, description, image_url, rarity`.
   Ajouter une colonne est une décision de Dan, pas un réflexe.
2. **ATTRIBUT** (`attributes` JSONB) — un fait **scalaire** propre à la fiche, ou une valeur
   **déclarée axe** dans `universe-taxonomy.ts`. Jamais de prose longue, jamais un pointeur qui fait
   autorité.
3. **ARÊTE** (`akasha_relations`) — **tout lien entre deux fiches**, sans exception *autre* que
   celle de la règle 2. Une liste de noms d'autres fiches dans `attributes` est un bug, pas une
   donnée.
4. **SECTION** (`akasha_sections`) — de la **prose titrée**, une ligne par section, ordonnée. Jamais
   dans `attributes`, jamais concaténée dans `description`.

### Arbitrage A1 — pourquoi l'axe échappe à la règle 3

Le volet Placement citait `village` comme preuve qu'un axe est « une arête déguisée » et concluait
qu'il fallait le migrer. **J'ai retenu R2 du volet Entités contre la règle 1 du volet Placement**,
parce que le rôle premier d'un axe n'est pas de traverser le graphe mais d'**être filtré en SQL** :
`.eq('attributes->>' + attr, value)` sur un index JSONB. `ALLOWED_FILTER_ATTRS` est construit par
`UNIVERSE_TAXONOMY.flatMap(u => u.axes.map(a => a.attr))` (`universe-taxonomy.ts` l.374) : vider ces
attributs viderait d'un coup les 18 axes déclarés, les pages `/u/[slug]/[axis]/[value]`, les
compteurs de hub et `HUB_VISUAL`. Aucun des volets qui réclamait la migration n'avait chiffré cette
casse.

**Formulation retenue** : *une valeur qui désigne une autre fiche va en arête — sauf si elle est
déclarée AXE, auquel cas elle reste attribut. L'arête miroir, quand elle existe, est un
**complément** de navigation, jamais un remplacement, jamais une obligation.*

Le corollaire est dur et il faut l'assumer : **tout ce qui n'est pas un axe déclaré et qui pointe
vers une fiche doit mourir.**

### Les cas d'école

| Donnée réelle | Verdict | Pourquoi |
|---|---|---|
| `attributes.village = "Konohagakure"` (756 persos Naruto) | **Attribut. Reste.** | Axe déclaré. Filtré en SQL par la page L2. L'arête `habite` qui existe en parallèle est un doublon toléré. |
| `attributes.jutsu = [94 noms EN]` sur `naruto-uzumaki` | **Arête. À purger.** | Pas un axe. Doublonne les **105 arêtes `maitrise`** sortantes de la même fiche, en anglais et non sluguées. Deux sources concurrentes sur le fait le plus central de la fiche la plus riche du corpus. |
| `attributes.family = [7 objets]` dont **1 sans `slug`** (Hinata) | **Cache dénormalisé. Toléré en lecture, jamais source de vérité.** | Voir « le cinquième réservoir » ci-dessous. |
| `attributes.descFr` (prose de bio, 93,9 %) | **Attribut.** | Prose *unique et non titrée* : c'est le corps de la fiche, pas une section. Sert de méta-description SEO. |
| « Vue d'ensemble », « Améliorations » sur `rasengan` | **Sections.** | Prose **titrée et ordonnée**. 19 183 lignes en table dédiée depuis le 05/08. |
| `attributes.sections` réinjecté à la lecture (`queries.ts` l.262) | **À défaire.** | Voir A5. |
| Les règles numérotées du Death Note (`facts[]`) | **Sections de la fiche artefact.** | Voir §6. |
| `attributes.forms[].stats` (37 fiches) | **Attribut.** | Scalaires de databook, jamais filtrés, jamais liés. |
| `attributes.partie = "Partie 1-2"` sur Joseph Joestar | **Attribut, mais en TABLEAU.** | Axe déclaré (donc attribut, A1) — mais scalaire aujourd'hui alors que la fiche porte 10 arêtes Partie 3 et Partie 4. Voir §6. |

### Le cinquième réservoir, que personne n'avait nommé

Il existe un quatrième-et-demi canal, non gouverné : les **tableaux d'objets porteurs d'un `slug`
optionnel** dans `attributes` — `family[]`, `squad.members[]`. Sur `naruto-uzumaki`, 6 des 7 entrées
de `family` sont sluguées, **une ne l'est pas** (Hinata Uzumaki, alors qu'une fiche existe). Ce
n'est ni une arête (aucune contrainte ne le bloque : la garde ne vise que la clé littérale
`relations`), ni un attribut inerte. C'est un **pointeur informel, non indexé, incohérent au sein
d'une même fiche**.

**Décision** : ce n'est pas un 5ᵉ réservoir, c'est un **cache dénormalisé d'arêtes**. Statut :
*toléré en lecture pour éviter une jointure, interdit comme source de vérité*. Règle opérationnelle :

> **Tout tableau d'objets à `slug` dans `attributes` doit être intégralement reconstructible depuis
> `akasha_relations`. S'il ne l'est pas, c'est l'arête qui manque — pas le slug.**

Vérifiable par une requête, et donc par le script de garde ci-dessous.

### La contrainte technique qui empêche de se tromper

Une règle écrite dans un `.md` ne tient pas un an sur un projet à une personne. Il faut **un seul
script, qui sort en code non-zéro**. Pas quatre disciplines.

`scripts/akasha-lint.mjs` — à appeler avant commit et dans le protocole de vérification existant
(`npx tsc --noEmit` + une page navigateur) :

```
1. attributes ne contient ni 'relations' ni 'sections'          → doublon de réservoir
2. tout tableau d'objets à `slug` dans attributes a une arête
   correspondante                                                → cache dénormalisé désynchronisé
3. toute clé d'attributs pointant des fiches (heuristique :
   la valeur matche ≥ 3 noms de fiches du même univers) est
   soit un axe déclaré, soit signalée                            → règle 3 contournée
4. cohérence (type source → type cible) par relation, comparée
   au tableau de §2.3                                            → `exerce` vers un `status`, etc.
5. aucun doublon de conteneur : (universe, nom normalisé) unique
   parmi type IN ('status','place')                              → les 25 groupes de §2.5
6. char→char absent de tout canal de contenance                  → A6
```

Et **une** garde en base, qui coûte zéro maintenance :

```sql
alter table akasha_entries
  add constraint akasha_attributes_sans_reservoirs
  check (not (attributes ?| array['relations', 'sections']));
```

Elle empêche la **persistance** d'un réservoir dans un autre. Elle n'empêche pas la fusion en
mémoire — c'est précisément l'objet de A5.

---

## 2. La hiérarchie des entités

### 2.1 Quatre niveaux, pas sept

Aucune nouvelle table, **aucune colonne `parent_id`**. La contenance récursive est déjà exprimable
par le schéma. Ce qui manque n'est pas un champ, c'est **une règle de lecture unique**.

| Niveau | Ce que c'est | Volume mesuré |
|---|---|---|
| **0 · Univers** | La colonne `universe`. 100 % peuplée. Rien à construire. | 8 valeurs |
| **1 · Conteneur** | Toute fiche `place` ou `status` qui reçoit des membres. | 324 conteneurs actifs sur 701 `place`+`status` |
| **2 · Conteneur local** | A un parent **et** reçoit des membres. Profondeur émergente, pas imposée. | **121 fiches**, dont 92 Naruto (76 %) |
| **3 · Occupant** | `character` en écrasante majorité, marginalement `artifact` et `profession`. | 4 034 personnages |

Le niveau 2 n'est **pas un palier obligatoire**. C'est un cas particulier qui existe là où le canon
le produit (les petites équipes Naruto rattachées à un village). Le figer comme étage à remplir,
c'est ouvrir un chantier que 6 univers sur 8 ne rempliront jamais.

**En parallèle, jamais dans le même arbre** : la **filiation taxonomique** `power→power` (261
arêtes, ex. Hado 90 → Kidō) et `artifact→artifact` (16, ex. Zangetsu → Zanpakutō). C'est un *est-un-
type-de*, pas un *est-dans*. Les empiler avec Village/Clan casse le modèle à la première fiche qui a
un parent spatial **et** un parent taxonomique. Second axe, consultable séparément.

### 2.2 Ce qui porte la contenance : deux canaux, un ordre

```
containerOf(entry) :
  1. AXE     — attributes[axe déclaré] → matcher par nom exact, puis par slug,
               contre les fiches place/status du même univers
  2. ARÊTE   — en repli seulement : appartient|habite sortante vers un place/status
  GARDE      — jamais depuis une arête character→character (A6)
```

**Pourquoi cet ordre, et pourquoi le repli est indispensable.** Le volet Entités justifiait « axe
d'abord » par Naruto (99,9 % de concordance). Mesuré par univers, c'est plus intéressant que ça :

| Univers | Persos | Parent via **axe** | Parent via **arête** | Orphelins | Couverture |
|---|---:|---:|---:|---:|---:|
| One Piece | 1 449 | 353 | 475 | 621 | **57,1 %** |
| Naruto | 1 337 | **927** | 126 | 284 | **78,8 %** |
| Dragon Ball | 473 | 31 | 21 | 421 | **11,0 %** |
| Bleach | 293 | 9 | **148** | 136 | **53,6 %** |
| Hunter x Hunter | 203 | 0 | 36 | 167 | **17,7 %** |
| JoJo | 179 | 0 | 20 | 159 | **11,2 %** |
| Death Note | 74 | 21 | 7 | 46 | **37,8 %** |
| Initial D | 26 | 19 | 0 | 7 | **73,1 %** |
| **Total** | **4 034** | **1 360** | **833** | **1 841** | **54,4 %** |

*(recompte indépendant ; l'analyse annonçait 54,9 % — écart de 20 fiches, dû à la normalisation
« X Clan »/« X Family ». Sans conséquence.)*

Le fait qui décide : **Naruto résout à 88 % par l'axe, Bleach à 94 % par l'arête.** Aucun des deux
canaux ne suffit seul, et l'ordre choisi n'est pas une préférence esthétique — il donne la priorité
au canal *filtrable*, l'autre restant garanti par le repli. HxH et JoJo tombent à zéro côté axe :
leurs axes (`nen`, `partie`) n'ont **aucune fiche en face**, ce qui est un choix, pas un manque
(§6).

### 2.3 Arbitrage A6 — la garde porte sur la forme, pas sur l'étiquette

Le volet Entités interdisait « `appartient` character→character ». **J'ai retenu la garde par forme
contre la garde par étiquette**, parce que le comptage exhaustif des arêtes char→char donne :

```
allie 1336 · ennemi 1334 · appartient 1198 · famille 1041 · mentor 246 · rival 192
eleve 48 · possede 15 · maitrise 3 · exerce 1 · habite 1
```

**Sept étiquettes** au moins peuvent produire une fausse contenance, dont `possede` (Naruto
« possède » Kurama, qui est un `character`, exactement comme il possède un bâton bō) et même
`habite`, réputé univoque. Interdire une étiquette, c'est réécrire la règle à chaque nouveau nom de
relation. La règle retenue tient en une ligne et ne vieillit pas :

> **`from.type === 'character' && to.type === 'character'` n'est JAMAIS de la contenance, quel que
> soit le nom de la relation.** C'est de la loyauté, de la parenté ou du commandement.

Ce comptage révèle en passant un **défaut de cohérence type-source/type-cible** que rien ne
surveille : `exerce` (censé cibler `profession`) pointe depuis `naruto-uzumaki` vers « Hokage », qui
est typé `status` — et double une arête `appartient` vers la même cible. D'où le point 4 du script
de garde.

### 2.4 Le sort des orphelines — 1 841 personnages (45,6 %)

**Une orpheline n'est pas un bug à corriger, c'est un état à rendre digne.** Trois traitements,
selon la cause :

1. **Le PARENT manque** (le gisement rentable). ~60 clans Naruto cités par un personnage sans
   fiche ; les **3 factions macro One Piece** (Gouvernement Mondial, Armée Révolutionnaire, Civil)
   absentes alors que `crew`, le cran *en dessous*, est fiché à 96 %. La hiérarchie OP est mieux
   peuplée au milieu qu'en haut. **Quelques dizaines de fiches donneraient un parent à des
   centaines de personnages d'un coup.**
2. **Le parent n'existe pas et ne doit pas exister** (Dragon Ball 421 orphelins, JoJo 159, HxH 167).
   Ces univers n'ont pas de conteneur canon pour la majorité de leur casting. **On ne fabrique pas
   un conteneur pour faire nombre.** Ces fiches vivent par leur axe de filtre (saga, partie, nen) et
   par « Voir aussi » (§3).
3. **La fiche est vide de tout** (305 fiches, 4,0 %). Ni descFr, ni description, ni dossier. Elles
   gardent socle + image + « Voir aussi ». Rien d'autre. Voir §3.

**Ce qu'on ne fait pas** : créer les 13 fiches « division Bleach », les 7 « Partie JoJo », les 99
« saga Dragon Ball ». Elles n'ajouteraient **aucun** parent nouveau — l'axe scalaire fait déjà le
travail de filtre. Ce serait exactement le « modèle à sept niveaux que personne ne peuple ».

### 2.5 Trouvaille — 25 conteneurs en doublon, 23 sur One Piece

Le rapport R6 signalait « Gotei 13 ×2 ». Le scan complet sur `(universe, nom normalisé)` parmi
`type IN ('status','place')` en donne **25 groupes**, et le motif est bien pire qu'un doublon
isolé :

| Univers | Doublet | Arêtes entrantes |
|---|---|---|
| One Piece | `east-blue` (place) / `east-blue-one-piece` (status) | **77** / 0 |
| One Piece | `impel-down` (status) / `impel-down-lieu` (place) | **19** / 0 |
| One Piece | `skypiea` (status) / `skypiea-lieu` (place) | **18** / 2 |
| One Piece | `alabasta` (status) / `alabasta-lieu` (place) | **11** / 0 |
| One Piece | `loguetown` (status) / `loguetown-lieu` (place) | 3 / **9** |
| One Piece | `dressrosa` (status) / `dressrosa-lieu` (place) | **7** / 2 |
| Bleach | `gotei-13` / `gotei-13-bleach` | **47** / 0 |
| … | 18 autres groupes, même motif | |

**Le cas « Dressrosa mal typé » n'existe pas.** Dressrosa n'est pas une île qu'on aurait typée
`status` par erreur : il y a **deux fiches**, une par type, et les arêtes de membres se sont
réparties au hasard entre les deux selon l'ordre d'import. Le suffixe `-lieu` (13 slugs) est la
signature du second passage. Corollaire : **142 des 152 `status` One Piece portent
`category = "Équipage"`**, îles comprises — d'où des îles rendues en organigramme d'équipage
pirate.

**Décision** : la fusion des 25 doublets est un **prérequis** à tout affichage d'effectif agrégé et
à tout `containerOf()`. Sans elle, les compteurs sont faux de moitié sur les plus gros conteneurs du
site. Règle de fusion proposée (à valider, §8 Q1) : *garder le twin `place`, y recoller les arêtes
du twin `status`, transformer le slug abandonné en redirection.*

---

## 3. La hiérarchie de la fiche

### L'ordre de lecture — six niveaux concentriques, toujours dans cet ordre

Une fiche pauvre et une fiche riche partagent **le même DOM, la même grille `ak-zone-grid`, le même
ordre de blocs**. La différence n'est jamais un gabarit alternatif : ce sont les niveaux 2 à 5 qui
rendent `null`, un par un.

| Niv. | Bloc | Présence mesurée | Où il vit |
|---|---|---|---|
| **0** | **Socle** — chips type/rareté/univers + nom en très grand (Bebas italic) | **100 %** (`type`, `universe`, `rarity`, `name` : 0 NULL sur 7 674) | Surface, en tête |
| **1** | **Signe** — portrait, ou tuile générée (initiale + dégradé d'accent) | image 89,1 % (100 % `character`, **13 % `profession`**) ; summary 99,6 % | Surface |
| **2** | **Rattachements** — grappes cliquables (village/clan/crew/faction…) ou chip ◈ Collection | 48,6 % des personnages | Surface |
| **3** | **Récit** — descFr + dossier de sections | descFr 93,9 % · dossier 62,6 % (86 % persos, 20-53 % ailleurs) | Pleine largeur, `gridColumn: 1/-1` |
| **4** | **Réseau** — relations typées + « Voir aussi » | 87,4 % ont ≥1 arête ; **12,6 % (970) isolées** | Grappes de surface + bas de page |
| **5** | **Signatures rares** — formes/ArcFrieze, radar databook, nindō, doubleurs | formes **1,9 %** (78 persos, toujours ≥2 formes) · radar **0,9 %** (37, dont 27 Naruto canon) | Canal ou sous le portrait — **jamais** dans le flux principal |

Le niveau 5 vit à part **par construction** : s'il apparaissait dans le flux, son arrivée
déplacerait tout ce qui est en dessous. Placé dans le canal ou sous le portrait, il est purement
additif. C'est déjà le cas en code, et c'est le point le plus solide du système actuel : Naruto
Uzumaki (37 formes, radar, nindō) et Tomaru Minakura (0 forme, 0 radar) partagent la même grille.

### Comment une fiche pauvre garde la même structure sans faire semblant

Trois interdits, et un seul principe.

> **Chaque niveau répond à « et si la donnée n'existe pas ? » par UNE ligne de code — une garde de
> longueur — jamais par une branche de gabarit.**

1. **Jamais un titre sans contenu.** « Description », « Attributs », « Relations » ne s'affichent
   pas vides. `DossierSections` le fait déjà : `.filter(s => s?.titre && s?.texte)` — une section à
   moitié écrite est **invisible**, pas tronquée.
2. **Jamais un message d'excuse.** Pas de « données manquantes », pas de « bientôt disponible ».
   L'exception assumée : « Aucun membre relié dans le registre pour l'instant. » sur les 52
   organisations isolées — honnête, mais c'est une impasse (§4), donc à accompagner d'un
   « Voir aussi », pas à supprimer.
3. **Jamais une image cassée.** `image_url` absent (10,9 %, jusqu'à **87 % sur `profession`**) →
   tuile générée. Jamais un `<img>` sans branche de repli.

Le résultat est une fiche **plus courte et plus dense en typographie** — le nom géant du niveau 0
pèse proportionnellement plus lourd faute de contenu dessous. C'est un rendu, pas un aveu.

### Le défaut de routage — corrigé par la capacité, pas par le libellé

Le routeur teste aujourd'hui `category === 'Attaque'` **à la lettre** (`[slug]/page.tsx` l.97). Les
1 408 fiches Jutsu (`category: "Jutsu"`) et les 44 Stand JoJo n'atteignent donc jamais le gabarit
riche « bandeau signature + Maîtrisée par », et retombent sur le générique.

Chiffré ici : **1 780 fiches `power`/`skill` ne portent pas `category = "Attaque"`, et 1 676 d'entre
elles ont au moins une arête `maitrise` entrante** — la hiérarchie de contenu attendue existe déjà
dans les données, elle n'est simplement jamais rendue.

**Décision** : router **par capacité réelle**, jamais par libellé.

```
type ∈ {power, skill} ET relationsIn.some(r => r.relation === 'maitrise')
```

Gain : 1 676 fiches, sur au moins 3 univers, en une condition. Et la règle ne casse plus au prochain
libellé de catégorie inventé par la curation (`Fruit du Démon` 211, `Transformation` 45,
`Kekkei genkai` 15…).

### Arbitrage A5 — les sections réinjectées dans `attributes`

`queries.ts` l.262 fait `attributes: { ...e.attributes, sections }` : les sections lues dans
`akasha_sections` sont refusionnées **en mémoire** dans le sac d'attributs, à chaque lecture. Le
volet Placement blâme ce point pour le bug « [object Object] » du 07/08 et propose une contrainte
`CHECK`. **J'ai retenu la correction du code comme mesure première, contre la contrainte SQL**,
parce qu'une contrainte s'applique à l'**écriture en base** : elle ne peut structurellement pas
atteindre une fusion faite à la lecture. La poser seule, c'est croire un bug corrigé alors qu'il
reste entièrement possible.

Ordre retenu, et il compte :

1. **Ajouter** `sections` comme champ propre sur le retour de `getEntryBySlug`
   (`{ ...e, sections, relationsOut, relationsIn }`) **sans retirer** la fusion — période de grâce,
   zéro casse.
2. Migrer les 4 points de montage de `DossierSections` vers le nouveau champ.
3. **Retirer** la fusion.
4. Poser la contrainte `CHECK` comme filet contre la persistance.

⚠ **COLLISION** : l'étape 3 change la forme d'un objet que la vague surfaces manipule. À faire
après fusion des deux vagues, ou sur diff vérifié (§8 Q8).

---

## 4. La navigation

### Profondeur — quatre niveaux de path, jamais cinq

```
L0  /learn/akasha                              Registre (tous filtres en query string)
L1  /learn/akasha/u/[slug]                     Hub d'univers
    /learn/akasha/{tops,wanted,c/[slug]}       Vitrines — MÊME niveau, entrées latérales
L2  /learn/akasha/u/[slug]/[axis]/[value]      Page d'axe
L3  /learn/akasha/[slug]                       Fiche
```

Tout affinage — rareté, tri, recherche, pagination, **et sous-axe** — reste en **query string** via
le builder unique `registryHref`.

**Arbitrage A3.** Le volet Entités décrit une contenance à profondeur émergente (2 crans mesurés,
sans plafond de principe) ; la Navigation plafonne le path. **J'ai retenu le plafond de path contre
la profondeur libre d'URL** : 121 fiches sur 7 674 (1,6 %) ont un 2ᵉ cran, concentrées à 76 % sur
Naruto. Un 5ᵉ segment multiplierait `generateStaticParams`, l'ISR et le SEO par une dimension que
6 univers sur 8 ne rempliront jamais.

Le mécanisme existe déjà — c'est le `attr2/val2` du drill-down Naruto village→clan — mais il est
**câblé en dur** (`taxo.slug === 'naruto'`, l.65 et 94). **Décision** : le généraliser en le
déclarant comme **donnée** sur `UniverseAxis` :

```ts
drillInto?: string[]   // liste PLATE de sous-axes combinables, PAS une chaîne emboîtée
```

Plate, parce que les trois sous-axes Naruto (`clan`, `rank`, `generation`) sont combinables entre
eux au même niveau, pas imbriqués. Un univers qui exigerait 3 crans emboîtés est un cas particulier
à instruire, pas un besoin à anticiper.

### Fil d'Ariane — un composant, monté partout

État mesuré : `Crumbs.tsx` existe, porte 4 niveaux + JSON-LD, et n'est monté **que sur les fiches**
(grep : seul `[slug]/page.tsx` l'importe). Trois nav inline le réimplémentent (hub, page d'axe,
vitrine) et **`/tops` et `/wanted` n'en ont aucun**.

**Contrat retenu** :

- Un seul composant, monté sur **toute page ≠ L0**.
- Chaque maillon affiche le **nom lisible** du niveau (jamais un slug), le dernier n'est pas un lien.
- Le **sous-filtre actif** (`attr2/val2`) est visible — comme maillon ou comme suffixe du maillon
  axe. Aujourd'hui il est silencieux.
- **Arbitrage A7** : un maillon pointe vers **sa propre route** — page d'axe L2 **ou** fiche L3 —
  **jamais nécessairement vers une fiche du registre**. J'ai retenu ça contre la lecture « chaque
  maillon = une fiche », parce que celle-ci pousserait à créer des fiches `division` Bleach ou
  `partie` JoJo que §2.4 refuse délibérément. *Navigabilité du maillon : toujours garantie.
  Existence d'une fiche conteneur derrière : jamais garantie.*

### Mouvements latéraux — deux temps, jamais confondus

1. **Re-scope EN PLACE** dans le canal : clic sur une grappe (famille, technique, membre,
   appartenance) → **zéro navigation**, re-render du panneau.
2. **Navigation fiche→fiche DIRECTE** via un CTA explicite (« Ouvrir la fiche → ») — **ne repasse
   jamais par le hub**.

Les « valeurs sœurs » d'une page d'axe (Konoha → Suna) sont le même patron appliqué aux collections.
Ce mécanisme fonctionne déjà partout où un canal existe. Le problème n'a jamais été le mécanisme :
c'est son absence de repli quand la donnée manque.

### Sortie d'impasse — le seul bug grave, et le moins cher

**Définition opérationnelle** : *une fiche est en impasse si, en retirant le chrome global
(UniverseWheel + ⌘K), aucun clic n'atteint une autre fiche.* Le chrome est un filet de sécurité,
**jamais** une preuve qu'une fiche n'est pas en impasse.

Mesuré : **970 fiches sans aucune arête** (664 personnages, 118 lieux, 102 artefacts, 52
organisations, 30 pouvoirs, 4 autres). Après déduction des replis qui fonctionnent déjà — gabarit
générique montant `SimilarSection`, passerelle seiyū partagé — il reste :

```
664 personnages isolés
  − 424 sauvés par un seiyū JP partagé avec ≥1 autre fiche
  =  77 avec un seiyū solitaire  +  163 sans seiyū  →  240 impasses personnages
+  52 organisations isolées  ( « Aucun membre relié… » )
+   1 lieu à ères
= 293 impasses réelles (3,8 %)
```

**La cause est en trois lignes de code** : `SimilarSection`/`listSimilar` n'est monté que sur le
gabarit générique (l.351) et le gabarit Attaque (l.172). Les branches `character`, `status` et
`eras` — **4 438 fiches, 58 % du site** — ne l'appellent jamais.

**Arbitrage A2.** Fallait-il un prédicat savant (`relations vides ET pas de conteneur résolu`) pour
éviter d'afficher « Voir aussi » sur une fiche qui a déjà un chip village cliquable ? **J'ai retenu
le prédicat simple contre le prédicat composite**, sur mesure : sur les 970 fiches sans arête,
**6** ont un conteneur résolu par axe. Six. Faire dépendre chaque rendu de fiche d'un
`containerOf()` — un import, une résolution de nom, un risque de désynchronisation — pour 0,08 % du
corpus, c'est de l'ingénierie pour l'ingénierie.

Et le dilemme s'évapore si l'on change la nature du repli : **« Voir aussi » est ADDITIF, jamais
exclusif**. Un bloc de suggestions sur une fiche qui a déjà un rattachement n'est pas une erreur,
c'est du confort. Le prédicat ne sert qu'à décider si on le monte **inconditionnellement** :

```ts
// Condition retenue — donnée déjà chargée par getEntryBySlug, ZÉRO requête neuve
entry.relationsOut.length === 0 && entry.relationsIn.length === 0
```

**Seuil de page d'axe** : une valeur d'axe curée à **moins de 5 fiches** ne reçoit pas de route L2
pérenne (dé-curer ou fusionner). Une profondeur qui existe sans contenu à voir est une impasse
déguisée en existence. Restes connus : DB Majin/Angel, Bleach 13 divisions, JoJo Parties 7-8,
Initial D écuries < 3. ⚠ **COLLISION** : toucher à ça touche `generateStaticParams` — voir §8 Q7.

---

## 5. La structure du code

### Les cinq couches

```
1  Supabase                        akasha_entries · akasha_relations · akasha_sections
2  lib/akasha/*.ts   (à plat)      GÉNÉRIQUE — queries, types, schema, relations, sections,
                                   forms, flavor, href, collections, containment
                                   ⛔ zéro littéral de nom/slug d'univers
3  lib/akasha/universe/<slug>/     BESPOKE — un point de vérité par univers : taxonomie,
                                   HubVisual, datasets de carte, exclusions curées
4  components/akasha/              PRÉSENTATION générique — ZoneShell, zones, dispatcher
                                   d'icônes, mosaïque/liste ; hub/ ; zone/
5  app/learn/akasha/               ORCHESTRATION pure — slug→config, requêtes, choix du
                                   gabarit par TYPE ⛔ plus aucun `if (taxo.slug === …)`
```

État mesuré : `app/learn/akasha` = 13 fichiers / 2 387 lignes · `components/akasha` = **44** fichiers
/ 4 990 lignes (27 à plat + 13 dans `hub/` + 4 dans `zone/` — l'écart avec le « 29 » souvent cité
vient des sous-dossiers) · `lib/akasha` = **17** modules / 2 746 lignes.

### La règle de nommage, et où va un composant nouveau

> **Sert tous les univers → couche 4. Propre à un seul → couche 3.**
> **Nommer d'après ce que la chose EST, jamais d'après l'univers qui l'a commandée.**

`EraZone` porte le mauvais nom (héritage de `CharacterZone`) : elle ne sert **jamais** un
personnage — ses 37 fiches sont `status` 23 / `place` 8 / `artifact` 3 / `skill` 1 / `profession` 1 /
`power` 1. À renommer au moment de l'extraction du `ZoneShell`, pas avant.

Arbre de décision :

```
Le composant lit-il un nom d'univers pour décider QUOI RENDRE ?
├─ oui, un switch de dispatch  → défaut. Le dispatch va dans la config (registre à clé).
└─ non
   ├─ un seul univers l'utilisera (carte, roue, plateau)  → couche 3, enregistré par clé
   └─ plusieurs                                            → couche 4, piloté par props
```

### Le pivot config-driven — ajouter un 9ᵉ univers sans toucher au partagé

Trois défauts mesurés bloquent aujourd'hui cette promesse :

**(a) 12 littéraux d'univers hors config**, dont 10 dans `u/[slug]/page.tsx` — le fichier dont
l'en-tête promet « zéro code par univers ». Cascade de 5 branches choisissant le fournisseur
d'icône, `OP_NON_CREW`, `NARUTO_NON_CLAN`, bloc `DragonBallCards`.

**(b) Trois API d'icônes concurrentes** : `NarutoIcons` expose 4 composants nommés par axe ;
`OnePieceIcons` et `DragonBallIcons` exposent chacun une fonction `xAxisIcon(attr, value, size)` ;
`MoreUniverseIcons` généralise déjà — **une seule fonction servant 5 univers** par dispatch interne.
Le motif a fait ses preuves sur 5/8. **Naruto est l'anomalie, pas la norme.**

**(c) `HubVisual.map` est un type union FERMÉ** (`'op-world' | 'db-cosmos'`) : une 3ᵉ carte oblige à
éditer le type, donc à toucher `universe-taxonomy.ts` pour du code de rendu.

**Les trois corrections, dans l'ordre** :

```ts
// 1. Façade unique — tue la cascade à 5 branches
axisIcon(slug, attr, value, size)

// 2. Le comportement spécial devient une DONNÉE
interface UniverseAxis { …; drillInto?: string[] }

// 3. Registre à clé, ouvert — au lieu d'un type union fermé
HUB_VISUAL[slug].signature = 'nen-wheel'   // résolu dans un registre extensible
```

Après quoi **un 9ᵉ univers = un dossier `lib/akasha/universe/<slug>/` + une clé dans le registre.**
Zéro fichier partagé modifié.

### Arbitrage A4 — le grep de conformité ne porte pas sur tout

La règle « zéro littéral, grep à 0 » est violée par le plan censé la servir : les étapes proposées
corrigent `axisIcon` et `drillInto` et laissent explicitement `HubSignature.tsx` hors scope, au motif
qu'un seul univers en a besoin. **J'ai retenu la distinction dispatch/interne contre le grep
universel**, parce qu'une règle qu'on annonce et qu'on ne tient pas est pire qu'une règle plus
étroite qu'on tient :

- ⛔ **Littéral de DISPATCH** — `if (universe === 'Bleach') return <BleachWorldsMap/>` : **défaut**,
  corrigible par un registre à clé. C'est ce que le grep vérifie.
- ✅ **Littéral INTERNE** à un composant déjà déclaré bespoke — le JS de `BleachWorldsMap` qui
  connaît les kanji de ses 13 divisions : **légitime**, et couvert par la règle du registre.

Portée du grep, donc : `app/learn/akasha/**` et `components/akasha/*.tsx` à plat. **Pas**
`lib/akasha/universe/**`, **pas** l'intérieur d'un composant bespoke enregistré.

Un corollaire à ne pas oublier : les composants bespoke doivent tolérer un axe absent **et** un
libellé renommé. `NenWheel` fait déjà `if (chips.length < 3) return null`. `KiraDuel` cherche
`'Kira'` **en dur** : si la curation renomme ce libellé, le composant se dégrade **silencieusement**.
Cibler la 1ʳᵉ/2ᵉ valeur **déclarée par l'axe**, jamais une chaîne littérale.

### Duplication de présentation — le `ZoneShell` fantôme

`CharacterZone` (484 l.), `OrganizationZone` (236 l.) et `EraZone` (206 l.) réimplémentent **chacune**
son `chip()`, son `Row()`, son bloc d'en-tête et sa coquille de canal. Le blueprint lot 1 nommait un
`ZoneShell.tsx` partagé — jamais matérialisé. C3-3 planifie une **4ᵉ** (PowerZone) et une **5ᵉ**
(GenericZone) sur le même moule non partagé.

**Décision** : extraire `ZoneShell` **avant** C3-3. Sinon on écrit une 4ᵉ puis une 5ᵉ copie de la
même chrome, et le renommage d'`EraZone` devient un chantier à 5 fichiers au lieu de 1.

**Hors scope explicite** : l'unification `AkashaMosaic`/`AkashaList`/`CardArt` (backlog C3-4 de Dan,
ne pas dupliquer) ; la généralisation de `BleachWorldsMap` en concept « axe imbriqué »
(sur-ingénierie tant qu'un seul univers en a besoin).

---

## 6. Les cas limites assumés

Ce ne sont pas des trous. Ce sont des formes que le modèle **prévoit**, et il faut que ce soit écrit
pour qu'un agent ne « corrige » pas ce qui n'est pas cassé.

### Initial D — 44 fiches, **zéro** `power`, 1 seul `skill`

Le niveau « Techniques » de la fiche personnage ne s'affichera **jamais** pour cet univers entier.
**Le modèle accepte qu'un niveau disparaisse à l'échelle d'un UNIVERS, pas seulement d'une fiche.**
La richesse se reporte sur ses deux axes réels (`affiliation`, `col`) et sur les artefacts
(véhicules). Sa couverture parent est de **73,1 %** — deuxième meilleure du corpus — sans aucun
axe de pouvoir. ⛔ Ne jamais créer une page d'axe vide « pour la symétrie ».

### Death Note — 84 fiches, **2 lieux**, 0 `power`

Aucune carte géographique n'a de sens. Le conteneur pertinent est `camp` (`status`), pas `place` :
**un univers entier peut sauter le niveau « lieu » sans casser le modèle**, précisément parce que la
contenance ne l'impose pas. Couverture : 37,8 %, entièrement par `camp` et les relations
allié/ennemi.

**Le point que personne n'avait tranché — où vivent les LOIS d'un système de pouvoir ?** Les règles
numérotées du Death Note (comme les lois du Nen, les principes du Haki) ne sont rattachées à aucun
personnage. Elles vivent aujourd'hui en `facts[]` et `eras[].event` dans la fiche artefact unique
« Death Note ». Le test en 3 questions du volet Placement les classerait en « attribut » — mais un
**ensemble numéroté, potentiellement inter-référencé**, n'est ni un fait scalaire isolé ni de la
prose continue.

> **Décision** : une règle d'un système de pouvoir est une **SECTION** de la fiche artefact ou
> pouvoir qui la porte. **Jamais une fiche.**

Motif : une règle n'a ni image, ni relations, ni page propre. En faire des fiches créerait une
trentaine de culs-de-sac parfaits — exactement ce que §4 cherche à fermer. Les sections sont
ordonnées, indexées par ⌘K depuis le 06/08, et se déplient déjà (niveau 3).

### JoJo — 233 fiches, casting renouvelé à chaque Partie

`partie` n'est **pas un conteneur** : c'est un **repère chronologique**. Un personnage n'est pas
*contenu dans* une Partie, il y **apparaît**. ⛔ Ne jamais migrer cet axe vers une arête `appartient`.
`category` est NULL pour tous les personnages JoJo → fil d'Ariane à 3 maillons, pas 4 : **correct,
pas un bug**. Couverture parent 11,2 %, dont **0 via l'axe** — cohérent avec `partie` 0/179 fiches
en face, qui est un choix (§2.4).

**Le défaut réel, qui n'est pas là où on croit** : `partie` est un **scalaire**. Joseph Joestar porte
`partie: "Partie 1-2"` alors que son propre graphe le rattache explicitement à la **Partie 3**
(8 arêtes : allié Muhammad Avdol, famille Jotaro Kujo, mentor Anne Merlai…) et à la **Partie 4**
(2 arêtes). Sur `.eq('attributes->>partie', 'Partie 3')`, Joseph — allié majeur de cette partie —
**n'apparaît jamais**.

> **Décision** : `partie` passe en **tableau JSONB**, et reste un **attribut** (A1 : c'est un axe
> déclaré). Le filtre devient un test de contenance de tableau. C'est le seul axe du corpus à valeurs
> multiples légitimes ; il ne justifie pas de changer le modèle, seulement la forme de cette valeur.

**Risque à instruire avant** : l'homonymie de lignée (Joestar). Un poseur de relations qui ne scope
pas par partie peut rattacher une relation famille au mauvais individu — même classe de bug que la
pollution inter-univers déjà purgée (215 arêtes). À sonder **avant** d'étendre quoi que ce soit aux
relations famille JoJo.

### Bleach — la fiche « Gotei 13 » existe, ses 13 divisions n'existent pas

`BleachSeireitiMap.tsx` câble en dur les 13 capitaines et leurs kanji : ce n'est **pas** un rendu du
graphe, c'est un composant à données câblées. **Et c'est la bonne solution à ce stade** (A4 : littéral
interne à un composant bespoke, légitime). Créer les 13 fiches n'ajouterait aucun parent nouveau et
ouvrirait 13 pages vides. ⛔ Ne pas ficher tant qu'aucune page dédiée n'est validée par Dan.

Fait remarquable : Bleach résout **94 % de ses parents par l'ARÊTE** (148 contre 9 par l'axe) —
l'inverse exact de Naruto. C'est ce qui justifie que le repli par arête ne soit pas optionnel.

### Dragon Ball — 473 personnages, **11,0 % de couverture**, la plus basse du corpus

Ce n'est pas un retard de curation : le canon DB n'a pas de conteneur d'appartenance pour la
majorité de son casting. `saga` (0/99 fiches) est un repère narratif, comme `partie`. **On n'invente
pas de conteneur.** DB tient par son axe `race`, sa carte du multivers et « Voir aussi ». Et son
absence totale de stats (0 sur 473 personnages) est un état sain : **zéro stat estimée**.

### Formes et radar hors Naruto

Luffy et Zoro portent des `forms[].stats` au même format JSON que les personnages Naruto canon.
Ils **restent badgés « estimé »** (décision Dan 06/08, codée `estime = universe !== 'Naruto'` mais
écrite nulle part hors commentaire — à remonter au niveau du composant partagé). Le radar est réservé
aux databooks canon Naruto : 37 fiches sur 4 034, **0,9 %**. Un niveau volontairement rarissime,
jamais un standard à généraliser.

### Le contrôle négatif — ce qui marche

`Toyota AE86 Trueno` : `type: artifact`, `category: "Voiture"`, bascule vers `EraZone` par
`attributes.eras`, et `STAT_LABELS` relabellise « leader » en « Porteur » selon le type. **Aucun
accroc.** Utile comme repère : le modèle casse quand une **garde est absente** (Voir aussi, routage
par capacité), pas par principe. Même chose pour les 19 fiches « Dial » One Piece isolées : le
gabarit générique monte `SimilarSection`, `rarity` est peuplé, le filet fonctionne. **Le trou est
spécifique aux branches character/status/eras — ce n'est pas un problème général de couverture.**

---

## 7. La migration

### L'ordre, et ce qui casse si on l'inverse

| # | Étape | Coût | Gain | Ce qui casse si fait plus tôt / plus tard |
|---|---|---|---|---|
| **1** | **Monter `SimilarSection`** sur les branches `character`/`status`/`eras` de `[slug]/page.tsx`, condition `relationsOut.length === 0 && relationsIn.length === 0` | 1 commit, ~10 lignes, **zéro requête neuve** | Ferme **293 impasses** | Rien. La fonction existe, tourne déjà sur 2 gabarits. **À faire en premier, sans discussion.** |
| **2** | **Écrire `lib/akasha/containment.ts`** — `containerOf()` / `membersOf()`, implémentant les 2 canaux + la garde char→char | ~1 h | **Le seul artefact à créer.** Toute zone future lit la contenance sans réapprendre les pièges | Si écrit **après** l'étape 3, la vague surfaces aura recodé sa propre résolution → deux vérités |
| **3** | **Fusionner les 25 doublets de conteneurs** (§2.5) | script + relecture | Débloque tout comptage d'effectif | Si fait **après** l'adoption de `akasha_org_stats`, tous les effectifs publiés sont faux de moitié sur les plus gros conteneurs |
| **4** | **Router par capacité** (`maitrise` entrante) au lieu de `category === 'Attaque'` | ~1 h | **1 676 fiches** au gabarit riche | Si fait **avant** l'étape 5, on refactorise un bloc qu'on va déplacer |
| **5** | **Extraire `ZoneShell`** + renommer `EraZone` | 2-3 h, 3 fichiers larges | Prérequis direct de C3-3 | Si fait **après** C3-3, c'est 5 fichiers au lieu de 3 |
| **6** | **`axisIcon()` façade unique** puis **`drillInto` en config** | ~30 min + ~1 h | Tue 12 littéraux, ouvre le 9ᵉ univers | Aucun risque, aucun changement visuel |
| **7** | **`sections` en champ propre** (A5, en 4 temps) puis contrainte `CHECK` | ~1 h | Ferme la classe de bug du 07/08 | ⚠ **COLLISION** — change la forme d'un objet que la vague surfaces manipule |
| **8** | **Purger `attributes.jutsu`** + auditer les `family[]` sans slug | script | Une seule source de vérité sur les techniques | Si fait **avant** l'étape 2, on ne saura pas vérifier ce qu'on a perdu |
| **9** | **`akasha_org_stats`** — l'exécuter enfin (écrit dans `supabase/akasha_aggregates.sql`, **jamais appliqué** : aucune référence en code) | 1 requête | Rend la règle « conteneur actif » vérifiable en 1 appel | **Après** l'étape 3, jamais avant |
| **10** | **Combler les parents manquants** — 3 factions macro OP, ~60 clans Naruto | curation | Des centaines de personnages gagnent un parent | Après 2 et 3, pour mesurer le gain réel |
| **11** | **`scripts/akasha-lint.mjs`** (§1) | ~2 h | La seule chose qui empêche la dérive à un an | En dernier : il encode les décisions ci-dessus |
| **12** | **Unifier le fil d'Ariane** + `partie` en tableau + seuil R7 | — | — | ⚠ **COLLISION** sur les 3. À caler avec la vague surfaces. |

### Les trois inversions qui coûtent cher

1. **Agrégats avant fusion des doublets** (9 avant 3) → on publie des effectifs faux sur `east-blue`,
   `impel-down`, `gotei-13`, et on les corrige deux fois.
2. **Zones avant `ZoneShell`** (C3-3 avant 5) → une 4ᵉ et une 5ᵉ copie de `chip()`/`Row()`.
3. **Helper de contenance après les surfaces** (2 après la vague parallèle) → deux définitions
   concurrentes de « cette fiche a-t-elle un parent », exactement le nœud que A2 vient de dénouer.

### Vérification

Après **chaque** étape : `npx tsc --noEmit` + **une** page en navigateur (texte + console suffisent).
Un commit atomique par ligne du tableau. Aucun workflow multi-agents — chaque étape est mesurée,
pré-mâchée, et exécutable seule. Les chiffres de ce document servent de **ligne de base** : le gain
se recompte, il ne s'affirme pas.

---

## 8. À trancher par Dan — questions fermées

> **08/08/2026 — Dan tranche « go tout » : les options en gras (les recommandations) sont
> DÉCIDÉES.** Statut d'exécution vérifié indépendamment (base + code) juste sous le tableau.

| # | Question | Options | Enjeu chiffré |
|---|---|---|---|
| **Q1** | Fusionner les **25 doublets de conteneurs** (23 One Piece + Gotei 13 + Buggy/Baggy) en gardant le twin `place` et en redirigeant le slug abandonné ? | **oui** / non / oui mais garder le twin `status` | Sans ça, `east-blue` affiche 77 membres d'un côté et 0 de l'autre. Bloque tout effectif agrégé. |
| **Q2** | Purger `attributes.jutsu` (94 noms EN non slugués sur Naruto Uzumaki, doublon des 105 arêtes `maitrise`) et ses équivalents ? | **oui** / non | Deux sources concurrentes sur le fait central de la fiche la plus riche. |
| **Q3** | Router le gabarit riche par **capacité** (`maitrise` entrante) au lieu du libellé `category === 'Attaque'` ? | **oui** / non | **1 676 fiches** `power`/`skill` gagnent le bandeau + « Maîtrisée par », dont 1 408 Jutsu Naruto et 44 Stand JoJo. |
| **Q4** | Créer les **3 fiches de faction macro One Piece** (Gouvernement Mondial, Armée Révolutionnaire, Civil) ? | **oui** / non | 3 fiches → un parent pour ~170 personnages aujourd'hui orphelins. Meilleur ratio du corpus. |
| **Q5** | Créer les **~60 fiches de clan Naruto** manquantes (clans cités par un personnage, sans fiche) ? | toutes / **seulement celles à ≥ 3 personnages** / aucune | 74 % des clans cités ont une fiche ; les 26 % restants sont surtout des clans à 1-2 membres. |
| **Q6** | Confirmer que **Bleach `division`, JoJo `partie`, DB `saga`** restent des **axes purs sans fiches** ? | **oui, confirmé** / non, ficher | 119 fiches qui n'ajouteraient **aucun** parent nouveau et ouvriraient autant de pages vides. |
| **Q7** | Appliquer le **seuil < 5 fiches → pas de route L2** (DB Majin/Angel, Bleach divisions, JoJo Parties 7-8, Initial D écuries) **maintenant** ou après fusion des deux vagues ? | maintenant / **après fusion** | Touche `generateStaticParams` — risque de 404 sur un lien que la vague surfaces vient de poser. |
| **Q8** | Sortir `sections` de `attributes` (A5) **avant** ou **après** la fusion avec la vague surfaces ? | avant / **après** | Change la forme du retour de `getEntryBySlug`, consommé par `DossierSections` à 4 endroits. |

### Statut d'exécution, vérifié le 08/08/2026 (recompte + lecture directe du code et des pages)

- **Q1 — DÉCIDÉ ET EXÉCUTÉ.** 41 groupes / 42 fiches perdantes fusionnées (chantier
  `doublets-conteneurs`), twin `place` gardé, 42 redirections 308 dans `next.config.js` — testé en
  direct : `/learn/akasha/skypiea` → 308 → `/learn/akasha/skypiea-lieu`, contenu enrichi des
  relations et sections du perdant. ⚠️ **Défaut trouvé à la lecture** : la fusion de sections ne
  déduplique que sur **titre exact**. Sur `skypiea-lieu`, le dossier affiche désormais côte à côte
  « Porte du Ciel » (FR, migré) et « Heaven's Gate » (EN, déjà présent) qui racontent le même
  fait, de même « Île des Anges »/« Angel Island » et « Parc Wagomuland »/« Wagomuland » — contenu
  factuellement redondant sous deux titres, visible en lecture réelle, non couvert par la mesure
  « 79 sections doublons ignorées » de l'audit (qui ne voit que les titres identiques).
- **Q2 — DÉCIDÉ ET EXÉCUTÉ.** 0 fiche avec `attributes.jutsu` en base, sur l'ensemble du corpus.
  Sur `naruto-uzumaki` : compteur affiché « Techniques · 105 » = exactement le compte indépendant
  des arêtes `maitrise` sortantes (105, requêté directement) — cohérent, plus de double compte.
- **Q3 — DÉCIDÉ, NON EXÉCUTÉ.** `app/learn/akasha/[slug]/page.tsx` (l.103) teste toujours
  littéralement `category === 'Attaque'`, aucun repli par `maitrise` entrante. Reste à faire.
- **Q4 — DÉCIDÉ, EXÉCUTÉ À 2/3.** `gouvernement-mondial` et `civil` créées et vérifiées en base et
  en page. La 3ᵉ (Armée Révolutionnaire) existe déjà en base sous un nom désaligné, non rapprochée
  — à corriger par alias, pas par une fiche neuve. **⚠️ Défaut trouvé à la lecture, sur les 2
  fiches créées** : `gouvernement-mondial` et `civil` affichent toutes deux « **0 membre au
  registre — Aucun membre relié dans le registre pour l'instant** », alors que l'audit
  `parents-manquants` revendique 24 et 137 personnages « résolus » sur ces fiches. Cette
  résolution est un **appariement par attribut** (`attributes.faction` ≈ nom de la fiche), pas une
  arête `akasha_relations` — et `OrganizationZone.tsx`, le composant qui rend la page, ne lit
  **que** `relationsIn.filter(r => r.relation === 'appartient')`. Aucune arête n'a été créée : le
  lecteur qui visite ces fiches ne voit aucun des personnages que l'audit dit leur avoir
  rattachés. C'est exactement le rôle non encore construit de `containerOf()`/`membersOf()`
  (§7, étape 2 de ce document) : tant qu'il n'est pas écrit et branché dans `OrganizationZone`,
  toute fiche-parent créée par appariement d'axe reste une coquille vide à l'écran.
- **Q5 — DÉCIDÉ, EXÉCUTÉ PARTIELLEMENT, CONFORMITÉ AU SEUIL NON VÉRIFIABLE ICI.** 3 fiches créées
  (Sarutobi, Kagetsu, Izuno) — **même défaut « 0 membre » que Q4**, confirmé en direct sur
  `/learn/akasha/clan-sarutobi` (0 membre affiché ; « Sarutobi » n'est même pas une valeur curée de
  l'axe `clan` Naruto, donc pas de page L2 de repli non plus). Le rapport `parents-manquants` note
  lui-même 3 valeurs restées sans fiche malgré ≥ 3 personnages (Fūma Land of Sound 7, Kazekage 5,
  Shirogane 4), écartées « pour un motif distinct chacune » — motifs non vérifiés individuellement
  dans le budget de cette relecture ; à recroiser si Dan y attache de l'importance.
- **Q6 — DÉCIDÉ : oui, confirmé.** Statu quo, rien à exécuter. Vérifié : aucune fiche
  `division`/`partie`/`saga` n'existe en base pour ces 3 axes, conforme.
- **Q7 — DÉCIDÉ (après fusion) — la fusion des deux vagues, c'est cette vérification-ci : reste à
  exécuter.** `generateStaticParams` de `u/[slug]/[axis]/[value]/page.tsx` génère toujours toutes
  les valeurs curées sans filtrer par effectif — pas encore fait.
- **Q8 — DÉCIDÉ (après fusion) — même remarque que Q7 : reste à exécuter.** Dans
  `lib/akasha/queries.ts` (l.262), la fusion en mémoire `attributes: { ...e.attributes, sections }`
  est toujours en place ; aucune des 4 étapes de l'ordre retenu (§3, arbitrage A5) n'a commencé.

---

## Annexe — les six règles à ne jamais réapprendre

1. **`character → character` n'est jamais de la contenance**, quelle que soit l'étiquette
   (7 relations concernées, `possede` incluse).
2. **Un axe n'implique jamais une fiche cliquable en face** — compter avant de router un lien
   (`division` 0/13, `partie` 0/179, `saga` 0/99).
3. **L'axe se lit avant l'arête, mais l'arête n'est pas optionnelle** — Naruto résout à 88 % par
   l'axe, Bleach à 94 % par l'arête.
4. **Une section ne s'affiche que si titre ET texte existent** ; une image absente donne une tuile,
   jamais un cadre vide ; un titre sans contenu ne s'affiche pas.
5. **Le chrome global (⌘K, roue) n'est jamais la preuve qu'une fiche n'est pas en impasse.**
6. **Le `head` PostgREST plafonne à 1 000 lignes** — toute mesure passe par `range()`, sinon les
   chiffres sont faux et personne ne le voit.
