export default function NewsLoading() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 1.4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ width: 110, height: 12, background: 'var(--bg3)', borderRadius: 4, marginBottom: '1rem' }} />
        <div style={{ width: 220, height: 52, background: 'var(--bg3)', borderRadius: 6, marginBottom: '0.8rem' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{
            background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10,
            height: 100, animation: `pulse ${1 + i * 0.1}s ease-in-out infinite alternate`,
          }} />
        ))}
      </div>
      <style>{`@keyframes pulse { from { opacity: 0.4; } to { opacity: 0.7; } }`}</style>
    </div>
  );
}
