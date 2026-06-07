'use client'
// components/food/TrackingTimeline.tsx
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled'

const STEPS: { status: OrderStatus; label: string; emoji: string }[] = [
  { status: 'pending',    label: 'Commande reçue',  emoji: '📋' },
  { status: 'confirmed',  label: 'Confirmée',        emoji: '✅' },
  { status: 'preparing',  label: 'En préparation',   emoji: '🍳' },
  { status: 'delivering', label: 'En livraison',     emoji: '🛵' },
  { status: 'delivered',  label: 'Livrée !',         emoji: '🎉' },
]

const STATUS_ORDER: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'delivering', 'delivered']

type Props = {
  orderId: string
  initialStatus: OrderStatus
}

export default function TrackingTimeline({ orderId, initialStatus }: Props) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus)

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return
    const channel = supabase
      .channel(`order-track-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'food_orders',
        filter: `id=eq.${orderId}`,
      }, payload => {
        setStatus((payload.new as { status: OrderStatus }).status)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [orderId])

  const currentIdx = STATUS_ORDER.indexOf(status)
  const cancelled = status === 'cancelled'

  return (
    <div className="food-timeline">
      {STEPS.map((step, i) => {
        const stepState = cancelled
          ? 'upcoming'
          : i < currentIdx
            ? 'done'
            : i === currentIdx
              ? 'active'
              : 'upcoming'
        return (
          <div key={step.status} className={`food-timeline-step ${stepState}`}>
            <div className="food-timeline-dot">
              {stepState === 'done' ? '✓' : step.emoji}
            </div>
            <div className="food-timeline-label">{step.label}</div>
          </div>
        )
      })}
      {cancelled && (
        <div style={{
          background: 'rgba(212,75,36,0.1)',
          border: '1px solid rgba(212,75,36,0.25)',
          borderRadius: 10,
          padding: '0.8rem 1rem',
          marginTop: '0.5rem',
          fontFamily: 'var(--fo)',
          fontSize: 13,
          color: '#f87171',
        }}>
          Commande annulée.
        </div>
      )}
    </div>
  )
}
