#!/bin/zsh
# scripts/nuit.sh — la routine de nuit NIKA OPS (lancée par launchd à 2 h 30, ou à la main).
# Remplit la file avec des lots modestes (quotas gratuits respectés), draine la production au
# cloud, puis le jugement en local, puis note l'ancrage HHEM (CPU). Tout en priorité de fond ;
# la RAM est rendue en fin de drain (déchargement auto du worker). Dan relit au matin dans /ops.
cd "$(dirname "$0")/.."
LOG=~/.cache/nika/nuit-$(date +%Y%m%d).log
mkdir -p ~/.cache/nika
exec >> "$LOG" 2>&1

echo "═══ nuit NIKA OPS — $(date '+%Y-%m-%d %H:%M') ═══"

# Couloir cloud : on TESTE la clé Cerebras (1 token) au lieu de croire à sa présence —
# le 26/07, la clé existait mais le compte répondait 402 (offre gratuite supprimée).
MODELE=${CLOUD_MODEL:-groq/openai/gpt-oss-120b}
if grep -q '^CEREBRAS_API_KEY=' .env.local 2>/dev/null; then
  CK=$(grep '^CEREBRAS_API_KEY=' .env.local | cut -d= -f2)
  CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://api.cerebras.ai/v1/chat/completions \
    -H "Authorization: Bearer $CK" -H 'Content-Type: application/json' \
    -d '{"model":"gpt-oss-120b","max_tokens":1,"messages":[{"role":"user","content":"."}]}')
  [ "$CODE" = "200" ] && MODELE=${CLOUD_MODEL:-cerebras/gpt-oss-120b}
  CK=""
fi
echo "→ production sur ${MODELE}"

# Lots de la nuit — modestes exprès : ~90 productions + autant de relectures.
node --env-file=.env.local scripts/ops-fill-attrs.mjs --limit=40
node --env-file=.env.local scripts/ops-fill-relations.mjs --limit=20
node --env-file=.env.local scripts/ops-fill-fandom.mjs --limit=30 2>/dev/null || true

# 1) Production (cloud) — rend les tâches de jugement à la file en sortant.
taskpolicy -c background node --env-file=.env.local scripts/agent-worker.mjs \
  --cloud="$MODELE" --types=akasha_attrs,akasha_relations,fandom_descfr,flavor_akasha --conc=3

# 2) Jugement (local) — puis déchargement auto du modèle (RAM rendue).
taskpolicy -c background node --env-file=.env.local scripts/agent-worker.mjs \
  --types=review_local --conc=2

# 3) Ancrage HHEM (CPU uniquement, le GPU dort déjà).
taskpolicy -c background node --env-file=.env.local scripts/ops-score-ancrage.mjs 2>/dev/null || true

echo "═══ fin de nuit — $(date '+%H:%M') ═══"
