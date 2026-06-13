'use client'
// components/food/DishCard.tsx
import Spin360 from '@/components/Spin360'
import { visual } from '@/lib/visuals'

export type FoodItem = {
  id: string
  slug?: string
  name: string
  description?: string
  price: number
  category: 'main' | 'side' | 'drink'
  emoji?: string
  remaining_stock: number
  featured?: boolean
}

type Props = {
  item: FoodItem
  qty: number
  onAdd: () => void
  onRemove: () => void
}

const CATEGORY_BG: Record<string, string> = {
  main:  '#1a1008',
  side:  '#1c1c1c',
  drink: '#0d1a14',
}

const CATEGORY_BORDER: Record<string, string> = {
  main:  '#D85A3040',
  side:  '#2a2a2a',
  drink: '#1D9E7540',
}

export default function DishCard({ item, qty, onAdd, onRemove }: Props) {
  const outOfStock = item.remaining_stock === 0
  const stockLow = !outOfStock && item.remaining_stock <= 3
  const isFeatured = item.featured || item.category === 'main'

  return (
    <div style={{
      background: CATEGORY_BG[item.category] ?? '#1c1c1c',
      borderRadius: 14,
      padding: '12px',
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      border: `1px solid ${outOfStock ? '#2a2a2a' : CATEGORY_BORDER[item.category] ?? '#2a2a2a'}`,
      opacity: outOfStock ? 0.55 : 1,
    }}>
      {/* Visual block */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Spin360 emoji={item.emoji || '🍽️'} alt={item.name} accent="#D85A30" size={60} {...visual('food/afroweek06', item.slug ?? '')} />
        {isFeatured && !outOfStock && (
          <span style={{
            position: 'absolute', top: -4, right: -4, zIndex: 2,
            background: '#D85A30', color: '#fff',
            fontSize: 9, fontWeight: 700,
            padding: '2px 5px', borderRadius: 99,
            fontFamily: 'var(--fo)',
          }}>
            ⭐
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700,
          color: outOfStock ? '#555' : '#fff',
          marginBottom: 2,
        }}>
          {item.name}
        </div>
        {item.description && (
          <div style={{
            fontFamily: 'var(--fo)', fontSize: 11, color: '#666',
            lineHeight: 1.45, marginBottom: 6,
          }}>
            {item.description}
          </div>
        )}
        {stockLow && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: 'var(--fo)', fontSize: 10, color: '#EF9F27',
            marginBottom: 4,
          }}>
            ⚠ {item.remaining_stock} restant{item.remaining_stock > 1 ? 's' : ''} ce soir
          </div>
        )}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontFamily: 'var(--fo)', fontSize: 15, fontWeight: 700,
            color: outOfStock ? '#555' : '#D85A30',
          }}>
            {item.price}€
          </span>

          {outOfStock ? (
            <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: '#555' }}>Épuisé</span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={onRemove}
                disabled={qty === 0}
                aria-label="Retirer"
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  border: '1px solid #D85A30',
                  background: 'transparent', color: '#D85A30',
                  fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: qty === 0 ? 'default' : 'pointer',
                  opacity: qty === 0 ? 0.35 : 1,
                  fontWeight: 500,
                }}
              >
                −
              </button>
              <span style={{
                fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700,
                color: qty > 0 ? '#fff' : '#555',
                minWidth: 14, textAlign: 'center',
              }}>
                {qty}
              </span>
              <button
                onClick={onAdd}
                disabled={qty >= item.remaining_stock}
                aria-label="Ajouter"
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: qty >= item.remaining_stock ? 'transparent' : '#D85A30',
                  border: `1px solid ${qty >= item.remaining_stock ? '#555' : '#D85A30'}`,
                  color: '#fff', fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: qty >= item.remaining_stock ? 'default' : 'pointer',
                  opacity: qty >= item.remaining_stock ? 0.35 : 1,
                  fontWeight: 500,
                }}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
