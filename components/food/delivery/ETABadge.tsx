// components/food/delivery/ETABadge.tsx

type Props = { etaSeconds: number | null; compact?: boolean }

export default function ETABadge({ etaSeconds, compact }: Props) {
  if (etaSeconds === null || etaSeconds <= 0) return null
  const minutes = Math.max(1, Math.round(etaSeconds / 60))
  if (compact) {
    return (
      <span style={{
        fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--food-brand)',
      }}>
        {minutes} min
      </span>
    )
  }
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: 'rgba(216,90,48,0.1)', border: '1px solid rgba(216,90,48,0.3)',
      borderRadius: 24, padding: '8px 16px',
    }}>
      <span style={{ fontSize: 18 }}>🛵</span>
      <div>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 15, fontWeight: 700, color: 'var(--food-brand)', lineHeight: 1 }}>
          {minutes} min
        </div>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', marginTop: 2 }}>ETA estimé</div>
      </div>
    </div>
  )
}
