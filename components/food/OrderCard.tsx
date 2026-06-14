'use client'
// components/food/OrderCard.tsx
import { useState, useTransition } from 'react'
import { updateOrderStatus, cancelOrder } from '@/app/food/dashboard/actions'
import ConfirmDialog from '@/components/ConfirmDialog'

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

const STATUS_NEXT: Partial<Record<OrderStatus, { label: string; next: OrderStatus; color: string }>> = {
  pending:    { label: '✅ Confirmer',       next: 'confirmed',  color: '#16a34a' },
  confirmed:  { label: '🍳 En préparation',  next: 'preparing',  color: '#2563eb' },
  preparing:  { label: '🛵 Envoyer livreur', next: 'delivering', color: '#d97706' },
  delivering: { label: '🎉 Marquer livré',   next: 'delivered',  color: '#7c3aed' },
}

const STATUS_DISPLAY: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending:    { label: 'En attente',   color: '#EF9F27', bg: 'rgba(239,159,39,0.12)' },
  confirmed:  { label: 'Confirmée',   color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  preparing:  { label: 'En prép.',    color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  delivering: { label: 'En livraison',color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  delivered:  { label: 'Livrée',      color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  cancelled:  { label: 'Annulée',     color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
}

export default function OrderCard({ order, onStatusChange }: Props) {
  const [status, setStatus] = useState<OrderStatus>(order.status)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const advance = () => {
    const next = STATUS_NEXT[status]
    if (!next) return
    setError(null)
    startTransition(async () => {
      const { error: err } = await updateOrderStatus(order.id, next.next)
      if (err) {
        setError('Erreur: ' + err)
      } else {
        setStatus(next.next)
        onStatusChange?.(order.id, next.next)
      }
    })
  }

  const runCancel = () => {
    setConfirmOpen(false)
    setError(null)
    startTransition(async () => {
      const { error: err } = await cancelOrder(order.id)
      if (err) {
        setError('Erreur: ' + err)
      } else {
        setStatus('cancelled')
        onStatusChange?.(order.id, 'cancelled')
      }
    })
  }

  const subtotal = order.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const fee = order.delivery_fee ?? 2
  const total = order.total ?? subtotal + fee
  const disp = STATUS_DISPLAY[status]
  const nextAction = STATUS_NEXT[status]

  // Temps écoulé depuis la commande
  const elapsed = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000)

  return (
    <div style={{
      background: 'var(--bg2)',
      border: `1px solid ${disp.bg}`,
      borderLeft: `3px solid ${disp.color}`,
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        padding: '0.9rem 1.1rem 0.6rem', gap: 8,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 15, fontWeight: 700, color: 'var(--td)', marginBottom: 3 }}>
            {order.customer_name}
          </div>
          {order.customer_phone && (
            <a href={`tel:${order.customer_phone}`} style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--food-brand)', textDecoration: 'none', display: 'block', marginBottom: 2 }}>
              📞 {order.customer_phone}
            </a>
          )}
          {order.delivery_address && (
            <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>
              📍 {order.delivery_address}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: 99,
            background: disp.bg, color: disp.color,
            fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
            marginBottom: 4,
          }}>
            {disp.label}
          </span>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>
            il y a {elapsed < 1 ? '<1' : elapsed} min
          </div>
          {order.scheduled_time && (
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: '#EF9F27', marginTop: 2 }}>
              🕐 {order.scheduled_time.slice(0, 5)}
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: '0 1.1rem 0.8rem', borderTop: '1px solid var(--bd)' }}>
        <div style={{ paddingTop: '0.7rem' }}>
          {order.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', padding: '2px 0' }}>
              <span>{item.emoji} {item.quantity}× {item.name}</span>
              <span>{(item.quantity * item.unit_price).toFixed(2)} €</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', paddingTop: 4, borderTop: '1px solid var(--bd)', marginTop: 4 }}>
            <span>Livraison</span>
            <span>{fee.toFixed(2)} €</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--fo)', fontSize: 15, fontWeight: 700, color: 'var(--food-brand)', paddingTop: 4 }}>
            <span>Total</span>
            <span>{total.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {/* Notes + payment */}
      {(order.notes || order.payment_method) && (
        <div style={{ padding: '0.5rem 1.1rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--bd)' }}>
          {order.payment_method && (
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginBottom: order.notes ? 3 : 0 }}>
              💳 {order.payment_method}
            </div>
          )}
          {order.notes && (
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: '#EF9F27' }}>📝 {order.notes}</div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '0.5rem 1.1rem', fontFamily: 'var(--fo)', fontSize: 12, color: '#f87171', background: 'rgba(248,113,113,0.08)' }}>
          {error}
        </div>
      )}

      {/* Actions */}
      {status !== 'delivered' && status !== 'cancelled' && (
        <div style={{ display: 'flex', gap: 8, padding: '0.8rem 1.1rem', borderTop: '1px solid var(--bd)' }}>
          {nextAction && (
            <button
              onClick={advance}
              disabled={isPending}
              style={{
                flex: 1, padding: '10px', borderRadius: 10,
                background: nextAction.color, color: '#fff',
                fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700,
                border: 'none', cursor: isPending ? 'wait' : 'pointer',
                opacity: isPending ? 0.7 : 1,
              }}
            >
              {isPending ? '…' : nextAction.label}
            </button>
          )}
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={isPending}
            style={{
              padding: '10px 14px', borderRadius: 10,
              background: 'transparent', color: '#f87171',
              fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700,
              border: '1px solid rgba(248,113,113,0.3)',
              cursor: isPending ? 'wait' : 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Annuler cette commande ?"
        message={`Commande de ${order.customer_name} · ${total.toFixed(2)} €. Le client sera notifié.`}
        confirmLabel="Annuler la commande"
        cancelLabel="Retour"
        danger
        busy={isPending}
        onConfirm={runCancel}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  )
}
