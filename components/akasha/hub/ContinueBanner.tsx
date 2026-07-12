'use client';
// components/akasha/hub/ContinueBanner.tsx — « Reprends où tu t'étais arrêté » : dernière fiche
// vue de CET univers (localStorage), affichée en tête du hub. Rien si aucune visite.
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Last = { slug: string; name: string; image: string | null };

export default function ContinueBanner({ universe, color }: { universe: string; color: string }) {
  const [last, setLast] = useState<Last | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`nika:akasha:last:${universe}`);
      if (raw) { const v = JSON.parse(raw) as Last; if (v?.slug) setLast(v); }
    } catch { /* noop */ }
  }, [universe]);

  if (!last) return null;
  return (
    <Link href={`/learn/akasha/${last.slug}`} className="dom-card" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', background: `linear-gradient(100deg, ${color}1A, var(--bg2))`, border: `1px solid ${color}44`, borderRadius: 13, padding: '9px 13px', marginBottom: 4 }}>
      <div style={{ width: 44, height: 44, borderRadius: 9, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
        {last.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={last.image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color }}>↺ Reprendre</div>
        <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 17, color: 'var(--td)', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{last.name}</div>
      </div>
      <span aria-hidden style={{ color, fontSize: 18, paddingRight: 4 }}>→</span>
    </Link>
  );
}
