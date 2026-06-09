export default function WalletLoading() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ width: 100, height: 12, background: 'var(--bg3)', borderRadius: 4, marginBottom: '1rem' }} />
        <div style={{ width: 220, height: 52, background: 'var(--bg3)', borderRadius: 6, marginBottom: '0.8rem' }} />
      </div>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 12, height: 140, marginBottom: '1rem', animation: 'pulse 1s ease-in-out infinite alternate' }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{
          background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10,
          height: 64, marginBottom: '0.6rem',
          animation: `pulse ${1 + i * 0.12}s ease-in-out infinite alternate`,
        }} />
      ))}
      <style>{`@keyframes pulse { from { opacity: 0.4; } to { opacity: 0.7; } }`}</style>
    </div>
  );
}
