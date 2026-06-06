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
 *   0 */6 * * * cd /home/ubuntu/NIKA && node scripts/scrape-availability.js >> /var/log/nika-calendar.log 2>&1
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
  }
  // Fallback hardcodé
  return [
    { slug: 'sous-marin-jaune-nouvelle-zelande',           airbnb_id: '20605023' },
    { slug: 'express-voiture-salon-14630-normandie',       airbnb_id: '946891754525944779' },
    { slug: 'silo-missiles-bunker-atlas-f-roswell',        airbnb_id: '46711243' },
    { slug: 'anthenea-suite-flottante-perros-guirec',      airbnb_id: '1152145392834567091' },
    { slug: 'ovni-guadalupe-vallee-baja',                  airbnb_id: '900891950206269231' },
    { slug: 'caboose-train-jacuzzi-eureka-springs',        airbnb_id: '765336753795827514' },
    { slug: 'peniche-arche-noe-somme-pont-remy',           airbnb_id: '12031639' },
    { slug: 'wagon-conestoga-ranch-sandy-valley-nevada',   airbnb_id: '50597302' },
    { slug: 'tiny-house-silo-grain-ellensburg-washington', airbnb_id: '645104367296318967' },
    { slug: 'earthship-taos-mesa-nouveau-mexique',         airbnb_id: '1762491' },
    { slug: 'wee-nook-hobbit-hole-tennessee',              airbnb_id: '22840443' },
    { slug: 'cob-cottage-mayne-island-canada',             airbnb_id: '1720832' },
    { slug: 'maison-hobbit-saint-affrique-occitanie',      airbnb_id: '43395127' },
    { slug: 'grotte-nid2reve-savignac-perigord',           airbnb_id: '31562435' },
    { slug: 'grotte-moulin-motte-baudoin-noyers-sur-cher', airbnb_id: '35018780' },
    { slug: 'sphere-rochers-joshua-tree-californie',       airbnb_id: '1131387956858883609' },
    { slug: 'living-inn-dome-volcanique-hawaii',           airbnb_id: '939467291828305415' },
    { slug: 'naturhus-bio-hors-reseau-bralande-suede',     airbnb_id: '713793474951553871' },
    { slug: 'domeland-adobe-hors-reseau-big-bend-texas',   airbnb_id: '457547' },
    { slug: 'cabane-konza-silos-grain-ranch-kansas',       airbnb_id: '32269342' },
    { slug: 'bloomhouse-austin-texas',                     airbnb_id: '28254684' },
    { slug: 'gawthornes-hut-top10-monde-mudgee-australie', airbnb_id: '45646568' },
    { slug: 'nid-des-hirondelles-erquy-bretagne',          airbnb_id: '51225228' },
    { slug: 'vieux-moulin-chinon-val-de-loire',            airbnb_id: '27253558' },
    { slug: 'estiva-loft-hobbit-lapeyrugue-auvergne',      airbnb_id: '26175744' },
    { slug: 'gite-du-sorcier-colmar-alsace',               airbnb_id: '34459490' },
    { slug: 'birdbox-lotsbergskaara-nordfjord-norvege',    airbnb_id: '918645205013496461' },
    { slug: 'birdbox-fordefjord-norvege',                  airbnb_id: '34692739' },
    { slug: 'bubble-etoile-agnes-victoria-australie',      airbnb_id: '896615610365768668' },
    { slug: 'treecastle-wallkill-new-york',                airbnb_id: '51410896' },
    { slug: 'loft-cime-arbres-georgie',                    airbnb_id: '1173097257967089025' },
    { slug: 'cabane-leaf-fredericksburg-texas',            airbnb_id: '46594086' },
    { slug: 'willow-treehouse-alaska',                     airbnb_id: '13761529' },
    { slug: 'maison-des-fous-aubrey-texas',                airbnb_id: '49797626' },
    { slug: 'copper-fox-treehouse-vermont',                airbnb_id: '1025206498994795956' },
    { slug: 'yourtes-jardin-foret-galena',                 airbnb_id: '42230391' },
    { slug: 'cabane-octogonale-galena',                    airbnb_id: '985095564769450218' },
    { slug: 'nid-dragon-katana-villa-amed-bali',           airbnb_id: '46766508' },
    { slug: 'grand-cheval-fjord-sunnfjord-norvege',        airbnb_id: '581170184081838138' },
    { slug: 'swallow-nest-pucon-chili',                    airbnb_id: '45526609' },
    { slug: 'naturel-scanie-suede',                        airbnb_id: '41632284' },
  ]
}

// ─── Fetch iCal ────────────────────────────────────────────
function fetchIcal(airbnbId) {
  return new Promise((resolve, reject) => {
    const url = `https://www.airbnb.com/calendar/ical/${airbnbId}.ics`
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`))
        res.resume()
        return
      }
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    }).on('error', reject)
  })
}

// ─── Parse iCal → jours bloqués ────────────────────────────
function parseBlockedDates(ical) {
  const blocked = new Set()
  const lines = ical.replace(/\r\n/g, '\n').split('\n')
  let inEvent = false, dtStart = null, dtEnd = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { inEvent = true; dtStart = null; dtEnd = null }
    if (!inEvent) continue
    if (line.startsWith('DTSTART')) {
      const m = line.match(/(\d{8})/)
      if (m) dtStart = m[1]
    }
    if (line.startsWith('DTEND')) {
      const m = line.match(/(\d{8})/)
      if (m) dtEnd = m[1]
    }
    if (line === 'END:VEVENT' && dtStart) {
      // Ajouter tous les jours du bloc [dtStart, dtEnd)
      const start = new Date(dtStart.slice(0,4)+'-'+dtStart.slice(4,6)+'-'+dtStart.slice(6,8))
      const end   = dtEnd ? new Date(dtEnd.slice(0,4)+'-'+dtEnd.slice(4,6)+'-'+dtEnd.slice(6,8)) : new Date(start.getTime() + 86400000)
      const cur   = new Date(start)
      while (cur < end) {
        blocked.add(cur.toISOString().split('T')[0])
        cur.setDate(cur.getDate() + 1)
      }
      inEvent = false
    }
  }
  return blocked
}

// ─── Générer toutes les dates de la fenêtre ────────────────
function generateDateRange(months) {
  const dates = []
  const start = new Date()
  const end   = new Date()
  end.setMonth(end.getMonth() + months)

  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

// ─── Upsert Supabase ────────────────────────────────────────
async function upsertAvailability(supabase, slug, airbnbId, dates, blocked) {
  const rows = dates.map(date => ({
    slug,
    airbnb_id:  airbnbId,
    date,
    available:  !blocked.has(date),
    fetched_at: new Date().toISOString(),
  }))

  let inserted = 0
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase
      .from('stay_availability')
      .upsert(rows.slice(i, i + 100), { onConflict: 'slug,date' })
    if (error) console.error(`  ❌ Supabase: ${error.message}`)
    else inserted += Math.min(100, rows.length - i)
  }
  return inserted
}

// ─── Delay ─────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── Main ───────────────────────────────────────────────────
async function main() {
  const startTime = Date.now()
  console.log(`\n🗓️  NIKA iCal Scraper — ${new Date().toISOString()}`)
  console.log(`   Months ahead: ${MONTHS_AHEAD}`)

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const allDates = generateDateRange(MONTHS_AHEAD)
  console.log(`   Fenêtre: ${allDates[0]} → ${allDates[allDates.length-1]} (${allDates.length} jours)`)

  let listings = getListings()
  if (TARGET_SLUG) {
    listings = listings.filter(l => l.slug === TARGET_SLUG)
    if (!listings.length) { console.error(`❌ Slug introuvable: ${TARGET_SLUG}`); process.exit(1) }
  }
  console.log(`   Listings: ${listings.length}\n`)

  let totalDays = 0, errors = 0

  for (let i = 0; i < listings.length; i++) {
    const { slug, airbnb_id } = listings[i]
    process.stdout.write(`[${String(i+1).padStart(2,'0')}/${listings.length}] ${slug} ... `)

    try {
      const ical    = await fetchIcal(airbnb_id)
      const blocked = parseBlockedDates(ical)
      const avail   = allDates.filter(d => !blocked.has(d)).length
      const inserted = await upsertAvailability(supabase, slug, airbnb_id, allDates, blocked)
      console.log(`✅ ${allDates.length} jours / ${avail} dispo / ${blocked.size} bloqués / ${inserted} upserted`)
      totalDays += inserted
    } catch(e) {
      console.log(`❌ ${e.message}`)
      errors++
    }

    if (i < listings.length - 1) await sleep(DELAY_MS)
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000)
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`✅ Terminé en ${elapsed}s — ${totalDays} jours upserted — ${errors} erreurs`)
  console.log(`${'─'.repeat(50)}\n`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
