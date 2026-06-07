'use client'
// app/food/driver/dashboard/page.tsx
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DriverDashboard from '@/components/food/delivery/DriverDashboard'
import { useDriverPosition } from '@/components/food/delivery/PositionBroadcaster'

export default function DriverDashboardPage() {
  const router = useRouter()
  const [driverId, setDriverId] = useState('')
  const [driverName, setDriverName] = useState('')
  const [active, setActive] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [gpsStatus, setGpsStatus] = useState<'ok' | 'denied' | 'idle'>('idle')

  // Broadcast GPS position every 5s when active
  useDriverPosition(active ? driverId : '')

  const loadDriver = useCallback(async (id: string) => {
    const supabase = createClient()
    if (!supabase) return
    const { data } = await supabase
      .from('food_drivers')
      .select('active')
      .eq('id', id)
      .single()
    if (data) setActive(data.active)
  }, [])

  useEffect(() => {
    const id = typeof window !== 'undefined' && localStorage.getItem('nika-driver-id')
    const name = typeof window !== 'undefined' && localStorage.getItem('nika-driver-name')
    if (!id) { router.replace('/food/driver'); return }
    setDriverId(id)
    setDriverName(name || 'Livreur')
    loadDriver(id)
  }, [router, loadDriver])

  // Check GPS permission when going active
  useEffect(() => {
    if (!active) return
    navigator.geolocation.getCurrentPosition(
      () => setGpsStatus('ok'),
      () => setGpsStatus('denied'),
    )
  }, [active])

  const toggleActive = async () => {
    setToggling(true)
    const supabase = createClient()
    if (supabase) {
      const next = !active
      await supabase.from('food_drivers').update({ active: next }).eq('id', driverId)
      setActive(next)
    }
    setToggling(false)
  }

  const logout = () => {
    localStorage.removeItem('nika-driver-id')
    localStorage.removeItem('nika-driver-name')
    router.push('/food/driver')
  }

  if (!driverId) return null

  return (
    <main style={{ maxWidth: 540, margin: '0 auto', padding: 0, paddingBottom: '4rem' }}>
      {/* Header */}
      <div className="food-dash-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="food-dash-title">🛵 {driverName}</div>
            <div className="food-dash-sub">Tableau de bord livreur</div>
          </div>
          <button
            onClick={logout}
            style={{
              fontFamily: 'var(--fo)', fontSize: 11,
              color: 'rgba(255,255,255,0.35)', background: 'none',
              border: 'none', cursor: 'pointer', paddingTop: 4,
            }}
          >
            Déconnexion
          </button>
        </div>

        {/* Toggle disponibilité */}
        <div style={{ marginTop: '1.2rem' }}>
          <button
            onClick={toggleActive}
            disabled={toggling}
            style={{
              width: '100%', fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700,
              padding: '12px 24px', borderRadius: 12,
              background: active ? 'rgba(16,185,129,0.15)' : 'rgba(100,100,120,0.15)',
              border: `1px solid ${active ? 'rgba(16,185,129,0.4)' : 'rgba(100,100,120,0.3)'}`,
              color: active ? '#34d399' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {toggling ? '…' : active
              ? '🟢 Disponible · Cliquer pour passer hors ligne'
              : '⚫ Hors ligne · Cliquer pour être disponible'}
          </button>
          {active && gpsStatus === 'denied' && (
            <p style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--amber)', marginTop: 6, textAlign: 'center' }}>
              ⚠ GPS refusé — activez la localisation pour que les clients vous suivent.
            </p>
          )}
          {active && gpsStatus === 'ok' && (
            <p style={{ fontFamily: 'var(--fo)', fontSize: 11, color: '#34d399', marginTop: 6, textAlign: 'center' }}>
              📡 Position GPS envoyée toutes les 5 secondes
            </p>
          )}
        </div>
      </div>

      {/* Livraisons en cours */}
      <div style={{ padding: '1.2rem 1.2rem 0' }}>
        <h2 style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: 'var(--td)', marginBottom: '1rem' }}>
          Livraisons en cours
        </h2>
        {driverId && <DriverDashboard driverId={driverId} />}
      </div>
    </main>
  )
}
