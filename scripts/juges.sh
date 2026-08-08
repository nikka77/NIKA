#!/bin/zsh
# scripts/juges.sh — L'ÉTAGE DE JUGEMENT, sur son propre couloir (02/08/2026).
#
# Deuxième worker, dédié aux relectures. Il n'a été possible qu'une fois la lecture par couloir
# en place (supabase/nika_ops_lecture_par_couloir.sql) : avant elle, un worker spécialisé recevait
# la file entière et devait rendre ce qui n'était pas à lui — réémission au fond, ordre détruit à
# chaque tour, et deux workers qui se renvoient la file sans jamais la vider. Mesuré ce matin dans
# les deux sens : la flotte est tombée à 0,5 verdict/minute, puis un chantier de 23 sections mis
# en tête n'a pas été servi de l'heure.
#
# POURQUOI DEUX ÉTAGES SÉPARÉS plutôt qu'un worker qui fait tout : la chaîne consomme DEUX
# verdicts par production. Un worker unique les traite dans l'ordre de la file, donc en alternant
# par blocs — mesuré : 169 verdicts et 0 production, puis 77 productions et 0 verdict. Chaque
# étage sur son couloir, chacun avance à son rythme sans jamais attendre l'autre, et le rapport
# 2 pour 1 s'établit tout seul.
#
# Le jury reste celui d'usine.sh : gemma gratuit d'abord, DeepInfra en filet.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if command -v taskpolicy >/dev/null; then PRIO=(taskpolicy -c background); else PRIO=(nice -n 10); fi
cd "$(dirname "$0")/.."

# mistral-small AVANT Qwen (02/08 soir) : gemma épuisé, tout le monde retombait sur le même
# Qwen DeepInfra qui saturait (« Model busy » en chaîne). Mistral est « sans plafond » et
# n'a jamais été pris en défaut comme JUGE — il encaisse le premier repli, Qwen respire.
# COULOIR RETIRÉ le 07/08 : deepinfra (Qwen3-32B) répond 402 « You need positive balance » —
# solde épuisé. Le laisser en DEUXIÈME position faisait basculer chaque tâche plafonnée par Groq
# sur un guichet mort : elle repartait en file, revenait, replafonnait — la file MONTAIT au lieu
# de descendre. Un couloir dont on sait qu'il est fermé n'a rien à faire dans une rotation ;
# à re-créditer chez le fournisseur pour le réarmer.
JUGE=${JUDGE_MODEL:-openrouter/google/gemma-4-26b-a4b-it:free,mistral/mistral-small-latest,nvidia/nvidia/nemotron-3-super-120b-a12b,groq/llama-3.3-70b-versatile,openrouter/mistralai/mistral-small-24b-instruct-2501,anthropic/claude-haiku-4-5}
CONC=${NIKA_CONC_JUGES:-20}

# RÉATTRIBUTION AU VOL DU JURY (07/08) — une relecture porte, dans sa charge utile, le jury décidé
# à son ENRÔLEMENT. Retirer un couloir mort de la liste ci-dessus ne libère donc pas celles qui
# l'attendent déjà : le 07/08, 5 des 24 emplacements étaient collés à deepinfra (402, solde épuisé)
# et leurs tâches étaient reportées en boucle — la file MONTAIT au lieu de descendre, indéfiniment.
# --force-jury les réassigne par emplacement (A = juge n°1, B = juge n°2, jamais le même modèle
# pour les deux, donc pas de faux consensus). Deux FAMILLES distinctes, comme le veut la règle du
# 28/07. NIKA_FORCE_JURY pour changer sans toucher au script.
# Choisis sur le BUDGET DU JOUR restant, pas sur la seule disponibilité (08/08, 01 h 10) :
# openrouter/gemma-4-26b:free est plafonné à 450 requêtes/jour et les avait toutes consommées.
# Chaque fiche recevait alors son premier verdict et jamais le second — les emplacements de juge
# se terminaient bien (« ✓ done »), mais AUCUN dossier ne se bouclait, ce qui ne se voit pas dans
# le journal. gemini/gemma-4-31b-it porte 11 500 req/jour et n'en avait consommé que 45.
# Deux familles distinctes : Meta pour le premier juge, Google pour le second.
# RETIRÉ PAR DÉFAUT le 08/08 — ce contournement a fait son temps. Il servait à décoller les
# relectures collées à un couloir mort ; depuis que la clé d'un couloir est la MÊME pour le
# marquer et pour le relire (correctif du 08/08), la substitution ordinaire fait ce travail
# toute seule. Or il entonnait TOUT le trafic dans DEUX couloirs, chacun plafonné à 24 requêtes
# par minute : mesuré 154 substitutions pour 67 succès en dix minutes, soit 6,7 jugements par
# minute alors que six couloirs étaient ouverts. Un contournement qu'on oublie de retirer
# devient un goulot. Le remettre pour une campagne précise : NIKA_FORCE_JURY=a,b
FORCE_JURY=${NIKA_FORCE_JURY:-}

echo "⚖️  étage de jugement — couloir review_local · jury ${JUGE} · réattribution ${FORCE_JURY:-(aucune)} · ${CONC} de front"
exec "${PRIO[@]}" node --env-file=.env.local scripts/agent-worker.mjs \
  --loop --types=review_local --juge="$JUGE" ${FORCE_JURY:+--force-jury="$FORCE_JURY"} --conc="$CONC"
