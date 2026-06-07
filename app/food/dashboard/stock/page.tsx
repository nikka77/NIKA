// app/food/dashboard/stock/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Metadata } from 'next'
import StockManager, { type StockItem } from '@/components/food/StockManager'

export const metadata: Metadata = { title: 'Stocks — Dashboard @afroweek06' }
export const dynamic = 'force-dynamic'

export default async function StockPage() {
  const supabase = await createClient()

  const { data: provider } = supabase
    ? await supabase.from('food_providers').select('id, name').eq('slug', 'afroweek06').single()
    : { data: null }

  const today = new Date().toISOString().split('T')[0]
  const { data: session } = provider && supabase
    ? await supabase
        .from('food_sessions')
        .select('id, status')
        .eq('provider_id', provider.id)
        .eq('date', today)
        .maybeSingle()
    : { data: null }

  let stocks: StockItem[] = []
  if (session && supabase) {
    const { data } = await supabase
      .from('food_session_stocks')
      .select('id, item_id, initial_stock, remaining_stock, food_items(name, emoji)')
      .eq('session_id', session.id)
    if (data) {
      stocks = data.map(row => ({
        id:              row.id,
        item_id:         row.item_id,
        name:            (row.food_items as unknown as { name: string; emoji: string | null } | null)?.name ?? '?',
        emoji:           (row.food_items as unknown as { name: string; emoji: string | null } | null)?.emoji ?? undefined,
        initial_stock:   row.initial_stock,
        remaining_stock: row.remaining_stock,
      }))
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 0, paddingBottom: '4rem' }}>
      <div className="food-dash-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            href="/food/dashboard"
            style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none', fontFamily: 'var(--fo)', fontSize: 12 }}
          >
            ← Dashboard
          </Link>
        </div>
        <div className="food-dash-title" style={{ marginTop: 8 }}>📦 Stocks ce soir</div>
        <div className="food-dash-sub">
          Modifications en temps réel · session {today}
        </div>
      </div>

      <div style={{ padding: '1.6rem 1.2rem' }}>
        {!session ? (
          <div className="food-alert">
            <div className="food-alert-emoji">📭</div>
            <div className="food-alert-title">Aucune session ce soir</div>
            <div className="food-alert-sub">
              Lancez le script seed pour ouvrir une session, ou créez-en une manuellement en base.
            </div>
          </div>
        ) : stocks.length === 0 ? (
          <div className="food-alert">
            <div className="food-alert-emoji">📦</div>
            <div className="food-alert-title">Aucun stock configuré</div>
            <div className="food-alert-sub">Les stocks de la session sont vides.</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)' }}>
                Session : <span className={`food-status-pill ${session.status}`} style={{ fontSize: 11, marginLeft: 6 }}>{session.status}</span>
              </div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>
                Mises à jour en temps réel via Realtime
              </div>
            </div>
            <StockManager sessionId={session.id} initialStocks={stocks} />
          </>
        )}
      </div>
    </main>
  )
}
