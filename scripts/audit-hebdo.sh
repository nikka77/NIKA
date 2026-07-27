#!/bin/zsh
# scripts/audit-hebdo.sh — l'audit à l'aveugle HEBDOMADAIRE (dimanche 9 h, launchd).
# 10 fiches récentes (surtout les ⚡auto de la semaine) re-vérifiées sur source par Claude
# en headless (abonnement Max). Tout « faux » est annulé en base. Le taux surveille la dérive.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"   # launchd : PATH minimal sinon
cd "$(dirname "$0")/.."
# Token headless (claude setup-token, 1 an) : sans lui, launchd n'a aucune session claude.
TOK=$(grep '^CLAUDE_CODE_OAUTH_TOKEN=' .env.local 2>/dev/null | cut -d= -f2-)
[ -n "$TOK" ] && export CLAUDE_CODE_OAUTH_TOKEN="$TOK"
LOG=~/.cache/nika/audit-hebdo-$(date +%Y%m%d).log
mkdir -p ~/.cache/nika
exec >> "$LOG" 2>&1
echo "═══ audit hebdo — $(date '+%Y-%m-%d %H:%M') ═══"

# Session Claude requise : si l'OAuth est expiré, on le dit clairement et on n'invente rien.
if ! claude -p "OK" --output-format text < /dev/null > /dev/null 2>&1; then
  echo "⚠ session claude invalide — régénère le token : \`claude setup-token\` puis colle-le dans .env.local (CLAUDE_CODE_OAUTH_TOKEN), et relance :"
  echo "  ./scripts/audit-hebdo.sh"
  node --env-file=.env.local scripts/ops-alerte.mjs "⚠ NIKA OPS : audit hebdo SAUTÉ — token Claude invalide. Régénère avec claude setup-token → .env.local (les 2 copies), puis ./scripts/audit-hebdo.sh"
  exit 0
fi

# Outils autorisés : UNIQUEMENT l'outillage d'audit (liste + vote). Rien d'autre.
claude -p "$(cat scripts/audit-hebdo-prompt.md)" \
  --output-format text \
  --allowedTools "Bash(node --env-file=.env.local scripts/ops-audit-batch.mjs:*)" \
  < /dev/null

# Résumé de l'audit → alerte (les 3 lignes AUDIT_ écrites par Claude en fin de course).
RESUME=$(grep -h "^AUDIT_" "$LOG" | tail -3 | tr '\n' ' ')
node --env-file=.env.local scripts/ops-alerte.mjs "◎ NIKA OPS audit hebdo : ${RESUME:-terminé sans résumé — voir $LOG}"

echo "═══ fin d'audit — $(date '+%H:%M') ═══"
