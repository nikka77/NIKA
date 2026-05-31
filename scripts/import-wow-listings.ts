/**
 * scripts/import-wow-listings.ts
 * 
 * Importe les 22 listings WOW Airbnb dans la table Supabase `stay_listings`.
 * 
 * Usage :
 *   npx ts-node scripts/import-wow-listings.ts
 *   npx ts-node scripts/import-wow-listings.ts --dry-run   (sans écrire en base)
 *   npx ts-node scripts/import-wow-listings.ts --id wow-001 (un seul listing)
 * 
 * Prérequis : SUPABASE_SERVICE_ROLE_KEY dans .env.local
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// --- Config ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const DATA_FILE    = path.join(process.cwd(), 'data', 'wow_listings.json')

const isDryRun  = process.argv.includes('--dry-run')
const targetId  = process.argv.find(a => a.startsWith('--id='))?.split('=')[1]

// --- Types ---
interface WowListing {
  id: string
  airbnb_id: string
  slug: string
  name: string
  tagline: string
  type: string
  wow_score: number
  country: string
  region?: string
  city: string
  address?: string
  gps?: number[]
  capacity: { guests: number; bedrooms: number; beds: number; bathrooms: number }
  rating: number
  reviews_count: number
  badge?: string
  host: string
  price_ref?: string
  description_nika: string
  history: Record<string, any>
  amenities: string[]
  sample_reviews: Array<{ author: string; date: string; stars: number; text: string }>
  review_categories?: Record<string, number>
  checkin?: string
  checkout?: string
  booking_type: string
  contact_priority: string
  also_on_booking?: boolean
  media?: string[]
}

// --- Conversion vers le schéma Supabase ---
function toSupabaseRow(listing: WowListing) {
  return {
    // Identité
    name:         listing.name,
    slug:         listing.slug,
    type:         listing.type,
    tagline:      listing.tagline,
    description:  listing.description_nika,

    // Localisation
    country:      listing.country,
    region:       listing.region || null,
    city:         listing.city,
    lat:          listing.gps?.[0] || null,
    lng:          listing.gps?.[1] || null,

    // Capacité
    max_guests:   listing.capacity.guests,
    bedrooms:     listing.capacity.bedrooms,
    bathrooms:    Math.round(listing.capacity.bathrooms),

    // Tarif
    price_per_night: parsePriceRef(listing.price_ref),
    currency:     'EUR',

    // Affiliation
    booking_type: listing.booking_type,
    affil_url:    null, // À renseigner manuellement avec liens affiliés

    // Scores
    wow_score:    listing.wow_score,
    nika_score:   0, // Calculé plus tard depuis les avis

    // Statut
    status:       'pending', // Passer à 'active' après validation
    featured:     listing.wow_score >= 23,

    // Source
    source:       'airbnb_wow',
    source_id:    listing.airbnb_id,

    // Métadonnées enrichies (stockées en JSONB)
    metadata: {
      host:             listing.host,
      badge:            listing.badge || null,
      contact_priority: listing.contact_priority,
      history:          listing.history,
      amenities:        listing.amenities,
      review_categories: listing.review_categories || {},
      media:            listing.media || [],
      also_on_booking:  listing.also_on_booking || false,
      checkin:          listing.checkin || null,
      checkout:         listing.checkout || null,
    }
  }
}

function parsePriceRef(ref?: string): number | null {
  if (!ref) return null
  const match = ref.match(/(\d+)/)
  return match ? parseInt(match[1]) : null
}

// --- Import des avis ---
async function importReviews(
  supabase: any,
  listingDbId: string,
  reviews: WowListing['sample_reviews']
) {
  if (!reviews?.length) return

  const rows = reviews.map(r => ({
    listing_id:     listingDbId,
    score_overall:  r.stars,
    text:           r.text,
    source:         'airbnb_import',
    source_author:  r.author,
    source_date:    parseDate(r.date),
    verified_stay:  false,
  }))

  const { error } = await supabase.from('stay_reviews').upsert(rows, {
    onConflict: 'listing_id,source_author,source_date',
    ignoreDuplicates: true
  })

  if (error) console.warn(`  ⚠️  Avis: ${error.message}`)
  else console.log(`  ✅ ${rows.length} avis importés`)
}

function parseDate(dateStr: string): string | null {
  // "mars 2026" → "2026-03-01"
  const months: Record<string, string> = {
    'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
    'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
    'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
  }
  const match = dateStr.match(/(\w+)\s+(\d{4})/)
  if (!match) return null
  const month = months[match[1].toLowerCase()]
  return month ? `${match[2]}-${month}-01` : null
}

// --- Main ---
async function main() {
  console.log('🚀 NIKA WOW Listings Import')
  console.log(`   Fichier : ${DATA_FILE}`)
  console.log(`   Mode    : ${isDryRun ? 'DRY RUN (aucune écriture)' : 'PRODUCTION'}`)
  if (targetId) console.log(`   Filtre  : ${targetId}`)
  console.log('')

  // Lire le fichier JSON
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`❌ Fichier introuvable : ${DATA_FILE}`)
    console.error('   Copier nika_wow_all_22.json vers data/wow_listings.json')
    process.exit(1)
  }

  const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
  let listings: WowListing[] = raw.listings

  // Filtre optionnel
  if (targetId) {
    listings = listings.filter(l => l.id === targetId)
    if (!listings.length) {
      console.error(`❌ Listing introuvable : ${targetId}`)
      process.exit(1)
    }
  }

  console.log(`📦 ${listings.length} listing(s) à traiter\n`)

  if (isDryRun) {
    listings.forEach(l => {
      console.log(`[DRY RUN] ${l.id} — ${l.name} (${l.city}, ${l.country})`)
      console.log(`          slug: ${l.slug}`)
      console.log(`          note: ${l.rating}/5 — ${l.reviews_count} avis`)
      console.log(`          WOW score: ${l.wow_score}/25 — ${l.contact_priority}`)
      console.log('')
    })
    console.log('✅ Dry run terminé — aucune donnée écrite')
    return
  }

  // Connexion Supabase (service role pour bypass RLS)
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  let imported = 0, updated = 0, errors = 0

  for (const listing of listings) {
    console.log(`\n[${listing.id}] ${listing.name}`)
    console.log(`  ${listing.city}, ${listing.country} — ${listing.rating}★ (${listing.reviews_count} avis)`)

    const row = toSupabaseRow(listing)

    // Upsert sur le slug (idempotent — safe à relancer)
    const { data, error } = await supabase
      .from('stay_listings')
      .upsert(row, { onConflict: 'slug' })
      .select('id')
      .single()

    if (error) {
      console.error(`  ❌ Erreur : ${error.message}`)
      errors++
      continue
    }

    const isNew = !data?.id
    if (isNew) { console.log(`  ✅ Créé`); imported++ }
    else       { console.log(`  🔄 Mis à jour`); updated++ }

    // Importer les avis
    if (data?.id && listing.sample_reviews?.length) {
      await importReviews(supabase, data.id, listing.sample_reviews)
    }
  }

  console.log('\n' + '─'.repeat(50))
  console.log(`✅ Import terminé`)
  console.log(`   Créés   : ${imported}`)
  console.log(`   Mis à j : ${updated}`)
  console.log(`   Erreurs : ${errors}`)
  console.log('')
  console.log('💡 Prochaines étapes :')
  console.log('   1. Passer les listings validés à status="active" dans Supabase')
  console.log('   2. Ajouter les vraies URLs affiliées dans le champ affil_url')
  console.log('   3. Récupérer les photos auprès des propriétaires')
  console.log('   4. Générer les pages Next.js /stay/[slug]')
}

main().catch(console.error)
