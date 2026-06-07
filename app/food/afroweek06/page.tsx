// app/food/afroweek06/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import FoodClient from './FoodClient'

export const metadata: Metadata = {
  title: '@afroweek06 — Cuisine sénégalaise à Nice | NIKA Food',
  description: 'Thiéboudienne, Poulet Yassa, Mafé — cuisine africaine authentique livrée le soir à Nice et alentours.',
}

export const dynamic = 'force-dynamic'

export default async function Afroweek06Page() {
  const supabase = await createClient()

  const { data: provider } = supabase
    ? await supabase.from('food_providers').select('*').eq('slug', 'afroweek06').single()
    : { data: null }

  if (!provider) notFound()

  const today = new Date().toISOString().split('T')[0]

  const { data: session } = supabase
    ? await supabase
        .from('food_sessions')
        .select('id, status')
        .eq('provider_id', provider.id)
        .eq('date', today)
        .maybeSingle()
    : { data: null }

  const { data: items } = supabase
    ? await supabase
        .from('food_items')
        .select('id, name, description, price, category, emoji')
        .eq('provider_id', provider.id)
        .eq('active', true)
        .order('category')
        .order('name')
    : { data: [] }

  // Join stocks if session exists
  let stocks: Record<string, number> = {}
  if (session && supabase) {
    const { data: sessionStocks } = await supabase
      .from('food_session_stocks')
      .select('item_id, remaining_stock')
      .eq('session_id', session.id)
    if (sessionStocks) {
      stocks = Object.fromEntries(sessionStocks.map(s => [s.item_id, s.remaining_stock]))
    }
  }

  const itemsWithStock = (items || []).map(item => ({
    ...item,
    remaining_stock: session ? (stocks[item.id] ?? 0) : 0,
  }))

  const sessionStatus: 'open' | 'closed' | 'sold_out' = session
    ? (session.status as 'open' | 'closed' | 'sold_out')
    : 'closed'

  return (
    <FoodClient
      provider={provider}
      sessionId={session?.id ?? null}
      sessionStatus={sessionStatus}
      items={itemsWithStock}
    />
  )
}
