'use client'
// components/food/rakomoria/ZoneSelector.tsx

export type DeliveryZone = { name: string; min: number }

type Props = {
  zones: DeliveryZone[]
  selected: string
  onSelect: (zone: string) => void
  cartTotal: number
}

export default function ZoneSelector({ zones, selected, onSelect, cartTotal }: Props) {
  const currentZone = zones.find(z => z.name === selected)
  const minOrder = currentZone?.min ?? 0
  const diff = minOrder - cartTotal
  const reached = cartTotal >= minOrder

  return (
    <div style={{
      background: '#0D1A0D', border: '1px solid #1A4D1A',
      borderRadius: 12, padding: '1rem 1.1rem',
      marginBottom: '0.8rem',
    }}>
      <div style={{
        fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
        color: '#F5C518', letterSpacing: '0.07em', textTransform: 'uppercase',
        marginBottom: 10,
      }}>
        📍 Votre zone de livraison
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {zones.map(zone => {
          const isSelected = zone.name === selected
          return (
            <label key={zone.name} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 9,
              background: isSelected ? 'rgba(245,197,24,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isSelected ? '#F5C51850' : '#1a3a1a'}`,
              cursor: 'pointer',
            }}>
              <input
                type="radio"
                name="delivery-zone"
                value={zone.name}
                checked={isSelected}
                onChange={() => onSelect(zone.name)}
                style={{ accentColor: '#F5C518' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: isSelected ? '#F5C518' : '#aaa' }}>
                  {zone.name}
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700,
                color: isSelected ? '#F5C518' : '#555',
              }}>
                min. {zone.min}€
              </div>
            </label>
          )
        })}
      </div>

      {/* Barre de progression vers le minimum */}
      {selected && minOrder > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{
            height: 4, borderRadius: 99,
            background: '#1a3a1a', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, (cartTotal / minOrder) * 100)}%`,
              background: reached ? '#16a34a' : '#F5C518',
              borderRadius: 99,
              transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{
            fontFamily: 'var(--fo)', fontSize: 11,
            color: reached ? '#34d399' : '#F5C518',
            marginTop: 5,
          }}>
            {reached
              ? '✓ Minimum atteint — vous pouvez commander !'
              : `Encore ${diff.toFixed(2)} € pour commander dans cette zone`}
          </div>
        </div>
      )}
    </div>
  )
}
