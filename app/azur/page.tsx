// app/azur/page.tsx — Server Component
// Listing des prestataires NIKA Azur + hero Côte d'Azur
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import ProviderCard from '@/components/azur/ProviderCard'
import DomainHero from '@/components/DomainHero'

export const metadata: Metadata = {
  title: 'NIKA Azur — Expériences Côte d\'Azur',
  description: 'Sorties en mer, villas d\'exception, restaurants secrets — prestataires vérifiés par NIKA sur la Côte d\'Azur.',
}

// Fallback statique si la table Supabase n'est pas encore créée
const STATIC_PROVIDERS = [
  {
    slug:         'rentboat-06',
    name:         'Rentboat 06',
    category:     'nautique',
    tagline:      'Vivez la mer autrement',
    location:     'Cannes Marina',
    rating:       4.9,
    review_count: 127,
    verified:     true,
    label_halal:  false,
    packs:        [{ price: 590 }, { price: 790 }, { price: 990 }],
  },
  {
    slug:         'nayah-boat',
    name:         'Nayah Boat',
    category:     'nautique',
    tagline:      'Sorties en mer à la carte — 6 bateaux pour tous les budgets',
    location:     'Nice — Antibes',
    rating:       4.8,
    review_count: 84,
    verified:     true,
    label_halal:  true,
    packs:        [{ price: 200 }],
  },
]

export default async function AzurPage() {
  const supabase = createAdminClient()
  let providers: typeof STATIC_PROVIDERS = STATIC_PROVIDERS

  if (supabase) {
    const { data } = await supabase
      .from('azur_providers')
      .select('slug,name,category,tagline,location,rating,review_count,verified,label_halal,packs,accent_color')
      .order('verified',  { ascending: false })
      .order('rating',    { ascending: false })

    if (data?.length) providers = data as typeof STATIC_PROVIDERS
  }

  return (
    <main>
      {/* ── HERO ──────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(180deg, #030C1A 0%, #060F22 60%, var(--bg) 100%)',
        borderBottom: '1px solid var(--bd)',
        padding: 'clamp(3rem,7vw,5.5rem) 1.4rem',
        position: 'relative', overflow: 'hidden',
      }}>
        <DomainHero slug="azur" />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div style={{
            fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--az2)', marginBottom: '1rem',
          }}>
            ⚓ NIKA AZUR
          </div>

          <h1 style={{
            fontFamily: 'var(--fe)',
            fontSize: 'clamp(44px,8vw,96px)',
            fontWeight: 900, fontStyle: 'italic',
            textTransform: 'uppercase', color: 'var(--td)',
            lineHeight: 0.88, marginBottom: '1.2rem',
          }}>
            Expériences<br />
            <span style={{ color: 'var(--az2)' }}>Côte d'Azur</span>
          </h1>

          <p style={{
            fontFamily: 'var(--fo)',
            fontSize: 'clamp(14px,1.5vw,16px)',
            color: 'var(--td2)', maxWidth: 480, lineHeight: 1.7,
          }}>
            Sorties en mer, villas d'exception, restaurants secrets —
            chaque prestataire est rencontré et validé par l'équipe NIKA.
          </p>
        </div>
      </div>

      {/* ── STATS BAR ─────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--bd)', padding: '0.9rem 1.4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: '2.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { v: providers.length, l: 'Prestataires' },
            { v: '100%',           l: 'Vérifiés NIKA' },
            { v: 'Côte d\'Azur',   l: 'Exclusif' },
          ].map(stat => (
            <div key={stat.l}>
              <div style={{ fontFamily: 'var(--fn)', fontSize: 20, color: 'var(--az2)', lineHeight: 1 }}>
                {stat.v}
              </div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 9, color: 'var(--td3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>
                {stat.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PRESTATAIRES ─────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(2rem,4vw,3rem) 1.4rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontFamily: 'var(--fe)',
            fontSize: 'clamp(28px,4vw,52px)',
            fontWeight: 900, fontStyle: 'italic',
            textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.92,
          }}>
            Prestataires partenaires
          </h2>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginTop: '0.5rem' }}>
            Sélection manuelle · Chaque prestataire est rencontré et vérifié par l'équipe NIKA
          </p>
        </div>

        <div className="g-providers">
          {providers.map(p => (
            <ProviderCard key={p.slug} provider={p} />
          ))}
        </div>
      </div>
    </main>
  )
}
