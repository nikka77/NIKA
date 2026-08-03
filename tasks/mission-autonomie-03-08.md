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
