#!/bin/zsh
# scripts/nuit.sh — la routine de nuit NIKA OPS (lancée par launchd à 2 h 30, ou à la main).
# Remplit la file avec des lots modestes (quotas gratuits respectés), draine la production au
# cloud, puis le jugement en local, puis note l'ancrage HHEM (CPU). Tout en priorité de fond ;
# la RAM est rendue en fin de drain (déchargement auto du worker). Dan relit au matin dans /ops.
# launchd démarre avec un PATH minimal : sans cette ligne, `node` est introuvable (exit 127 —
# constaté le 27/07 AVANT la première exécution, par contrôle du statut launchctl).
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
# Priorité de fond : taskpolicy (macOS) ou nice (Linux) — mêmes scripts sur les deux mondes.
PRIO=$(command -v taskpolicy >/dev/null && echo "taskpolicy -c background" || echo "nice -n 10")
cd "$(dirname "$0")/.."
# Clone d'automatisation (~/dev/NIKA) : se synchronise depuis GitHub avant chaque nuit —
# le dépôt iCloud reste la copie de travail de Dan, launchd ne peut pas y lire (TCC macOS).
git pull --ff-only 2>/dev/null || true
LOG=~/.cache/nika/nuit-$(date +%Y%m%d).log
mkdir -p ~/.cache/nika
exec >> "$LOG" 2>&1

echo "═══ nuit NIKA OPS — $(date '+%Y-%m-%d %H:%M') ═══"

# Couloir cloud : on TESTE la clé Cerebras (1 token) au lieu de croire à sa présence —
# le 26/07, la clé existait mais le compte répondait 402 (offre gratuite supprimée).
MODELE=${CLOUD_MODEL:-groq/openai/gpt-oss-120b}
# Juge d'une AUTRE famille que le producteur (angles morts complémentaires, duel du 25/07).
# Au cloud il cesse d'être le goulot : 15 h de GPU local mesurées pour juger tout le chantier.
JUGE=${JUDGE_MODEL:-}
grep -q '^GEMINI_API_KEY=' .env.local 2>/dev/null && JUGE=${JUDGE_MODEL:-gemini/gemini-flash-lite-latest}
# Juge n°2 en famille croisée (Meta) dès que la clé Groq existe — étude modèles 28/07.
grep -q '^GROQ_API_KEY=' .env.local 2>/dev/null && JUGE=${JUDGE_MODEL:-groq/llama-3.3-70b-versatile}
[ -z "$JUGE" ] && JUGE=ollama/gemma4:12b
if grep -q '^CEREBRAS_API_KEY=' .env.local 2>/dev/null; then
  CK=$(grep '^CEREBRAS_API_KEY=' .env.local | cut -d= -f2)
  CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://api.cerebras.ai/v1/chat/completions \
    -H "Authorization: Bearer $CK" -H 'Content-Type: application/json' \
    -d '{"model":"gpt-oss-120b","max_tokens":1,"messages":[{"role":"user","content":"."}]}')
  [ "$CODE" = "200" ] && MODELE=${CLOUD_MODEL:-cerebras/gpt-oss-120b}
  CK=""
fi
echo "→ production sur ${MODELE} · jugement sur ${JUGE}"

# Lots de la nuit — modestes exprès : ~90 productions + autant de relectures.
node --env-file=.env.local scripts/ops-fill-attrs.mjs --limit=40
node --env-file=.env.local scripts/ops-fill-relations.mjs --limit=20
node --env-file=.env.local scripts/ops-fill-fandom.mjs --limit=30 2>/dev/null || true

# 1+2) Production (cloud) ET jugement (cloud, autre famille) : UN SEUL worker — le tri par
# modèle fait le travail des anciens « couloirs », sans le ping-pong de renvois qu'ils causaient.
$PRIO node --env-file=.env.local scripts/agent-worker.mjs \
  --cloud="$MODELE" --juge="$JUGE" --conc=3

# 3) Ancrage HHEM (CPU uniquement, le GPU dort déjà).
$PRIO node --env-file=.env.local scripts/ops-score-ancrage.mjs 2>/dev/null || true

# 3bis) Rattrapage des escalades Claude restées en attente (session expirée, échec…).
node --env-file=.env.local scripts/ops-escalades.mjs || true

# 4) Bilan + sentinelles → alerte (WhatsApp si clé, sinon notification macOS).
node --env-file=.env.local scripts/ops-bilan-nuit.mjs --heures=8

echo "═══ fin de nuit — $(date '+%H:%M') ═══"
