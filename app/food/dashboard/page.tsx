// app/food/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Metadata } from 'next'
import DashboardClient from './DashboardClient'

export const metadata: Metadata = { title: 'Dashboard @afroweek06 — NIKA Food' }
export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  pending:    'En attente',
  confirmed:  'Confirmées',
  preparing:  'En prép.',
  delivering: 'En livraison',
  delivered:  'Livrées',
  cancelled:  'Annulées',
}

export default async function FoodDashboardPage() {
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

  const { data: ordersToday } = session && supabase
    ? await supabase.from('food_orders').select('id, status, total').eq('session_id', session.id)
    : { data: [] }

  const orders = ordersToday || []
  const revenue = orders.reduce((s: number, o: { total?: number }) => s + (o.total ?? 0), 0)
  const byStatus = orders.reduce((acc: Record<string, number>, o: { status: string }) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 0, paddingBottom: '4rem' }}>
      {/* Header */}
      <div className="food-dash-header">
        <div className="food-dash-title">@afroweek06</div>
        <div className="food-dash-sub">
          Dashboard prestataire · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Statut unifié + toggle (Client) */}
      <DashboardClient
        providerId={provider?.id ?? ''}
        sessionId={session?.id ?? null}
        sessionStatus={(session?.status ?? null) as 'open' | 'closed' | 'sold_out' | null}
        revenue={revenue}
        orderCount={orders.length}
      />

      <div style={{ padding: '1rem 1.2rem' }}>
        {/* Stats commandes */}
        {orders.length > 0 && (
          <div style={{ gap: '0.7rem', marginBottom: '1.4rem' }} className="g-3">
            {Object.entries(STATUS_LABELS).map(([key, label]) =>
              (byStatus[key] ?? 0) > 0 ? (
                <div key={key} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '0.9rem 1rem', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--fn)', fontSize: 28, color: 'var(--food-brand)', lineHeight: 1, marginBottom: 4 }}>
                    {byStatus[key]}
                  </div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{label}</div>
                </div>
              ) : null
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {[
            { href: '/food/dashboard/orders',   icon: '🧾', label: 'Commandes',    sub: 'Gérer et valider les commandes', arrow: '→' },
            { href: '/food/dashboard/stock',    icon: '📦', label: 'Stocks',       sub: 'Ajuster les stocks en temps réel', arrow: '→' },
            { href: '/food/dashboard/delivery', icon: '🛵', label: 'Livraisons',   sub: 'Dispatch et suivi des livreurs', arrow: '→' },
            { href: '/food/afroweek06',         icon: '👁', label: 'Voir la vitrine', sub: 'Page client /food/afroweek06', arrow: '↗' },
          ].map(({ href, icon, label, sub, arrow }) => (
            <Link
              key={href}
              href={href}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 12, padding: '1.1rem 1.3rem', textDecoration: 'none' }}
            >
              <div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 15, fontWeight: 700, color: 'var(--td)', marginBottom: 3 }}>{icon} {label}</div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>{sub}</div>
              </div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 20, color: 'var(--td3)' }}>{arrow}</div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
