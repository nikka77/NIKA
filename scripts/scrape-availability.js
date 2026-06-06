/**
 * scripts/scrape-availability.js
 * Scrape Airbnb calendar availability for all WOW listings
 * Runs on GitHub Actions every 6h, stores in Supabase
 */

const { chromium } = require('playwright')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const MONTHS_AHEAD  = parseInt(process.env.MONTHS_AHEAD || '3')
const DELAY_MS      = 3000
const DATA_FILE     = path.join(process.cwd(), 'data', 'wow_listings.json')

const LISTINGS_FALLBACK = [
  ['20605023','sous-marin-jaune-nouvelle-zelande'],
  ['946891754525944779','express-voiture-salon-14630-normandie'],
  ['46711243','silo-missiles-bunker-atlas-f-roswell'],
  ['1152145392834567091','anthenea-suite-flottante-perros-guirec'],
  ['900891950206269231','ovni-guadalupe-vallee-baja'],
  ['765336753795827514','caboose-train-jacuzzi-eureka-springs'],
  ['12031639','peniche-arche-noe-somme-pont-remy'],
  ['50597302','wagon-conestoga-ranch-sandy-valley-nevada'],
  ['645104367296318967','tiny-house-silo-grain-ellensburg-washington'],
  ['1762491','earthship-taos-mesa-nouveau-mexique'],
  ['22840443','wee-nook-hobbit-hole-tennessee'],
  ['1720832','cob-cottage-mayne-island-canada'],
  ['43395127','maison-hobbit-saint-affrique-occitanie'],
  ['31562435','grotte-nid2reve-savignac-perigord'],
  ['35018780','grotte-moulin-motte-baudoin-noyers-sur-cher'],
  ['1131387956858883609','sphere-rochers-joshua-tree-californie'],
  ['939467291828305415','living-inn-dome-volcanique-hawaii'],
  ['713793474951553871','naturhus-bio-hors-reseau-bralande-suede'],
  ['457547','domeland-adobe-hors-reseau-big-bend-texas'],
  ['32269342','cabane-konza-silos-grain-ranch-kansas'],
  ['28254684','bloomhouse-austin-texas'],
  ['45646568','gawthornes-hut-top10-monde-mudgee-australie'],
  ['51225228','nid-des-hirondelles-erquy-bretagne'],
  ['27253558','vieux-moulin-chinon-val-de-loire'],
  ['26175744','estiva-loft-hobbit-lapeyrugue-auvergne'],
  ['34459490','gite-du-sorcier-colmar-alsace'],
  ['918645205013496461','birdbox-lotsbergskaara-nordfjord-norvege'],
  ['34692739','birdbox-fordefjord-norvege'],
  ['896615610365768668','bubble-etoile-agnes-victoria-australie'],
  ['51410896','treecastle-wallkill-new-york'],
  ['1173097257967089025','loft-cime-arbres-georgie'],
  ['46594086','cabane-leaf-fredericksburg-texas'],
  ['13761529','willow-treehouse-alaska'],
  ['49797626','maison-des-fous-aubrey-texas'],
  ['1025206498994795956','copper-fox-treehouse-vermont'],
  ['42230391','yourtes-jardin-foret-galena'],
  ['985095564769450218','cabane-octogonale-galena'],
  ['46766508','nid-dragon-katana-villa-amed-bali'],
  ['581170184081838138','grand-cheval-fjord-sunnfjord-norvege'],
  ['45526609','swallow-nest-pucon-chili'],
  ['41632284','naturel-scanie-suede'],
]

function getListings() {
  if (!fs.existsSync(DATA_FILE)) return LISTINGS_FALLBACK.map(([id,slug]) => ({slug, airbnb_id: id}))
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
  return data.listings.map(l => ({ slug: l.slug, airbnb_id: l.airbnb_id }))
}

async function scrapeCalendar(page, airbnbId, months) {
  await page.goto(`https://www.airbnb.fr/rooms/${airbnbId}`, {
    waitUntil: 'domcontentloaded', timeout: 30000
  })
  await page.waitForTimeout(2000)
  const rows = []
  const now = new Date()
  for (let m = 0; m < months; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() + m, 1)
    const data = await page.evaluate(async (id, month, year) => {
      try {
        const r = await fetch(
          `/api/v2/calendar_months?listing_id=${id}&month=${month}&year=${year}&count=1&_format=for_mbp`,
          { headers: { 'Accept': 'application/json' } }
        )
        if (!r.ok) return null
        return await r.json()
      } catch(e) { return null }
    }, airbnbId, d.getMonth() + 1, d.getFullYear())
    if (data && data.calendar_months) {
      data.calendar_months.forEach(cm => {
        cm.days.forEach(day => {
          rows.push({
            date: day.date,
            available: Boolean(day.available),
            min_nights: day.min_nights || null,
            price_native: day.price && day.price.native_price ? day.price.native_price : null,
            currency: day.price && day.price.native_currency ? day.price.native_currency : null,
          })
        })
      })
    }
  }
  return rows
}

async function upsertAvailability(supabase, slug, airbnbId, days) {
  if (!days.length) return 0
  const rows = days.map(d => ({
    slug, airbnb_id: airbnbId,
    date: d.date, available: d.available,
    min_nights: d.min_nights, price_native: d.price_native,
    currency: d.currency, fetched_at: new Date().toISOString(),
  }))
  let inserted = 0
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase
      .from('stay_availability')
      .upsert(rows.slice(i, i + 100), { onConflict: 'slug,date' })
    if (!error) inserted += Math.min(100, rows.length - i)
    else console.error('Supabase error:', error.message)
  }
  return inserted
}

async function main() {
  const start = Date.now()
  console.log('\n=== NIKA Calendar Scraper ===')
  console.log('Time:', new Date().toISOString())

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE env vars')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const listings = getListings()
  console.log('Listings:', listings.length)

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    locale: 'fr-FR'
  })

  // Accept cookies once
  const setup = await context.newPage()
  try {
    await setup.goto('https://www.airbnb.fr', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await setup.waitForTimeout(1500)
    await setup.click('button:has-text("Accepter")', { timeout: 2000 }).catch(() => {})
  } catch(e) {}
  await setup.close()

  let total = 0, errors = 0
  for (let i = 0; i < listings.length; i++) {
    const { slug, airbnb_id } = listings[i]
    process.stdout.write(`[${String(i+1).padStart(2,'0')}/${listings.length}] ${slug}... `)
    const page = await context.newPage()
    try {
      const days = await scrapeCalendar(page, airbnb_id, MONTHS_AHEAD)
      const n = await upsertAvailability(supabase, slug, airbnb_id, days)
      const avail = days.filter(d => d.available).length
      console.log(`OK ${days.length} days / ${avail} available / ${n} upserted`)
      total += n
    } catch(e) {
      console.log(`FAIL ${e.message}`)
      errors++
    } finally {
      await page.close()
    }
    if (i < listings.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS + Math.random() * 2000))
    }
  }

  await browser.close()
  const elapsed = Math.round((Date.now() - start) / 1000)
  console.log(`\n=== Done in ${elapsed}s | ${total} rows upserted | ${errors} errors ===`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
