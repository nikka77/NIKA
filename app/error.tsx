'use client';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{
      minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '1.2rem', padding: '2rem', textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--fe)', fontSize: 48, fontWeight: 900, fontStyle: 'italic',
        color: 'var(--coral)', letterSpacing: '-0.02em',
      }}>
        ERREUR
      </div>
      <p style={{ fontFamily: 'var(--fo)', color: 'var(--td2)', fontSize: 15, maxWidth: 420 }}>
        Une erreur inattendue s&apos;est produite. Si le problème persiste, contactez le support NIKA.
      </p>
      {error.digest && (
        <code style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--td3)', background: 'var(--bg3)', padding: '4px 10px', borderRadius: 4 }}>
          #{error.digest}
        </code>
      )}
      <button
        onClick={reset}
        style={{
          fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 900, fontStyle: 'italic',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          background: 'var(--az)', color: '#fff',
          border: 'none', borderRadius: 4, padding: '12px 24px',
          cursor: 'pointer',
        }}
      >
        Réessayer
      </button>
    </div>
  );
}
