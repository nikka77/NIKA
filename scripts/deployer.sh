#!/bin/bash
# scripts/deployer.sh — LANCER LE DÉPLOIEMENT DEPUIS LE MAC, ET SAVOIR S'IL A EU LIEU.
#
# POURQUOI (09/08/2026)
# `ssh root@vps 'bash -s' < scripts/deployer-vps.sh` a rendu **0** alors que rien n'avait été
# déployé : Tailscale demandait une ré-authentification, a fermé la connexion, et le code de sortie
# de ssh est resté à zéro. Une automatisation qui lit ce code conclut « déployé ». C'est la même
# famille de panne que celles traquées toute la journée — un canal qui répond « ça va » quand il ne
# sait pas. Le script distant, lui, n'a jamais tourné : il ne pouvait donc pas se plaindre.
#
# La parade ne peut pas vivre côté VPS. Elle vit ICI : le script distant termine par une SENTINELLE,
# et ce lanceur refuse de conclure au succès sans l'avoir lue. Pas de sentinelle = pas de
# déploiement, quel que soit le code de sortie.
#
# Usage : bash scripts/deployer.sh [hôte]
set -uo pipefail
HOTE="${1:-root@100.75.38.126}"
ICI="$(cd "$(dirname "$0")" && pwd)"
SENTINELLE='DEPLOIEMENT-TERMINE'

# PLAFOND DE TEMPS. Quand Tailscale réclame une ré-authentification, la connexion ne tombe pas :
# elle ATTEND, indéfiniment, y compris en BatchMode. `ConnectTimeout` ne couvre que l'établissement
# du canal, pas ce qui se passe après. macOS n'a pas `timeout(1)` — on plafonne à la main.
DELAI=${DELAI:-120}
JOURNAL=$(mktemp)
ssh -o ConnectTimeout=20 -o BatchMode=yes "$HOTE" 'bash -s' < "$ICI/deployer-vps.sh" >"$JOURNAL" 2>&1 &
SSH_PID=$!
( sleep "$DELAI"; kill -0 "$SSH_PID" 2>/dev/null && kill -9 "$SSH_PID" 2>/dev/null ) &
GARDE=$!
wait "$SSH_PID"; CODE=$?
kill "$GARDE" 2>/dev/null
SORTIE=$(cat "$JOURNAL"); rm -f "$JOURNAL"
echo "$SORTIE"

if ! grep -q "$SENTINELLE" <<<"$SORTIE"; then
  echo
  echo "✗ AUCUN DÉPLOIEMENT : le script distant n'a pas rendu sa sentinelle (code ssh $CODE)."
  if grep -qi 'tailscale\|additional check\|login.tailscale.com' <<<"$SORTIE"; then
    echo "  Cause lue dans la sortie : Tailscale réclame une ré-authentification."
    echo "  → ouvrir le lien ci-dessus, puis relancer. Le VPS reste sur sa version précédente."
  fi
  exit 1
fi

grep -q 'tout tourne sur la version courante' <<<"$SORTIE" && exit 0
echo "⚠ déploiement fait, mais au moins un service n'est pas sur la version courante."
exit 2
