/**
 * scripts/scrape-availability.js
 *
 * Récupère les disponibilités Airbnb via les feeds iCal publics.
 * Aucune dépendance navigateur — simple fetch HTTP.
 *
 * INSTALL :
 *   npm install @supabase/supabase-js node-fetch
 *
 * CRON (crontab -e) :
 *   0 * /6 * * * cd /home/ubuntu/NIKA && node scripts/scrape-availability.js >> /var/log/nika-calendar.log 2>&1
 *
 * USAGE :
 *   node scripts/scrape-availability.js
 *   node scripts/scrape-availability.js --slug=sous-marin-jaune-nouvelle-zelande
 *   node scripts/scrape-availability.js --months=6
 */

const { createClient } = require('@supabase/supabase-js')
const https = require('https')
const fs   = require('fs')
const path = require('path')

// ─── Config ────────────────────────────────────────────────
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const MONTHS_AHEAD  = parseInt(process.argv.find(a => a.startsWith('--months='))?.split('=')[1] || '3')
const TARGET_SLUG   = process.argv.find(a => a.startsWith('--slug='))?.split('=')[1]
const DELAY_MS      = 800   // délai poli entre requêtes
const DATA_FILE     = path.join(process.cwd(), 'data', 'wow_listings.json')

// ─── Listings ──────────────────────────────────────────────
function getListings() {
  if (fs.existsSync(DATA_FILE)) {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
    return data.listings.map(l => ({ slug: l.slug, airbnb_id: l.airbnb_id })).filter(l => l.airbnb_id)
