'use client'
// components/food/rakomoria/DailySpecialBanner.tsx

const DAILY_SPECIALS: Record<string, { name: string; emoji: string }> = {
  tuesday:   { name: 'Couscousma', emoji: '🥘' },
  wednesday: { name: 'Riz sauce rouge viande de bœuf', emoji: '🍚' },
  thursday:  { name: 'Foutra Burger', emoji: '🍔' },
  friday:    { name: 'Riz viande de bœuf rougaï', emoji: '🍛' },
  saturday:  { name: 'Gratin de pâtes', emoji: '🍝' },
  sunday:    { name: 'Riz aux légumes viande de bœuf', emoji: '🥩' },
}

export default function DailySpecialBanner() {
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
  const special = DAILY_SPECIALS[day]
  if (!special) return null

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1A4D1A, #0D2E0D)',
      border: '1px solid #2d7a2d',
      borderRadius: 12, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      margin: '0.8rem 0',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: '#F5C51820',
        border: '1px solid #F5C51840',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, flexShrink: 0,
        position: 'relative',
      }}>
        {special.emoji}
        <span style={{
          position: 'absolute', top: -6, right: -6,
          background: '#F5C518', color: '#0D0D0D',
          fontSize: 8, fontWeight: 900, padding: '2px 4px',
          borderRadius: 99, fontFamily: 'var(--fo)',
        }}>
          ★
        </span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700,
          color: '#F5C518', letterSpacing: '0.1em', marginBottom: 3,
          textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: '#F5C518', animation: 'pulse 2s infinite',
          }} />
          Plat du soir
        </div>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: '#fff' }}>
          {special.name}
        </div>
      </div>
      <div style={{
        fontFamily: 'var(--fn)', fontSize: 22, color: '#F5C518',
        fontWeight: 900, lineHeight: 1,
      }}>
        10€
      </div>
    </div>
  )
}
