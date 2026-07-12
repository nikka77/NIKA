'use client';
// components/akasha/hub/DragonBallVisualizer.tsx — visualiseur de personnage Dragon Ball.
// Onglets de race (+ « Tous » → les 436 persos), carrousel swipe, bloc stats/force au-dessus,
// frise des sagas cliquable en dessous. Données : lib/akasha/db-roster.ts.
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { DB_ROSTER, DB_RACE_META, DB_SAGA_META, DB_STAT_AXES, type DbChar } from '@/lib/akasha/db-roster';

const RARITY_COLOR: Record<string, string> = { legendary: '#F2C14E', epic: '#C77DFF', rare: '#4EA8DE', common: '#8FA3B0' };

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 74, flexShrink: 0, fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)' }}>{label}</span>
      <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--su2)', overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${color}99, ${color})` }} />
      </div>
      <span style={{ width: 26, textAlign: 'right', fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 800, color: 'var(--td2)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

export default function DragonBallVisualizer({ color = '#E8613C' }: { color?: string }) {
  const [race, setRace] = useState<string>('Tous');
  const [saga, setSaga] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);

  const list = useMemo(() => DB_ROSTER.roster.filter((c) =>
    (race === 'Tous' || c.race === race) && (!saga || c.saga === saga)), [race, saga]);

  const cur: DbChar | undefined = list[Math.min(idx, list.length - 1)];
  const go = (d: number) => { if (list.length) setIdx((i) => (Math.min(i, list.length - 1) + d + list.length) % list.length); };
  const setRaceTab = (r: string) => { setRace(r); setIdx(0); };
  const toggleSaga = (s: string) => { setSaga((cur) => cur === s ? null : s); setIdx(0); };

  const onDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, moved: false }; };
  const onMove = (e: React.PointerEvent) => { if (drag.current && Math.abs(e.clientX - drag.current.x) > 40 && !drag.current.moved) { drag.current.moved = true; go(e.clientX < drag.current.x ? 1 : -1); } };
  const onUp = () => { drag.current = null; };

  const rar = cur ? (RARITY_COLOR[cur.rarity] || RARITY_COLOR.common) : color;

  return (
    <div style={{ marginTop: '1.6rem' }}>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, marginBottom: 4 }}>
        🐉 Visualiseur de guerriers — {DB_ROSTER.count} personnages
      </div>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td3)', margin: '0 0 10px' }}>
        Choisis une race, swipe entre les guerriers, lis leur puissance. La frise des sagas filtre la chronologie.
      </p>

      {/* Onglets de race */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {['Tous', ...DB_ROSTER.races].map((r) => {
          const active = race === r;
          const meta = DB_RACE_META[r];
          const n = r === 'Tous' ? DB_ROSTER.count : DB_ROSTER.roster.filter((c) => c.race === r).length;
          return (
            <button key={r} onClick={() => setRaceTab(r)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 999, cursor: 'pointer',
              fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
              border: `1px solid ${active ? 'transparent' : 'var(--bd)'}`, background: active ? color : 'transparent', color: active ? '#0A1420' : 'var(--td2)',
            }}>{meta ? meta.emoji : '✳️'} {meta ? meta.label : 'Tous'} <span style={{ opacity: 0.7, fontSize: 10.5 }}>{n}</span></button>
          );
        })}
      </div>

      {cur && (
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'minmax(0,1fr)', alignItems: 'stretch' }}>
          <div style={{ position: 'relative', border: `1px solid ${rar}55`, borderRadius: 18, overflow: 'hidden', background: `radial-gradient(120% 100% at 50% 0%, ${rar}18, var(--su) 65%)` }}>
            {/* Stats au-dessus */}
            <div style={{ padding: '14px 16px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)' }}>Niveau de puissance</div>
                <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 22, color: rar, lineHeight: 1 }}>{cur.stats?.power ?? (cur.ki || '—')}</div>
              </div>
              {cur.stats
                ? <div style={{ display: 'grid', gap: 6 }}>{DB_STAT_AXES.map((a) => <StatBar key={a.key} label={a.label} value={cur.stats![a.key] as number} color={rar} />)}</div>
                : <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', padding: '4px 0' }}>Stats détaillées bientôt pour ce personnage.</div>}
            </div>

            {/* Perso + navigation */}
            <div style={{ position: 'relative', touchAction: 'pan-y' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cur.image} alt={cur.name} loading="lazy" draggable={false}
                style={{ width: '100%', height: 340, objectFit: 'contain', display: 'block', background: 'var(--su2)', userSelect: 'none' }} />
              {list.length > 1 && (['‹', '›'] as const).map((ch, i) => (
                <button key={ch} onClick={() => go(i ? 1 : -1)} aria-label={i ? 'Suivant' : 'Précédent'}
                  style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [i ? 'right' : 'left']: 8, width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--bd)', background: 'rgba(10,20,32,0.72)', color: '#fff', fontSize: 22, fontWeight: 700, cursor: 'pointer', lineHeight: 1 }}>{ch}</button>
              ))}
            </div>

            {/* Nom + méta */}
            <div style={{ padding: '10px 16px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontFamily: 'var(--fb)', fontSize: 24, color: 'var(--td)', lineHeight: 1 }}>{cur.name}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    {cur.race && <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: `${color}22`, color: 'var(--td2)' }}>{DB_RACE_META[cur.race]?.emoji} {DB_RACE_META[cur.race]?.label ?? cur.race}</span>}
                    {cur.saga && <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: `${DB_SAGA_META[cur.saga]?.color ?? color}22`, color: 'var(--td2)' }}>{DB_SAGA_META[cur.saga]?.label ?? cur.saga}</span>}
                  </div>
                </div>
                <Link href={`/learn/akasha/${cur.slug}`} style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color, textDecoration: 'none' }}>Fiche complète →</Link>
              </div>
              <div style={{ marginTop: 8, fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{(Math.min(idx, list.length - 1)) + 1} / {list.length}</span>
                <span>🖱️ flèches ou swipe</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Frise des sagas */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 8 }}>⏳ Chronologie des sagas</div>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--bd)' }}>
          {DB_ROSTER.sagas.map((s, i) => {
            const meta = DB_SAGA_META[s];
            const active = saga === s;
            const isCur = cur?.saga === s;
            return (
              <button key={s} onClick={() => toggleSaga(s)} style={{
                flex: 1, minWidth: 0, padding: '10px 6px', cursor: 'pointer', border: 'none', borderLeft: i ? '1px solid var(--bd)' : 'none',
                background: active ? meta.color : isCur ? `${meta.color}22` : 'var(--su)',
                color: active ? '#0A1420' : 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 800,
                position: 'relative', transition: 'background .15s',
              }}>
                <span style={{ display: 'block', fontSize: 9.5, fontWeight: 700, opacity: 0.7 }}>{i + 1}</span>
                {meta.label}
                {isCur && !active && <span style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: '50%', background: meta.color }} />}
              </button>
            );
          })}
        </div>
        {saga && <button onClick={() => { setSaga(null); setIdx(0); }} style={{ marginTop: 6, fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: 'var(--td3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕ toute la chronologie</button>}
      </div>
    </div>
  );
}
