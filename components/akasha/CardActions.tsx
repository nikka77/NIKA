'use client';
// components/akasha/CardActions.tsx — actions sur une carte AKASHA : collection (localStorage) + partage.
// Pas d'auth : la collection vit en localStorage (même approche que le kit livreur), lisible par
// CollectionStrip sur le registre. On stocke {slug, name, img} pour un rendu autonome de la bande.
import { useEffect, useState } from 'react';

export type CollectItem = { slug: string; name: string; img?: string };
const KEY = 'nika:akasha:collection';

const read = (): CollectItem[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((x) => x && typeof x.slug === 'string') : [];
  } catch {
    return [];
  }
};

export default function CardActions({ slug, name, img, color }: { slug: string; name: string; img?: string; color: string }) {
  const [mounted, setMounted] = useState(false);
  const [collected, setCollected] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setCollected(read().some((x) => x.slug === slug));
  }, [slug]);

  const toggle = () => {
    const cur = read();
    const has = cur.some((x) => x.slug === slug);
    const next = has ? cur.filter((x) => x.slug !== slug) : [{ slug, name, img }, ...cur];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      window.dispatchEvent(new Event('akasha:collection'));
    } catch {
      /* quota / privé */
    }
    setCollected(!has);
    setFlash(has ? 'Retiré de ta collection' : 'Ajouté à ta collection ✦');
    setTimeout(() => setFlash(null), 1800);
  };

  const share = async () => {
    const url = window.location.href;
    const data = { title: `${name} — AKASHA`, text: `Découvre la carte ${name} sur NIKA AKASHA.`, url };
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

  const btn = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    fontFamily: 'var(--fo)',
    fontSize: 13,
    fontWeight: 700,
    padding: '11px 14px',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all .18s',
  } as const;

  const on = mounted && collected;

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={on}
          className="ak-cta"
          style={{
            ...btn,
            flex: 1,
            border: `1px solid ${on ? color : `${color}55`}`,
            background: on ? color : `${color}14`,
            color: on ? '#0B0F14' : color,
          }}
        >
          <span aria-hidden style={{ fontSize: 15 }}>{on ? '✓' : '◈'}</span>
          {on ? 'Dans ma collection' : 'Ajouter à ma collection'}
        </button>
        <button
          type="button"
          onClick={share}
          aria-label="Partager la carte"
          title="Partager"
          className="ak-cta"
          style={{ ...btn, flex: '0 0 auto', width: 52, border: '1px solid var(--bd2)', background: 'var(--bg2)', color: 'var(--td2)', fontSize: 17 }}
        >
          <span aria-hidden>⤴</span>
        </button>
      </div>
      <div style={{ height: 16, marginTop: 5, textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 600, color, opacity: flash ? 1 : 0, transition: 'opacity .2s' }}>
        {flash}
      </div>
    </div>
  );
}
