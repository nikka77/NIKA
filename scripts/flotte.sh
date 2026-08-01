#!/bin/zsh
# scripts/flotte.sh — la flotte NIKA OPS : un worker par couloir, en priorité de fond.
# Couloirs : le cloud produit (quota tokens/min = la vraie limite), le local juge (GPU à lui seul).
# Usage :  ./scripts/flotte.sh            (tourne jusqu'à Ctrl-C, les deux couloirs en --loop)
#          CLOUD_MODEL=cerebras/gpt-oss-120b ./scripts/flotte.sh   (changer de fournisseur)
# taskpolicy -c background : macOS déclasse CPU/IO — l'interface de Dan reste fluide.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
# Priorité de fond : taskpolicy (macOS) ou nice (Linux) — mêmes scripts sur les deux mondes.
if command -v taskpolicy >/dev/null; then PRIO=(taskpolicy -c background); else PRIO=(nice -n 10); fi   # TABLEAU : en zsh, $chaine non citée ne se découpe pas — « nice -n 10 » devenait un nom de commande (01/08)
cd "$(dirname "$0")/.."

MODELE=${CLOUD_MODEL:-groq/openai/gpt-oss-120b}
# Juge d'une AUTRE famille que le producteur (angles morts complémentaires, duel du 25/07).
# Au cloud il cesse d'être le goulot : 15 h de GPU local mesurées pour juger tout le chantier.
JUGE=${JUDGE_MODEL:-}
grep -q '^GEMINI_API_KEY=' .env.local 2>/dev/null && JUGE=${JUDGE_MODEL:-gemini/gemini-flash-lite-latest}
# Juge n°2 en famille croisée (Meta) dès que la clé Groq existe — étude modèles 28/07.
grep -q '^GROQ_API_KEY=' .env.local 2>/dev/null && JUGE=${JUDGE_MODEL:-groq/llama-3.3-70b-versatile}
[ -z "$JUGE" ] && JUGE=ollama/gemma4:12b

echo "⚓ flotte NIKA OPS — production : ${MODELE} · jugement : ${JUGE} (Ctrl-C pour tout arrêter)"

"${PRIO[@]}" node --env-file=.env.local scripts/agent-worker.mjs --loop \
  --cloud="$MODELE" --juge="$JUGE" --conc=3 &
PROD=$!

trap "kill $PROD 2>/dev/null" INT TERM
wait
