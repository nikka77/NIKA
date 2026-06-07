'use client'
// components/food/StockManager.tsx
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  // Local quantities — not saved until "Sauvegarder"
  const [qtys, setQtys] = useState<Record<string, number>>(
    Object.fromEntries(initialStocks.map(s => [s.id, s.remaining_stock]))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const set = (id: string, val: number) => {
    if (val < 0) return
    setQtys(prev => ({ ...prev, [id]: val }))
    setSaved(false)
  }

  const anyActive = Object.values(qtys).some(q => q > 0)
  const isDirty = initialStocks.some(s => qtys[s.id] !== s.remaining_stock)

  const save = async () => {
    setSaving(true)
    const supabase = createClient()
    if (supabase) {
      await Promise.all(
        initialStocks.map(s =>
          supabase
            .from('food_session_stocks')
            .update({ remaining_stock: qtys[s.id], initial_stock: qtys[s.id] })
            .eq('id', s.id)
        )
      )
      // Ouvrir ou fermer la session selon les stocks
      const total = Object.values(qtys).reduce((a, b) => a + b, 0)
      await supabase
        .from('food_sessions')
        .update({ status: total > 0 ? 'open' : 'closed' })
        .eq('id', sessionId)
    }
    setSaving(false)
    setSaved(true)
  }

  return (
    <div>
      {/* Badge global */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.2rem' }}>
        <span style={{
          fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700,
          padding: '5px 14px', borderRadius: 20,
          background: anyActive ? 'rgba(16,185,129,0.15)' : 'rgba(100,100,120,0.18)',
          border: `1px solid ${anyActive ? 'rgba(16,185,129,0.35)' : 'rgba(100,100,120,0.3)'}`,
          color: anyActive ? '#34d399' : 'var(--td3)',
        }}>
          {anyActive ? '🟢 Actif' : '⚫ Inactif'}
        </span>
        {isDirty && !saved && (
          <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--amber)' }}>
            Modifications non sauvegardées
          </span>
        )}
        {saved && (
          <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--teal)' }}>
            ✓ Sauvegardé
          </span>
        )}
      </div>

      {/* Rows */}
      <div className="food-stock-manager">
        {initialStocks.map(stock => {
          const qty = qtys[stock.id] ?? 0
          const isActive = qty > 0
          return (
            <div key={stock.id} className="food-stock-row" style={{
              borderColor: isActive ? 'rgba(216,90,48,0.3)' : undefined,
            }}>
              <div className="food-stock-item-info">
                <span className="food-stock-emoji">{stock.emoji || '🍽️'}</span>
                <div>
                  <div className="food-stock-name">{stock.name}</div>
                  <span style={{
                    fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700,
                    color: isActive ? '#34d399' : 'var(--td3)',
                  }}>
                    {isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
              <div className="food-qty-wrap">
                <button
                  className="food-qty-btn"
                  onClick={() => set(stock.id, qty - 1)}
                  disabled={qty === 0}
                >
                  −
                </button>
                <span
                  className="food-qty-count food-qty-count--lg"
                  style={{ color: qty === 0 ? 'var(--td3)' : qty <= 2 ? 'var(--amber)' : 'var(--td)' }}
                >
                  {qty}
                </span>
                <button
                  className="food-qty-btn"
                  onClick={() => set(stock.id, qty + 1)}
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bouton sauvegarder */}
      <button
        className="food-submit-btn"
        onClick={save}
        disabled={saving || (!isDirty && saved)}
        style={{ marginTop: '1.4rem' }}
      >
        {saving ? 'Sauvegarde…' : saved && !isDirty ? '✓ Stock sauvegardé' : '💾 Sauvegarder le stock'}
      </button>
    </div>
  )
}
