# AKASHA — carnet de chantiers

> Mesuré le 10/08/2026 par `scripts/audit-akasha-etat.mjs` (trace : `data/audits/akasha-etat.json`).
> **Chaque ligne cite un chiffre recomptable.** Relancer la même commande dit si le chantier a servi —
> c'est la seule façon de savoir qu'un travail a été livré et pas seulement fait.
>
> État de départ : **7 632 fiches · 16 388 arêtes · 19 099 sections de dossier.**

## Ce qui manque, par ordre de ce que ça coûte au lecteur

| # | Chantier | Mesure au 10/08 | Où ça se voit |
|---|---|---|---|
| 1 | **Fiches isolées** — aucune arête, ni entrante ni sortante | **951** (12,5 %) · One Piece 539, Dragon Ball 148, Naruto 117 | Le canal n'a rien à montrer, la navigation « un saut à la fois » s'arrête net |
| 2 | **Résumés de remplissage** — « Personnage secondaire de Dragon Ball. » | **420** dont **410 en Dragon Ball** | Le résumé est le seul texte visible en liste, en recherche et en méta-description |
| 3 | **Fiches sans visuel** | **818** · One Piece 401, Naruto 305, Bleach 63 | Rangée muette en liste, hub, recherche, classement, image OpenGraph |
| 4 | **Fiches sans texte FR** (`descFr`) | **454** · One Piece 210, Naruto 167 | Fiche sans corps : titre, attributs, rien à lire |
| 5 | **Valeurs d'axe hors liste curée** | **24** · crew OP 12, rank Naruto 4, race DB 4, race Bleach 3, fruit_type OP 1 | Chip absent du hub, ou valeur qui double une valeur curée |
| 6 | **Fiches sans dossier** (aucune section) | **2 862** | La fiche s'arrête après le canal |
| 7 | **Colonne `description`** | **vide sur 7 599 / 7 632** ; redit `summary` sur 5 | Colonne morte que le schéma présente comme le texte long — un architecte concevrait autour |
| 8 | **Fiches sans résumé du tout** | **29** | Rangée sans sous-titre |
| 9 | **Groupes d'images partagées non lus** | **37** sur 41 | C'est ce tri qui a sorti les 4 portraits usurpés le 09/08 |
| 10 | **EraZone → module `timeline` d'EntityZone** | 14 fiches | Décidé au §8 q3 « au LOT 5 », jamais fait — dernier reste du lot 5 |

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
