// app/not-found.tsx — Page 404 globale NIKA
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '404 — Page introuvable · NIKA',
}

export default function NotFound() {
  return (
    <main style={{
      minHeight: '70vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '3rem 1.4rem', textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--fe)',
        fontSize: 'clamp(80px,15vw,160px)',
        fontWeight: 900, fontStyle: 'italic',
        color: 'var(--az)', lineHeight: 1,
        marginBottom: '0.5rem', opacity: 0.15,
        userSelect: 'none',
      }}>
        404
      </div>
      <div style={{ fontFamily: 'var(--fn)', fontSize: 'clamp(24px,4vw,40px)', color: 'var(--td)', letterSpacing: '0.04em', marginBottom: '0.6rem' }}>
        PAGE INTROUVABLE
      </div>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td3)', maxWidth: 380, lineHeight: 1.7, marginBottom: '2rem' }}>
        Cette page n&apos;existe pas ou a été déplacée. Retourne sur NIKA pour explorer la Côte d&apos;Azur.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/"
          style={{
            fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700,
            padding: '12px 28px', borderRadius: 10,
            background: 'var(--az)', color: '#fff',
            textDecoration: 'none',
          }}
        >
          ← Accueil NIKA
        </Link>
        <Link
          href="/food"
          style={{
            fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700,
            padding: '12px 28px', borderRadius: 10,
            background: 'transparent', color: 'var(--td)',
            border: '1px solid var(--bd)', textDecoration: 'none',
          }}
        >
          🍽️ FOOD
        </Link>
        <Link
          href="/stay"
          style={{
            fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700,
            padding: '12px 28px', borderRadius: 10,
            background: 'transparent', color: 'var(--td)',
            border: '1px solid var(--bd)', textDecoration: 'none',
          }}
        >
          🏡 STAY
        </Link>
      </div>
    </main>
  )
}
