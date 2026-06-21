// scripts/seed-food-pros.ts
// Seed de pros FOOD réels à Nice (table `pros`) + leurs plats (table `listings`),
// chacun avec ses `service_modes` — pour tester le filtrage de la roulette du FoodModule
// (Livraison / Sur place / À emporter) sur de vraies données plutôt que la démo.
//
// Usage : NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-food-pros.ts
//
// Prérequis : tables `pros` + `listings` (supabase/migrations/core.sql) ET la colonne
//             service_modes (supabase/migrations/20260621_pros_service_modes.sql) appliquées.

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis')
  process.exit(1)
}
const supabase = createClient(url, key)

type Mode = 'livraison' | 'surplace' | 'emporter'
type Dish = { title: string; price: number }
type Pro = {
  business_name: string
  description: string
  address: string
  rating: number
  rating_count: number
  service_modes: Mode[]
  dishes: Dish[]
}

// Vraies adresses niçoises. Modes choisis pour que la roulette filtre visiblement :
//   livraison → Pizza Cresci, Sushi Gourmet
//   surplace  → Chez Pipo, La Merenda, Acchiardo, Fenocchio, Peixes
//   emporter  → Chez Pipo, Acchiardo, Pizza Cresci, Fenocchio, Sushi Gourmet, Peixes
const PROS: Pro[] = [
  {
    business_name: 'Chez Pipo',
    description: 'Socca au feu de bois & cuisine niçoise depuis 1923',
    address: '13 Rue Bavastro, Le Port, 06300 Nice',
    rating: 4.7, rating_count: 1840,
    service_modes: ['surplace', 'emporter'],
    dishes: [
      { title: 'Socca', price: 3.5 },
      { title: 'Pissaladière', price: 4 },
      { title: 'Tourte de blettes', price: 4.5 },
    ],
  },
  {
    business_name: 'La Merenda',
    description: 'Cuisine niçoise traditionnelle, sans téléphone ni carte bleue',
    address: '4 Rue Raoul Bosio, Vieux-Nice, 06300 Nice',
    rating: 4.8, rating_count: 920,
    service_modes: ['surplace'],
    dishes: [
      { title: 'Daube niçoise', price: 19 },
      { title: 'Beignets de courgettes', price: 9 },
      { title: 'Pâtes au pistou', price: 15 },
    ],
  },
  {
    business_name: 'Acchiardo',
    description: 'Trattoria niçoise familiale au cœur du Vieux-Nice',
    address: '38 Rue Droite, Vieux-Nice, 06300 Nice',
    rating: 4.6, rating_count: 1130,
    service_modes: ['surplace', 'emporter'],
    dishes: [
      { title: 'Gnocchis maison', price: 14 },
      { title: 'Farcis niçois', price: 13 },
      { title: 'Tiramisu', price: 7 },
    ],
  },
  {
    business_name: 'Pizza Cresci',
    description: 'Pizzeria au feu de bois, pâte fine à la niçoise',
    address: '1 Rue Miron, Centre, 06000 Nice',
    rating: 4.5, rating_count: 760,
    service_modes: ['livraison', 'emporter'],
    dishes: [
      { title: 'Pizza Reine', price: 12 },
      { title: 'Calzone', price: 13 },
      { title: 'Focaccia', price: 6 },
    ],
  },
  {
    business_name: 'Fenocchio',
    description: 'Glacier artisanal — 90 parfums place Rossetti',
    address: '2 Place Rossetti, Vieux-Nice, 06300 Nice',
    rating: 4.7, rating_count: 5400,
    service_modes: ['surplace', 'emporter'],
    dishes: [
      { title: '2 boules', price: 5 },
      { title: 'Sorbet figue', price: 5 },
      { title: 'Granité citron', price: 4 },
    ],
  },
  {
    business_name: 'Sushi Gourmet',
    description: 'Sushi & poké bowls frais, préparés à la commande',
    address: '12 Avenue Malausséna, Libération, 06000 Nice',
    rating: 4.4, rating_count: 510,
    service_modes: ['livraison', 'emporter'],
    dishes: [
      { title: 'Plateau 24 pièces', price: 22 },
      { title: 'Poké saumon', price: 14 },
      { title: 'California', price: 9 },
    ],
  },
  {
    business_name: 'Peixes',
    description: 'Bar à ceviche & poissons de la Méditerranée',
    address: "4 Rue de l'Opéra, Vieux-Nice, 06300 Nice",
    rating: 4.6, rating_count: 1320,
    service_modes: ['surplace', 'emporter'],
    dishes: [
      { title: 'Ceviche de daurade', price: 16 },
      { title: 'Tataki de thon', price: 18 },
      { title: 'Tartare de saumon', price: 15 },
    ],
  },
]

async function seed() {
  console.log(`🌱 Seed ${PROS.length} pros FOOD (Nice)...`)
  let okPros = 0
  let okDishes = 0

  for (const p of PROS) {
    const { dishes, ...proRow } = p

    const { data: pro, error } = await supabase
      .from('pros')
      .upsert({ ...proRow, domain: 'food', active: true, verified: true }, { onConflict: 'business_name' })
      .select('id, business_name')
      .single()

    if (error || !pro) {
      console.error('❌', p.business_name, '→', error?.message)
      continue
    }
    okPros++

    // listings : pas de contrainte unique naturelle → on purge puis on réinsère (idempotent)
    await supabase.from('listings').delete().eq('pro_id', pro.id).eq('domain', 'food')
    const rows = dishes.map(d => ({
      pro_id: pro.id, domain: 'food', title: d.title, price: d.price, available: true,
    }))
    const { error: lerr } = await supabase.from('listings').insert(rows)
    if (lerr) {
      console.error('  ❌ listings', p.business_name, '→', lerr.message)
      continue
    }
    okDishes += rows.length
    console.log(`✅ ${pro.business_name} — [${p.service_modes.join(', ')}] — ${rows.length} plats`)
  }

  console.log(`\n🎉 Seed terminé : ${okPros}/${PROS.length} pros, ${okDishes} plats.`)
}

seed().catch(e => { console.error(e); process.exit(1) })
