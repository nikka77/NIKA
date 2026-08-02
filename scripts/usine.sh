#!/bin/zsh
# scripts/usine.sh — L'USINE EN CONTINU (L23, 01/08/2026). Remplace la salve nocturne par un
# fonctionnement 24/7 : la machine était inactive 22 h sur 24 (charge mesurée 0,12 à conc=8 —
# le goulot est l'attente réseau, pas le CPU), alors que les budgets quotidiens des couloirs
# gratuits, eux, courent toute la journée. En continu, on les consomme en douceur au lieu de
# les brûler en une salve — c'est plus doux pour les fournisseurs ET plus rapide pour nous.
#
# Le worker s'auto-régule : budgets ops_quotas par minute ET par jour, sieste de 15 min quand
# un guichet quotidien se ferme (PlafondJourError — la tâche est reportée, jamais perdue).
# Le ravitaillement est assuré à part par nika-remplisseurs.timer (ops-remplir-auto.mjs).
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
# Préfixe de priorité en TABLEAU : en zsh une chaîne non citée ne se découpe pas (01/08).
if command -v taskpolicy >/dev/null; then PRIO=(taskpolicy -c background); else PRIO=(nice -n 10); fi
cd "$(dirname "$0")/.."

# Couloirs en LISTE : le worker bascule sur le suivant quand un guichet du jour se ferme.
# Production : gpt-oss-120b (qualifié, en tête) — les autres couloirs candidats n'entrent ici
# QU'APRÈS avoir passé l'audit à l'aveugle du dimanche. On ne troque pas la qualité contre du débit.
# Production : Mistral en tête depuis le 01/08 — gpt-oss-120b, l'ancien titulaire, est plafonné
# à 2 000 jetons/JOUR sur ce compte (~8 fiches), mesuré au 429. Mistral et Nemotron encaissent
# tous deux une requête de taille réelle et ont passé leurs sondes d'embauche du 29/07.
# Familles distinctes de bout en bout : Mistral produit · Google et Meta jugent · NVIDIA arbitre.
# DeepInfra EN DERNIER, et seulement en dernier (02/08) : les trois couloirs gratuits gardent
# la priorité, mais quand ils sont tous à sec l'usine s'arrêtait pour la journée — mesuré ce
# midi, le chantier Death Note tournait en rond, chaque tâche lue puis reportée faute de guichet.
# Facturé au jeton, sans plafond quotidien : c'est le filet qui empêche l'usine de s'éteindre.
# NVIDIA SORT DE LA PRODUCTION le 02/08. Son palier gratuit n'est pas un débit mais un STOCK
# fini (~1 000 appels, qui ne se rechargent pas). Le dépenser en production, c'est le brûler sur
# un travail que Mistral, Groq et DeepInfra savent faire — alors qu'il est la SEULE famille du
# parc capable de départager les deux juges. Il reste donc au jugement, où il est irremplaçable.
MODELE=${CLOUD_MODEL:-mistral/mistral-large-latest,groq/openai/gpt-oss-120b,deepinfra/meta-llama/Llama-3.3-70B-Instruct-Turbo}
# Jugement n°2 (famille croisée) : Qwen3-32B chez DeepInfra depuis le 01/08 — facturé au
# jeton, donc SANS guichet quotidien, le mur contre lequel tous les couloirs gratuits butaient.
# Mesuré : 0,000195 $ le verdict avec /no_think (2,6 s) — les 10 $ de Dan valent ~51 000
# relectures, quand juger l'encyclopédie entière deux fois en demande 23 000.
# Derrière lui, les couloirs gratuits restent en repli : Nemotron, Mistral, llama.
# Quatre familles distinctes de bout en bout :
#   Mistral produit · Google (gemma) juge · Qwen juge · NVIDIA arbitre.
JUGE=${JUDGE_MODEL:-deepinfra/Qwen/Qwen3-32B,nvidia/nvidia/nemotron-3-super-120b-a12b,mistral/mistral-large-latest,groq/llama-3.3-70b-versatile}
CONC=${NIKA_CONC:-$(grep '^NIKA_CONC=' .env.local 2>/dev/null | cut -d= -f2)}

echo "🏭 usine continue — production ${MODELE} · jugement ${JUGE} · ${CONC:-8} de front"
exec "${PRIO[@]}" node --env-file=.env.local scripts/agent-worker.mjs \
  --loop --cloud="$MODELE" --juge="$JUGE" --conc="${CONC:-8}"
