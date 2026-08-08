#!/bin/bash
# scripts/deployer-vps.sh — TIRER LE CODE **ET** REDÉMARRER CE QUI LE FAIT TOURNER.
#
# POURQUOI (08/08/2026)
# `git pull` met le fichier à jour ; il ne touche pas les processus qui ont déjà chargé l'ancien
# en mémoire. Mesuré ce matin : `nika-arbitre` tournait depuis le 5 août, sans TROIS jours de
# correctifs — dont celui qui réparait précisément l'erreur qu'il produisait en boucle. Le fichier
# sur disque était juste, le service faisait faux, et rien ne le disait. J'ai cherché le défaut
# dans le code pendant que le code était déjà bon.
#
# Ce script fait donc les deux, et AFFICHE l'âge de chaque service après coup : un service plus
# vieux que le dernier commit est un service qui ment sur la version qu'il exécute.
#
# Usage (depuis le Mac) : ssh root@100.75.38.126 'bash -s' < scripts/deployer-vps.sh
set -u
DEPOT=/home/nika/NIKA
UNITES="nika-usine nika-juges nika-secretaire nika-arbitre"

cd "$DEPOT" || { echo "✗ dépôt introuvable : $DEPOT"; exit 1; }
echo "── tirage du code"
sudo -u nika git pull --ff-only 2>&1 | tail -2
COMMIT=$(git log -1 --format='%h %s' | cut -c1-70)
DATE_COMMIT=$(git log -1 --format=%ct)
echo "   HEAD : $COMMIT"

echo "── redémarrage des services"
for u in $UNITES; do
  systemctl is-enabled "$u" >/dev/null 2>&1 || { printf '   %-18s (absent, ignoré)\n' "$u"; continue; }
  systemctl restart "$u"
done
sleep 3

echo "── contrôle : un service plus VIEUX que le commit exécute du code périmé"
ECART=0
for u in $UNITES; do
  systemctl is-enabled "$u" >/dev/null 2>&1 || continue
  ETAT=$(systemctl is-active "$u")
  DEPUIS=$(date -d "$(systemctl show -p ActiveEnterTimestamp --value "$u")" +%s 2>/dev/null || echo 0)
  if [ "$ETAT" != "active" ]; then
    printf '   ✗ %-18s %s\n' "$u" "$ETAT"; ECART=1
  elif [ "$DEPUIS" -lt "$DATE_COMMIT" ]; then
    printf '   ⚠ %-18s démarré AVANT le commit — code périmé\n' "$u"; ECART=1
  else
    printf '   ✓ %-18s actif sur le code courant\n' "$u"
  fi
done
[ "$ECART" = 0 ] && echo "✓ tout tourne sur la version courante" || echo "⚠ au moins un service n'est pas à jour"
exit $ECART
