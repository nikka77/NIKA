'use client';
// components/akasha/CardActions.tsx — actions sur une fiche AKASHA : partage natif (Web Share API)
// + repli presse-papiers. (La collection localStorage a été retirée avec la gamification — préparation
// de la refonte « zones » ; ce composant sera absorbé par le panneau canal au lot 1.)
import { useState } from 'react';

export default function CardActions({ name, color }: { slug?: string; name: string; img?: string; color: string }) {
  const [flash, setFlash] = useState<string | null>(null);

  const share = async () => {
    const url = window.location.href;
    const data = { title: `${name} — AKASHA`, text: `Découvre ${name} sur NIKA AKASHA.`, url };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      setFlash('Lien copié !');
      setTimeout(() => setFlash(null), 1800);
    } catch {
      /* annulé */
    }
  };

  return (
    <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
      <button
        type="button"
        onClick={share}
        aria-label="Partager la fiche"
        className="ak-cta"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, padding: '11px 16px', borderRadius: 12, cursor: 'pointer', border: '1px solid var(--bd2)', background: 'var(--bg2)', color: 'var(--td2)', transition: 'all .18s' }}
      >
        <span aria-hidden style={{ fontSize: 15, color }}>⤴</span>
        Partager
      </button>
      <span aria-live="polite" style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)' }}>{flash ?? ''}</span>
    </div>
  );
}
