'use client'
// components/food/delivery/DispatchPanel.tsx
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Driver = {
  id: string
  name: string
  vehicle: string | null
  active: boolean
}

type DeliveryRow = {
  id: string
  status: string
  driver_id: string | null
}

type OrderRow = {
  id: string
  customer_name: string
  delivery_address: string | null
  status: string
  delivery: DeliveryRow | null
}

type Props = { sessionId: string }

const VEHICLE_ICON: Record<string, string> = {
  scooter: '🛵', bike: '🚲', car: '🚗', foot: '🚶',
}

export default function DispatchPanel({ sessionId }: Props) {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [dispatching, setDispatching] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    if (!supabase) { setLoading(false); return }

    const [ordersRes, driversRes] = await Promise.all([
      supabase
        .from('food_orders')
        .select('id, customer_name, delivery_address, status, food_deliveries(id, status, driver_id)')
        .eq('session_id', sessionId)
        .in('status', ['confirmed', 'preparing', 'delivering'])
        .order('created_at', { ascending: true }),
      supabase
        .from('food_drivers')
        .select('id, name, vehicle, active')
        .eq('active', true),
    ])

    if (ordersRes.data) {
      setOrders(ordersRes.data.map((o: any) => ({
        id:               o.id,
        customer_name:    o.customer_name,
        delivery_address: o.delivery_address,
        status:           o.status,
        delivery:         Array.isArray(o.food_deliveries) && o.food_deliveries.length > 0
                            ? (o.food_deliveries[0] as DeliveryRow)
                            : (o.food_deliveries as DeliveryRow | null) ?? null,
      })))
    }
    if (driversRes.data) setDrivers(driversRes.data as Driver[])
    setLoading(false)
  }, [sessionId])

  useEffect(() => {
    load()
    const supabase = createClient()
    if (!supabase) return
    const channel = supabase.channel('dispatch-panel-' + sessionId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_deliveries' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_orders' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load, sessionId])

  const dispatch = async (orderId: string, driverId: string | null) => {
    setDispatching(orderId)
    const supabase = createClient()
    if (!supabase) { setDispatching(null); return }

    const { data: existing } = await supabase
      .from('food_deliveries')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('food_deliveries')
        .update({
          driver_id:     driverId,
          status:        driverId ? 'dispatching' : 'pending',
          dispatched_at: driverId ? new Date().toISOString() : null,
        })
        .eq('id', existing.id)
    } else {
      await supabase.from('food_deliveries').insert({
        order_id:      orderId,
        driver_id:     driverId,
        status:        driverId ? 'dispatching' : 'pending',
        dispatched_at: driverId ? new Date().toISOString() : null,
      })
    }
    setDispatching(null)
    load()
  }

  if (loading) return (
    <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', padding: '1.5rem', textAlign: 'center' }}>
      Chargement…
    </div>
  )

  if (orders.length === 0) return (
    <div className="food-alert">
      <div className="food-alert-emoji">✅</div>
      <div className="food-alert-title">Aucune commande à dispatcher</div>
      <div className="food-alert-sub">Les commandes confirmées apparaissent ici.</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      {orders.map(order => {
        const delivery = order.delivery
        const hasDriver = !!(delivery?.driver_id)
        const btnStyle: React.CSSProperties = {
          fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700,
          padding: '7px 14px', borderRadius: 20, cursor: 'pointer',
        }
        return (
          <div key={order.id} style={{
            background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 12, padding: '1rem 1.2rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: '0.7rem' }}>
              <div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: 'var(--td)' }}>
                  {order.customer_name}
                </div>
                {order.delivery_address && (
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: 2 }}>
                    📍 {order.delivery_address}
                  </div>
                )}
              </div>
              {delivery && (
                <span style={{
                  fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  color: delivery.status === 'delivered' ? '#34d399' : 'var(--food-brand)',
                  background: delivery.status === 'delivered' ? 'rgba(16,185,129,0.1)' : 'rgba(216,90,48,0.1)',
                  border: `1px solid ${delivery.status === 'delivered' ? 'rgba(16,185,129,0.25)' : 'rgba(216,90,48,0.25)'}`,
                  borderRadius: 10, padding: '2px 8px', whiteSpace: 'nowrap',
                }}>
                  {delivery.status}
                </span>
              )}
            </div>

            {!hasDriver && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={() => dispatch(order.id, null)}
                  disabled={dispatching === order.id}
                  style={{ ...btnStyle, background: 'var(--food-brand)', color: '#fff', border: 'none' }}
                >
                  {dispatching === order.id ? '…' : '🏃 Je livre moi-même'}
                </button>
                {drivers.map(d => (
                  <button
                    key={d.id}
                    onClick={() => dispatch(order.id, d.id)}
                    disabled={dispatching === order.id}
                    style={{ ...btnStyle, background: 'transparent', color: 'var(--td2)', border: '1px solid var(--bd2)' }}
                  >
                    {VEHICLE_ICON[d.vehicle ?? 'foot'] ?? '🚶'} {d.name}
                  </button>
                ))}
              </div>
            )}

            {hasDriver && !delivery?.status?.startsWith('delivered') && (
              <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: '#34d399' }}>
                ✓ Livreur assigné · en cours
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
