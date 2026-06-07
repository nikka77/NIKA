'use client'
// components/food/rakomoria/MangaMenuSection.tsx — section jeudi/vendredi/samedi

export type FoodItem = {
  id: string
  name: string
  description?: string
  price: number
  emoji?: string
  remaining_stock: number
  slug: string
}

type Props = {
  items: FoodItem[]
  cart: Record<string, number>
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  isOpen: boolean
}

export default function MangaMenuSection({ items, cart, onAdd, onRemove, isOpen }: Props) {
  if (items.length === 0) return null

  return (
    <div style={{ marginBottom: '1.4rem' }}>
      {/* Header manga */}
      <div style={{
        background: 'linear-gradient(135deg, #1A0030, #0D0D0D)',
        border: '1px solid #5a00aa40',
        borderRadius: '12px 12px 0 0',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8,
          background: 'linear-gradient(135deg, #5a00aa, #C0392B)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>
          🔥
        </div>
        <div>
          <div style={{
            fontFamily: 'var(--fn)', fontSize: 18,
            background: 'linear-gradient(90deg, #F5C518, #C0392B)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.05em',
          }}>
            MENU RMR DU SOIR
          </div>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: '#888', letterSpacing: '0.08em' }}>
            TACOS · BURGERS · SPÉCIAUX · JEU–SAM SEULEMENT
          </div>
        </div>
      </div>

      {/* Items */}
      <div style={{
        background: '#0A0010',
        border: '1px solid #5a00aa30',
        borderTop: 'none',
        borderRadius: '0 0 12px 12px',
        overflow: 'hidden',
      }}>
        {items.map((item, i) => {
          const qty = cart[item.id] ?? 0
          const outOfStock = item.remaining_stock === 0
          return (
            <div key={item.id} style={{
              display: 'flex', gap: 10, alignItems: 'center',
              padding: '11px 14px',
              borderTop: i === 0 ? 'none' : '1px solid #1a0030',
              opacity: outOfStock ? 0.5 : 1,
            }}>
              {/* Emoji */}
              <div style={{
                width: 48, height: 48, borderRadius: 9,
                background: 'linear-gradient(135deg, #1A0030, #2D0050)',
                border: '1px solid #5a00aa40',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
              }}>
                {item.emoji || '🔥'}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                  {item.name}
                </div>
                {item.description && (
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: '#666', lineHeight: 1.4 }}>
                    {item.description}
                  </div>
                )}
                <div style={{
                  fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700,
                  background: 'linear-gradient(90deg, #F5C518, #ff6600)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  marginTop: 4,
                }}>
                  {item.price}€
                </div>
              </div>

              {/* Qty */}
              {outOfStock ? (
                <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: '#555' }}>Épuisé</span>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => onRemove(item.id)} disabled={qty === 0} style={{
                    width: 26, height: 26, borderRadius: '50%',
                    border: '1px solid #F5C51860', background: 'transparent',
                    color: '#F5C518', fontSize: 16, cursor: qty === 0 ? 'default' : 'pointer',
                    opacity: qty === 0 ? 0.3 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>−</button>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: qty > 0 ? '#F5C518' : '#555', minWidth: 14, textAlign: 'center' }}>
                    {qty}
                  </span>
                  <button
                    onClick={() => isOpen && onAdd(item.id)}
                    disabled={qty >= item.remaining_stock || !isOpen}
                    style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: qty >= item.remaining_stock ? 'transparent' : 'linear-gradient(135deg, #F5C518, #ff6600)',
                      border: '1px solid #F5C51860', color: '#0D0D0D', fontSize: 16,
                      cursor: qty >= item.remaining_stock ? 'default' : 'pointer',
                      opacity: qty >= item.remaining_stock ? 0.3 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700,
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
