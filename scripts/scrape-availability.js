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
 *   0 */6 * * * cd /home/ubuntu/NIKA && node scripts/scrape-availability.js >> /var/log/nika-calendar.log 2>&1
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
function getListings() {
  if (!fs.existsSync(DATA_FILE)) {
    // Fallback hardcodé si pas de fichier
    return [
      { slug: 'sous-marin-jaune-nouvelle-zelande',       airbnb_id: '20605023' },
      { slug: 'express-voiture-salon-14630-normandie',   airbnb_id: '946891754525944779' },
      { slug: 'silo-missiles-bunker-atlas-f-roswell',    airbnb_id: '46711243' },
      { slug: 'anthenea-suite-flottante-perros-guirec',  airbnb_id: '1152145392834567091' },
      { slug: 'ovni-guadalupe-vallee-baja',              airbnb_id: '900891950206269231' },
      { slug: 'caboose-train-jacuzzi-eureka-springs',    airbnb_id: '765336753795827514' },
      { slug: 'peniche-arche-noe-somme-pont-remy',       airbnb_id: '12031639' },
      { slug: 'wagon-conestoga-ranch-sandy-valley-nevada', airbnb_id: '50597302' },
      { slug: 'tiny-house-silo-grain-ellensburg-washington', airbnb_id: '645104367296318967' },
      { slug: 'earthship-taos-mesa-nouveau-mexique',     airbnb_id: '1762491' },
      { slug: 'wee-nook-hobbit-hole-tennessee',          airbnb_id: '22840443' },
      { slug: 'cob-cottage-mayne-island-canada',         airbnb_id: '1720832' },
      { slug: 'maison-hobbit-saint-affrique-occitanie',  airbnb_id: '43395127' },
      { slug: 'grotte-nid2reve-savignac-perigord',       airbnb_id: '31562435' },
      { slug: 'grotte-moulin-motte-baudoin-noyers-sur-cher', airbnb_id: '35018780' },
      { slug: 'sphere-rochers-joshua-tree-californie',   airbnb_id: '1131387956858883609' },
      { slug: 'living-inn-dome-volcanique-hawaii',       airbnb_id: '939467291828305415' },
      { slug: 'naturhus-bio-hors-reseau-bralande-suede', airbnb_id: '713793474951553871' },
      { slug: 'domeland-adobe-hors-reseau-big-bend-texas', airbnb_id: '457547' },
      { slug: 'cabane-konza-silos-grain-ranch-kansas',   airbnb_id: '32269342' },
      { slug: 'bloomhouse-austin-texas',                 airbnb_id: '28254684' },
      { slug: 'gawthornes-hut-top10-monde-mudgee-australie', airbnb_id: '45646568' },
      { slug: 'nid-des-hirondelles-erquy-bretagne',      airbnb_id: '51225228' },
      { slug: 'vieux-moulin-chinon-val-de-loire',        airbnb_id: '27253558' },
      { slug: 'estiva-loft-hobbit-lapeyrugue-auvergne',  airbnb_id: '26175744' },
      { slug: 'gite-du-sorcier-colmar-alsace',           airbnb_id: '34459490' },
      { slug: 'birdbox-lotsbergskaara-nordfjord-norvege', airbnb_id: '918645205013496461' },
      { slug: 'birdbox-fordefjord-norvege',              airbnb_id: '34692739' },
      { slug: 'bubble-etoile-agnes-victoria-australie',  airbnb_id: '896615610365768668' },
      { slug: 'treecastle-wallkill-new-york',            airbnb_id: '51410896' },
      { slug: 'loft-cime-arbres-georgie',                airbnb_id: '1173097257967089025' },
      { slug: 'cabane-leaf-fredericksburg-texas',        airbnb_id: '46594086' },
      { slug: 'willow-treehouse-alaska',                 airbnb_id: '13761529' },
      { slug: 'maison-des-fous-aubrey-texas',            airbnb_id: '49797626' },
      { slug: 'copper-fox-treehouse-vermont',            airbnb_id: '1025206498994795956' },
      { slug: 'yourtes-jardin-foret-galena',             airbnb_id: '42230391' },
      { slug: 'cabane-octogonale-galena',                airbnb_id: '985095564769450218' },
      { slug: 'nid-dragon-katana-villa-amed-bali',       airbnb_id: '46766508' },
      { slug: 'grand-cheval-fjord-sunnfjord-norvege',    airbnb_id: '581170184081838138' },
      { slug: 'swallow-nest-pucon-chili',                airbnb_id: '45526609' },
      { slug: 'naturel-scanie-suede',                    airbnb_id: '41632284' },
    ]
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
  return data.listings.map(l => ({ slug: l.slug, airbnb_id: l.airbnb_id }))
}

// ─── Scraper une annonce ────────────────────────────────────
async function scrapeCalendar(page, airbnbId, months = 3) {
  // Naviguer sur la page listing (nécessaire pour cookies + auth domaine)
  await page.goto(`https://www.airbnb.fr/rooms/${airbnbId}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  })
  await page.waitForTimeout(2000)
  
  // Appeler l'API calendrier depuis le contexte du navigateur (même-origine → pas de 403)
  const now = new Date()
  const results = []
  
  for (let m = 0; m < months; m++) {
    const date = new Date(now.getFullYear(), now.getMonth() + m, 1)
    const month = date.getMonth() + 1
    const year  = date.getFullYear()
    
    const data = await page.evaluate(async (id, month, year) => {
      try {
        const r = await fetch(
          `/api/v2/calendar_months?listing_id=${id}&month=${month}&year=${year}&count=1&_format=for_mbp`,
          { headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } }
        )
        if (!r.ok) return { error: r.status }
        return await r.json()
      } catch(e) {
        return { error: e.message }
      }
    }, airbnbId, month, year)
    
    if (data.error) {
      console.warn(`  ⚠️  API error for ${airbnbId} month ${month}/${year}: ${data.error}`)
      continue
    }
    
    if (data.calendar_months) {
      data.calendar_months.forEach(cm => {
        cm.days.forEach(day => {
          results.push({
            date:         day.date,
            available:    Boolean(day.available),
            min_nights:   day.min_nights || null,
            price_native: day.price?.native_price || null,
            currency:     day.price?.native_currency || null,
          })
        })
      })
    }
  }
  
  return results
}

// ─── Upsert Supabase ────────────────────────────────────────
async function upsertAvailability(supabase, slug, airbnbId, days) {
  if (!days.length) return 0
  
  const rows = days.map(d => ({
    slug,
    airbnb_id:    airbnbId,
    date:         d.date,
    available:    d.available,
    min_nights:   d.min_nights,
    price_native: d.price_native,
    currency:     d.currency,
    fetched_at:   new Date().toISOString(),
  }))
  
  // Upsert par batch de 100
  let inserted = 0
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase
      .from('stay_availability')
      .upsert(rows.slice(i, i + 100), { onConflict: 'slug,date' })
    if (error) console.error(`  ❌ Supabase error: ${error.message}`)
    else inserted += Math.min(100, rows.length - i)
  }
  return inserted
}

// ─── Main ───────────────────────────────────────────────────
async function main() {
  const startTime = Date.now()
  console.log(`\n🗓️  NIKA Calendar Scraper — ${new Date().toISOString()}`)
  console.log(`   Months ahead: ${MONTHS_AHEAD}`)
  
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local')
    process.exit(1)
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  
  let listings = getListings()
  if (TARGET_SLUG) {
    listings = listings.filter(l => l.slug === TARGET_SLUG)
    if (!listings.length) { console.error(`❌ Slug introuvable: ${TARGET_SLUG}`); process.exit(1) }
  }
  
  console.log(`   Listings: ${listings.length}\n`)
  
  // Browser une seule fois pour tous les listings
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
    ]
  })
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    locale: 'fr-FR',
    viewport: { width: 1280, height: 800 }
  })
  
  // Accepter les cookies une fois
  const setupPage = await context.newPage()
  await setupPage.goto('https://www.airbnb.fr', { waitUntil: 'domcontentloaded', timeout: 20000 })
  await setupPage.waitForTimeout(2000)
  try {
    await setupPage.click('button:has-text("Accepter"), #onetrust-accept-btn-handler', { timeout: 3000 })
  } catch {}
  await setupPage.close()
  
  let totalDays = 0, errors = 0
  
  for (let i = 0; i < listings.length; i++) {
    const { slug, airbnb_id } = listings[i]
    process.stdout.write(`[${String(i+1).padStart(2,'0')}/${listings.length}] ${slug} ... `)
    
    const page = await context.newPage()
    try {
      const days = await scrapeCalendar(page, airbnb_id, MONTHS_AHEAD)
      const inserted = await upsertAvailability(supabase, slug, airbnb_id, days)
      const available = days.filter(d => d.available).length
      console.log(`✅ ${days.length} jours / ${available} dispo / ${inserted} upserted`)
      totalDays += inserted
    } catch(e) {
      console.log(`❌ ${e.message}`)
      errors++
    } finally {
      await page.close()
    }
    
    // Délai anti-bot entre listings
    if (i < listings.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS + Math.random() * 2000))
    }
  }
  
  await browser.close()
  
  const elapsed = Math.round((Date.now() - startTime) / 1000)
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`✅ Terminé en ${elapsed}s — ${totalDays} jours upserted — ${errors} erreurs`)
  console.log(`${'─'.repeat(50)}\n`)
}

main().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
