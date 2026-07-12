'use client';
// components/akasha/ClaimDaily.tsx — bouton « Réclamer » de la carte du jour : l'ajoute à la
// collection localStorage (MÊME contrat que CardActions : clé nika:akasha:collection + event
// 'akasha:collection'). Rendu DANS le Link DailyCard → stopPropagation/preventDefault.
import { useEffect, useState } from 'react';
import { hasInCollection, addManyToCollection } from '@/lib/akasha/collection-storage';

export default function ClaimDaily({ slug, name, img, color }: { slug: string; name: string; img?: string | null; color: string }) {
  const [state, setState] = useState<'idle' | 'owned' | 'claimed'>('idle');

  useEffect(() => {
    setState(hasInCollection(slug) ? 'owned' : 'idle');
  }, [slug]);

  const claim = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (state !== 'idle') return;
    addManyToCollection([{ slug, name, img }]);
    setState('claimed');
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
