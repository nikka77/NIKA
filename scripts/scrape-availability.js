// scripts/scrape-availability.js
// Récupère les disponibilités Airbnb via un VRAI navigateur (Playwright) qui lit
// le calendrier directement dans le DOM rendu (data-testid="calendar-day-…").
// Pas de clé API ni de hash GraphQL (verrouillés) → robuste.
//
// 3 modes (par ordre de priorité), choisis selon l'env :
//   1. SCRAPEDO_CDP_URL  → navigateur distant scrape.do "Scraping Browser" (CDP,
//      facturé par session = le moins cher à l'échelle). Ex: wss://…scrape.do…
//   2. SCRAPEDO_TOKEN    → navigateur local + PROXY résidentiel scrape.do (proxy mode)
//   3. (rien)            → connexion directe (test local, sans anti-blocage)
//
// Écrit dans Supabase (table stay_availability, lue par /api/calendar/[slug])
// + un dump data/availability.json pour debug.
//
// INSTALL : npm i -D playwright && npx playwright install chromium
// USAGE :
//   node scripts/scrape-availability.js --limit=2 --months=4   # POC
//   node scripts/scrape-availability.js --slug=… --no-db        # 1 listing, sans DB
//   node scripts/scrape-availability.js                         # tous, → Supabase
// CRON (1×/jour) :
//   0 4 * * * cd /path/NIKA && set -a && source .env.local && set +a && node scripts/scrape-availability.js >> /var/log/nika-calendar.log 2>&1

const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const arg = (k) => process.argv.find(a => a.startsWith(k + '='))?.split('=')[1]
const has = (k) => process.argv.includes(k)
const MONTHS = parseInt(arg('--months') || '6')
const TARGET_SLUG = arg('--slug')
const LIMIT = parseInt(arg('--limit') || '0')
const NO_DB = has('--no-db')

const SCRAPEDO_CDP_URL = process.env.SCRAPEDO_CDP_URL
const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DATA_FILE = path.join(process.cwd(), 'data', 'wow_listings.json')
const OUT_FILE = path.join(process.cwd(), 'data', 'availability.json')
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function getListings() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
  return (data.listings || []).map(l => ({ slug: l.slug, airbnb_id: String(l.airbnb_id || '') })).filter(l => l.airbnb_id)
}

// Lit les cellules-jours présentes dans le DOM → { 'YYYY-MM-DD': availableBool }
async function readCells(page) {
  return page.evaluate(() => {
    const out = {}
    for (const c of document.querySelectorAll('[data-testid^="calendar-day-"]')) {
      const id = c.getAttribute('data-testid').replace('calendar-day-', '')
      const [mm, dd, yyyy] = id.split('/')          // locale=en → MM/DD/YYYY
      if (!yyyy || !mm || !dd) continue
      const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
      out[iso] = c.getAttribute('data-is-day-blocked') !== 'true'   // true = disponible
    }
    return out
  })
}

async function scrapeOnce(context, listing) {
  const page = await context.newPage()
  await page.route('**/*', (route) => {
    const t = route.request().resourceType()
    if (t === 'image' || t === 'media' || t === 'font') return route.abort()
    return route.continue()
  })
  try {
    await page.goto(`https://www.airbnb.com/rooms/${listing.airbnb_id}?locale=en`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('[data-testid^="calendar-day-"]', { state: 'attached', timeout: 30000 })
    const days = {}
    Object.assign(days, await readCells(page))
    const clicks = Math.max(0, Math.ceil(MONTHS / 2) - 1)
    for (let i = 0; i < clicks; i++) {
      const next = await page.$('button[aria-label^="Move forward"], button[aria-label*="next month" i], [data-testid="bookit-calendar-next-button"]')
      if (!next) break
      try { await next.click({ timeout: 2500 }) } catch { break }
      await page.waitForTimeout(650)
      Object.assign(days, await readCells(page))
    }
    if (!Object.keys(days).length) throw new Error('aucune cellule calendrier')
    return days
  } finally {
    await page.close()
  }
}

// 2 tentatives par listing
async function scrapeListing(context, listing) {
  let lastErr
  for (let attempt = 1; attempt <= 2; attempt++) {
    try { return await scrapeOnce(context, listing) }
    catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 1500)) }
  }
  throw lastErr
}

// Upsert dans Supabase (le service role bypass RLS)
async function writeSupabase(supabase, listing, days) {
  const fetchedAt = new Date().toISOString()
  const rows = Object.entries(days).map(([date, available]) => ({
    slug: listing.slug, airbnb_id: listing.airbnb_id, date, available, fetched_at: fetchedAt,
  }))
  // par lots de 500
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from('stay_availability').upsert(rows.slice(i, i + 500), { onConflict: 'slug,date' })
    if (error) throw new Error('supabase: ' + error.message)
  }
  return rows.length
}

;(async () => {
  // ── Sélection du navigateur ───────────────────────────────
  let browser
  if (SCRAPEDO_CDP_URL) {
    console.log('🧠 Scraping Browser distant (CDP scrape.do)')
    browser = await chromium.connectOverCDP(SCRAPEDO_CDP_URL)
  } else if (SCRAPEDO_TOKEN) {
    console.log('🔒 navigateur local + proxy résidentiel scrape.do')
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--ignore-certificate-errors'],
      proxy: { server: 'http://proxy.scrape.do:8080', username: SCRAPEDO_TOKEN, password: 'super=true&geoCode=us' } })
  } else {
    console.log('🌐 connexion directe (test local — sans anti-blocage)')
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  }
  const context = await browser.newContext({ ignoreHTTPSErrors: true, locale: 'en-US', userAgent: UA, viewport: { width: 1280, height: 1800 } })

  // ── Supabase ──────────────────────────────────────────────
  let supabase = null
  if (!NO_DB && SUPABASE_URL && SUPABASE_KEY) {
    const { createClient } = require('@supabase/supabase-js')
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
    console.log('💾 écriture Supabase activée (stay_availability)')
  } else {
    console.log('💾 Supabase désactivé (' + (NO_DB ? '--no-db' : 'clés absentes') + ') — JSON seulement')
  }

  // ── Listings ──────────────────────────────────────────────
  let listings = getListings()
  if (TARGET_SLUG) listings = listings.filter(l => l.slug === TARGET_SLUG)
  if (LIMIT) listings = listings.slice(0, LIMIT)
  console.log(`→ ${listings.length} listing(s), ${MONTHS} mois\n`)

  const result = {}
  let ok = 0, fail = 0
  for (const l of listings) {
    try {
      const days = await scrapeListing(context, l)
      const total = Object.keys(days).length
      const available = Object.values(days).filter(Boolean).length
      let written = 0
      if (supabase) written = await writeSupabase(supabase, l, days)
      result[l.slug] = { airbnb_id: l.airbnb_id, scraped_at: new Date().toISOString(), total, available, written, days }
      console.log(`  ✓ ${l.slug.padEnd(34)} ${available}/${total} dispo${supabase ? ` · ${written} lignes DB` : ''}`)
      ok++
    } catch (e) {
      result[l.slug] = { airbnb_id: l.airbnb_id, error: e.message }
      console.log(`  ✗ ${l.slug.padEnd(34)} ${e.message}`)
      fail++
    }
    await new Promise(r => setTimeout(r, 1500))
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2))
  console.log(`\n💾 ${OUT_FILE}\n✅ ${ok} ok · ${fail} échec(s)`)
  await browser.close()
})().catch(e => { console.error('FATAL', e); process.exit(1) })
