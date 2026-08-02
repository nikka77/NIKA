#!/bin/zsh
# scripts/arbitre.sh — L'ÉTAGE D'ARBITRAGE CLAUDE, service dédié (02/08/2026).
#
# Pourquoi hors de l'usine : chaque CLI Claude pèse ~190 Mo. Dans l'usine (16 places, cgroup
# 1,4 Go), les lots d'arbitrage empilaient les processus jusqu'au bord de l'OOM — pic mesuré à
# 1,26 Go, un kill au journal. Ici : 2 appels de front, ~400 Mo stables, et un débit propre de
# ~13 litiges/minute (2 × lots de 10 à ~90 s l'appel) — la pile de Dan fond en deux heures.
export PATH="/usr/local/bin:$PATH"
if command -v taskpolicy >/dev/null; then PRIO=(taskpolicy -c background); else PRIO=(nice -n 10); fi
cd "$(dirname "$0")/.."
echo "⚖️  arbitre Claude — lots de 10 · 2 de front"
exec "${PRIO[@]}" node --env-file=.env.local scripts/agent-worker.mjs \
  --loop --types=arbitrage_claude,arbitrage_claude_lot --conc=2 --lot=8
