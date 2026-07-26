#!/bin/zsh
# scripts/flotte.sh — la flotte NIKA OPS : un worker par couloir, en priorité de fond.
# Couloirs : le cloud produit (quota tokens/min = la vraie limite), le local juge (GPU à lui seul).
# Usage :  ./scripts/flotte.sh            (tourne jusqu'à Ctrl-C, les deux couloirs en --loop)
#          CLOUD_MODEL=cerebras/gpt-oss-120b ./scripts/flotte.sh   (changer de fournisseur)
# taskpolicy -c background : macOS déclasse CPU/IO — l'interface de Dan reste fluide.
cd "$(dirname "$0")/.."

MODELE=${CLOUD_MODEL:-groq/openai/gpt-oss-120b}

echo "⚓ flotte NIKA OPS — production : ${MODELE} · jugement : local (Ctrl-C pour tout arrêter)"

taskpolicy -c background node --env-file=.env.local scripts/agent-worker.mjs --loop \
  --cloud="$MODELE" --types=akasha_attrs,akasha_relations,fandom_descfr,flavor_akasha,fiche_technique,fiche_artefact,fiche_lieu,fiche_lexique --conc=3 &
PROD=$!

taskpolicy -c background node --env-file=.env.local scripts/agent-worker.mjs --loop \
  --types=review_local --conc=2 &
JUGE=$!

trap "kill $PROD $JUGE 2>/dev/null" INT TERM
wait
