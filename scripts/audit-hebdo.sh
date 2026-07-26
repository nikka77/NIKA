#!/bin/zsh
# scripts/audit-hebdo.sh — l'audit à l'aveugle HEBDOMADAIRE (dimanche 9 h, launchd).
# 10 fiches récentes (surtout les ⚡auto de la semaine) re-vérifiées sur source par Claude
# en headless (abonnement Max). Tout « faux » est annulé en base. Le taux surveille la dérive.
cd "$(dirname "$0")/.."
LOG=~/.cache/nika/audit-hebdo-$(date +%Y%m%d).log
mkdir -p ~/.cache/nika
exec >> "$LOG" 2>&1
echo "═══ audit hebdo — $(date '+%Y-%m-%d %H:%M') ═══"

# Session Claude requise : si l'OAuth est expiré, on le dit clairement et on n'invente rien.
if ! claude -p "OK" --output-format text < /dev/null > /dev/null 2>&1; then
  echo "⚠ session claude expirée — lance \`claude\` dans un terminal et connecte-toi, puis relance :"
  echo "  ./scripts/audit-hebdo.sh"
  exit 0
fi

# Outils autorisés : UNIQUEMENT l'outillage d'audit (liste + vote). Rien d'autre.
claude -p "$(cat scripts/audit-hebdo-prompt.md)" \
  --output-format text \
  --allowedTools "Bash(node --env-file=.env.local scripts/ops-audit-batch.mjs:*)" \
  < /dev/null

echo "═══ fin d'audit — $(date '+%H:%M') ═══"
