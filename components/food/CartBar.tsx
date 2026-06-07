'use client'
// components/food/CartBar.tsx
import Link from 'next/link'

type Props = {
  itemCount: number
  total: number
  checkoutHref: string
}

export default function CartBar({ itemCount, total, checkoutHref }: Props) {
  if (itemCount === 0) return null
  return (
    <div className="food-cart-bar">
      <div className="food-cart-info">
        <span className="food-cart-count">
          {itemCount} article{itemCount > 1 ? 's' : ''}
        </span>
        <span className="food-cart-total">{total.toFixed(2)} €</span>
      </div>
      <Link href={checkoutHref} className="food-cart-cta">
        Commander →
      </Link>
    </div>
  )
}
