'use client'
// app/food/driver/delivery/[id]/page.tsx — Navigation live livreur
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useDriverPosition } from '@/components/food/delivery/PositionBroadcaster'
import DeliveryTimeline, { type DeliveryStatus } from '@/components/food/delivery/DeliveryTimeline'

const DriverMap = dynamic(() => import('@/components/food/delivery/DriverMap'), { ssr: false })

type DeliveryData = {
  id: string
  status: DeliveryStatus
  eta_seconds: number | null
  driver_id: string | null
  food_orders: {
    id: string
    customer_name: string
    delivery_address: string | null
    customer_phone: string | null
    delivery_lat: number | null
    delivery_lng: number | null
  } | null
}

type Props = { params: Promise<{ id: string }> }

export default function DriverDeliveryPage({ params }: Props) {
  const router = useRouter()
  const [driverId, setDriverId] = useState('')
  const [deliveryId, setDeliveryId] = useState('')
  const [delivery, setDelivery] = useState<DeliveryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  // Broadcast GPS during delivery
  useDriverPosition(driverId, deliveryId || undefined)

  useEffect(() => {
    const id = typeof window !== 'undefined' && localStorage.getItem('nika-driver-id')
    if (!id) { router.replace('/food/driver'); return }
    setDriverId(id)

    params.then(async ({ id: dId }) => {
      setDeliveryId(dId)
      // Lecture via route admin (les PII ne sont plus lisibles en anon).
      const res = await fetch(`/api/food/delivery/${dId}`)
      const json = await res.json().catch(() => ({}))
      setDelivery(res.ok ? (json.delivery as DeliveryData) : null)
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const markDelivered = async () => {
    if (!delivery) return
    setUpdating(true)
    const supabase = createClient()
    if (supabase) {
      await supabase.from('food_deliveries').update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      }).eq('id', delivery.id)
    }
    setUpdating(false)
    router.push('/food/driver/dashboard')
  }

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh',
      fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)',
    }}>
      Chargement…
    </div>
  )

  if (!delivery) return (
    <div style={{
      textAlign: 'center', padding: '4rem 1.4rem',
      fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)',
    }}>
      Livraison introuvable.
    </div>
  )

  const order = delivery.food_orders

  return (
    <main style={{ maxWidth: 540, margin: '0 auto', padding: 0, paddingBottom: '5rem' }}>
      {/* Header */}
      <div className="food-dash-header">
        <button
          onClick={() => router.push('/food/driver/dashboard')}
          style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 10 }}
        >
          ← Retour
        </button>
        <div className="food-dash-title">🗺️ En livraison</div>
        <div className="food-dash-sub">
          {order?.customer_name ?? 'Client'} · GPS actif
        </div>
      </div>

      <div style={{ padding: '1.4rem 1.2rem' }}>
        {/* Infos client */}
        <div className="food-form-section" style={{ marginBottom: '1.2rem' }}>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 15, fontWeight: 700, color: 'var(--td)', marginBottom: 6 }}>
            {order?.customer_name}
          </div>
          {order?.delivery_address && (
            <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', marginBottom: 8 }}>
              📍 {order.delivery_address}
            </div>
          )}
          {order?.customer_phone && (
            <a
              href={`tel:${order.customer_phone}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600,
                color: 'var(--food-brand)', textDecoration: 'none',
                padding: '8px 16px', background: 'rgba(216,90,48,0.1)',
                border: '1px solid rgba(216,90,48,0.25)', borderRadius: 10,
              }}
            >
              📞 Appeler le client
            </a>
          )}
        </div>

        {/* Carte Mapbox */}
        {driverId && deliveryId && (
          <div style={{ marginBottom: '1.4rem' }}>
            <DriverMap
              driverId={driverId}
              deliveryId={deliveryId}
              clientLat={order?.delivery_lat ?? 43.7102}
              clientLng={order?.delivery_lng ?? 7.2620}
              clientAddress={order?.delivery_address ?? undefined}
            />
            <p style={{
              fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)',
              marginTop: 6, textAlign: 'center',
            }}>
              Position mise à jour toutes les 5 secondes · visible par le client
            </p>
          </div>
        )}

        {/* Timeline livraison */}
        <div className="food-form-section" style={{ marginBottom: '1.4rem' }}>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)', marginBottom: '1rem' }}>
            Statut de la livraison
          </div>
          {deliveryId && (
            <DeliveryTimeline
              deliveryId={deliveryId}
              initialStatus={delivery.status}
              initialEta={delivery.eta_seconds}
            />
          )}
        </div>

        {/* Bouton livré */}
        {delivery.status === 'delivering' && (
          <button
            className="food-submit-btn"
            onClick={markDelivered}
            disabled={updating}
          >
            {updating ? 'Enregistrement…' : '🎉 Marquer comme livré'}
          </button>
        )}
      </div>
    </main>
  )
}
