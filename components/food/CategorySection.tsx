// components/food/CategorySection.tsx
import { type ReactNode } from 'react'

type Props = {
  title: string
  children: ReactNode
}

export default function CategorySection({ title, children }: Props) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 className="food-section-title">{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {children}
      </div>
    </section>
  )
}
