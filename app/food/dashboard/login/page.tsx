'use client'
// app/food/dashboard/login/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function FoodDashboardLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    if (!supabase) { setError('Service indisponible.'); setLoading(false); return }

    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
    } else {
      router.push('/food/dashboard')
      router.refresh()
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: '0 auto', padding: '4rem 1.4rem' }}>
      {/* Header */}
      <div className="food-dash-header" style={{ borderRadius: '14px 14px 0 0', overflow: 'hidden' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🍽️</div>
        <div className="food-dash-title">Espace Pro</div>
        <div className="food-dash-sub">Dashboard prestataire NIKA Food</div>
      </div>

      <form
        onSubmit={handleLogin}
        style={{
          background: 'var(--bg2)', border: '1px solid var(--bd)',
          borderRadius: '0 0 14px 14px', padding: '1.6rem 1.4rem',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}
      >
        <div>
          <label style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', display: 'block', marginBottom: 6, fontWeight: 700 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="afroweek06@nika.food"
            required
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '1px solid var(--bd)', background: 'var(--bg)',
              color: 'var(--td)', fontFamily: 'var(--fo)', fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <label style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', display: 'block', marginBottom: 6, fontWeight: 700 }}>
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '1px solid var(--bd)', background: 'var(--bg)',
              color: 'var(--td)', fontFamily: 'var(--fo)', fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <div style={{
            fontFamily: 'var(--fo)', fontSize: 13, color: '#f87171',
            background: 'rgba(212,75,36,0.08)', border: '1px solid rgba(212,75,36,0.2)',
            borderRadius: 8, padding: '0.7rem 1rem', textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '13px', borderRadius: 10,
            background: 'var(--food-brand)', color: '#fff',
            border: 'none', fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </main>
  )
}
