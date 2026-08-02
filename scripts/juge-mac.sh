#!/bin/zsh
# scripts/juge-mac.sh — LE MAC EN NŒUD JUGE (L25, 01/08/2026).
#
# Pourquoi : les paliers gratuits du nuage rationnent durement le JUGE n°2. Mesuré le 01/08 —
# llama-70b épuisé en une demi-journée, Nemotron n'est pas un débit mais un stock d'environ
# 1 000 crédits qui s'épuise définitivement, Mistral est bridé à ~2 requêtes simultanées.
# Or le double verdict exige DEUX familles distinctes : Google (gemma) est surabondant côté
# nuage, mais tout le reste manque. Le Mac a qwen3:8b — famille Qwen, absente du parc nuage,
# gratuite et sans plafond. Il devient donc le juge n°2 de la flotte quand il est allumé.
#
# Le VPS s'en aperçoit tout seul : chaque worker annonce « ollama » dans son battement
# (ops_workers) et l'enrôlement du jury préfère le nœud GPU quand il en voit un de moins de
# 3 minutes. Quand le Mac s'endort, le nuage reprend la main au battement suivant — rien à
# régler à la main, aucun risque de tâche orpheline (un nœud sans GPU laisse en file toute
# tâche confiée à un modèle local).
#
# COULOIR STRICT : --types=review_local — ce nœud ne produit rien, il juge. La production
# reste au VPS, qui tourne 24/7 ; le Mac n'est là que quand Dan travaille.
# CONCURRENCE 1 : le modèle pèse 7,6 Go sur 16 Go de RAM — deux de front feraient ramer la
# machine de Dan, ce qui n'est pas le but.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "$(dirname "$0")/.."

if ! curl -sf --max-time 5 http://localhost:11434/api/tags >/dev/null 2>&1; then
  echo "Ollama injoignable — lance l'app Ollama, ou : ollama serve" >&2
  exit 1
fi

# KV cache quantifié + flash attention (audit 02/08, doc Ollama) : sur un Mac 16 Go qui pagine,
# q8_0 divise par deux la mémoire du cache de contexte — c'est la pagination, pas le calcul, qui
# faisait les verdicts à 80 s. À poser AVANT le démarrage du serveur Ollama pour être pris.
export OLLAMA_FLASH_ATTENTION=1
export OLLAMA_KV_CACHE_TYPE=q8_0

echo "⚖️  Mac en nœud juge — qwen3:8b (famille Qwen) · couloir review_local"
exec taskpolicy -c background node --env-file=.env.local scripts/agent-worker.mjs \
  --loop --local --types=review_local --juge=ollama/qwen3:8b --conc=1
