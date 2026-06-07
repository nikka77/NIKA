'use client'
// components/food/delivery/DriverMap.tsx
// Always wrapped with dynamic({ ssr: false }) — browser-only
import 'mapbox-gl/dist/mapbox-gl.css'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ETABadge from '@/components/food/delivery/ETABadge'

type Props = {
  driverId: string
  deliveryId: string
  clientLat: number
  clientLng: number
  clientAddress?: string
  initialDriverLat?: number | null
  initialDriverLng?: number | null
}

type MapboxMap = {
  addSource: (id: string, src: object) => void
  addLayer: (layer: object) => void
  getSource: (id: string) => { setData: (d: object) => void } | undefined
  fitBounds: (bounds: [[number, number], [number, number]], options: object) => void
  remove: () => void
  on: (event: string, cb: () => void) => void
}

export default function DriverMap({
  driverId, deliveryId,
  clientLat, clientLng, clientAddress,
  initialDriverLat, initialDriverLng,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapboxMap | null>(null)
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || !token) return
    let map: MapboxMap

    const init = async () => {
      const mapboxgl = (await import('mapbox-gl')).default

      mapboxgl.accessToken = token

      map = new mapboxgl.Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [clientLng, clientLat],
        zoom: 14,
      }) as MapboxMap

      mapRef.current = map

      map.on('load', async () => {
        setMapLoaded(true)

        // Client pin (orange circle)
        map.addSource('client', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [clientLng, clientLat] },
            properties: {},
          },
        })
        map.addLayer({
          id: 'client-circle',
          type: 'circle',
          source: 'client',
          paint: {
            'circle-radius': 12,
            'circle-color': '#D85A30',
            'circle-stroke-color': '#fff',
            'circle-stroke-width': 3,
          },
        })

        // Driver pin (dark with orange border)
        const driverGeo = initialDriverLat && initialDriverLng ? {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [initialDriverLng, initialDriverLat] },
          properties: { heading: 0 },
        } : { type: 'FeatureCollection', features: [] }

        map.addSource('driver', { type: 'geojson', data: driverGeo })
        map.addLayer({
          id: 'driver-circle',
          type: 'circle',
          source: 'driver',
          paint: {
            'circle-radius': 14,
            'circle-color': '#1a1a2e',
            'circle-stroke-color': '#D85A30',
            'circle-stroke-width': 4,
          },
        })
        map.addLayer({
          id: 'driver-label',
          type: 'symbol',
          source: 'driver',
          layout: {
            'text-field': '🛵',
            'text-size': 16,
            'text-offset': [0, 0],
          },
        })

        // Route line
        map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#D85A30',
            'line-width': 4,
            'line-dasharray': [2, 1],
            'line-opacity': 0.85,
          },
        })

        // Fit bounds if driver position is known
        if (initialDriverLat && initialDriverLng) {
          map.fitBounds([
            [Math.min(initialDriverLng, clientLng) - 0.005, Math.min(initialDriverLat, clientLat) - 0.005],
            [Math.max(initialDriverLng, clientLng) + 0.005, Math.max(initialDriverLat, clientLat) + 0.005],
          ], { padding: 40 })
          const eta = await fetchRoute(map, initialDriverLng, initialDriverLat, clientLng, clientLat, token)
          if (eta) setEtaSeconds(eta * 60)
        }
      })
    }

    init()
    return () => {
      try { map?.remove() } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Realtime driver position
  useEffect(() => {
    const supabase = createClient()
    if (!supabase || !token) return

    const channel = supabase
      .channel('driver-map-pos-' + driverId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'food_driver_positions',
        filter: `driver_id=eq.${driverId}`,
      }, async (payload) => {
        const { lat, lng } = payload.new as { lat: number; lng: number }
        const map = mapRef.current
        const src = map?.getSource('driver')
        if (!src) return

        src.setData({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: {},
        })

        if (mapLoaded && map) {
          const eta = await fetchRoute(map, lng, lat, clientLng, clientLat, token)
          if (eta) setEtaSeconds(eta * 60)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId, mapLoaded, clientLat, clientLng, token])

  if (!token) {
    return (
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 14,
        padding: '2rem', textAlign: 'center',
        fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)',
      }}>
        🗺️ Carte non configurée
        <div style={{ marginTop: 4, fontSize: 11 }}>NEXT_PUBLIC_MAPBOX_TOKEN manquant</div>
      </div>
    )
  }

  return (
    <div>
      {etaSeconds != null && (
        <div style={{ marginBottom: '0.8rem' }}>
          <ETABadge etaSeconds={etaSeconds} />
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <div
          ref={containerRef}
          style={{ width: '100%', height: 280, borderRadius: 14, overflow: 'hidden', background: '#1a1a2e' }}
        />
        {!mapLoaded && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#1a1a2e', borderRadius: 14,
            fontFamily: 'var(--fo)', fontSize: 13, color: 'rgba(255,255,255,0.4)',
          }}>
            Chargement carte…
          </div>
        )}
        {clientAddress && (
          <div style={{
            position: 'absolute', bottom: 10, left: 10, right: 10,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
            borderRadius: 10, padding: '6px 10px',
            fontFamily: 'var(--fo)', fontSize: 11, color: 'rgba(255,255,255,0.8)',
          }}>
            📍 {clientAddress}
          </div>
        )}
      </div>
    </div>
  )
}

async function fetchRoute(
  map: MapboxMap,
  driverLng: number, driverLat: number,
  clientLng: number, clientLat: number,
  token: string
): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${driverLng},${driverLat};${clientLng},${clientLat}?geometries=geojson&access_token=${token}`
    )
    if (!res.ok) return null
    const json = await res.json()
    if (!json.routes?.length) return null
    const route = json.routes[0]
    map.getSource('route')?.setData(route.geometry)
    return Math.round(route.duration / 60)
  } catch {
    return null
  }
}
