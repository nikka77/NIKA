'use client';
// components/akasha/hub/DragonBallCards.tsx — navigateur des CARTES TCG Dragon Ball dans le hub.
// Réutilise la vraie carte du site (CharacterCard + CardFx + ArcFrieze) : onglets de race à
// icônes Higgsfield, navigation entre persos, et sélecteur d'évolutions natif (les transformations
// injectées dans l'attribut `forms` font évoluer image, puissance et données de la carte).
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import CardFx from '@/components/akasha/CardFx';
import CharacterCard from '@/components/akasha/CharacterCard';
import ArcFrieze from '@/components/akasha/ArcFrieze';
import { dbAxisIcon } from '@/components/akasha/DragonBallIcons';
import { normalizeForms } from '@/lib/akasha/forms';
import { DB_RACE_META } from '@/lib/akasha/db-roster';
import { RARITY_META, type AkashaEntry } from '@/lib/akasha/types';

const FOIL: Record<string, number> = { legendary: 0.6, epic: 0.48, rare: 0.38, common: 0.26 };

export default function DragonBallCards({ entries, color = '#E8613C' }: { entries: AkashaEntry[]; color?: string }) {
  const [race, setRace] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState(0);

  const raceCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) { const r = (e.attributes as Record<string, unknown>)?.race; if (typeof r === 'string') m.set(r, (m.get(r) || 0) + 1); }
    return m;
  }, [entries]);
  const races = useMemo(() => [...raceCounts.keys()].filter((r) => DB_RACE_META[r]).sort((a, b) => (raceCounts.get(b)! - raceCounts.get(a)!)), [raceCounts]);

  const list = useMemo(() => (race ? entries.filter((e) => (e.attributes as Record<string, unknown>)?.race === race) : entries), [race, entries]);
  const cur = list[Math.min(idx, list.length - 1)];
  useEffect(() => { setSel(0); }, [cur?.slug]);
  const go = (d: number) => { if (list.length) setIdx((i) => (Math.min(i, list.length - 1) + d + list.length) % list.length); };
  const pickRace = (r: string | null) => { setRace(r); setIdx(0); };

  const forms = cur ? (normalizeForms(cur.attributes as Record<string, unknown>) as Record<string, unknown>[]) : [];
  const frame = cur?.rarity ? RARITY_META[cur.rarity].color : color;

  return (
    <div style={{ marginTop: '1.6rem' }}>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, marginBottom: 4 }}>
        🐉 Cartes des guerriers — {entries.length} légendes
      </div>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td3)', margin: '0 0 12px', maxWidth: 640 }}>
        Feuillette les cartes de collection. Choisis une race, navigue entre les guerriers, et fais évoluer chaque carte à travers ses transformations.
      </p>

      {/* Onglets de race (icônes Higgsfield) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {[null, ...races].map((r) => {
          const active = race === r;
          const meta = r ? DB_RACE_META[r] : null;
          const n = r ? raceCounts.get(r)! : entries.length;
          const icon = r ? dbAxisIcon('race', r, 20) : null;
          return (
            <button key={r ?? 'all'} onClick={() => pickRace(r)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: icon ? '4px 12px 4px 6px' : '5px 12px', borderRadius: 999, cursor: 'pointer',
              fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
              border: `1px solid ${active ? 'transparent' : 'var(--bd)'}`, background: active ? color : 'transparent', color: active ? '#0A1420' : 'var(--td2)',
            }}>
              {icon ? <span style={{ display: 'inline-flex', width: 20, height: 20, filter: active ? 'none' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>{icon}</span> : <span aria-hidden>✳️</span>}
              {meta ? meta.label : 'Tous'} <span style={{ opacity: 0.7, fontSize: 10.5 }}>{n}</span>
            </button>
          );
        })}
      </div>

      {cur && (
        <div style={{ maxWidth: 460, margin: '0 auto' }}>
          {forms.length > 1 && <ArcFrieze forms={forms} sel={sel} onSelect={setSel} color={frame} heading={`✦ Évolutions — ${forms.length}`} pixelated={false} />}
          <div style={{ position: 'relative' }}>
            <CardFx color={frame} foilmax={FOIL[cur.rarity ?? 'common'] ?? 0.26}>
              <CharacterCard entry={cur} sel={sel} onSelect={setSel} />
            </CardFx>
            {list.length > 1 && (['‹', '›'] as const).map((ch, i) => (
              <button key={ch} onClick={() => go(i ? 1 : -1)} aria-label={i ? 'Suivant' : 'Précédent'}
                style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [i ? 'right' : 'left']: -6, zIndex: 6, width: 40, height: 40, borderRadius: '50%', border: `1px solid ${frame}66`, background: 'rgba(10,20,32,0.82)', color: '#fff', fontSize: 22, fontWeight: 700, cursor: 'pointer', lineHeight: 1, backdropFilter: 'blur(4px)', boxShadow: `0 4px 14px rgba(0,0,0,0.5)` }}>{ch}</button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)' }}>
            <span>{Math.min(idx, list.length - 1) + 1} / {list.length} · 🖱️ flèches</span>
            <Link href={`/learn/akasha/${cur.slug}`} style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color, textDecoration: 'none' }}>Fiche complète →</Link>
          </div>
        </div>
      )}
    </div>
  );
}
