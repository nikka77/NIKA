// components/azur/ProviderCard.tsx — Carte prestataire /azur (Server Component).
// Pros « mis en scène » (AZUR_THEMES par slug) : fond + logo + exclusivités en vignettes
// images (et « Choix du bateau » = aperçu nommé de tous les bateaux). Sinon carte classique.
import Link from 'next/link'
import type { CSSProperties } from 'react'

interface ProviderCardProps {
  provider: {
    slug: string
    name: string
    category?: string
    tagline?: string
    location?: string
    rating?: number
    review_count?: number
    verified?: boolean
    label_halal?: boolean
    accent_color?: string
    packs?: Array<{ price: number }>
  }
}

const CATEGORY_ICON: Record<string, string> = {
  nautique: '⛵', villa: '🏡', restaurant: '🍽️', experience: '🌊',
}

// Exclusivité : vignette image unique, ou galerie nommée (ex. choix du bateau).
type Exclu = { label: string; icon?: string; img?: string; gallery?: { name: string; img: string }[] }
type AzurTheme = { accent: string; accent2: string; bg?: string; logo?: string; fromPrice?: number; exclu: Exclu[] }

const NAYAH_BOATS = [
  { name: 'Pacific Craft 5.70', img: '/images/azur/boats/pacific_craft.webp' },
  { name: 'Flyer 6.5', img: '/images/azur/boats/flyer_6.webp' },
  { name: 'Tempest 700', img: '/images/azur/boats/tempest_700.webp' },
  { name: 'Quicksilver 675', img: '/images/azur/boats/qs_675.webp' },
  { name: 'Cap Camarat 715', img: '/images/azur/boats/cc_715.webp' },
  { name: 'Leader 805', img: '/images/azur/boats/leader_805.webp' },
]

// Identités « mises en scène » par prestataire (slug).
const AZUR_THEMES: Record<string, AzurTheme> = {
  'nayah-boat': {
    accent: '#13A8B8', accent2: '#F2B705', fromPrice: 200,
    bg: '/images/azur/cards/nayah-bg.jpg',
    logo: '/images/azur/cards/nayah-logo.png',
    exclu: [
      { label: 'Choix du bateau', icon: '🚤', gallery: NAYAH_BOATS },
      { label: 'Bento cake', icon: '🎂', img: '/images/azur/repas/bento_cake.webp' },
    ],
  },
  'rentboat-06': {
    accent: '#0E86D4', accent2: '#7FD4FF',
    bg: '/images/azur/cards/rentboat-bg.jpg',
    logo: '/images/azur/cards/rentboat-logo.png',
    exclu: [
      { label: "Feu d'artifice", icon: '🎆', img: '/images/azur/packs/feu_artifices.webp' },
      { label: 'Plateforme flottante', icon: '🛟', img: '/images/azur/options/plateforme.webp' },
      { label: 'Piscine anti-méduse', icon: '🪼', img: '/images/azur/options/piscine.webp' },
    ],
  },
}

const SHADOW = '0 1px 4px rgba(0,0,0,0.75)'

function minPriceOf(packs?: Array<{ price: number }>): number | null {
  if (!Array.isArray(packs) || !packs.length) return null
  const prices = packs.map(p => Number(p.price)).filter(n => Number.isFinite(n))
  return prices.length ? Math.min(...prices) : null
}

export default function ProviderCard({ provider }: ProviderCardProps) {
  const theme = AZUR_THEMES[provider.slug]
  const minPrice = minPriceOf(provider.packs)
  const accent = provider.accent_color || theme?.accent || 'var(--az)'

  // ===== Carte classique (prestataires sans thème) =====
  if (!theme) {
    const initials = provider.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    const icon = CATEGORY_ICON[provider.category || ''] || '🌊'
    return (
      <Link href={`/azur/prestataires/${provider.slug}`} className="riv-card" style={{ display: 'block', textDecoration: 'none' }}>
        <div style={{ height: 80, background: 'linear-gradient(135deg, #030C1A 0%, #061828 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, position: 'relative', overflow: 'hidden' }}>
          <span style={{ opacity: 0.15, fontSize: 80, position: 'absolute', right: -10, top: -10 }}>{icon}</span>
          <span style={{ position: 'relative', zIndex: 1 }}>{icon}</span>
        </div>
        <div style={{ padding: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem' }}>
            <div className="riv-avatar" style={{ width: 44, height: 44, fontSize: 16, background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--fe)', fontSize: 16, fontStyle: 'italic', fontWeight: 700, color: 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{provider.name}</div>
              {provider.location && <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>📍 {provider.location}</div>}
            </div>
          </div>
          {provider.tagline && <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.5, marginBottom: '0.8rem' }}>{provider.tagline}</p>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {provider.rating && <span style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--gold2)', fontWeight: 600 }}>⭐ {provider.rating}{provider.review_count != null && <span style={{ color: 'var(--td3)', fontWeight: 400 }}> ({provider.review_count})</span>}</span>}
            {minPrice != null && <span style={{ fontFamily: 'var(--fn)', fontSize: 18, color: accent }}>dès {minPrice}€</span>}
          </div>
        </div>
      </Link>
    )
  }

  // ===== Carte « mise en scène » (fond + logo + exclusivités vignettes) =====
  const accent2 = theme.accent2
  const price = minPrice ?? theme.fromPrice ?? null
  const galleries = theme.exclu.filter(e => e.gallery?.length)
  const singles = theme.exclu.filter(e => e.img)

  return (
    <Link href={`/azur/prestataires/${provider.slug}`} className="riv-card"
      style={{ position: 'relative', display: 'block', overflow: 'hidden', textDecoration: 'none', borderRadius: 16, border: `1px solid ${accent}66`, ['--dc']: accent } as CSSProperties}>
      {/* Fond généré + voile (allégé pour laisser respirer le motif) */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, background: theme.bg ? `url(${theme.bg}) center/cover no-repeat` : `linear-gradient(135deg, ${accent}, ${accent2})` }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(180deg, rgba(3,8,16,0.74) 0%, rgba(3,8,16,0.5) 45%, rgba(3,8,16,0.88) 100%)' }} />

      <div style={{ position: 'relative', zIndex: 2, padding: '1.2rem 1.3rem' }}>
        {/* En-tête : logo + nom + lieu + note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 15, flexShrink: 0, background: 'rgba(0,0,0,0.4)', border: `1px solid ${accent}66`, boxShadow: `0 0 16px ${accent}66` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {theme.logo ? <img src={theme.logo} alt={provider.name} width={46} height={46} style={{ width: 46, height: 46, objectFit: 'contain' }} /> : <span style={{ fontSize: 24 }}>⛵</span>}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--fe)', fontSize: 19, fontStyle: 'italic', fontWeight: 800, color: '#fff', lineHeight: 1.05, textShadow: SHADOW, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{provider.name}</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
              {provider.location && <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'rgba(255,255,255,0.78)', textShadow: SHADOW }}>📍 {provider.location}</span>}
              {provider.rating && <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--gold2)', fontWeight: 600, textShadow: SHADOW }}>⭐ {provider.rating}{provider.review_count != null && <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 400 }}> ({provider.review_count})</span>}</span>}
              {provider.verified && <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: '#5fe3a8', textShadow: SHADOW }}>✓ Vérifié</span>}
            </div>
          </div>
        </div>

        {/* Exclusivités */}
        <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: accent2, marginBottom: 8, textShadow: SHADOW }}>✦ Exclusivités NIKA</div>

        {/* Galerie (choix du bateau : aperçu nommé de tous les bateaux) */}
        {galleries.map(g => (
          <div key={g.label} style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 600, color: '#fff', marginBottom: 7, textShadow: SHADOW }}>{g.icon} {g.label} · {g.gallery!.length} bateaux</div>
            <div className="hero-domabar" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {g.gallery!.map(b => (
                <div key={b.img} style={{ width: 70, flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.img} alt={b.name} loading="lazy" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 9, border: `1px solid ${accent2}55`, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }} />
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 8.5, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 3, width: 70, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: SHADOW }}>{b.name}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Vignettes simples (bento, feu, plateforme, piscine…) — taille uniforme */}
        {singles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
            {singles.map(s => (
              <div key={s.label} style={{ width: 'calc(33.33% - 5.4px)' }}>
                <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: 11, overflow: 'hidden', border: `1px solid ${accent2}55`, boxShadow: '0 3px 10px rgba(0,0,0,0.4)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.img} alt={s.label} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginTop: 4, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: SHADOW }}>{s.icon} {s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Pied : tagline + prix (badge) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 13 }}>
          {provider.tagline && <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, fontStyle: 'italic', color: 'rgba(255,255,255,0.72)', lineHeight: 1.4, flex: 1, minWidth: 0, textShadow: SHADOW }}>{provider.tagline}</span>}
          {price != null && <span style={{ fontFamily: 'var(--fn)', fontSize: 16, color: '#0a0800', flexShrink: 0, background: accent2, padding: '5px 13px', borderRadius: 20, boxShadow: `0 0 14px ${accent2}66` }}>dès {price}€</span>}
        </div>
      </div>
    </Link>
  )
}
