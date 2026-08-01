#!/bin/zsh
# scripts/secretaire.sh — le démon du secrétaire WhatsApp (launchd, KeepAlive).
# Lit UNIQUEMENT la file ops_chat : léger (~50 Mo), cloud seulement, aucun modèle local chargé.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"   # launchd : PATH minimal sinon (exit 127)
# Priorité de fond : taskpolicy (macOS) ou nice (Linux) — mêmes scripts sur les deux mondes.
if command -v taskpolicy >/dev/null; then PRIO=(taskpolicy -c background); else PRIO=(nice -n 10); fi   # TABLEAU : en zsh, $chaine non citée ne se découpe pas — « nice -n 10 » devenait un nom de commande (01/08)
cd "$(dirname "$0")/.."
exec "${PRIO[@]}" node --env-file=.env.local scripts/agent-worker.mjs \
  --loop --chat --conc=2
