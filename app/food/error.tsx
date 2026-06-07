'use client'
// app/food/error.tsx
import { useEffect } from 'react'

export default function FoodError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <main style={{ maxWidth: 540, margin: '0 auto', padding: '4rem 1.4rem', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: '1rem' }}>🍽️</div>
      <h2 style={{ fontFamily: 'var(--fn)', fontSize: 28, color: 'var(--food-brand)', marginBottom: '0.8rem', letterSpacing: '0.04em' }}>
        ERREUR FOOD
      </h2>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td3)', marginBottom: '1.6rem', lineHeight: 1.6 }}>
        Un problème est survenu. Réessayez ou contactez @afroweek06 sur Instagram.
      </p>
      <button
        onClick={reset}
        style={{
          fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700,
          padding: '12px 28px', borderRadius: 12,
          background: 'var(--food-brand)', color: '#fff',
          border: 'none', cursor: 'pointer',
        }}
      >
        Réessayer
      </button>
    </main>
  )
}
