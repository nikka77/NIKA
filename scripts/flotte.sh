#!/bin/zsh
# scripts/flotte.sh — la flotte NIKA OPS : un worker par couloir, en priorité de fond.
# Couloirs : le cloud produit (quota tokens/min = la vraie limite), le local juge (GPU à lui seul).
# Usage :  ./scripts/flotte.sh            (tourne jusqu'à Ctrl-C, les deux couloirs en --loop)
#          CLOUD_MODEL=cerebras/gpt-oss-120b ./scripts/flotte.sh   (changer de fournisseur)
# taskpolicy -c background : macOS déclasse CPU/IO — l'interface de Dan reste fluide.
cd "$(dirname "$0")/.."

MODELE=${CLOUD_MODEL:-groq/openai/gpt-oss-120b}
# Juge d'une AUTRE famille que le producteur (angles morts complémentaires, duel du 25/07).
# Au cloud il cesse d'être le goulot : 15 h de GPU local mesurées pour juger tout le chantier.
JUGE=${JUDGE_MODEL:-}
grep -q '^GEMINI_API_KEY=' .env.local 2>/dev/null && JUGE=${JUDGE_MODEL:-gemini/gemini-flash-lite-latest}
[ -z "$JUGE" ] && JUGE=ollama/gemma4:12b

echo "⚓ flotte NIKA OPS — production : ${MODELE} · jugement : ${JUGE} (Ctrl-C pour tout arrêter)"

taskpolicy -c background node --env-file=.env.local scripts/agent-worker.mjs --loop \
  --cloud="$MODELE" --types=akasha_attrs,akasha_relations,fandom_descfr,flavor_akasha,fiche_technique,fiche_artefact,fiche_lieu,fiche_lexique --conc=3 &
PROD=$!

taskpolicy -c background node --env-file=.env.local scripts/agent-worker.mjs --loop \
  --juge="$JUGE" --types=review_local --conc=2 &
JUGE=$!

trap "kill $PROD $JUGE 2>/dev/null" INT TERM
wait
