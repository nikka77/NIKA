// components/azur/ProviderCard.tsx
// Carte prestataire pour le listing /azur — Server Component
import Link from 'next/link'

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
  nautique:    '⛵',
  villa:       '🏡',
  restaurant:  '🍽️',
  experience:  '🌊',
}

export default function ProviderCard({ provider }: ProviderCardProps) {
  const initials = provider.name
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()

  const minPrice = (() => {
    if (!Array.isArray(provider.packs) || !provider.packs.length) return null
    const prices = provider.packs.map(p => Number(p.price)).filter(n => Number.isFinite(n))
    return prices.length ? Math.min(...prices) : null
  })()

  const icon   = CATEGORY_ICON[provider.category || ''] || '🌊'
  const accent = provider.accent_color || 'var(--az)'

  return (
    <Link
      href={`/azur/prestataires/${provider.slug}`}
      className="riv-card"
      style={{ display: 'block', textDecoration: 'none' }}
    >
      {/* Bandeau catégorie */}
      <div style={{
        height: 80,
        background: provider.label_halal
          ? 'linear-gradient(135deg, #0a1628 0%, #1a3a5c 70%, #0a2040 100%)'
          : 'linear-gradient(135deg, #030C1A 0%, #061828 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 38, position: 'relative', overflow: 'hidden',
      }}>
        {provider.label_halal && (
          <span style={{ position: 'absolute', right: 4, top: -4, fontSize: 60, opacity: 0.25, color: '#c9a84c' }}>☪</span>
        )}
        <span style={{ opacity: 0.15, fontSize: 80, position: 'absolute', right: -10, top: -10 }}>{icon}</span>
        <span style={{ position: 'relative', zIndex: 1 }}>{icon}</span>
      </div>

      <div style={{ padding: '1.2rem' }}>
        {/* Avatar + nom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem' }}>
          <div className="riv-avatar" style={{ width: 44, height: 44, fontSize: 16, background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--fe)', fontSize: 16, fontStyle: 'italic',
              fontWeight: 700, color: 'var(--td)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {provider.name}
            </div>
            {provider.location && (
              <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>
                📍 {provider.location}
              </div>
            )}
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '0.8rem' }}>
          {provider.verified && <span className="riv-verified">✓ Vérifié</span>}
          {provider.label_halal && (
            <span style={{
              fontFamily: 'var(--fo)', fontSize: 10,
              padding: '3px 8px', borderRadius: 12,
              background: 'rgba(0,160,0,0.1)',
              border: '1px solid rgba(0,200,0,0.3)',
              color: '#4cde4c', letterSpacing: '0.06em',
            }}>
              ☪ Halal
            </span>
          )}
          {provider.category && (
            <span style={{
              fontFamily: 'var(--fo)', fontSize: 10,
              padding: '3px 8px', borderRadius: 12,
              background: 'rgba(0,148,212,0.08)',
              border: '1px solid rgba(0,148,212,0.15)',
              color: 'var(--az2)', textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {provider.category}
            </span>
          )}
        </div>

        {/* Tagline */}
        {provider.tagline && (
          <p style={{
            fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)',
            lineHeight: 1.5, marginBottom: '0.8rem',
          }}>
            {provider.tagline}
          </p>
        )}

        {/* Footer : rating + prix */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {provider.rating && (
            <span style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--gold2)', fontWeight: 600 }}>
              ⭐ {provider.rating}
              {provider.review_count != null && (
                <span style={{ color: 'var(--td3)', fontWeight: 400 }}> ({provider.review_count})</span>
              )}
            </span>
          )}
          {minPrice != null && (
            <span style={{ fontFamily: 'var(--fn)', fontSize: 18, color: accent }}>
              dès {minPrice}€
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
