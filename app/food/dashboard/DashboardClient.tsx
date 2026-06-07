'use client'
// app/food/dashboard/DashboardClient.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const toggle = async () => {
    setLoading(true)
    const supabase = createClient()
    if (!supabase) { setLoading(false); return }

    try {
      if (!sessionId) {
        // Vérifier si session existe déjà (race)
        const today = new Date().toISOString().split('T')[0]
        const { data: existing } = await supabase
          .from('food_sessions')
          .select('id, status')
          .eq('provider_id', providerId)
          .eq('date', today)
          .maybeSingle()

        if (existing) {
          setSessionId(existing.id)
          if (existing.status !== 'open') {
            await supabase.from('food_sessions').update({ status: 'open', closed_at: null }).eq('id', existing.id)
            setStatus('open')
          } else {
            setStatus(existing.status as Status)
          }
        } else {
          const { data } = await supabase
            .from('food_sessions')
            .insert({ provider_id: providerId, date: today, status: 'open' })
            .select('id')
            .single()
          if (data) { setSessionId(data.id); setStatus('open') }
        }
      } else if (status === 'open') {
        await supabase.from('food_sessions').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', sessionId)
        setStatus('closed')
      } else {
        await supabase.from('food_sessions').update({ status: 'open', closed_at: null }).eq('id', sessionId)
        setStatus('open')
      }
    } finally {
      setLoading(false)
      router.refresh()
    }
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

      {/* Statut unifié + CA */}
      <div style={{ padding: '0.8rem 1.2rem 0' }}>
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
              {isOpen && (
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              )}
              <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: isOpen ? '#16a34a' : isSoldOut ? '#dc2626' : '#888' }}>
                {isOpen ? 'Ouvert ce soir' : isSoldOut ? 'Épuisé — sold out' : 'Fermé'}
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

        {/* Toggle bouton */}
        {!isSoldOut && (
          <button
            onClick={toggle}
            disabled={loading}
            style={{
              marginTop: 10, width: '100%',
              fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700,
              padding: '13px', borderRadius: 12,
              background: isOpen ? '#dc2626' : 'var(--food-brand)',
              color: '#fff', border: 'none',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'background 0.2s',
            }}
          >
            {loading
              ? '…'
              : !sessionId
                ? '🟢 Ouvrir la boutique ce soir'
                : isOpen
                  ? '🔴 Fermer la boutique'
                  : '🟢 Rouvrir la boutique'}
          </button>
        )}
      </div>
    </>
  )
}
