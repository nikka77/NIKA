// app/food/dashboard/delivery/page.tsx — Vue livraisons prestataire
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Metadata } from 'next'
import DispatchPanel from '@/components/food/delivery/DispatchPanel'

export const metadata: Metadata = { title: 'Livraisons — Dashboard @afroweek06' }
export const dynamic = 'force-dynamic'

type DriverRow = {
  id: string
  name: string
  vehicle: string | null
  active: boolean
  last_seen_at: string | null
}

const VEHICLE_ICON: Record<string, string> = {
  scooter: '🛵', bike: '🚲', car: '🚗', foot: '🚶',
}

export default async function DeliveryDashboardPage() {
  const supabase = await createClient()

  const { data: provider } = supabase
    ? await supabase.from('food_providers').select('id, name').eq('slug', 'afroweek06').single()
    : { data: null }

  const today = new Date().toISOString().split('T')[0]
  const { data: session } = provider && supabase
    ? await supabase
        .from('food_sessions')
        .select('id, status')
        .eq('provider_id', provider.id)
        .eq('date', today)
        .maybeSingle()
    : { data: null }

  const { data: drivers } = supabase
    ? await supabase
        .from('food_drivers')
        .select('id, name, vehicle, active, last_seen_at')
        .eq('active', true)
        .order('last_seen_at', { ascending: false })
    : { data: [] }

  const activeDrivers = (drivers as DriverRow[] | null) ?? []

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 0, paddingBottom: '4rem' }}>
      {/* Header */}
      <div className="food-dash-header">
        <div>
          <Link
            href="/food/dashboard"
            style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none', fontFamily: 'var(--fo)', fontSize: 12 }}
          >
            ← Dashboard
          </Link>
        </div>
        <div className="food-dash-title" style={{ marginTop: 8 }}>🛵 Livraisons</div>
        <div className="food-dash-sub">Dispatch et suivi · {today}</div>
      </div>

      <div style={{ padding: '1.4rem 1.2rem' }}>
        {/* Livreurs actifs */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: 'var(--td)', marginBottom: '0.8rem' }}>
            Livreurs en ligne ({activeDrivers.length})
          </h2>

          {activeDrivers.length === 0 ? (
            <div className="food-alert">
              <div className="food-alert-emoji">🛵</div>
              <div className="food-alert-title">Aucun livreur connecté</div>
              <div className="food-alert-sub">
                Les livreurs activent leur disponibilité depuis{' '}
                <Link href="/food/driver" style={{ color: 'var(--food-brand)' }}>/food/driver</Link>.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {activeDrivers.map(driver => {
                const lastSeen = driver.last_seen_at ? new Date(driver.last_seen_at) : null
                const minsAgo = lastSeen ? Math.round((Date.now() - lastSeen.getTime()) / 60000) : null
                const icon = VEHICLE_ICON[driver.vehicle ?? ''] ?? '🚶'
                return (
                  <div key={driver.id} style={{
                    background: 'var(--bg2)', border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 10, padding: '0.7rem 1rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                  }}>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)' }}>
                      {icon} {driver.name}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: '#34d399', fontWeight: 700 }}>
                        🟢 En ligne
                      </div>
                      {minsAgo !== null && (
                        <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>
                          GPS il y a {minsAgo < 1 ? '&lt;1' : minsAgo} min
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Dispatch */}
        <section>
          <h2 style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: 'var(--td)', marginBottom: '0.8rem' }}>
            Commandes à dispatcher
          </h2>
          {session ? (
            <DispatchPanel sessionId={session.id} />
          ) : (
            <div className="food-alert">
              <div className="food-alert-emoji">📭</div>
              <div className="food-alert-title">Aucune session ce soir</div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
