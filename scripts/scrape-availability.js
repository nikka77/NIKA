/**
 * scripts/scrape-availability.js
 * 
 * Tourne sur Oracle Cloud ARM en cron toutes les 6h.
 * Visite chaque listing Airbnb avec un vrai Chromium,
 * extrait les disponibilités via l'API interne Airbnb (même-origine),
 * stocke dans Supabase.
 * 
 * INSTALL (Oracle Cloud) :
 *   npm install playwright @supabase/supabase-js
 *   npx playwright install chromium
 *   
 * CRON (crontab -e) :
 *   0 * /6 * * * cd /home/ubuntu/NIKA && node scripts/scrape-availability.js >> /var/log/nika-calendar.log 2>&1
 * 
 * USAGE :
 *   node scripts/scrape-availability.js              # tous les listings
 *   node scripts/scrape-availability.js --slug sous-marin-jaune-nouvelle-zelande
 *   node scripts/scrape-availability.js --months 3   # 3 mois en avance
 */

const { chromium } = require('playwright')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// ─── Config ────────────────────────────────────────────────
const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY
const MONTHS_AHEAD      = parseInt(process.argv.find(a => a.startsWith('--months='))?.split('=')[1] || '3')
const TARGET_SLUG       = process.argv.find(a => a.startsWith('--slug='))?.split('=')[1]
const DELAY_MS          = 4000   // délai entre listings (anti-bot)
const BATCH_SIZE        = 5      // listings en parallèle max
const DATA_FILE         = path.join(process.cwd(), 'data', 'wow_listings.json')

// ─── Listings ──────────────────────────────────────────────
