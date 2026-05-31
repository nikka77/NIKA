export default function StayLoading() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 1.4rem' }}>
      {/* Hero skeleton */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ width: 120, height: 12, background: 'var(--bg3)', borderRadius: 4, marginBottom: '1rem' }} />
        <div style={{ width: 280, height: 56, background: 'var(--bg3)', borderRadius: 6, marginBottom: '0.8rem' }} />
        <div style={{ width: 420, height: 20, background: 'var(--bg3)', borderRadius: 4, marginBottom: '0.5rem' }} />
        <div style={{ width: 320, height: 20, background: 'var(--bg3)', borderRadius: 4 }} />
      </div>
      {/* Cards grid skeleton */}
      <div className="g-4" style={{ gap: '0.8rem', marginBottom: '2rem' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{
            background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10,
            height: 220, animation: `pulse ${1 + i * 0.1}s ease-in-out infinite alternate`,
          }} />
        ))}
      </div>
      <style>{`@keyframes pulse { from { opacity: 0.4; } to { opacity: 0.7; } }`}</style>
    </div>
  );
}
