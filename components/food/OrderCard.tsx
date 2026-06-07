'use client'
// components/food/OrderCard.tsx
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled'

export type FoodOrder = {
  id: string
  customer_name: string
  customer_phone?: string
  delivery_address?: string
  scheduled_time?: string
  payment_method?: string
  status: OrderStatus
  total?: number
  delivery_fee?: number
  notes?: string
  created_at: string
  items: { name: string; emoji?: string; quantity: number; unit_price: number }[]
}

type Props = {
  order: FoodOrder
  onStatusChange?: (id: string, status: OrderStatus) => void
}

const STATUS_NEXT: Partial<Record<OrderStatus, { label: string; next: OrderStatus }>> = {
  pending:    { label: '✅ Confirmer',       next: 'confirmed'  },
  confirmed:  { label: '🍳 En préparation',  next: 'preparing'  },
  preparing:  { label: '🛵 En livraison',    next: 'delivering' },
  delivering: { label: '🎉 Marquer livré',   next: 'delivered'  },
}

export default function OrderCard({ order, onStatusChange }: Props) {
  const [status, setStatus] = useState<OrderStatus>(order.status)
  const [loading, setLoading] = useState(false)

  const advance = async () => {
    const next = STATUS_NEXT[status]
    if (!next) return
    setLoading(true)
    const supabase = createClient()
    if (supabase) {
      await supabase.from('food_orders').update({ status: next.next }).eq('id', order.id)
    }
    setStatus(next.next)
    onStatusChange?.(order.id, next.next)
    setLoading(false)
  }

  const cancel = async () => {
    if (!confirm('Annuler cette commande ?')) return
    setLoading(true)
    const supabase = createClient()
    if (supabase) {
      await supabase.from('food_orders').update({ status: 'cancelled' }).eq('id', order.id)
    }
    setStatus('cancelled')
    onStatusChange?.(order.id, 'cancelled')
    setLoading(false)
  }

  const subtotal = order.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const fee = order.delivery_fee ?? 2
  const total = order.total ?? subtotal + fee

  return (
    <div className={`food-order-card${status === 'delivering' ? ' food-order-card--delivering' : status === 'preparing' ? ' food-order-card--preparing' : ''}`}>
      <div className="food-order-header">
        <div>
          <div className="food-order-customer">{order.customer_name}</div>
          {order.customer_phone && (
            <a href={`tel:${order.customer_phone}`} className="food-order-phone">
              📞 {order.customer_phone}
            </a>
          )}
          {order.delivery_address && (
            <div className="food-order-addr">📍 {order.delivery_address}</div>
          )}
        </div>
        <div className="food-order-meta">
          <span className={`food-status-badge food-status-badge--${status}`}>{status}</span>
          {order.scheduled_time && (
            <div className="food-order-time">🕐 {order.scheduled_time.slice(0, 5)}</div>
          )}
          <div className="food-order-time">
            {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      <div className="food-order-items">
        {order.items.map((item, i) => (
          <div key={i} className="food-order-line">
            <span>{item.emoji} {item.quantity}× {item.name}</span>
            <span>{(item.quantity * item.unit_price).toFixed(2)} €</span>
          </div>
        ))}
        <div className="food-order-line food-order-line--fee">
          <span>Livraison</span>
          <span>{fee.toFixed(2)} €</span>
        </div>
        <div className="food-order-line food-order-line--total">
          <span>Total</span>
          <span>{total.toFixed(2)} €</span>
        </div>
      </div>

      {order.payment_method && (
        <div className="food-order-payment">💳 {order.payment_method}</div>
      )}
      {order.notes && (
        <div className="food-order-notes">📝 {order.notes}</div>
      )}

      {status !== 'delivered' && status !== 'cancelled' && (
        <div className="food-order-actions">
          {STATUS_NEXT[status] && (
            <button
              className="food-action-btn food-action-btn--primary"
              onClick={advance}
              disabled={loading}
            >
              {loading ? '…' : STATUS_NEXT[status]!.label}
            </button>
          )}
          <button
            className="food-action-btn food-action-btn--danger"
            onClick={cancel}
            disabled={loading}
          >
            ✕ Annuler
          </button>
        </div>
      )}
    </div>
  )
}
