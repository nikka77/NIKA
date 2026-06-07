// app/food/afroweek06/track/[orderId]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import TrackingTimeline from '@/components/food/TrackingTimeline'
import TrackDeliverySection from './TrackDeliverySection'

export const metadata: Metadata = { title: 'Suivi de commande — NIKA Food' }
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ orderId: string }> }

type OrderItem = {
  quantity: number
  unit_price: number
  food_items: { name: string; emoji: string | null } | null
}

type DeliveryRow = {
  id: string
  status: string
  eta_seconds: number | null
  driver_id: string | null
  food_drivers: {
    id: string
    name: string
    current_lat: number | null
    current_lng: number | null
  } | null
}

type Order = {
  id: string
  status: string
  customer_name: string
  delivery_address: string | null
  scheduled_time: string | null
  total: number | null
  food_order_items: OrderItem[]
}

export default async function TrackOrderPage({ params }: Props) {
  const { orderId } = await params
  const supabase = await createClient()

  const { data: order } = supabase
    ? await supabase
        .from('food_orders')
        .select('id, status, customer_name, delivery_address, scheduled_time, total, food_order_items(quantity, unit_price, food_items(name, emoji))')
        .eq('id', orderId)
        .single()
    : { data: null }

  if (!order) notFound()

  const typedOrder = order as unknown as Order

  // Livraison associée (si elle existe)
  const { data: deliveryRaw } = supabase
    ? await supabase
        .from('food_deliveries')
        .select('id, status, eta_seconds, driver_id, food_drivers(id, name, current_lat, current_lng)')
        .eq('order_id', orderId)
        .maybeSingle()
    : { data: null }

  const delivery = deliveryRaw as unknown as DeliveryRow | null

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.2rem 5rem' }}>
      <Link
        href="/food/afroweek06"
        style={{
          fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)',
          display: 'inline-flex', gap: 4, marginBottom: '1.6rem', textDecoration: 'none',
        }}
      >
        ← Menu
      </Link>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontFamily: 'var(--fn)', fontSize: 'clamp(24px,5vw,38px)',
          color: 'var(--food-brand)', letterSpacing: '0.05em', marginBottom: '0.3rem',
        }}>
          SUIVI DE COMMANDE
        </h1>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)' }}>
          Commande de {typedOrder.customer_name}
          {typedOrder.scheduled_time && ` · Livraison à ${typedOrder.scheduled_time.slice(0, 5)}`}
        </p>
      </div>

      {/* Timeline statut commande */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--bd)',
        borderRadius: 14, padding: '1.4rem', marginBottom: '1.4rem',
      }}>
        <TrackingTimeline
          orderId={orderId}
          initialStatus={typedOrder.status as 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled'}
        />
      </div>

      {/* Livraison live (carte + timeline livreur) */}
      {delivery && (
        <div style={{ marginBottom: '1.4rem' }}>
          <TrackDeliverySection
            deliveryId={delivery.id}
            driverId={delivery.driver_id}
            driverName={(delivery.food_drivers as unknown as { name: string } | null)?.name ?? null}
            initialStatus={delivery.status}
            initialEta={delivery.eta_seconds}
            initialDriverLat={(delivery.food_drivers as unknown as { current_lat: number | null } | null)?.current_lat ?? null}
            initialDriverLng={(delivery.food_drivers as unknown as { current_lng: number | null } | null)?.current_lng ?? null}
            clientAddress={typedOrder.delivery_address}
          />
        </div>
      )}

      {/* Récap commande */}
      <div className="food-form-section">
        <h2 style={{
          fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700,
          color: 'var(--td)', marginBottom: '0.8rem',
        }}>
          Votre commande
        </h2>
        {typedOrder.food_order_items.map((line, i) => (
          <div key={i} className="food-order-line" style={{ padding: '4px 0' }}>
            <span>{line.food_items?.emoji} {line.quantity}× {line.food_items?.name}</span>
            <span>{(line.quantity * line.unit_price).toFixed(2)} €</span>
          </div>
        ))}
        {typedOrder.delivery_address && (
          <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginTop: '0.8rem' }}>
            📍 {typedOrder.delivery_address}
          </div>
        )}
        {typedOrder.total && (
          <div className="food-order-line food-order-line--total" style={{ marginTop: '0.8rem' }}>
            <span>Total payé</span>
            <span>{Number(typedOrder.total).toFixed(2)} €</span>
          </div>
        )}
      </div>

      <p style={{
        fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)',
        textAlign: 'center', marginTop: '2rem',
      }}>
        Un problème ? Contactez @afroweek06 sur Instagram.
      </p>
    </main>
  )
}
