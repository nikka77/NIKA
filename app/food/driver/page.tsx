'use client'
// app/food/driver/page.tsx — Login livreur
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DriverLoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = typeof window !== 'undefined' && localStorage.getItem('nika-driver-id')
    if (stored) router.replace('/food/driver/dashboard')
  }, [router])

  const login = async () => {
    const cleaned = phone.replace(/\s/g, '')
    if (!cleaned) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    if (!supabase) { setError('Erreur de connexion.'); setLoading(false); return }

    const { data: driver } = await supabase
      .from('food_drivers')
      .select('id, name, active')
      .eq('phone', cleaned)
      .maybeSingle()

    if (!driver) {
      setError('Numéro non trouvé. Contacte @afroweek06 pour t\'enregistrer.')
      setLoading(false)
      return
    }

    localStorage.setItem('nika-driver-id', driver.id)
    localStorage.setItem('nika-driver-name', driver.name)
    router.push('/food/driver/dashboard')
  }

  return (
    <main style={{ maxWidth: 420, margin: '0 auto', padding: '3rem 1.4rem 5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2.4rem' }}>
        <div style={{
          fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'var(--food-brand)', marginBottom: 8,
        }}>
          🛵 NIKKA FOOD · LIVREUR
        </div>
        <h1 style={{
          fontFamily: 'var(--fn)', fontSize: 36, color: 'var(--td)',
          letterSpacing: '0.04em', marginBottom: 8,
        }}>
          CONNEXION
        </h1>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', lineHeight: 1.6 }}>
          Entre le numéro de téléphone enregistré par le prestataire.
        </p>
      </div>

      <div className="food-form-section">
        <label className="food-label">Téléphone</label>
        <input
          className="food-input"
          type="tel"
          inputMode="tel"
          placeholder="0612345678"
          value={phone}
          onChange={e => { setPhone(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && login()}
          autoFocus
        />
        {error && (
          <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--amber)', marginTop: 8 }}>
            {error}
          </p>
        )}
      </div>

      <button
        className="food-submit-btn"
        onClick={login}
        disabled={loading || !phone.trim()}
        style={{ marginTop: '1.2rem' }}
      >
        {loading ? 'Vérification…' : '🛵 Accéder au dashboard'}
      </button>
    </main>
  )
}
