#!/bin/zsh
# scripts/secretaire.sh — le démon du secrétaire WhatsApp (launchd, KeepAlive).
# Lit UNIQUEMENT la file ops_chat : léger (~50 Mo), cloud seulement, aucun modèle local chargé.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"   # launchd : PATH minimal sinon (exit 127)
# Priorité de fond : taskpolicy (macOS) ou nice (Linux) — mêmes scripts sur les deux mondes.
PRIO=$(command -v taskpolicy >/dev/null && echo "taskpolicy -c background" || echo "nice -n 10")
cd "$(dirname "$0")/.."
exec $PRIO node --env-file=.env.local scripts/agent-worker.mjs \
  --loop --chat --conc=2
