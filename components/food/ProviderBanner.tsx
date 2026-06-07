// components/food/ProviderBanner.tsx

type Props = {
  name: string
  description?: string
  instagram?: string
  city?: string
  opens_at?: string
  closes_at?: string
  status: 'open' | 'closed' | 'sold_out'
}

const STATUS_LABELS = {
  open:     '🟢 Ouvert',
  closed:   '⚫ Fermé',
  sold_out: '🔴 Épuisé ce soir',
}

export default function ProviderBanner({ name, description, instagram, city, opens_at, closes_at, status }: Props) {
  return (
    <div className="food-banner">
      <div className="food-banner-inner">
        <div style={{ flex: 1 }}>
          <p className="food-banner-name">{name}</p>
          {description && <p className="food-banner-desc">{description}</p>}
          <div className="food-banner-meta">
            {city && <span>📍 {city}</span>}
            {opens_at && closes_at && (
              <span>🕐 {opens_at.slice(0, 5)} – {closes_at.slice(0, 5)}</span>
            )}
            {instagram && <span>📸 {instagram}</span>}
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          <span className={`food-status-pill ${status}`}>{STATUS_LABELS[status]}</span>
        </div>
      </div>
    </div>
  )
}
