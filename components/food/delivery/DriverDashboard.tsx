'use client'
// components/food/delivery/DriverDashboard.tsx
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type DeliveryItem = { quantity: number; food_items: { name: string } | null }

type Delivery = {
  id: string
  status: string
  customer_name: string
  delivery_address: string | null
  customer_phone: string | null
  items: DeliveryItem[]
}

const STATUS_NEXT: Record<string, string> = {
  dispatching: 'accepted',
  accepted:    'picking_up',
  picking_up:  'picked_up',
  picked_up:   'delivering',
  delivering:  'delivered',
}

const STATUS_LABELS: Record<string, { label: string; emoji: string }> = {
  dispatching: { label: 'Accepter la livraison', emoji: '✅' },
  accepted:    { label: 'Je pars au restaurant', emoji: '🛵' },
  picking_up:  { label: 'Commande récupérée',    emoji: '📦' },
  picked_up:   { label: 'En route vers le client', emoji: '🚀' },
  delivering:  { label: 'Livré !',               emoji: '🎉' },
}

type Props = { driverId: string }

export default function DriverDashboard({ driverId }: Props) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    if (!supabase) { setLoading(false); return }

    const { data } = await supabase
      .from('food_deliveries')
      .select('id, status, food_orders(id, customer_name, delivery_address, customer_phone, food_order_items(quantity, food_items(name)))')
      .eq('driver_id', driverId)
      .not('status', 'in', '(delivered,failed)')
      .order('created_at', { ascending: false })

    if (data) {
      setDeliveries(data.map((d: any) => {
        const order = d.food_orders ?? {}
        return {
          id:               d.id,
          status:           d.status,
          customer_name:    order.customer_name ?? 'Client',
          delivery_address: order.delivery_address ?? null,
          customer_phone:   order.customer_phone ?? null,
          items:            (order.food_order_items ?? []).map((it: any) => ({
            quantity:   it.quantity,
            food_items: it.food_items ?? null,
          })),
        }
      }))
    }
    setLoading(false)
  }, [driverId])

  useEffect(() => {
    load()
    const supabase = createClient()
    if (!supabase) return
    const channel = supabase
      .channel('driver-deliveries-' + driverId)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'food_deliveries',
        filter: `driver_id=eq.${driverId}`,
      }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load, driverId])

  const advance = async (deliveryId: string, nextStatus: string) => {
    setUpdating(deliveryId)
    const supabase = createClient()
    if (supabase) {
      const update: Record<string, string> = { status: nextStatus }
      if (nextStatus === 'accepted')  update.accepted_at  = new Date().toISOString()
      if (nextStatus === 'picked_up') update.picked_up_at = new Date().toISOString()
      if (nextStatus === 'delivered') update.delivered_at = new Date().toISOString()
      await supabase.from('food_deliveries').update(update).eq('id', deliveryId)
    }
    setUpdating(null)
    load()
  }

  if (loading) return (
    <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', textAlign: 'center', padding: '3rem' }}>
      Chargement…
    </div>
  )

  if (deliveries.length === 0) return (
    <div className="food-alert">
      <div className="food-alert-emoji">✅</div>
      <div className="food-alert-title">Aucune livraison en cours</div>
      <div className="food-alert-sub">Les nouvelles livraisons arrivent ici en temps réel.</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      {deliveries.map(delivery => {
        const action = STATUS_LABELS[delivery.status]
        const nextStatus = STATUS_NEXT[delivery.status]
        return (
          <div key={delivery.id} style={{
            background: 'var(--bg2)',
            border: '1px solid rgba(216,90,48,0.3)',
            borderRadius: 14, padding: '1.2rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: '0.8rem' }}>
              <div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 15, fontWeight: 700, color: 'var(--td)' }}>
                  {delivery.customer_name}
                </div>
                {delivery.delivery_address && (
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginTop: 2 }}>
                    📍 {delivery.delivery_address}
                  </div>
                )}
                {delivery.customer_phone && (
                  <a
                    href={`tel:${delivery.customer_phone}`}
                    style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--food-brand)', marginTop: 2, display: 'block', textDecoration: 'none' }}
                  >
                    📞 {delivery.customer_phone}
                  </a>
                )}
              </div>
              <span style={{
                fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                color: 'var(--food-brand)', background: 'rgba(216,90,48,0.1)',
                border: '1px solid rgba(216,90,48,0.25)', borderRadius: 10,
                padding: '3px 10px', height: 'fit-content', whiteSpace: 'nowrap',
              }}>
                {delivery.status}
              </span>
            </div>

            {delivery.items.length > 0 && (
              <div style={{ marginBottom: '0.8rem', paddingBottom: '0.8rem', borderBottom: '1px solid var(--bd)' }}>
                {delivery.items.slice(0, 4).map((item, i) => (
                  <div key={i} style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', lineHeight: 1.6 }}>
                    {item.quantity}× {item.food_items?.name ?? '?'}
                  </div>
                ))}
                {delivery.items.length > 4 && (
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>
                    +{delivery.items.length - 4} autre{delivery.items.length - 4 > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {action && nextStatus && (
                <button
                  onClick={() => advance(delivery.id, nextStatus)}
                  disabled={updating === delivery.id}
                  style={{
                    flex: 1, fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700,
                    padding: '11px 16px', borderRadius: 10,
                    background: 'var(--food-brand)', color: '#fff',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  {updating === delivery.id ? '…' : `${action.emoji} ${action.label}`}
                </button>
              )}
              {delivery.status === 'delivering' && (
                <Link
                  href={`/food/driver/delivery/${delivery.id}`}
                  style={{
                    fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700,
                    padding: '11px 16px', borderRadius: 10,
                    background: 'transparent', color: 'var(--food-brand)',
                    border: '1px solid var(--food-brand)', textDecoration: 'none',
                  }}
                >
                  🗺
                </Link>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
