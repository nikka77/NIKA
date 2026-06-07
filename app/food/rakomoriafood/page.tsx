// app/food/rakomoriafood/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import RakoClient from './RakoClient'

export const metadata: Metadata = {
  title: '@rakomoriafood — Cuisine comorienne de nuit | NIKA Food',
  description: 'RAKOMORIA FOOD — Cuisine comorienne 100% fait main, Halal, livraison de nuit à Nice. Du goût, du frais, du bonheur !',
}

export const dynamic = 'force-dynamic'

export default async function RakomoriaPage() {
  const supabase = await createClient()

  const { data: provider } = supabase
    ? await supabase.from('food_providers').select('*').eq('slug', 'rakomoriafood').single()
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
        .select('id, name, description, price, category, emoji, slug')
        .eq('provider_id', provider.id)
        .eq('active', true)
        .order('category')
        .order('name')
    : { data: [] }

  let stocks: Record<string, number> = {}
  if (session && supabase) {
    const { data: ss } = await supabase
      .from('food_session_stocks')
      .select('item_id, remaining_stock')
      .eq('session_id', session.id)
    if (ss) stocks = Object.fromEntries(ss.map(s => [s.item_id, s.remaining_stock]))
  }

  const itemsWithStock = (items || []).map(item => ({
    ...item,
    remaining_stock: session ? (stocks[item.id] ?? 0) : 0,
  }))

  return (
    <RakoClient
      provider={provider}
      sessionId={session?.id ?? null}
      sessionStatus={(session?.status ?? 'closed') as 'open' | 'closed' | 'sold_out'}
      items={itemsWithStock}
    />
  )
}
