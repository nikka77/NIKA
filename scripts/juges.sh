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

JUGE=${JUDGE_MODEL:-openrouter/google/gemma-4-26b-a4b-it:free,deepinfra/Qwen/Qwen3-32B,mistral/mistral-small-latest,nvidia/nvidia/nemotron-3-super-120b-a12b,groq/llama-3.3-70b-versatile,openrouter/mistralai/mistral-small-24b-instruct-2501}
CONC=${NIKA_CONC_JUGES:-12}

echo "⚖️  étage de jugement — couloir review_local · jury ${JUGE} · ${CONC} de front"
exec "${PRIO[@]}" node --env-file=.env.local scripts/agent-worker.mjs \
  --loop --types=review_local --juge="$JUGE" --conc="$CONC"
