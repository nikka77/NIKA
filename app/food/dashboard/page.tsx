// app/food/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard @afroweek06 — NIKA Food' }
export const dynamic = 'force-dynamic'

export default async function FoodDashboardPage() {
  const supabase = await createClient()

  const { data: provider } = supabase
    ? await supabase.from('food_providers').select('id, name, active').eq('slug', 'afroweek06').single()
    : { data: null }

  const today = new Date().toISOString().split('T')[0]
  const { data: session } = provider && supabase
    ? await supabase
        .from('food_sessions')
        .select('id, status, opened_at')
        .eq('provider_id', provider.id)
        .eq('date', today)
        .maybeSingle()
    : { data: null }

  const { data: ordersToday } = session && supabase
    ? await supabase
        .from('food_orders')
        .select('id, status, total')
        .eq('session_id', session.id)
    : { data: [] }

  const orders = ordersToday || []
  const revenue = orders.reduce((s: number, o: { total?: number }) => s + (o.total ?? 0), 0)
  const byStatus = orders.reduce((acc: Record<string, number>, o: { status: string }) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})

  const STATUS_LABELS: Record<string, string> = {
    pending:    'En attente',
    confirmed:  'Confirmées',
    preparing:  'En prép.',
    delivering: 'En livraison',
    delivered:  'Livrées',
    cancelled:  'Annulées',
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 0, paddingBottom: '4rem' }}>
      {/* Header */}
      <div className="food-dash-header">
        <div className="food-dash-title">@afroweek06</div>
        <div className="food-dash-sub">
          Dashboard prestataire · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      <div style={{ padding: '1.6rem 1.2rem' }}>
        {/* Session status */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 14, padding: '1.2rem', marginBottom: '1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--td3)', marginBottom: 4 }}>
                Session ce soir
              </div>
              {session ? (
                <div style={{ fontFamily: 'var(--fo)', fontSize: 15, fontWeight: 700, color: 'var(--td)' }}>
                  <span className={`food-status-pill ${session.status}`} style={{ fontSize: 12 }}>
                    {session.status === 'open' ? '🟢 Ouverte' : session.status === 'sold_out' ? '🔴 Épuisée' : '⚫ Fermée'}
                  </span>
                </div>
              ) : (
                <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>
                  Aucune session créée aujourd&apos;hui.
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <div style={{ fontFamily: 'var(--fn)', fontSize: 32, color: 'var(--food-brand)', lineHeight: 1 }}>
                {revenue.toFixed(2)} €
              </div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>Chiffre du jour</div>
            </div>
          </div>
        </div>

        {/* Stats commandes */}
        {orders.length > 0 && (
          <div style={{ gap: '0.7rem', marginBottom: '1.6rem' }} className="g-3 max-sm:grid-cols-2">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              byStatus[key] > 0 ? (
                <div key={key} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '0.9rem 1rem', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--fn)', fontSize: 28, color: 'var(--food-brand)', lineHeight: 1, marginBottom: 4 }}>
                    {byStatus[key]}
                  </div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{label}</div>
                </div>
              ) : null
            ))}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <Link
            href="/food/dashboard/orders"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 12, padding: '1.1rem 1.3rem', textDecoration: 'none' }}
          >
            <div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 15, fontWeight: 700, color: 'var(--td)', marginBottom: 3 }}>🧾 Commandes</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>Gérer et valider les commandes</div>
            </div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 20, color: 'var(--td3)' }}>→</div>
          </Link>
          <Link
            href="/food/dashboard/stock"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 12, padding: '1.1rem 1.3rem', textDecoration: 'none' }}
          >
            <div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 15, fontWeight: 700, color: 'var(--td)', marginBottom: 3 }}>📦 Stocks</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>Ajuster les stocks restants en temps réel</div>
            </div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 20, color: 'var(--td3)' }}>→</div>
          </Link>
          <Link
            href="/food/dashboard/delivery"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 12, padding: '1.1rem 1.3rem', textDecoration: 'none' }}
          >
            <div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 15, fontWeight: 700, color: 'var(--td)', marginBottom: 3 }}>🛵 Livraisons</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>Dispatch et suivi des livreurs</div>
            </div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 20, color: 'var(--td3)' }}>→</div>
          </Link>
          <Link
            href="/food/afroweek06"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 12, padding: '1.1rem 1.3rem', textDecoration: 'none' }}
          >
            <div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 15, fontWeight: 700, color: 'var(--td)', marginBottom: 3 }}>👁 Voir la vitrine</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>Page client /food/afroweek06</div>
            </div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 20, color: 'var(--td3)' }}>↗</div>
          </Link>
        </div>
      </div>
    </main>
  )
}
