'use client';
// components/akasha/hub/ShareButton.tsx — partage natif (Web Share API) + repli presse-papiers.
import { useState } from 'react';

export default function ShareButton({ title, text, color }: { title: string; text: string; color: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) { await navigator.share({ title, text, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* annulé */ }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="ak-cta"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.04em', textTransform: 'uppercase', padding: '10px 20px', borderRadius: 10, border: `1px solid ${color}66`, background: 'transparent', color: 'var(--td)', cursor: 'pointer' }}
    >
      {copied ? '✓ Lien copié' : '↗ Partager cet univers'}
    </button>
  );
}
