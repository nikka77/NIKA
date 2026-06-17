// scripts/scrape-availability.js
// Récupère les dispos Airbnb via un VRAI navigateur (Playwright).
//
// OPTIMISÉ : on intercepte la réponse réseau que la fiche émet elle-même
// (GraphQL PdpAvailabilityCalendar, count:12) → 12 mois en UN chargement, JSON
// structuré (available + minNights + prix), sans clics mois-par-mois.
// Repli automatique sur la lecture DOM si l'interception échoue.
// Listings traités en parallèle (pool) ; CSS/images/polices bloqués (coût/vitesse).
//
// 3 modes selon l'env : SCRAPEDO_CDP_URL (Scraping Browser distant, /session) >
// SCRAPEDO_TOKEN (proxy résidentiel) > direct. Écrit dans Supabase stay_availability.
//
// INSTALL : npm i -D playwright && npx playwright install chromium
// USAGE :
//   node scripts/scrape-availability.js --limit=3 --months=12 --concurrency=3
//   node scripts/scrape-availability.js --slug=… --no-db
// CRON (1×/jour) :
//   0 4 * * * cd /path/NIKA && set -a && source .env.local && set +a && node scripts/scrape-availability.js >> /var/log/nika-calendar.log 2>&1

const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const arg = (k) => process.argv.find(a => a.startsWith(k + '='))?.split('=')[1]
const has = (k) => process.argv.includes(k)
const MONTHS = parseInt(arg('--months') || '12')
const TARGET_SLUG = arg('--slug')
const LIMIT = parseInt(arg('--limit') || '0')
const CONCURRENCY_ARG = arg('--concurrency') ? Math.max(1, parseInt(arg('--concurrency'))) : null
const NO_DB = has('--no-db')

const SCRAPEDO_CDP_URL = process.env.SCRAPEDO_CDP_URL
const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DATA_FILE = path.join(process.cwd(), 'data', 'wow_listings.json')
const OUT_FILE = path.join(process.cwd(), 'data', 'availability.json')
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const BLOCK = new Set(['image', 'media', 'font'])  // PAS le CSS (casse le rendu du calendrier)

function getListings() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
  return (data.listings || []).map(l => ({ slug: l.slug, airbnb_id: String(l.airbnb_id || '') })).filter(l => l.airbnb_id)
}

// ── Parsing de la réponse GraphQL PdpAvailabilityCalendar ──
function parseCalendarJson(j) {
  const out = {}
  const months = j?.data?.merlin?.pdpAvailabilityCalendar?.calendarMonths || []
  for (const m of months) {
    for (const d of (m.days || [])) {
      if (!d.calendarDate) continue
      out[d.calendarDate] = { available: !!d.available, minNights: d.minNights ?? null }
    }
  }
  return out
}

// ── Lecture fiable du calendrier dans le DOM (+ clics "mois suivant") ──
async function readDomMonths(page) {
  const read = () => page.evaluate(() => {
    const o = {}
    for (const c of document.querySelectorAll('[data-testid^="calendar-day-"]')) {
      const id = c.getAttribute('data-testid').replace('calendar-day-', '')
      const [mm, dd, yyyy] = id.split('/')
      if (!yyyy) continue
      o[`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`] = c.getAttribute('data-is-day-blocked') !== 'true'
    }
    return o
  })
  const flat = {}
  Object.assign(flat, await read())
  const clicks = Math.max(0, Math.ceil(MONTHS / 2) - 1)
  for (let i = 0; i < clicks; i++) {
    const next = await page.$('button[aria-label^="Move forward"], button[aria-label*="next month" i]')
    if (!next) break
    try { await next.click({ timeout: 2500 }) } catch { break }
    await page.waitForTimeout(550)
    Object.assign(flat, await read())
  }
  const out = {}
  for (const [date, available] of Object.entries(flat)) out[date] = { available, minNights: null }
  return out
}

// enrichit minNights depuis le GraphQL si on a pu l'intercepter (best-effort)
function enrich(days, gql) {
  for (const [date, d] of Object.entries(gql)) {
    if (days[date]) days[date].minNights = d.minNights
  }
}

async function scrapeOnce(context, listing) {
  const page = await context.newPage()
  await page.route('**/*', (route) => BLOCK.has(route.request().resourceType()) ? route.abort() : route.continue())
  // best-effort : si Airbnb émet PdpAvailabilityCalendar (12 mois), on capte minNights/prix
  let calJson = null
  page.on('response', async (r) => {
    try { if (r.url().includes('/api/v3/PdpAvailabilityCalendar') && r.status() === 200) calJson = await r.json() } catch {}
  })
  try {
    await page.goto(`https://www.airbnb.com/rooms/${listing.airbnb_id}?locale=en`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('[data-testid^="calendar-day-"]', { state: 'attached', timeout: 30000 })
    const days = await readDomMonths(page)
    if (!Object.keys(days).length) throw new Error('aucune cellule calendrier')
    if (calJson) enrich(days, parseCalendarJson(calJson))
    return { days, source: calJson ? 'dom+gql' : 'dom' }
  } finally {
    await page.close()
  }
}

async function scrapeListing(context, listing) {
  let lastErr
  for (let attempt = 1; attempt <= 2; attempt++) {
    try { return await scrapeOnce(context, listing) }
    catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 1200)) }
  }
  throw lastErr
}

async function writeSupabase(supabase, listing, days) {
  const fetchedAt = new Date().toISOString()
  const rows = Object.entries(days).map(([date, d]) => ({
    slug: listing.slug, airbnb_id: listing.airbnb_id, date,
    available: d.available, min_nights: d.minNights, fetched_at: fetchedAt,
  }))
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from('stay_availability').upsert(rows.slice(i, i + 500), { onConflict: 'slug,date' })
    if (error) throw new Error('supabase: ' + error.message)
  }
  return rows.length
}

// pool de concurrence
async function pool(items, size, fn) {
  const out = []
  let i = 0
  await Promise.all(Array(Math.min(size, items.length)).fill(0).map(async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]) }
  }))
  return out
}

;(async () => {
  let browser
  if (SCRAPEDO_CDP_URL) { console.log('🧠 Scraping Browser distant (CDP)'); browser = await chromium.connectOverCDP(SCRAPEDO_CDP_URL) }
  else if (SCRAPEDO_TOKEN) { console.log('🔒 proxy résidentiel scrape.do'); browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--ignore-certificate-errors'], proxy: { server: 'http://proxy.scrape.do:8080', username: SCRAPEDO_TOKEN, password: 'super=true&geoCode=us' } }) }
  else { console.log('🌐 connexion directe (test local)'); browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] }) }
  const context = await browser.newContext({ ignoreHTTPSErrors: true, locale: 'en-US', userAgent: UA, viewport: { width: 1280, height: 1800 } })

  let supabase = null
  if (!NO_DB && SUPABASE_URL && SUPABASE_KEY) {
    supabase = require('@supabase/supabase-js').createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
    console.log('💾 écriture Supabase activée')
  } else console.log('💾 Supabase off (' + (NO_DB ? '--no-db' : 'clés absentes') + ')')

  // Parallélisme : sûr UNIQUEMENT avec IP tournantes (proxy/CDP). En direct,
  // Airbnb dégrade les pages si plusieurs onglets simultanés depuis la même IP → 1.
  const concurrency = CONCURRENCY_ARG || ((SCRAPEDO_CDP_URL || SCRAPEDO_TOKEN) ? 4 : 1)

  let listings = getListings()
  if (TARGET_SLUG) listings = listings.filter(l => l.slug === TARGET_SLUG)
  if (LIMIT) listings = listings.slice(0, LIMIT)
  console.log(`→ ${listings.length} listing(s) · ${MONTHS} mois · concurrence ${concurrency}\n`)

  const t0 = Date.now()
  const result = {}
  let ok = 0, fail = 0
  await pool(listings, concurrency, async (l) => {
    try {
      const { days, source } = await scrapeListing(context, l)
      const total = Object.keys(days).length
      const available = Object.values(days).filter(d => d.available).length
      let written = 0
      if (supabase) written = await writeSupabase(supabase, l, days)
      result[l.slug] = { airbnb_id: l.airbnb_id, scraped_at: new Date().toISOString(), source, total, available, written, days }
      console.log(`  ✓ ${l.slug.padEnd(34)} ${available}/${total} dispo · ${source}${supabase ? ` · ${written} DB` : ''}`)
      ok++
    } catch (e) {
      result[l.slug] = { airbnb_id: l.airbnb_id, error: e.message }
      console.log(`  ✗ ${l.slug.padEnd(34)} ${e.message}`)
      fail++
    }
  })

  fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2))
  console.log(`\n💾 ${OUT_FILE}\n✅ ${ok} ok · ${fail} échec(s) · ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  await browser.close()
})().catch(e => { console.error('FATAL', e); process.exit(1) })
