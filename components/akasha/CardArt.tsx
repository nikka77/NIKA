'use client';
// components/akasha/CardArt.tsx — fenêtre d'illustration + sélecteur de versions (arcs, transformations).
import { useState } from 'react';
import { ChakraNatureIcon, VillageEmblem, ClanCrest } from './NarutoIcons';

export type CardForm = { label: string; url: string; caption?: string };

export default function CardArt({
  forms,
  name,
  frame,
  villageSlug,
  clanSlug,
  clan,
  natures,
  fallbackIcon,
}: {
  forms: CardForm[];
  name: string;
  frame: string;
  villageSlug: string | null;
  clanSlug: string | null;
  clan: string | null;
  natures: string[];
  fallbackIcon: string;
}) {
  const [sel, setSel] = useState(0);
  const current = forms[sel]?.url ?? forms[0]?.url ?? null;

  return (
    <div>
      <div
        style={{
          position: 'relative', borderRadius: 11, overflow: 'hidden', border: `2px solid ${frame}aa`,
          aspectRatio: '1 / 1', background: `linear-gradient(135deg, ${frame}33, ${frame}0A)`,
          boxShadow: 'inset 0 0 36px rgba(0,0,0,0.6)',
        }}
      >
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={current} src={current} alt={name} className="ak-art-img" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 70, opacity: 0.5 }} aria-hidden>{fallbackIcon}</div>
        )}
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(130% 80% at 50% 0%, transparent 50%, rgba(5,12,23,0.6) 100%)' }} />
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
          <VillageEmblem slug={villageSlug} size={34} />
          <ClanCrest slug={clanSlug} name={clan} size={34} />
        </div>
        {natures.length > 0 && (
          <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {natures.map((n, i) => <ChakraNatureIcon key={i} nature={n} size={24} />)}
          </div>
        )}
      </div>

      {forms.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 9 }}>
          {forms.map((f, i) => {
            const on = i === sel;
            return (
              <button
                key={i}
                onClick={() => setSel(i)}
                className="ak-var"
                style={{
                  fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  padding: '5px 11px', borderRadius: 20,
                  border: `1px solid ${on ? frame : 'var(--bd2)'}`,
                  background: on ? `${frame}22` : 'transparent',
                  color: on ? frame : 'var(--td2)',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      )}
      {forms[sel]?.caption && (
        <div style={{ textAlign: 'center', marginTop: 8, fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', fontStyle: 'italic' }}>{forms[sel].caption}</div>
      )}
    </div>
  );
}
