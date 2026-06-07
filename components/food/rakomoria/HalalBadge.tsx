// components/food/rakomoria/HalalBadge.tsx
export default function HalalBadge() {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {[
        { icon: '🥩', label: 'HALAL', color: '#1A4D1A', border: '#2d7a2d' },
        { icon: '🏠', label: '100% FAIT MAISON', color: '#1A2D1A', border: '#2d4a2d' },
        { icon: '🌶️', label: 'ÉPICES DES ÎLES', color: '#2D1A00', border: '#5a3a00' },
      ].map(({ icon, label, color, border }) => (
        <span key={label} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: color, border: `1px solid ${border}`,
          borderRadius: 99, padding: '5px 11px',
          fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700,
          color: '#F5C518', letterSpacing: '0.06em',
        }}>
          {icon} {label}
        </span>
      ))}
    </div>
  )
}
