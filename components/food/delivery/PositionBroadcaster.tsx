'use client'
// components/food/delivery/PositionBroadcaster.tsx
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useDriverPosition(driverId: string, deliveryId?: string) {
  useEffect(() => {
    if (!driverId) return
    const supabase = createClient()
    if (!supabase) return

    const interval = setInterval(async () => {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
          })
        )
        await supabase.rpc('update_driver_position', {
          p_driver_id:   driverId,
          p_lat:         pos.coords.latitude,
          p_lng:         pos.coords.longitude,
          p_heading:     pos.coords.heading ?? null,
          p_speed:       pos.coords.speed != null ? pos.coords.speed * 3.6 : null,
          p_delivery_id: deliveryId ?? null,
        })
      } catch {
        // Geolocation denied or timeout — skip silently
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [driverId, deliveryId])
}
