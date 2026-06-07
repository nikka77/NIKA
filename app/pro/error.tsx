'use client'
// app/pro/error.tsx
import { useEffect } from 'react'
import Link from 'next/link'

export default function ProError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <main style={{ maxWidth: 540, margin: '0 auto', padding: '5rem 1.4rem', textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: '1.2rem' }}>🏢</div>
      <h2 style={{ fontFamily: 'var(--fn)', fontSize: 28, color: 'var(--td)', marginBottom: '0.8rem', letterSpacing: '0.04em' }}>
        ERREUR ESPACE PRO
      </h2>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td3)', marginBottom: '2rem', lineHeight: 1.6 }}>
        Une erreur est survenue. Vérifiez votre connexion ou réessayez.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={reset}
          style={{
            fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700,
            padding: '11px 24px', borderRadius: 10,
            background: 'var(--az)', color: '#fff',
            border: 'none', cursor: 'pointer',
          }}
        >
          Réessayer
        </button>
        <Link
          href="/pro"
          style={{
            fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700,
            padding: '11px 24px', borderRadius: 10,
            background: 'transparent', color: 'var(--td)',
            border: '1px solid var(--bd)', textDecoration: 'none',
          }}
        >
          ← Espace Pro
        </Link>
      </div>
    </main>
  )
}
