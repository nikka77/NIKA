# AKASHA — carnet de chantiers

> Mesuré le 10/08/2026 par `scripts/audit-akasha-etat.mjs` (trace : `data/audits/akasha-etat.json`).
> **Chaque ligne cite un chiffre recomptable.** Relancer la même commande dit si le chantier a servi —
> c'est la seule façon de savoir qu'un travail a été livré et pas seulement fait.
>
> État de départ (10/08 au matin) : **7 632 fiches · 16 388 arêtes · 19 099 sections**.
> Après trois vagues, le même soir : **7 654 fiches · 16 769 arêtes · 19 084 sections**
> (+22 fiches — les pays Naruto qui manquaient · +381 arêtes · −15 sections orphelines balayées).
> Après la vague 5 (poche Dragon Ball) : **7 654 fiches · 16 819 arêtes** — +31 arêtes, 17 isolées
> sorties, 11 résumés de remplissage remplacés là où le résumé est réellement lu.

## Ce qui manque, par ordre de ce que ça coûte au lecteur

| # | Chantier | Mesure au 10/08 | Où ça se voit |
|---|---|---|---|
| 1 | **Fiches isolées** — aucune arête, ni entrante ni sortante | **662** mesuré le 10/08 à 13:21 UTC (747 avant la passe One Piece, 951 le matin) · **One Piece 366** (451 avant, −85), Dragon Ball 129 (146 avant), JoJo 49, Bleach 42, Naruto 39, HxH 22, Death Note 10, Initial D 5 · les 84 fiches sorties par la passe One Piece affichent TOUTES leur nouveau lien (84/84 vérifiées page par page, `data/audits/op-postflight-rendu-*.json`), comme les 17 de la passe Dragon Ball | Le canal n'a rien à montrer, la navigation « un saut à la fois » s'arrête net |
| 2 | **Résumés de remplissage** — « Personnage secondaire de Dragon Ball. » | 420 → **231** au 10/08 dont **121 Dragon Ball** et 110 Naruto · sur les 132 Dragon Ball, **112 ne montraient `summary` NULLE PART** (mesuré : `flavorText(descFr)` le devance partout) ; la vague 5 n'a écrit que les **11 visibles**, laissé les 7 sans `descFr` et refusé 2 sans phrase définitoire | `CharacterCard.tsx:101` est le SEUL lecteur inconditionnel (`f.summary ?? entry.summary`), alimenté par les 48 premiers persos Dragon Ball par popularité → cartes TCG du hub. Partout ailleurs : `flavor ?? summary`, donc seconde ligne. Après la vague 5 : 2 cartes TCG portent encore le texte creux (gokuu-black, jinzouningen-17-gou — aucune phrase de tête définitoire) |
| 3 | **Fiches sans visuel** | **779** au 10/08 20 h (818 le matin) | Rangée muette en liste, hub, recherche, classement, image OpenGraph |
| 4 | **Fiches sans texte FR** (`descFr`) | **401** au 10/08 20 h (454 le matin) | Fiche sans corps : titre, attributs, rien à lire |
| 5 | **Valeurs d'axe hors liste curée** | **0 axe sale** — `DIRTY_AXES` est vide depuis le 10/08 ; 6 valeurs canon promues, le reste documenté comme bruit structurel | Chip absent du hub, ou valeur qui double une valeur curée |
| 6 | **Fiches sans dossier** (aucune section) | **2 878** — trois vagues ont conclu qu'il n'y a PAS de gisement : les textes ne portent aucune articulation à découper | La fiche s'arrête après le canal |
| 7 | **Colonne `description`** | **vide sur 7 599 / 7 632** ; redit `summary` sur 5 | Colonne morte que le schéma présente comme le texte long — un architecte concevrait autour |
| 8 | **Fiches sans résumé du tout** | 29 → **10** au 10/08 (19 lieux Naruto écrits depuis `descFr`) · les 10 restantes : 8 sans `descFr` (→ chantier 4), 2 hors forme | Rangée sans sous-titre |
| 9 | **Groupes d'images partagées non lus** | **37** sur 41 | C'est ce tri qui a sorti les 4 portraits usurpés le 09/08 |
| ~~10~~ | ~~**EraZone → module `timeline` d'EntityZone**~~ | ~~14 fiches~~ | **FAIT le 10/08** — `EraZone.tsx` supprimée, branche `eras` de `page.tsx` retirée ; les 14 gagnent `relations` (14/14), `orbit` (5), `axis` (1), « Attributs » et « Voir aussi ». Traces : `data/audits/erazone-*` |

## Règles de conduite pour tout agent qui prend une ligne

1. **Mesurer d'abord.** Le chiffre du tableau est daté ; il a pu bouger. Recompter avant d'agir.
2. **Trace AVANT écriture**, dans `data/audits/`, et un chemin de fichier DIFFÉRENT par exécution
   d'écriture — un contrôle relancé après coup a déjà effacé la preuve de 42 écritures (08/08).
3. **Aucune invention.** Extraire d'un texte existant ou d'une source citable, jamais compléter au
   jugé. Une donnée juste sans sa preuve est une donnée non auditable.
4. **Écrire une donnée n'est pas la livrer.** Terminer par « où est-ce que ça SE VOIT ? » et ouvrir
   la page. Un champ que rien n'affiche est pire qu'un champ absent : il fait croire le travail fait.
5. **Une seule colonne par chantier.** Ne jamais réécrire `attributes` en entier si le chantier ne
   porte pas dessus — d'autres écrivent en parallèle.
6. **Le tiroir par défaut est celui qui existait.** Une classification incertaine laisse la donnée
   où elle est ; elle ne l'exile pas dans un axe où personne ne la cherchera.
7. **Mesurer son taux d'erreur sur vingt cas avant d'écrire les mille.** Au-delà de 5 %, resserrer
   la règle plutôt qu'écrire.

## Décisions de Dan à ne jamais rouvrir

Forme sans image = tuile stylisée conservée · zéro NOUVELLE stat estimée · Luffy et Zoro gardent
leurs stats marquées « estimé » · stats post-databook omises · radar réservé aux databooks canon
Naruto · **gamification supprimée** (14/07) · Bleach = carte des 4 mondes · **DA en pause** :
prototyper en vrai code, jamais de maquettes générées.

## ~~Plafond mesuré le 10/08 (vague 4)~~ — **LEVÉ, revérifié le 10/08 par la vague 5**

`CharacterZone.tsx` porte désormais une grappe `appartenancesLiees` qui lit `relationsOut` pour
`appartient` / `habite` / `exerce`. Recontrôlé à la main avant d'écrire quoi que ce soit :
`/learn/akasha/giant-panda` et `/learn/akasha/king-of-hell` affichent maintenant
« Appartenances · Appartient à — Créature invoquée ». Les 31 arêtes posées ce soir ont ensuite été
vérifiées **une page à la fois** : `scouter` et `super-dragon-balls` disent « Possédé par »,
`tapion` « Réside » + « Famille », `mutaito` « Élève », `toppo` « Mentor », et côté cible
`konats`/`big-gete-star` disent « Habité par ». Ce qui reste de l'ancien constat, pour mémoire :

`app/learn/akasha/[slug]/page.tsx` route `type === 'character'` vers **`CharacterZone`**, qui ne
passe pas par `deriveShape` : sa grappe « Appartenances » se construit depuis `attributes`
(`BELONG_ATTRS` + `affiliation`), jamais depuis `relationsOut`, et son bloc « liens » n'accepte que
`allie · mentor · eleve · ennemi · rival`. **Une arête `appartient` partant d'un personnage est donc
invisible sur sa propre fiche.** Mesuré : 4 031 personnages, dont **3 509 porteurs d'au moins une
arête**, tous concernés. Vérifié à la main le 10/08 : `/learn/akasha/giant-panda` et
`/learn/akasha/king-of-hell` ne contiennent pas « Créature invoquée » dans leur markup rendu, alors
que `/learn/akasha/creature-invoquee` affiche bien ses 52 membres ; `/learn/akasha/genbu-island`
(place) et `/learn/akasha/wind-release-bursting-compressed-air` (power), eux, affichent
« Autres liens · 1 — Appartient à · … ».

Second point relevé au passage sur `/learn/akasha/creature-invoquee` : l'en-tête annonce
**52 membres au registre** et la grappe en liste **43** — 9 membres ne sont ni affichés ni repliés
derrière un « + N autres ». Même famille que le compteur mort de konohagakure (leçon du 10/08).

## Plafond mesuré le 10/08 (vague 5) — la poche Dragon Ball n'est pas un problème d'extraction

Rendement du wiki `dragonball.fandom.com` mesuré **champ par champ** sur les 146 isolées Dragon Ball
(trace `data/audits/poche-db-aretes-rendement-*`), 531 cibles brutes, 26 champs :

| champ | cibles servies | résolues chez nous | ce que ça dit |
|---|---|---|---|
| `allegiance` | 61 | **0** | Frieza Force, Ginyu Force, Pride Troopers, Team Universe 2/3/4/10/11… |
| `race` | 51 | **0** | `Earthling` demandé par 20 isolées — chez nous la race est un AXE, pas une fiche |
| `anime/manga/game/movie debut` | 128 | **0** | épisodes et jeux, hors corpus |
| `date of death` | 72 | **0** | dates liées |
| `address` | 16 | 7 | le seul champ à rendement réel, cible `place` |
| `user` | 53 | 19 | 3 objets seulement (Scouter, Super Dragon Balls…) |
| `famconnect` | 20 | 6 | dont 9 refusées : « (owner) », « (host) », « (creator) » ne sont pas de la parenté |
| `mentors` / `students` / `homeworld` / `occupation` | 20 | 7 | petits volumes |

**La cause du zéro n'est pas l'extracteur, c'est la cible absente.** Notre corpus Dragon Ball :
473 personnages, 504 pouvoirs, 83 lieux, 45 techniques, 30 objets et **2 fiches de type
organisation** (Capsule Corporation, Saiyan). 61 liens d'allégeance n'ont nulle part où pointer.
Le chantier qui débloquerait le plus n'est donc pas une regex mais **la création d'une quinzaine de
fiches d'organisation** (Commando Ginyu, Armée du Ruban Rouge, Pride Troopers, Kamikaze Fireballs,
Team Universe 2/3/4/10/11, Slug's Demon Clan, Organization of Babidi, Dark Empire, Dragon Team).

Deuxième gisement sondé et **refusé** : nos propres `descFr`. Sept motifs relationnels prédiqués
(« membre du », « élève de », « originaire de la planète ») sur les 146 isolées → **5 candidats**,
dont un faux (« les élèves de Kame-Sennin » attribué au sujet de la fiche). 20 % d'erreur : au-dessus
du seuil, motif jeté. Les textes Dragon Ball décrivent, ils ne rattachent pas.

## Registre d'alias (vague 4)

`data/alias-cibles-naruto.json` — titre de wiki → fiche, **une preuve redemandable par paire**.
Construit par `scripts/akasha-alias-registre.mjs` (relançable : il redemande chaque témoin à la
source). Quatre témoins, aucune distance de chaînes : `T1` redirection dure **ou douce**
(`{{soft redirect|…}}`), `T2` interlangue (`prop=langlinks` du wiki EN + redirections du wiki FR,
égalité stricte après `norm` avec le nom / la parenthèse / le `roman_name` / le slug), `T3` paire
déjà confirmée dans `data/alias-cures.json`, `T4` précédent du graphe **mesuré** (≥ 10 arêtes en
place + tirage de 20 sources relues sur le wiki, seuil 95 %).
`data/alias-cures.json` sert désormais aussi **dans le sens source** (nos noms français → titre
anglais) : c'est ce qui rend 6 de nos isolées cherchables sur le wiki.

## L'image OpenGraph — réparée le 10/08 au soir, et ce qu'elle ne pourra pas montrer

La carte de partage de chaque fiche (`app/learn/akasha/[slug]/opengraph-image.tsx`) montrait un
**cadre vide** : `@vercel/og` n'accepte qu'une liste fermée de formats (`qI` du bundle installé :
png, apng, jpeg, gif, svg+xml) et **les trois CDN du registre servent du WebP quel que soit le
fichier demandé** — 75 tirages, 75 WebP, en-tête `Accept` et User-Agent indifférents. Pire, les
**121 fiches à chemin relatif** faisaient JETER satori (« Image source must be an absolute URL ») :
leur route ne rendait rien du tout, réponse vide, `curl` code 52.

Le rendu encaisse désormais ce que la donnée lui donne — `image_url` n'a pas bougé d'une ligne.
`lib/akasha/og-visuel.ts` réécrit l'adresse au moment du rendu (`format=png` chez Fandom, `.webp`
→ `.jpg` chez MyAnimeList, optimiseur du site pour les fichiers locaux), **vérifie les octets
reçus** et ne rend l'image que s'il a constaté un format accepté ; sinon `null`, et la carte
retombe sur la tuile à icône.

| Mesure | Avant | Après |
|---|---|---|
| Fiches à visuel dont le format est servable | 1 sondée sur 6 904 | **6 827 / 6 904** (`scripts/recensement-og-servables.mjs`, corpus entier paginé) |
| Images OG ouvertes et regardées | 5, toutes vides ou sans réponse | **142, zéro cadre vide** (`scripts/verifier-og-rendu.mjs`) |
| Fiches dont la route ne répondait rien | 121 | **0** |

**Plafonds mesurés, à ne pas rouvrir sans nouvelle mesure :**
- **64 fiches Dragon Ball** pointent sur `dragonball-api.com`, qui n'existe qu'en WebP : `.png` et
  `.jpg` rendent 404, `?format=png` est ignoré. Elles gardent la tuile à icône.
- **13 GIF animés** (Bleach, One Piece) : satori accepte le GIF, mais **resvg n'en peint rien** —
  éprouvé, un GIF rend 4 157 octets de PNG là où un PNG en rend 273 994. Elles gardent l'icône.
  La 14ᵉ fiche à `.gif` (`mont-myogi`) passe : Fandom convertit ce fichier statique en PNG.
- **Latence** : les fiches à GIF coûtent de 10 à 16 s au rendu (le repli télécharge jusqu'à 6,5 Mo
  avant de refuser). Les autres tiennent sous la seconde.
- **`public/images/akasha/ref/nara.webp` est un panneau « sens interdit »**, pas un emblème du clan
  Nara : la carte le rend fidèlement, c'est la donnée qui est à reprendre (hors de ce chantier).
