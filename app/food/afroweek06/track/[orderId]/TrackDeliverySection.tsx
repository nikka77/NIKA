'use client'
// app/food/afroweek06/track/[orderId]/TrackDeliverySection.tsx
import dynamic from 'next/dynamic'
import DeliveryTimeline, { type DeliveryStatus } from '@/components/food/delivery/DeliveryTimeline'

const DriverMap = dynamic(() => import('@/components/food/delivery/DriverMap'), { ssr: false })

type Props = {
  deliveryId: string
  driverId: string | null
  driverName: string | null
  initialStatus: string
  initialEta: number | null
  initialDriverLat: number | null
  initialDriverLng: number | null
  clientAddress: string | null
}

export default function TrackDeliverySection({
  deliveryId, driverId, driverName,
  initialStatus, initialEta,
  initialDriverLat, initialDriverLng,
  clientAddress,
}: Props) {
  const hasDriver = !!driverId
  const hasPosition = initialDriverLat != null && initialDriverLng != null

  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid rgba(216,90,48,0.25)',
      borderRadius: 14, overflow: 'hidden',
    }}>
      {/* Driver info banner */}
      {hasDriver && driverName && (
        <div style={{
          background: 'var(--food-dark)', padding: '0.7rem 1.2rem',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>🛵</span>
          <div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: '#fff' }}>
              {driverName}
            </div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
              Votre livreur · position en direct
            </div>
          </div>
        </div>
      )}

      {/* Map (si token + position connue) */}
      {hasDriver && driverId && (
        <div style={{ padding: '1rem' }}>
          <DriverMap
            driverId={driverId}
            deliveryId={deliveryId}
            clientLat={43.7102}
            clientLng={7.2620}
            clientAddress={clientAddress ?? undefined}
            initialDriverLat={hasPosition ? initialDriverLat : undefined}
            initialDriverLng={hasPosition ? initialDriverLng : undefined}
          />
        </div>
      )}

      {/* Timeline livraison */}
      <div style={{ padding: hasDriver ? '0 1rem 1rem' : '1rem' }}>
        <DeliveryTimeline
          deliveryId={deliveryId}
          initialStatus={initialStatus as DeliveryStatus}
          initialEta={initialEta}
        />
      </div>
    </div>
  )
}
