# Mission autonomie du 03/08/2026 — « jusqu'au dernier traitement One Piece »

Dan a confié la journée entière : enchaîner les vagues d'agents sans intervention, dans cet
ordre, jusqu'au bout. Ce fichier est la mémoire de la mission : toute session qui reprend
doit le lire, mesurer l'état réel, et continuer à la phase courante.

## Ordre des phases (une phase n'attend pas la suivante si elle est bloquée par un tiers)

| # | Phase | Fait quoi | Critère de sortie |
|---|-------|-----------|-------------------|
| A | Vider « à relire » | Vagues d'arbitrage sur les litiges MÛRS (deux verdicts posés, contestés) | plus aucun litige mûr non signé « ⚖ Claude » |
| B | Les 915 « écartées par les gardes » | Curateur d'alias (8 univers) → realias-requeue ; puis Rédacteur des sans-source par univers | écartées = figurants sans page NI mentions (impossibles documentés) |
| C | Dragon Ball 100 % | découpe + usine + blitz fenêtre sur les persos sans dossier | dossiers persos ≈ total − sans-page |
| D | Naruto 100 % | idem (1 337 persos, 1 981 autres entrées — le plus gros) | idem |
| E | One Piece 100 % | idem (1 449 persos, 821 autres) | idem |

## Ce qui tourne en permanence (VPS, indépendant de la fenêtre)
- `nika-usine` (production), `nika-juges` (double jury, conc 24), `nika-arbitre` (lots Claude CLI)
- timers : litiges (15 min), dispatch (15 min), remplisseurs (20 min), audit à l'aveugle (dim. 9h30)
- découpes lancées en `systemd-run` : nika-decoupe-naruto / -op / -db2

## Vraies limites (à surveiller, ce ne sont PAS les tokens de la fenêtre)
- guichets quotidiens : Claude CLI VPS 400 lots/j, gemma:free 450, groq 800, nemotron 450
- Fandom : ~1 page / 2 s → une découpe de 1 400 persos ≈ 50 min
- si un guichet ferme, la rotation bascule seule ; si TOUS ferment, l'usine dort jusqu'à minuit UTC

## Invariants de qualité (jamais négociables, quelle que soit la vitesse)
1. Arbitre : motif CITÉ de la source, ids du chargeur uniquement, décision cohérente avec le motif.
2. Sceptique sur CHAQUE approbation (citation > 15 car. sinon l'approbation tient).
3. Garde stricte à l'application : id/slug+index absents du chargeur = verdict jeté.
4. Blitz de sections : un vérificateur indépendant par chargeur, pose signée (`sectionsSource`),
   jamais par-dessus une section existante.
5. QC de flux à chaque vague + audit sémantique périodique contre sources FRAÎCHES.
6. Omission ≠ défaut · romanisation NIKA = référence · motifs d'un autre univers = verdict croisé.

## Journal d'avancement (à tenir à jour à chaque vague)
- 03/08 09:27 — état de départ : à relire 4 476 · écartées 915 · DB 344 dossiers/477 ·
  Naruto 0/1 337 · One Piece 0/1 449. Phase A lancée (123 mûrs), B lancée (curateur 8 univers),
  découpes C/D/E lancées sur le VPS.
- 03/08 10:0x — GISEMENT : la pile ne mûrissait pas parce que 1 879 productions attendaient un
  arbitre que le guichet VPS (400 lots/j) ne pouvait plus servir. Grande vague fenêtre :
  **1 823 verdicts appliqués, 1 548 publications** (85 % d'approbations, 67 bascules sceptique).
  Pile 4 476 → 3 106. Leçon : un filtre d'export trop étroit (doubles refus seulement) cache le
  vrai stock — compter par ÉTAT de verdict avant de conclure que « rien n'est mûr ».
- 03/08 11:2x — Blitz Dragon Ball : 1 535 sections → 1 175 validées (357 recalées), 1 123 posées.
  DB persos 81 %, autres entrées 0 → 417/664. Outils du blitz déplacés du scratchpad AU DÉPÔT
  (une purge de session les avait effacés en pleine mission).
- 03/08 11:3x — Phase D lancée : Naruto exporté (850 entités, 3 313 sections, 165 chargeurs),
  blitz partie 1/2 (83 chargeurs) en vol. Export One Piece lancé dans la foulée.
- 03/08 13:0x — Phase D (Naruto) : 3 313 sections traduites en 2 blitz (330 agents), 637 recalées
  par les vérificateurs (19 %), **2 614 posées** sur 796 fiches, 0 perdue. Naruto 0 → 796 dossiers.
- 03/08 13:1x — Phase E lancée : One Piece exporté (901 entités, 4 347 sections, 215 chargeurs,
  99 sans page), blitz 1/3 en vol.
- 03/08 17:0x — **PHASE E TERMINÉE**. One Piece : 4 347 sections en 3 blitz (430 agents),
  1 023 recalées par les vérificateurs (24 %), **3 163 posées** sur 847 fiches. OP 0 → 856 dossiers.
- **BILAN DE MISSION** : 2 687 / 4 038 personnages ont un dossier (67 %), contre 1 090 ce matin.
  ~11 000 sections traduites dans la journée, ~2 900 recalées par les vérificateurs, 9 hallucinations
  interceptées par la garde stricte, 0 écriture erronée. 1 823 verdicts d'arbitrage appliqués
  (1 548 publications). Reste : les figurants sans page Fandom (plafond honnête) et les « autres
  entrées » de Naruto/One Piece (2 802) qui n'ont jamais été découpées — chantier suivant.
- 03/08 20:0x — Après-mission, 3 vagues de sillage : 4 310 verdicts appliqués (3 081 publications,
  ~330 bascules sceptique). Blitz « autres entrées » : Naruto 242 + One Piece 1 237 sections posées.
  **Persos 3 411/4 038 (84 %)** · autres entrées 880/3 653 (24 %).
  Plafond mesuré des autres entrées : 530/700 Naruto et 310/700 One Piece SANS page Fandom
  exploitable (jutsu mineurs = infobox sans prose) — impossibles documentés, pas un échec.
