'use client';
// components/akasha/hub/HubSearch.tsx — recherche INSTANTANÉE scopée à l'univers, sur un index
// pré-chargé (pas de round-trip). Filtre en cours de frappe, résultats cliquables + nav clavier.
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TYPE_META, type AkashaType } from '@/lib/akasha/types';

type Item = { s: string; n: string; t: AkashaType };
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function HubSearch({ index, universe, color }: { index: Item[]; universe: string; color: string }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const results = useMemo(() => {
    const nq = norm(q.trim());
    if (nq.length < 2) return [];
    return index.filter((it) => norm(it.n).includes(nq)).slice(0, 8);
  }, [q, index]);

  const go = (it?: Item) => {
    const target = it ?? results[active];
    if (target) router.push(`/learn/akasha/${target.s}`);
  };

  return (
    <div style={{ position: 'relative', marginBottom: 4 }}>
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => { setQ(e.target.value); setActive(0); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
          else if (e.key === 'Enter') { e.preventDefault(); go(); }
          else if (e.key === 'Escape') { setQ(''); }
        }}
        placeholder={`Rechercher dans ${universe}…`}
        aria-label={`Rechercher dans ${universe}`}
        style={{ width: '100%', fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td)', background: 'var(--bg2)', border: `1px solid ${q ? color : 'var(--bd2)'}`, borderRadius: 11, padding: '11px 14px', outline: 'none' }}
      />
      {q.trim().length >= 2 && results.length === 0 && (
        <div role="status" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, background: 'var(--bg2)', border: '1px solid var(--bd2)', borderRadius: 12, padding: '12px 14px', zIndex: 20, boxShadow: '0 16px 40px -18px rgba(0,0,0,0.8)', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>
          Aucun résultat pour « {q.trim()} » dans {universe}.
        </div>
      )}
      {results.length > 0 && (
        <div role="listbox" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, background: 'var(--bg2)', border: '1px solid var(--bd2)', borderRadius: 12, overflow: 'hidden', zIndex: 20, boxShadow: '0 16px 40px -18px rgba(0,0,0,0.8)' }}>
          {results.map((it, i) => {
            const m = TYPE_META[it.t];
            return (
              <button
                key={it.s}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(it)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', padding: '9px 13px', background: i === active ? `${color}1A` : 'transparent', color: 'var(--td)' }}
              >
                <span aria-hidden style={{ fontSize: 15 }}>{m.icon}</span>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 13.5, fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.n}</span>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: m.color }}>{m.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
