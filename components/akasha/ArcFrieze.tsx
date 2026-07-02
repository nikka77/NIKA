'use client';
// components/akasha/ArcFrieze.tsx — frise chronologique HORIZONTALE des formes, au-dessus de la carte.
// Remplace à la fois l'ancien sélecteur d'onglets ET l'onglet « Parcours » du dossier (gain de place).
// Chaque station = nœud sur un rail + sprite + libellé + âge·arc. Cliquer une station pilote la carte.
import { useEffect, useRef } from 'react';

type Form = Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

export default function ArcFrieze({ forms, sel, onSelect, color, heading, pixelated = true }: { forms: Form[]; sel: number; onSelect: (i: number) => void; color: string; heading?: string; pixelated?: boolean }) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // Garder la station active visible quand la sélection change (ex. pilotée ailleurs).
  useEffect(() => {
    const el = activeRef.current;
    if (el) el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [sel]);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 9 }}>
        {heading ?? `◆ Parcours — ${forms.length} formes`}
      </div>
      <div ref={railRef} className="hero-domabar" style={{ display: 'flex', overflowX: 'auto', paddingBottom: 6 }}>
        {forms.map((f, i) => {
          const on = i === sel;
          const label = str(f.label) ?? `Forme ${i + 1}`;
          const age = str(f.age);
          const arc = str(f.arc);
          const img = str(f.idle) ?? str(f.url);
          const first = i === 0;
          const last = i === forms.length - 1;
          return (
            <button
              key={i}
              ref={on ? activeRef : null}
              type="button"
              onClick={() => onSelect(i)}
              aria-pressed={on}
              title={[label, age, arc].filter(Boolean).join(' · ')}
              style={{ flexShrink: 0, width: 96, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 0, background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              {/* rail + nœud */}
              <div style={{ position: 'relative', width: '100%', height: 14 }}>
                <div style={{ position: 'absolute', top: 6, left: first ? '50%' : 0, right: last ? '50%' : 0, height: 2, background: 'var(--bd2)' }} />
                <div style={{ position: 'absolute', top: 1, left: '50%', transform: 'translateX(-50%)', width: 12, height: 12, borderRadius: '50%', border: `2px solid ${on ? color : 'var(--bd2)'}`, background: on ? color : 'var(--bg)', boxShadow: on ? `0 0 9px ${color}` : 'none', transition: 'all .18s' }} />
              </div>
              {/* sprite */}
              {img && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt="" width={54} height={54} loading="lazy" style={{ objectFit: pixelated ? 'contain' : 'cover', borderRadius: 11, border: `1px solid ${on ? color : 'var(--bd)'}`, background: on ? `${color}1A` : 'var(--bg)', boxShadow: on ? `0 6px 16px -8px ${color}` : 'none', imageRendering: pixelated ? 'pixelated' : 'auto', transition: 'all .18s' }} />
              )}
              {/* textes */}
              <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: on ? 800 : 700, lineHeight: 1.15, color: on ? color : 'var(--td)', textAlign: 'center' }}>{label}</div>
              {age && <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, color: on ? 'var(--td2)' : 'var(--td3)', textAlign: 'center' }}>{age}</div>}
              {arc && <div style={{ fontFamily: 'var(--fo)', fontSize: 8.5, color: 'var(--td3)', textAlign: 'center', lineHeight: 1.2, maxWidth: 92 }}>{arc}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
