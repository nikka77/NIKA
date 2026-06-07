'use client'
// components/food/StockManager.tsx
import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateStocks } from '@/app/food/dashboard/actions'

export type StockItem = {
  id: string
  item_id: string
  name: string
  emoji?: string
  initial_stock: number
  remaining_stock: number
}

type Props = {
  sessionId: string
  initialStocks: StockItem[]
}

export default function StockManager({ sessionId, initialStocks }: Props) {
  const [qtys, setQtys] = useState<Record<string, number>>(
    Object.fromEntries(initialStocks.map(s => [s.id, s.remaining_stock]))
  )
  const [savedQtys, setSavedQtys] = useState(qtys)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<'saved' | 'error' | null>(null)

  // Realtime: écouter les changements de stock depuis d'autres sources
  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return
    const channel = supabase
      .channel(`stocks-manager-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'food_session_stocks',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        const p = payload.new as { id: string; remaining_stock: number }
        setQtys(prev => ({ ...prev, [p.id]: p.remaining_stock }))
        setSavedQtys(prev => ({ ...prev, [p.id]: p.remaining_stock }))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  const set = (id: string, val: number) => {
    if (val < 0) return
    setQtys(prev => ({ ...prev, [id]: val }))
    setFeedback(null)
  }

  const isDirty = initialStocks.some(s => qtys[s.id] !== savedQtys[s.id])
  const anyActive = Object.values(qtys).some(q => q > 0)

  const save = () => {
    setFeedback(null)
    startTransition(async () => {
      const updates = initialStocks.map(s => ({ id: s.id, remaining_stock: qtys[s.id] }))
      const { error } = await updateStocks(updates)
      if (error) {
        setFeedback('error')
      } else {
        setSavedQtys({ ...qtys })
        setFeedback('saved')
      }
    })
  }

  return (
    <div>
      {/* Badge global */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700,
          padding: '5px 14px', borderRadius: 20,
          background: anyActive ? 'rgba(16,185,129,0.15)' : 'rgba(100,100,120,0.18)',
          border: `1px solid ${anyActive ? 'rgba(16,185,129,0.35)' : 'rgba(100,100,120,0.3)'}`,
          color: anyActive ? '#34d399' : 'var(--td3)',
        }}>
          {anyActive ? '🟢 Stock actif' : '⚫ Stock épuisé'}
        </span>
        {isDirty && !isPending && (
          <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: '#EF9F27' }}>
            ● Modifications non sauvegardées
          </span>
        )}
        {isPending && (
          <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>
            Sauvegarde…
          </span>
        )}
        {feedback === 'saved' && !isDirty && (
          <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: '#34d399' }}>
            ✓ Sauvegardé — vitrine mise à jour
          </span>
        )}
        {feedback === 'error' && (
          <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: '#f87171' }}>
            ✗ Erreur lors de la sauvegarde
          </span>
        )}
      </div>

      {/* Rows */}
      <div className="food-stock-manager">
        {initialStocks.map(stock => {
          const qty = qtys[stock.id] ?? 0
          const isActive = qty > 0
          const isLow = qty > 0 && qty <= 2
          return (
            <div key={stock.id} className="food-stock-row" style={{
              borderColor: isLow ? 'rgba(239,159,39,0.4)' : isActive ? 'rgba(216,90,48,0.3)' : undefined,
            }}>
              <div className="food-stock-item-info">
                <span className="food-stock-emoji">{stock.emoji || '🍽️'}</span>
                <div>
                  <div className="food-stock-name">{stock.name}</div>
                  <span style={{
                    fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700,
                    color: isLow ? '#EF9F27' : isActive ? '#34d399' : 'var(--td3)',
                  }}>
                    {isLow ? '⚠ Stock bas' : isActive ? 'Disponible' : 'Épuisé'}
                  </span>
                </div>
              </div>
              <div className="food-qty-wrap">
                <button className="food-qty-btn" onClick={() => set(stock.id, qty - 1)} disabled={qty === 0}>−</button>
                <span className="food-qty-count food-qty-count--lg" style={{
                  color: qty === 0 ? 'var(--td3)' : isLow ? '#EF9F27' : 'var(--td)',
                  minWidth: 28, textAlign: 'center', display: 'inline-block',
                }}>
                  {qty}
                </span>
                <button className="food-qty-btn" onClick={() => set(stock.id, qty + 1)}>+</button>
              </div>
            </div>
          )
        })}
      </div>

      <button
        className="food-submit-btn"
        onClick={save}
        disabled={isPending || !isDirty}
        style={{ marginTop: '1.4rem' }}
      >
        {isPending ? 'Sauvegarde en cours…' : !isDirty && feedback === 'saved' ? '✓ Stock sauvegardé' : '💾 Sauvegarder'}
      </button>
    </div>
  )
}
