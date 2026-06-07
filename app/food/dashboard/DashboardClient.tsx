'use client'
// app/food/dashboard/DashboardClient.tsx
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { openSession, closeSession } from './actions'

type Status = 'open' | 'closed' | 'sold_out' | null

type Props = {
  providerId: string
  sessionId: string | null
  sessionStatus: Status
  revenue: number
  orderCount: number
}

export default function DashboardClient({ providerId, sessionId: initId, sessionStatus: initStatus, revenue, orderCount }: Props) {
  const [sessionId, setSessionId] = useState(initId)
  const [status, setStatus] = useState(initStatus)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const toggle = () => {
    setError(null)
    startTransition(async () => {
      if (!sessionId || status !== 'open') {
        // Ouvrir / rouvrir
        const { error: err, sessionId: newId } = await openSession(providerId)
        if (err) { setError(err); return }
        if (newId) setSessionId(newId)
        setStatus('open')
      } else {
        // Fermer
        const { error: err } = await closeSession(sessionId)
        if (err) { setError(err); return }
        setStatus('closed')
      }
      router.refresh()
    })
  }

  const logout = async () => {
    const supabase = createClient()
    if (supabase) await supabase.auth.signOut()
    router.push('/food/dashboard/login')
    router.refresh()
  }

  const isOpen = status === 'open'
  const isSoldOut = status === 'sold_out'

  return (
    <>
      {/* Déconnexion */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.6rem 1.2rem 0' }}>
        <button
          onClick={logout}
          style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          Déconnexion →
        </button>
      </div>

      <div style={{ padding: '0.8rem 1.2rem 0' }}>
        {/* Statut unifié + CA */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--bd)',
          borderRadius: 14, padding: '1.2rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '1rem',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--td3)', marginBottom: 8 }}>
              Statut boutique
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: isOpen ? '#16a34a20' : isSoldOut ? '#dc262620' : 'rgba(100,100,120,0.12)',
              border: `1px solid ${isOpen ? '#16a34a' : isSoldOut ? '#dc2626' : '#444'}`,
              borderRadius: 99, padding: '6px 14px',
            }}>
              {isOpen && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', display: 'inline-block', animation: 'pulse 2s infinite' }} />}
              <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: isOpen ? '#16a34a' : isSoldOut ? '#dc2626' : '#888' }}>
                {isOpen ? 'Ouvert ce soir' : isSoldOut ? 'Sold out' : !sessionId ? 'Pas de session' : 'Fermé'}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--fn)', fontSize: 32, color: 'var(--food-brand)', lineHeight: 1 }}>
              {revenue.toFixed(2)} €
            </div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: 4 }}>
              {orderCount} commande{orderCount !== 1 ? 's' : ''} ce soir
            </div>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: '#f87171', padding: '0.6rem 0', textAlign: 'center' }}>
            ✗ {error}
          </div>
        )}

        {/* Toggle bouton */}
        {!isSoldOut && (
          <button
            onClick={toggle}
            disabled={isPending}
            style={{
              marginTop: 10, width: '100%',
              fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700,
              padding: '13px', borderRadius: 12,
              background: isOpen ? '#dc2626' : '#16a34a',
              color: '#fff', border: 'none',
              cursor: isPending ? 'wait' : 'pointer',
              opacity: isPending ? 0.7 : 1,
              transition: 'background 0.2s',
            }}
          >
            {isPending ? '…' : !sessionId ? '🟢 Ouvrir la boutique' : isOpen ? '🔴 Fermer la boutique' : '🟢 Rouvrir la boutique'}
          </button>
        )}
      </div>
    </>
  )
}
