// app/pro/reviews/import/page.tsx — Import CSV Airbnb (Server Component)
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ImportClient from './ImportClient'

export const metadata: Metadata = {
  title: 'Importer des avis Airbnb — Espace Pro NIKA',
  description: 'Importez vos avis Airbnb au format CSV : analyse IA automatique, détection de problèmes et Score NIKA.',
}

export default async function ImportReviewsPage() {
  const supabase = await createClient()
  if (!supabase) redirect('/connexion')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: pro } = await supabase
    .from('pros')
    .select('id, business_name')
    .eq('user_id', user.id)
    .eq('active', true)
    .single()
  if (!pro) redirect('/pro/inscription')

  const { data: listings } = await supabase
    .from('stay_listings')
    .select('id, name, type')
    .eq('pro_id', pro.id)
    .order('name')

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 720, margin: '0 auto' }}>
      <Link href="/pro/reviews" style={{
        fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 600,
        color: 'var(--td3)', textDecoration: 'none',
        display: 'inline-block', marginBottom: '1.5rem',
      }}>
        ← Avis & Problèmes
      </Link>

      <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#E07038', marginBottom: '0.4rem' }}>
        🏡 STAY · Espace Pro
      </p>
      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,5vw,48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '0.5rem' }}>
        Importer des avis
      </h1>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '2rem', lineHeight: 1.6 }}>
        Export CSV officiel Airbnb (Historique des commentaires) · Chaque avis est analysé par l&apos;IA NIKA : sentiment, problèmes détectés, Score NIKA.
      </p>

      <ImportClient listings={listings ?? []} />
    </main>
  )
}
