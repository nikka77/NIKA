// scripts/scrape-availability.js
// Récupère les disponibilités Airbnb via un VRAI navigateur (Playwright) qui lit
// le calendrier directement dans le DOM rendu (data-testid="calendar-day-…").
// Pas de clé API ni de hash GraphQL (verrouillés) → robuste.
//
// Anti-blocage à l'échelle : si SCRAPEDO_TOKEN est défini, le trafic passe par
// le PROXY RÉSIDENTIEL scrape.do (proxy mode). Sinon, connexion directe (test local).
//
// INSTALL : npm i -D playwright && npx playwright install chromium
//
// USAGE :
//   node scripts/scrape-availability.js                 # tous les listings
//   node scripts/scrape-availability.js --limit=2       # POC : 2 premiers
//   node scripts/scrape-availability.js --slug=sous-marin-... --months=8
//
// CRON (1×/jour suffit, le calendrier bouge lentement) :
//   0 4 * * * cd /path/NIKA && set -a && source .env.local && set +a && node scripts/scrape-availability.js >> /var/log/nika-calendar.log 2>&1

const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const arg = (k) => process.argv.find(a => a.startsWith(k + '='))?.split('=')[1]
const MONTHS = parseInt(arg('--months') || '6')
const TARGET_SLUG = arg('--slug')
const LIMIT = parseInt(arg('--limit') || '0')
const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN
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

async function scrapeListing(context, listing) {
  const page = await context.newPage()
  // Bloque images/polices/médias → moins de requêtes proxy (coût) + plus rapide
  await page.route('**/*', (route) => {
    const t = route.request().resourceType()
    if (t === 'image' || t === 'media' || t === 'font') return route.abort()
    return route.continue()
  })
  try {
    await page.goto(`https://www.airbnb.com/rooms/${listing.airbnb_id}?locale=en`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    // les cellules sont dans le DOM mais pas forcément "visible" → attendre 'attached'
    await page.waitForSelector('[data-testid^="calendar-day-"]', { state: 'attached', timeout: 30000 })
    const days = {}
    const clicks = Math.max(0, Math.ceil(MONTHS / 2) - 1)
    Object.assign(days, await readCells(page))
    for (let i = 0; i < clicks; i++) {
      const next = await page.$('button[aria-label^="Move forward"], button[aria-label*="next month" i], [data-testid="bookit-calendar-next-button"]')
      if (!next) break
      try { await next.click({ timeout: 2500 }) } catch { break }
      await page.waitForTimeout(650)
      Object.assign(days, await readCells(page))
    }
    return days
  } finally {
    await page.close()
  }
}

;(async () => {
  const launchOpts = { headless: true, args: ['--no-sandbox', '--ignore-certificate-errors'] }
  if (SCRAPEDO_TOKEN) {
    // scrape.do proxy mode : username=token, password=options (résidentiel + géo)
    launchOpts.proxy = { server: 'http://proxy.scrape.do:8080', username: SCRAPEDO_TOKEN, password: 'super=true&geoCode=us' }
    console.log('🔒 via proxy résidentiel scrape.do')
  } else {
    console.log('🌐 connexion directe (test local — sans anti-blocage)')
  }

  const browser = await chromium.launch(launchOpts)
  const context = await browser.newContext({ ignoreHTTPSErrors: true, locale: 'en-US', userAgent: UA, viewport: { width: 1280, height: 1800 } })

  let listings = getListings()
  if (TARGET_SLUG) listings = listings.filter(l => l.slug === TARGET_SLUG)
  if (LIMIT) listings = listings.slice(0, LIMIT)
  console.log(`→ ${listings.length} listing(s), ${MONTHS} mois`)

  const result = {}
  for (const l of listings) {
    try {
      const days = await scrapeListing(context, l)
      const total = Object.keys(days).length
      const available = Object.values(days).filter(Boolean).length
      result[l.slug] = { airbnb_id: l.airbnb_id, scraped_at: new Date().toISOString(), total, available, days }
      console.log(`  ✓ ${l.slug.padEnd(34)} ${available}/${total} dispo`)
    } catch (e) {
      result[l.slug] = { airbnb_id: l.airbnb_id, error: e.message }
      console.log(`  ✗ ${l.slug.padEnd(34)} ${e.message}`)
    }
    await new Promise(r => setTimeout(r, 1500))
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2))
  console.log(`\n💾 ${OUT_FILE}`)
  await browser.close()
})().catch(e => { console.error('FATAL', e); process.exit(1) })
