#!/bin/zsh
# scripts/nuit.sh — la routine de nuit NIKA OPS (lancée par launchd à 2 h 30, ou à la main).
# Remplit la file avec des lots modestes (quotas gratuits respectés), draine la production au
# cloud, puis le jugement en local, puis note l'ancrage HHEM (CPU). Tout en priorité de fond ;
# la RAM est rendue en fin de drain (déchargement auto du worker). Dan relit au matin dans /ops.
# launchd démarre avec un PATH minimal : sans cette ligne, `node` est introuvable (exit 127 —
# constaté le 27/07 AVANT la première exécution, par contrôle du statut launchctl).
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
# Priorité de fond : taskpolicy (macOS) ou nice (Linux) — mêmes scripts sur les deux mondes.
if command -v taskpolicy >/dev/null; then PRIO=(taskpolicy -c background); else PRIO=(nice -n 10); fi   # TABLEAU : en zsh, $chaine non citée ne se découpe pas — « nice -n 10 » devenait un nom de commande (01/08)
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

# Depuis L23 (01/08), l'usine tourne EN CONTINU (nika-usine.service) et est ravitaillée par
# son propre timer : la nuit ne doit alors ni remplir (doublons) ni drainer (concurrence),
# seulement faire l'ENTRETIEN — orphelines, ancrage, escalades, bilan. Sur une machine sans
# service continu (le Mac), elle garde son rôle complet d'autrefois.
if systemctl is-active --quiet nika-usine 2>/dev/null; then
  CONTINU=1; echo "→ usine continue active : nuit en mode ENTRETIEN (ni remplissage ni drain)"
else
  CONTINU=0
fi

if [ "$CONTINU" = 0 ]; then
  # Lots de la nuit — modestes exprès : ~90 productions + autant de relectures.
  node --env-file=.env.local scripts/ops-fill-attrs.mjs --limit=40
  node --env-file=.env.local scripts/ops-fill-relations.mjs --limit=20
  node --env-file=.env.local scripts/ops-fill-fandom.mjs --limit=30 2>/dev/null || true
fi

# 0bis) Relectures ORPHELINES (juge en panne → production sans verdict) : remises en file
# AVANT le drain pour être jugées cette nuit même — sinon elles s'accumulent en silence.
node --env-file=.env.local scripts/ops-rejoue-relectures.mjs || true

# 1+2) Production (cloud) ET jugement (cloud, autre famille) : UN SEUL worker — le tri par
# modèle fait le travail des anciens « couloirs », sans le ping-pong de renvois qu'ils causaient.
# conc=8 (31/07, demande Dan) : le goulot est l'ATTENTE réseau, pas le CPU — 8 tâches de front
# font travailler producteur + juges + arbitre sur leurs guichets respectifs EN MÊME TEMPS.
# Sans danger : à quota atteint le worker attend la fenêtre (pas d'échec), et le gate HHEM est
# sous mutex (un seul Python à la fois). Ajustable sans commit : NIKA_CONC=4 dans .env.local
# (lu ci-dessous — .env.local n'est chargé que par node, pas par le shell).
CONC=${NIKA_CONC:-$(grep '^NIKA_CONC=' .env.local 2>/dev/null | cut -d= -f2)}
if [ "$CONTINU" = 0 ]; then
  "${PRIO[@]}" node --env-file=.env.local scripts/agent-worker.mjs \
    --cloud="$MODELE" --juge="$JUGE" --conc="${CONC:-8}"
fi

# 3) Ancrage HHEM (CPU uniquement) — --write PERSISTE les scores (pastille /ops), sinon ils
# partaient dans le log et personne ne les voyait. Pas de 2>/dev/null : c'est lui qui a caché
# pendant une nuit que le venv manquait sur le VPS (leçon du 31/07).
"${PRIO[@]}" node --env-file=.env.local scripts/ops-score-ancrage.mjs --write || true

# 3bis) Rattrapage des escalades Claude restées en attente (session expirée, échec…).
node --env-file=.env.local scripts/ops-escalades.mjs || true

# 4) Bilan + sentinelles → alerte (WhatsApp si clé, sinon notification macOS).
node --env-file=.env.local scripts/ops-bilan-nuit.mjs --heures=8

echo "═══ fin de nuit — $(date '+%H:%M') ═══"
