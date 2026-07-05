'use client';
// components/akasha/ClaimDaily.tsx — bouton « Réclamer » de la carte du jour : l'ajoute à la
// collection localStorage (MÊME contrat que CardActions : clé nika:akasha:collection + event
// 'akasha:collection'). Rendu DANS le Link DailyCard → stopPropagation/preventDefault.
import { useEffect, useState } from 'react';

const KEY = 'nika:akasha:collection';
type Item = { slug: string; name: string; img?: string };
const read = (): Item[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((x) => x && typeof x.slug === 'string') : [];
  } catch { return []; }
};

export default function ClaimDaily({ slug, name, img, color }: { slug: string; name: string; img?: string | null; color: string }) {
  const [state, setState] = useState<'idle' | 'owned' | 'claimed'>('idle');

  useEffect(() => {
    setState(read().some((x) => x.slug === slug) ? 'owned' : 'idle');
  }, [slug]);

  const claim = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (state !== 'idle') return;
    try {
      localStorage.setItem(KEY, JSON.stringify([{ slug, name, img: img ?? undefined }, ...read()]));
      window.dispatchEvent(new Event('akasha:collection'));
      setState('claimed');
    } catch { /* stockage privé/quota */ }
  };

  return (
    <button
      onClick={claim}
      disabled={state !== 'idle'}
      style={{
        fontFamily: 'var(--fe)', fontSize: 12, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.05em',
        textTransform: 'uppercase', padding: '7px 14px', borderRadius: 9, cursor: state === 'idle' ? 'pointer' : 'default',
        border: `1px solid ${color}66`, marginTop: 8, alignSelf: 'flex-start',
        background: state === 'idle' ? color : 'transparent',
        color: state === 'idle' ? '#fff' : color,
        transition: 'transform 0.15s ease',
      }}
    >
      {state === 'idle' ? '✦ Réclamer la carte' : state === 'claimed' ? '✓ Réclamée !' : '✓ Dans ta collection'}
    </button>
  );
}
