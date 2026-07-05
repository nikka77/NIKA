'use client';
// components/akasha/CollectionStrip.tsx — « Ma collection » sur le registre : lit le localStorage
// alimenté par CardActions et affiche les cartes collectionnées (live via l'event 'akasha:collection').
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CollectItem } from './CardActions';

const KEY = 'nika:akasha:collection';
const ACCENT = '#7B5CF0';

const read = (): CollectItem[] => {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(r) ? r.filter((x) => x && typeof x.slug === 'string') : [];
  } catch {
    return [];
  }
};

export default function CollectionStrip() {
  const [items, setItems] = useState<CollectItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sync = () => setItems(read());
    sync();
    window.addEventListener('akasha:collection', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('akasha:collection', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  if (!mounted || items.length === 0) return null;

  return (
    <div style={{ marginBottom: '1.4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT }}>★ Ma collection</span>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, color: ACCENT, background: `${ACCENT}18`, borderRadius: 20, padding: '1px 8px' }}>{items.length}</span>
      </div>
      <div className="hero-domabar" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {items.map((it) => (
          <Link key={it.slug} href={`/learn/akasha/${it.slug}`} style={{ flexShrink: 0, width: 92, textDecoration: 'none' }}>
            <div style={{ width: 92, height: 92, borderRadius: 12, overflow: 'hidden', position: 'relative', background: `linear-gradient(135deg, ${ACCENT}30, ${ACCENT}0A)`, border: `1px solid ${ACCENT}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {it.img ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img aria-hidden src={it.img} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', filter: 'blur(12px) saturate(1.25) brightness(0.5)', transform: 'scale(1.2)' }} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.img} alt={it.name} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} />
                </>
              ) : (
                <span aria-hidden style={{ fontSize: 30, opacity: 0.6 }}>✦</span>
              )}
            </div>
            <div style={{ marginTop: 5, fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 600, color: 'var(--td2)', lineHeight: 1.2, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
