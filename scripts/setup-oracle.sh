#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  NIKA Calendar — Setup Oracle Cloud ARM
#  À exécuter UNE SEULE FOIS sur le serveur Oracle Cloud
# ═══════════════════════════════════════════════════════════

set -e

echo ""
echo "🗓️  NIKA Calendar Scraper — Setup Oracle Cloud"
echo "═══════════════════════════════════════════════"
echo ""

NIKA_DIR="/home/ubuntu/NIKA"
SCRIPT="$NIKA_DIR/scripts/scrape-availability.js"

# 1. Vérifier les dépendances
echo "📦 Vérification des dépendances..."
cd "$NIKA_DIR"

# Installer Playwright si absent
if ! node -e "require('playwright')" 2>/dev/null; then
  echo "  → Installation Playwright..."
  npm i -D playwright
  npx playwright install chromium --with-deps
else
  echo "  ✅ Playwright déjà installé"
fi

# Vérifier .env.local
if [ ! -f "$NIKA_DIR/.env.local" ]; then
  echo "❌ .env.local manquant — créer avec SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

echo "  ✅ .env.local présent"
echo "  ℹ️  Anti-blocage à l'échelle (optionnel) : définir SCRAPEDO_TOKEN (proxy"
echo "     résidentiel) ou SCRAPEDO_CDP_URL (Scraping Browser) dans .env.local."
echo "     Sans ça → connexion directe (OK depuis cette IP serveur, séquentiel)."

# 2. Test rapide sur 1 listing
echo ""
echo "🧪 Test sur sous-marin-jaune..."
set -a && source .env.local && set +a
node scripts/scrape-availability.js \
  --slug=sous-marin-jaune-nouvelle-zelande \
  --months=1

echo ""
echo "✅ Test OK — configuration du cron..."

# 3. Cron 1×/jour (le calendrier bouge lentement + coût proxy maîtrisé)
CRON_CMD="0 4 * * * cd $NIKA_DIR && set -a && source .env.local && set +a && node scripts/scrape-availability.js >> /var/log/nika-calendar.log 2>&1"

# Ajouter si pas déjà présent
(crontab -l 2>/dev/null | grep -v "scrape-availability" ; echo "$CRON_CMD") | crontab -

echo "✅ Cron configuré : 1×/jour à 4h"
echo ""
crontab -l | grep scrape-availability
echo ""

# 4. Premier run complet
echo "🚀 Premier run complet (tous les listings WOW avec airbnb_id)..."
echo "   Logs : tail -f /var/log/nika-calendar.log"
echo ""
echo "Pour lancer maintenant :"
echo "  node scripts/scrape-availability.js"
echo ""
echo "Pour lancer en arrière-plan :"
echo "  nohup node scripts/scrape-availability.js > /var/log/nika-calendar.log 2>&1 &"
