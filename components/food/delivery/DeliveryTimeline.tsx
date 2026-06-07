'use client'
// components/food/delivery/DeliveryTimeline.tsx
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ETABadge from '@/components/food/delivery/ETABadge'

export type DeliveryStatus =
  | 'pending' | 'dispatching' | 'accepted'
  | 'picking_up' | 'picked_up' | 'delivering' | 'delivered' | 'failed'

const STEPS: { key: DeliveryStatus; label: string; icon: string }[] = [
  { key: 'dispatching', label: 'Recherche d\'un livreur', icon: '📡' },
  { key: 'accepted',    label: 'Livreur trouvé',          icon: '✅' },
  { key: 'picking_up', label: 'En route vers le resto',   icon: '🛵' },
  { key: 'picked_up',  label: 'Commande récupérée',       icon: '📦' },
  { key: 'delivering', label: 'En route vers vous',       icon: '🚀' },
  { key: 'delivered',  label: 'Livré !',                  icon: '🎉' },
]

const ORDER: DeliveryStatus[] = ['dispatching', 'accepted', 'picking_up', 'picked_up', 'delivering', 'delivered']

type Props = {
  deliveryId: string
  initialStatus: DeliveryStatus
  initialEta?: number | null
}

export default function DeliveryTimeline({ deliveryId, initialStatus, initialEta }: Props) {
  const [status, setStatus] = useState<DeliveryStatus>(initialStatus)
  const [etaSeconds, setEtaSeconds] = useState<number | null>(initialEta ?? null)

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return

    const channel = supabase
      .channel('delivery-timeline-' + deliveryId)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'food_deliveries',
        filter: `id=eq.${deliveryId}`,
      }, (payload) => {
        const row = payload.new as { status: DeliveryStatus; eta_seconds: number | null }
        setStatus(row.status)
        if (row.eta_seconds != null) setEtaSeconds(row.eta_seconds)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [deliveryId])

  const currentIdx = ORDER.indexOf(status)
  const isDelivered = status === 'delivered'
  const isFailed = status === 'failed'

  if (isFailed) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem' }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>❌</div>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: 'var(--td)' }}>
          Livraison annulée
        </div>
      </div>
    )
  }

  return (
    <div>
      {etaSeconds != null && currentIdx >= 3 && !isDelivered && (
        <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
          <ETABadge etaSeconds={etaSeconds} />
        </div>
      )}
      <div style={{ position: 'relative', paddingLeft: '2.2rem' }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute', left: '0.55rem', top: 14, bottom: 14,
          width: 2, background: 'var(--bd)',
        }} />
        {STEPS.map((step, i) => {
          const done = i <= currentIdx
          const active = i === currentIdx
          return (
            <div key={step.key} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: i < STEPS.length - 1 ? '1rem' : 0,
              position: 'relative', opacity: done ? 1 : 0.4,
              transition: 'opacity 0.3s ease',
            }}>
              {/* Dot */}
              <div style={{
                position: 'absolute', left: -30,
                width: 14, height: 14, borderRadius: '50%',
                background: done ? 'var(--food-brand)' : 'var(--bg)',
                border: done ? '2px solid var(--food-brand)' : '2px solid var(--bd)',
                boxShadow: active ? '0 0 0 4px rgba(216,90,48,0.25)' : 'none',
                transition: 'all 0.3s ease',
                animation: active ? 'deliveryPulse 2s infinite' : 'none',
              }} />
              <span style={{ fontSize: active ? 20 : 16, transition: 'font-size 0.2s' }}>
                {step.icon}
              </span>
              <div style={{ flex: 1 }}>
                <span style={{
                  fontFamily: 'var(--fo)', fontSize: 13,
                  fontWeight: done ? 700 : 400,
                  color: done ? 'var(--td)' : 'var(--td3)',
                }}>
                  {step.label}
                </span>
                {active && !isDelivered && (
                  <span style={{
                    marginLeft: 8,
                    fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700,
                    color: 'var(--food-brand)', background: 'rgba(216,90,48,0.1)',
                    border: '1px solid rgba(216,90,48,0.25)', borderRadius: 10,
                    padding: '2px 7px',
                  }}>EN COURS</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
