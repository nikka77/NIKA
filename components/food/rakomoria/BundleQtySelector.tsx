'use client'
// components/food/rakomoria/BundleQtySelector.tsx
// Gestion des quantités par lots pour Triangles (×2) et Samboussa (×5 / ×10)

type BundleOption = { qty: number; price: number; label: string }

type Props = {
  itemId: string
  name: string
  emoji?: string
  description?: string
  bundleOptions: BundleOption[]
  cart: Record<string, { qty: number; price: number }>  // key = `${itemId}-${qty}`
  onAdd: (itemId: string, qty: number, price: number) => void
  onRemove: (itemId: string, qty: number) => void
  remainingStock: number
  isOpen: boolean
}

export default function BundleQtySelector({
  itemId, name, emoji, description,
  bundleOptions, cart, onAdd, onRemove, remainingStock, isOpen
}: Props) {
  const outOfStock = remainingStock === 0

  return (
    <div style={{
      background: '#0D1A0D',
      border: '1px solid #F5C51830',
      borderRadius: 14, padding: '12px',
      opacity: outOfStock ? 0.5 : 1,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 10,
          background: '#1A4D1A', border: '1px solid #F5C51840',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, flexShrink: 0,
        }}>
          {emoji || '🥟'}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3 }}>
            {name}
          </div>
          {description && (
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: '#666', lineHeight: 1.4 }}>
              {description}
            </div>
          )}
        </div>
      </div>

      {/* Options lots */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {bundleOptions.map(opt => {
          const key = `${itemId}-${opt.qty}`
          const currentQty = cart[key]?.qty ?? 0
          return (
            <div key={key} style={{
              flex: 1, minWidth: 90,
              background: '#1a3a1a',
              border: `1px solid ${currentQty > 0 ? '#F5C518' : '#2d5a2d'}`,
              borderRadius: 10, padding: '9px 10px',
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
                color: '#F5C518', marginBottom: 4,
              }}>
                {opt.label}
              </div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: '#D85A30', marginBottom: 8 }}>
                {opt.price}€
              </div>
              {outOfStock ? (
                <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: '#555' }}>Épuisé</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <button
                    onClick={() => onRemove(itemId, opt.qty)}
                    disabled={currentQty === 0}
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      border: '1px solid #F5C51860', background: 'transparent',
                      color: '#F5C518', fontSize: 15,
                      cursor: currentQty === 0 ? 'default' : 'pointer',
                      opacity: currentQty === 0 ? 0.3 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >−</button>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: currentQty > 0 ? '#F5C518' : '#555', minWidth: 14, textAlign: 'center' }}>
                    {currentQty}
                  </span>
                  <button
                    onClick={() => isOpen && onAdd(itemId, opt.qty, opt.price)}
                    disabled={!isOpen}
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: '#F5C518', border: '1px solid #F5C518',
                      color: '#0D0D0D', fontSize: 15, fontWeight: 700,
                      cursor: isOpen ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >+</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
