// scripts/seed-rakomoria.ts
// Usage: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-rakomoria.ts

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PROVIDER = {
  slug:        'rakomoriafood',
  name:        'RAKOMORIA FOOD',
  description: 'Cuisine comorienne authentique — 100% fait maison. Du goût, du frais, du bonheur !',
  city:        'Nice',
  instagram:   'rakomoriafood',
  active:      true,
  opens_at:    '21:00',
  closes_at:   '03:00',
}

const ITEMS = [
  // Plats principaux
  { slug: 'couscousma',          name: 'Couscousma',                      description: 'Pain comorien fait main, sauce tomate savoureuse, escalope de poulet, légumes parfumés',      price: 10, category: 'main',  emoji: '🥘' },
  { slug: 'riz-sauce-rouge-boeuf', name: 'Riz sauce rouge viande de bœuf', description: 'Riz blanc, sauce maison tomate, morceaux de bœuf fondants, petits pois, carottes',           price: 10, category: 'main',  emoji: '🍚' },
  { slug: 'foutra-burger',       name: 'Foutra Burger',                   description: 'Pain comorien fait main, steaks savoureux, sauces onctueuses, fromage fondant',               price: 10, category: 'main',  emoji: '🍔' },
  { slug: 'riz-viande-rougai',   name: 'Riz viande de bœuf rougaï',       description: 'Riz au coco, rougail tomate, bœuf mijoté aux épices des Comores',                           price: 10, category: 'main',  emoji: '🍛' },
  { slug: 'gratin-pates',        name: 'Gratin de pâtes',                 description: 'Pâtes généreuses, sauce savoureuse, viande hachée, mozzarella fondante',                     price: 10, category: 'main',  emoji: '🍝' },
  { slug: 'riz-legumes-boeuf',   name: 'Riz aux légumes viande de bœuf',  description: 'Épices comoriennes, légumes frais, viande de bœuf fondante',                                price: 10, category: 'main',  emoji: '🥩' },
  // RMR (jeudi-samedi)
  { slug: 'tacos-tenders',       name: 'Tacos gratiné Tenders',           description: 'Tenders croustillants, sauce maison, fromage fondant',                                      price: 10, category: 'main',  emoji: '🌯' },
  { slug: 'tacos-viande-hachee', name: 'Tacos gratiné viande hachée',     description: 'Viande hachée, sauce maison, fromage fondant',                                              price: 10, category: 'main',  emoji: '🌮' },
  { slug: 'cheese-burger',       name: 'Cheese Burger',                   description: 'Steak juteux, pain brioché moelleux, fromage ultra fondant',                                price: 10, category: 'main',  emoji: '🍔' },
  { slug: 'chicken-burger',      name: 'Chicken Burger',                  description: 'Poulet croustillant, sauce maison, pain brioché moelleux',                                  price: 10, category: 'main',  emoji: '🍗' },
  { slug: 'tasty-croust',        name: 'Tasty Croust',                    description: 'Riz basmati, tenders de poulet, sauce aigre douce, sriracha mayo, oignons frits, basilic frais', price: 10, category: 'main',  emoji: '🥡' },
  // Snacks & accompagnements
  { slug: 'triangle',            name: 'Triangle (×2)',                   description: 'Chausson comorien feuilleté, viandes variables — par 2 ou 4',                              price:  5, category: 'side',  emoji: '🥟' },
  { slug: 'wrakos',              name: 'Wrakos',                          description: 'Beignets comoriens, dispo variable selon les jours',                                        price:  7, category: 'side',  emoji: '🫔' },
  { slug: 'samboussa',           name: 'Samboussa (×5)',                  description: 'Beignets triangulaires farcis — par 5 ou 10 pièces, disponibles tous les jours',           price:  6, category: 'side',  emoji: '🥠' },
  // Boissons
  { slug: 'jus-tamarin',         name: 'Jus de Tamarin',                  description: 'Jus maison acidulé et rafraîchissant — 250cl',                                             price:  3, category: 'drink', emoji: '🧃' },
  { slug: 'jus-gingembre',       name: 'Jus de Gingembre',               description: '"Le jus de bagarre" — gingembre des îles, puissant et généreux — 250cl',                  price:  4, category: 'drink', emoji: '🫚' },
]

const STOCKS: Record<string, number> = {
  'couscousma': 6, 'riz-sauce-rouge-boeuf': 6, 'foutra-burger': 6,
  'riz-viande-rougai': 6, 'gratin-pates': 6, 'riz-legumes-boeuf': 6,
  'tacos-tenders': 6, 'tacos-viande-hachee': 6, 'cheese-burger': 6,
  'chicken-burger': 6, 'tasty-croust': 6,
  'triangle': 20, 'wrakos': 10, 'samboussa': 30,
  'jus-tamarin': 15, 'jus-gingembre': 15,
}

async function seed() {
  console.log('🌱 Seed RAKOMORIA FOOD...')

  const { data: provider, error: provErr } = await supabase
    .from('food_providers')
    .upsert(PROVIDER, { onConflict: 'slug' })
    .select('id, slug')
    .single()

  if (provErr || !provider) { console.error('❌ Provider:', provErr); process.exit(1) }
  console.log('✅ Provider:', provider.id)

  const itemsWithProvider = ITEMS.map(i => ({ ...i, provider_id: provider.id }))
  const { data: insertedItems, error: itemsErr } = await supabase
    .from('food_items')
    .upsert(itemsWithProvider, { onConflict: 'provider_id,slug' })
    .select('id, slug')

  if (itemsErr || !insertedItems) { console.error('❌ Items:', itemsErr); process.exit(1) }
  console.log(`✅ ${insertedItems.length} items`)

  const today = new Date().toISOString().split('T')[0]

  // Check existing session
  const { data: existing } = await supabase
    .from('food_sessions')
    .select('id')
    .eq('provider_id', provider.id)
    .eq('date', today)
    .maybeSingle()

  let session: { id: string } | null = existing

  if (!existing) {
    const { data: newSession, error: sessErr } = await supabase
      .from('food_sessions')
      .insert({ provider_id: provider.id, date: today, status: 'open' })
      .select('id')
      .single()
    if (sessErr || !newSession) { console.error('❌ Session:', sessErr); process.exit(1) }
    session = newSession
  } else {
    console.log('ℹ️  Session existante aujourd\'hui:', existing.id)
  }

  if (!session) { console.error('❌ No session'); process.exit(1) }
  console.log('✅ Session:', session.id)

  const stocks = insertedItems.map(item => ({
    session_id:      session!.id,
    item_id:         item.id,
    initial_stock:   STOCKS[item.slug] ?? 5,
    remaining_stock: STOCKS[item.slug] ?? 5,
  }))

  // Upsert stocks (fallback to insert if no unique constraint yet)
  const { error: stockErr } = await supabase
    .from('food_session_stocks')
    .upsert(stocks, { onConflict: 'session_id,item_id', ignoreDuplicates: false })

  if (stockErr) {
    // Fallback: delete and re-insert
    await supabase.from('food_session_stocks').delete().eq('session_id', session.id)
    const { error: insertErr } = await supabase.from('food_session_stocks').insert(stocks)
    if (insertErr) { console.error('❌ Stocks:', insertErr); process.exit(1) }
  }
  console.log('✅ Stocks seedés !')

  console.log('\n📋 Résumé :')
  console.log('  Provider : rakomoriafood ·', provider.id)
  console.log('  Session  :', session.id)
  console.log('  Date     :', today)
  console.log('  Items    :', insertedItems.length)
  console.log('\n🎉 Seed RAKOMORIA terminé !')
}

seed().catch(e => { console.error(e); process.exit(1) })
