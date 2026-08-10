# AKASHA — carnet de chantiers

> Mesuré le 10/08/2026 par `scripts/audit-akasha-etat.mjs` (trace : `data/audits/akasha-etat.json`).
> **Chaque ligne cite un chiffre recomptable.** Relancer la même commande dit si le chantier a servi —
> c'est la seule façon de savoir qu'un travail a été livré et pas seulement fait.
>
> État de départ (10/08 au matin) : **7 632 fiches · 16 388 arêtes · 19 099 sections**.
> Après trois vagues, le même soir : **7 654 fiches · 16 769 arêtes · 19 084 sections**
> (+22 fiches — les pays Naruto qui manquaient · +381 arêtes · −15 sections orphelines balayées).

## Ce qui manque, par ordre de ce que ça coûte au lecteur

| # | Chantier | Mesure au 10/08 | Où ça se voit |
|---|---|---|---|
| 1 | **Fiches isolées** — aucune arête, ni entrante ni sortante | **764** au 10/08 après la vague 4 (783 avant, 951 le matin) · One Piece 451, Dragon Ball 146, JoJo 49, Bleach 42, **Naruto 39** (58 avant) · ⚠️ 12 des 19 désisolées n'affichent RIEN sur leur propre fiche : `CharacterZone` ne lit pas `relationsOut` (cf. plafond en bas de page) | Le canal n'a rien à montrer, la navigation « un saut à la fois » s'arrête net |
| 2 | **Résumés de remplissage** — « Personnage secondaire de Dragon Ball. » | 420 → **133** au 10/08 (vague 1 : 131 · vague 2 : 175) · reste 129 en Dragon Ball, dont **78 dont le texte nomme la fiche autrement** (« Recoome »/« Reacoom ») | ⚠️ la colonne `où ça se voit` de cette ligne était FAUSSE : `lib/akasha/flavor.ts` sert `flavorText(descFr)` AVANT `summary` en liste, en mosaïque et en méta description, et la recherche fouille déjà `descFr`. Mesuré : sur 175 résumés écrits, **2** changent la liste/la méta, **5** changent une carte TCG du hub Dragon Ball (`CharacterCard`, seul lecteur direct de `summary`) |
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

## Plafond mesuré le 10/08 (vague 4) — une arête écrite n'est pas une arête lue

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
