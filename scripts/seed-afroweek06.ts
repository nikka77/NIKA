// scripts/seed-afroweek06.ts
// Usage: PATH="/opt/homebrew/bin:$PATH" node --loader ts-node/esm scripts/seed-afroweek06.ts

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PROVIDER = {
  slug:        'afroweek06',
  name:        '@afroweek06',
  description: 'Cuisine africaine authentique — sénégalaise. Livraison soir à Nice et alentours.',
  city:        'Nice',
  instagram:   '@afroweek06',
  opens_at:    '19:00',
  closes_at:   '23:00',
  active:      true,
}

const ITEMS = [
  { slug: 'thieboudienne', name: 'Thiéboudienne',     description: 'Riz au poisson, légumes, sauce tomate maison',       price: 13, category: 'main',  emoji: '🐟' },
  { slug: 'poulet-yassa',  name: 'Poulet Yassa',      description: 'Poulet grillé, oignons confits, citron, olives vertes', price: 13, category: 'main',  emoji: '🍗' },
  { slug: 'mafe',          name: 'Mafé',              description: 'Bœuf en sauce arachide, riz blanc',                   price: 13, category: 'main',  emoji: '🥜' },
  { slug: 'vermicelles',   name: 'Vermicelles',       description: 'Vermicelles sautés, oignons, viande mijotée',         price: 13, category: 'main',  emoji: '🍝' },
  { slug: 'thieboli-yapp', name: 'Thiéboli Yapp',     description: 'Riz à la viande, légumes de saison',                 price: 13, category: 'main',  emoji: '🍖' },
  { slug: 'pastels',       name: 'Pastels (5 pièces)', description: 'Beignets farcis maison, sauce pimentée',            price:  6, category: 'side',  emoji: '🥟' },
  { slug: 'bissap',        name: 'Bissap',            description: "Jus d'hibiscus maison, servi frais",                 price:  2, category: 'drink', emoji: '🧃' },
]

const STOCKS: Record<string, number> = {
  'thieboudienne': 8,
  'poulet-yassa':  6,
  'mafe':          5,
  'vermicelles':   4,
  'thieboli-yapp': 3,
  'bissap':        20,
  'pastels':       12,
}

async function seed() {
  console.log('🌱 Seed @afroweek06...')

  // 1. Prestataire
  const { data: provider, error: provErr } = await supabase
    .from('food_providers')
    .upsert(PROVIDER, { onConflict: 'slug' })
    .select('id, slug')
    .single()

  if (provErr || !provider) { console.error('❌ Provider:', provErr); process.exit(1) }
  console.log('✅ Provider:', provider.id)

  // 2. Items
  const itemsWithProvider = ITEMS.map(i => ({ ...i, provider_id: provider.id }))
  const { data: insertedItems, error: itemsErr } = await supabase
    .from('food_items')
    .upsert(itemsWithProvider, { onConflict: 'provider_id,slug' })
    .select('id, slug')

  if (itemsErr || !insertedItems) { console.error('❌ Items:', itemsErr); process.exit(1) }
  console.log(`✅ ${insertedItems.length} items`)

  // 3. Session du jour (upsert pour idempotence)
  const today = new Date().toISOString().split('T')[0]
  const { data: session, error: sessErr } = await supabase
    .from('food_sessions')
    .upsert({ provider_id: provider.id, date: today, status: 'open' }, { onConflict: 'provider_id,date' })
    .select('id')
    .single()

  if (sessErr || !session) { console.error('❌ Session:', sessErr); process.exit(1) }
  console.log('✅ Session:', session.id)

  // 4. Stocks
  const stocks = insertedItems.map(item => ({
    session_id:      session.id,
    item_id:         item.id,
    initial_stock:   STOCKS[item.slug] ?? 5,
    remaining_stock: STOCKS[item.slug] ?? 5,
  }))
  const { error: stockErr } = await supabase.from('food_session_stocks').upsert(stocks, { onConflict: 'session_id,item_id' })
  if (stockErr) { console.error('❌ Stocks:', stockErr); process.exit(1) }
  console.log('✅ Stocks seedés !')

  console.log('\n📋 Résumé :')
  console.log(`  Provider slug : afroweek06`)
  console.log(`  Provider id   : ${provider.id}`)
  console.log(`  Session id    : ${session.id}`)
  console.log(`  Date          : ${today}`)
  console.log('\n🎉 Seed terminé !')
}

seed().catch(err => { console.error(err); process.exit(1) })
