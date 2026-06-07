'use client'
// app/food/dashboard/orders/page.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import OrderCard, { type FoodOrder } from '@/components/food/OrderCard'

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled'

type RawOrder = {
  id: string
  customer_name: string
  customer_phone: string | null
  delivery_address: string | null
  scheduled_time: string | null
  payment_method: string | null
  status: string
  total: number | null
  delivery_fee: number | null
  notes: string | null
  created_at: string
  food_order_items: {
    quantity: number
    unit_price: number
    food_items: { name: string; emoji: string | null } | null
  }[]
}

const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'delivering']

export default function OrdersDashboardPage() {
  const [orders, setOrders] = useState<FoodOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'active' | 'all'>('active')

  const loadOrders = async () => {
    const supabase = createClient()
    if (!supabase) { setLoading(false); return }

    const { data: provider } = await supabase
      .from('food_providers')
      .select('id')
      .eq('slug', 'afroweek06')
      .single()
    if (!provider) { setLoading(false); return }

    const today = new Date().toISOString().split('T')[0]
    const { data: session } = await supabase
      .from('food_sessions')
      .select('id')
      .eq('provider_id', provider.id)
      .eq('date', today)
      .maybeSingle()
    if (!session) { setLoading(false); return }

    let query = supabase
      .from('food_orders')
      .select('id, customer_name, customer_phone, delivery_address, scheduled_time, payment_method, status, total, delivery_fee, notes, created_at, food_order_items(quantity, unit_price, food_items(name, emoji))')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })

    if (filter === 'active') {
      query = query.in('status', ACTIVE_STATUSES)
    }

    const { data } = await query
    if (data) {
      setOrders((data as unknown as RawOrder[]).map(raw => ({
        id:               raw.id,
        customer_name:    raw.customer_name,
        customer_phone:   raw.customer_phone ?? undefined,
        delivery_address: raw.delivery_address ?? undefined,
        scheduled_time:   raw.scheduled_time ?? undefined,
        payment_method:   raw.payment_method ?? undefined,
        status:           raw.status as OrderStatus,
        total:            raw.total ?? undefined,
        delivery_fee:     raw.delivery_fee ?? undefined,
        notes:            raw.notes ?? undefined,
        created_at:       raw.created_at,
        items:            raw.food_order_items.map(line => ({
          name:       line.food_items?.name ?? '?',
          emoji:      line.food_items?.emoji ?? undefined,
          quantity:   line.quantity,
          unit_price: line.unit_price,
        })),
      })))
    }
    setLoading(false)
  }

  useEffect(() => {
    loadOrders()

    // Realtime: reload on new orders or status changes
    const supabase = createClient()
    if (!supabase) return
    const channel = supabase
      .channel('orders-dashboard')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'food_orders',
      }, () => { loadOrders() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const handleStatusChange = (id: string, status: OrderStatus) => {
    setOrders(prev =>
      prev.map(o => o.id === id ? { ...o, status } : o)
        .filter(o => filter === 'all' || ACTIVE_STATUSES.includes(o.status as OrderStatus))
    )
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 0, paddingBottom: '4rem' }}>
      <div className="food-dash-header">
        <div>
          <Link
            href="/food/dashboard"
            style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none', fontFamily: 'var(--fo)', fontSize: 12 }}
          >
            ← Dashboard
          </Link>
        </div>
        <div className="food-dash-title" style={{ marginTop: 8 }}>🧾 Commandes</div>
        <div className="food-dash-sub">Gestion en temps réel · ce soir</div>
      </div>

      <div style={{ padding: '1.2rem 1.2rem 0' }}>
        {/* Filtre */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.2rem' }}>
          {(['active', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700,
                padding: '7px 16px', borderRadius: 20,
                background: filter === f ? 'var(--food-light)' : 'transparent',
                border: `1px solid ${filter === f ? 'var(--food-brand)' : 'var(--bd2)'}`,
                color: filter === f ? 'var(--food-brand)' : 'var(--td3)',
                cursor: 'pointer',
              }}
            >
              {f === 'active' ? '⚡ En cours' : '📋 Toutes'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>
            Chargement…
          </div>
        ) : orders.length === 0 ? (
          <div className="food-alert">
            <div className="food-alert-emoji">{filter === 'active' ? '✅' : '📭'}</div>
            <div className="food-alert-title">
              {filter === 'active' ? 'Aucune commande en cours' : 'Aucune commande ce soir'}
            </div>
            <div className="food-alert-sub">
              {filter === 'active' ? 'Les nouvelles commandes apparaissent ici en temps réel.' : 'La session est peut-être fermée.'}
            </div>
          </div>
        ) : (
          orders.map(order => (
            <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
          ))
        )}
      </div>
    </main>
  )
}
