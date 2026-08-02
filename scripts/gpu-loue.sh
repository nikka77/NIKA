#!/bin/zsh
# scripts/gpu-loue.sh — CAMPAGNE SUR GPU LOUÉ (01/08/2026).
#
# Le jugement est le vrai goulot : chaque fiche coûte 1 appel pour produire et 2 pour juger,
# et les paliers gratuits de 2026 rationnent durement. Le Mac juge gratuitement mais met 80 s
# par verdict. Un GPU loué à l'heure (~0,30 $) rend le même service 20 à 40 fois plus vite :
# une soirée de location vide un arriéré de plusieurs jours pour moins d'un dollar.
#
# Le worker ne fait AUCUNE différence entre le Mac et un GPU distant : il suffit de pointer
# OLLAMA_HOST ailleurs. Ce script lance donc un nœud juge identique à juge-mac.sh, mais dont
# le calcul se fait sur la machine louée.
#
# AVANT DE LANCER — côté fournisseur (RunPod, Vast.ai…), à faire par Dan :
#   1. créer un pod avec l'image officielle « ollama/ollama », GPU au choix (un RTX 4090
#      suffit très largement pour un modèle de 8 à 14 milliards de paramètres) ;
#   2. exposer le port 11434 et relever l'URL publique du pod ;
#   3. y charger le modèle juge :  ollama pull qwen3:8b
#      (qwen3 est notre juge qualifié : famille Qwen, distincte des juges nuage Google/Meta) ;
#   4. protéger l'accès si le fournisseur le permet — un Ollama ouvert sur Internet est un
#      service de calcul offert au premier venu. À défaut, ne laisser vivre le pod que le
#      temps de la campagne et le détruire ensuite.
#
# Usage :
#   OLLAMA_HOST=https://xxxx-11434.proxy.runpod.net [OLLAMA_CLE=…] ./scripts/gpu-loue.sh
#
# ⚠ FACTURATION À L'HEURE : le pod coûte tant qu'il tourne, même inactif. Ce script affiche
# la file restante à chaque tour pour que tu saches quand l'éteindre — et il s'arrête TOUT
# SEUL quand il n'y a plus rien à juger, pour ne pas facturer une nuit de sommeil.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "$(dirname "$0")/.."

if [ -z "$OLLAMA_HOST" ]; then
  echo "OLLAMA_HOST manquant. Exemple :" >&2
  echo "  OLLAMA_HOST=https://xxxx-11434.proxy.runpod.net ./scripts/gpu-loue.sh" >&2
  exit 1
fi

echo "→ épreuve du GPU loué : $OLLAMA_HOST"
MODELES=$(curl -sf --max-time 20 ${OLLAMA_CLE:+-H "Authorization: Bearer $OLLAMA_CLE"} "$OLLAMA_HOST/api/tags")
if [ -z "$MODELES" ]; then
  echo "✗ injoignable. Vérifie que le pod tourne et que le port 11434 est exposé." >&2
  exit 1
fi
echo "$MODELES" | grep -q 'qwen3' || {
  echo "✗ qwen3 absent du GPU. Sur le pod :  ollama pull qwen3:8b" >&2; exit 1; }
echo "✓ GPU joignable, qwen3 présent"

# Concurrence 4 : un GPU loué encaisse plusieurs verdicts de front, contrairement au Mac.
echo "⚖️  campagne de jugement sur GPU loué — arrête le pod dès que la file est vide"
exec node --env-file=.env.local scripts/agent-worker.mjs \
  --loop --local --types=review_local --juge=ollama/qwen3:8b --conc=4  # exige OLLAMA_NUM_PARALLEL=4 sur le pod (defaut Ollama: 1 — les 4 verdicts seraient serialises)
