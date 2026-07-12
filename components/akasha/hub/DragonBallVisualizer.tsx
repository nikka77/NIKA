'use client';
// components/akasha/hub/DragonBallVisualizer.tsx — visualiseur de guerriers Dragon Ball.
// Onglets de race (icônes Higgsfield), carrousel, radar de stats, niveau de puissance chiffré,
// sélecteur d'ÉVOLUTIONS (transformations → image + puissance + stats qui changent), fusions,
// artefacts liés, frise des sagas. Données : lib/akasha/db-roster.ts + lib/akasha/db-forms.ts.
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { DB_ROSTER, DB_RACE_META, DB_SAGA_META, DB_STAT_AXES, type DbChar } from '@/lib/akasha/db-roster';
import { DB_FORMS, DB_FUSIONS, DB_CHAR_ARTIFACTS } from '@/lib/akasha/db-forms';
import { dbAxisIcon } from '@/components/akasha/DragonBallIcons';

const RARITY_COLOR: Record<string, string> = { legendary: '#F2C14E', epic: '#C77DFF', rare: '#4EA8DE', common: '#8FA3B0' };

// Radar (graphique en étoile) des 5 stats.
const RADAR_SHORT: Record<string, string> = { force: 'FOR', ki: 'KI', vitesse: 'VIT', technique: 'TEC', resistance: 'RÉS' };
function Radar({ stats, color }: { stats: Record<string, number>; color: string }) {
  const size = 200, c = size / 2, maxR = c - 32, n = DB_STAT_AXES.length;
  const pt = (i: number, r: number): [number, number] => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [c + r * Math.cos(a), c + r * Math.sin(a)]; };
  const ring = (f: number) => DB_STAT_AXES.map((_, i) => pt(i, maxR * f).join(',')).join(' ');
  const poly = DB_STAT_AXES.map((a, i) => pt(i, (maxR * Math.min(100, stats[a.key] || 0)) / 100).join(',')).join(' ');
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>
      {[0.25, 0.5, 0.75, 1].map((f, i) => <polygon key={i} points={ring(f)} fill="none" stroke="var(--bd2)" strokeWidth={0.6} opacity={0.55} />)}
      {DB_STAT_AXES.map((_, i) => { const [x, y] = pt(i, maxR); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--bd2)" strokeWidth={0.6} opacity={0.5} />; })}
      <polygon points={poly} fill={`${color}3A`} stroke={color} strokeWidth={2.2} strokeLinejoin="round" />
      {DB_STAT_AXES.map((a, i) => { const [x, y] = pt(i, (maxR * Math.min(100, stats[a.key] || 0)) / 100); return <circle key={i} cx={x} cy={y} r={2.6} fill={color} />; })}
      {DB_STAT_AXES.map((a, i) => {
        const [lx, ly] = pt(i, maxR + 17);
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700 }}>
            <tspan style={{ fill: 'var(--td3)' }}>{RADAR_SHORT[a.key]} </tspan>
            <tspan style={{ fill: color, fontWeight: 800 }}>{Math.round(Math.min(99, stats[a.key] || 0))}</tspan>
          </text>
        );
      })}
    </svg>
  );
}

export default function DragonBallVisualizer({ color = '#E8613C' }: { color?: string }) {
  const [race, setRace] = useState<string>('Tous');
  const [saga, setSaga] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [formIdx, setFormIdx] = useState(0);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);

  const list = useMemo(() => DB_ROSTER.roster.filter((c) =>
    (race === 'Tous' || c.race === race) && (!saga || c.saga === saga)), [race, saga]);

  const cur: DbChar | undefined = list[Math.min(idx, list.length - 1)];
  useEffect(() => { setFormIdx(0); }, [cur?.slug]);

  const go = (d: number) => { if (list.length) setIdx((i) => (Math.min(i, list.length - 1) + d + list.length) % list.length); };
  const setRaceTab = (r: string) => { setRace(r); setIdx(0); };
  const toggleSaga = (s: string) => { setSaga((c) => c === s ? null : s); setIdx(0); };

  const onDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, moved: false }; };
  const onMove = (e: React.PointerEvent) => { if (drag.current && Math.abs(e.clientX - drag.current.x) > 40 && !drag.current.moved) { drag.current.moved = true; go(e.clientX < drag.current.x ? 1 : -1); } };
  const onUp = () => { drag.current = null; };

  const rar = cur ? (RARITY_COLOR[cur.rarity] || RARITY_COLOR.common) : color;
  const forms = cur ? DB_FORMS[cur.slug] : undefined;
  const form = forms ? forms[Math.min(formIdx, forms.length - 1)] : undefined;
  const aura = form?.aura || rar;
  const displayImg = form?.img || cur?.image;
  const displayPower = form?.power || cur?.stats?.power || cur?.ki || '—';
  const boost = form?.boost || 0;
  const displayStats = cur?.stats ? Object.fromEntries(DB_STAT_AXES.map((a) => [a.key, Math.min(99, (cur.stats![a.key] as number) + boost)])) : null;
  const fusion = cur ? DB_FUSIONS[cur.slug] : undefined;
  const artifacts = cur ? DB_CHAR_ARTIFACTS[cur.slug] : undefined;
  const raceMeta = cur?.race ? DB_RACE_META[cur.race] : undefined;

  return (
    <div style={{ marginTop: '1.6rem' }}>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, marginBottom: 4 }}>
        🐉 Visualiseur de guerriers — {DB_ROSTER.count} personnages
      </div>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td3)', margin: '0 0 12px' }}>
        Choisis une race, swipe entre les guerriers, explore leurs évolutions, stats et artefacts.
      </p>

      {/* Onglets de race (icônes Higgsfield) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {['Tous', ...DB_ROSTER.races].map((r) => {
          const active = race === r;
          const meta = DB_RACE_META[r];
          const n = r === 'Tous' ? DB_ROSTER.count : DB_ROSTER.roster.filter((c) => c.race === r).length;
          const icon = r !== 'Tous' ? dbAxisIcon('race', r, 20) : null;
          return (
            <button key={r} onClick={() => setRaceTab(r)} style={{
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
        <div style={{ border: `1px solid ${aura}55`, borderRadius: 18, overflow: 'hidden', background: `radial-gradient(130% 100% at 20% 0%, ${aura}1E, var(--su) 62%)`, transition: 'border-color .25s, background .25s' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {/* Colonne image + navigation */}
            <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 340, minWidth: 220, touchAction: 'pan-y', background: `radial-gradient(90% 70% at 50% 20%, ${aura}22, var(--su2) 70%)` }}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={displayImg} alt={cur.name} loading="lazy" draggable={false} key={displayImg}
                style={{ width: '100%', height: 380, objectFit: 'contain', display: 'block', userSelect: 'none' }} />
              {form && form.name !== forms![0].name && (
                <span style={{ position: 'absolute', left: 10, top: 10, fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.03em', color: '#0A1420', background: aura, borderRadius: 999, padding: '3px 10px', boxShadow: `0 0 12px ${aura}` }}>{form.name}</span>
              )}
              {list.length > 1 && (['‹', '›'] as const).map((ch, i) => (
                <button key={ch} onClick={() => go(i ? 1 : -1)} aria-label={i ? 'Suivant' : 'Précédent'}
                  style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [i ? 'right' : 'left']: 8, width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--bd)', background: 'rgba(10,20,32,0.72)', color: '#fff', fontSize: 21, fontWeight: 700, cursor: 'pointer', lineHeight: 1, backdropFilter: 'blur(3px)' }}>{ch}</button>
              ))}
              <span style={{ position: 'absolute', right: 10, bottom: 8, fontFamily: 'var(--fo)', fontSize: 10, color: 'rgba(255,255,255,0.7)', background: 'rgba(10,8,24,0.6)', borderRadius: 6, padding: '1px 7px' }}>{Math.min(idx, list.length - 1) + 1} / {list.length}</span>
            </div>

            {/* Colonne infos */}
            <div style={{ flex: '2 1 320px', minWidth: 260, padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 11 }}>
              {/* Nom + chips */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontFamily: 'var(--fb)', fontSize: 26, color: 'var(--td)', lineHeight: 1 }}>{cur.name}</div>
                  <Link href={`/learn/akasha/${cur.slug}`} style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color, textDecoration: 'none', whiteSpace: 'nowrap', marginTop: 3 }}>Fiche →</Link>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7 }}>
                  {raceMeta && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, padding: '3px 9px 3px 4px', borderRadius: 999, background: `${color}22`, color: 'var(--td2)' }}>
                      {dbAxisIcon('race', cur.race!, 16) ? <span style={{ display: 'inline-flex', width: 16, height: 16 }}>{dbAxisIcon('race', cur.race!, 16)}</span> : <span>{raceMeta.emoji}</span>} {raceMeta.label}
                    </span>
                  )}
                  {cur.saga && <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: `${DB_SAGA_META[cur.saga]?.color ?? color}22`, color: 'var(--td2)' }}>⏳ Saga {DB_SAGA_META[cur.saga]?.label ?? cur.saga}</span>}
                  {fusion && <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: '#C77DFF22', color: 'var(--td2)' }}>⚡ {fusion.type}</span>}
                </div>
                {fusion && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 6, fontFamily: 'var(--fo)', fontSize: 11 }}>
                    <span style={{ color: 'var(--td3)', fontWeight: 700 }}>Fusion de&nbsp;:</span>
                    {fusion.bases.map((b, i) => (
                      <span key={b.slug} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {i > 0 && <span style={{ color: 'var(--td3)' }}>+</span>}
                        <Link href={`/learn/akasha/${b.slug}`} style={{ color: 'var(--td)', fontWeight: 700, textDecoration: 'none', borderBottom: `1px solid ${color}55` }}>{b.name}</Link>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Niveau de puissance (nombre) + radar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 130px' }}>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)' }}>Niveau de puissance{form ? ` · ${form.name}` : ''}</div>
                  <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 30, color: aura, lineHeight: 1, marginTop: 2, textShadow: `0 0 18px ${aura}66` }}>{displayPower}</div>
                  {form && <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, color: 'var(--td3)', marginTop: 2 }}>estimation approximative</div>}
                </div>
                {displayStats
                  ? <div style={{ flex: '1 1 180px' }}><Radar stats={displayStats} color={aura} /></div>
                  : <div style={{ flex: '1 1 180px', fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>Stats détaillées bientôt.</div>}
              </div>

              {/* Sélecteur d'évolutions */}
              {forms && forms.length > 1 && (
                <div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 6 }}>✦ Évolutions — {forms.length}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {forms.map((f, i) => {
                      const on = i === Math.min(formIdx, forms.length - 1);
                      const fc = f.aura || rar;
                      return (
                        <button key={f.name} onClick={() => setFormIdx(i)} style={{
                          padding: '4px 10px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                          border: `1px solid ${on ? 'transparent' : `${fc}55`}`, background: on ? fc : `${fc}14`, color: on ? '#0A1420' : 'var(--td2)',
                        }}>{f.name}</button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Artefacts */}
              {artifacts && artifacts.length > 0 && (
                <div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 6 }}>🗡️ Artefacts</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {artifacts.map((a) => (
                      <Link key={a.slug} href={`/learn/akasha/${a.slug}`} style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: 'var(--td2)', background: 'var(--su2)', border: '1px solid var(--bd)', borderRadius: 999, padding: '3px 10px', textDecoration: 'none' }}>{a.name}</Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Frise des sagas */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 10 }}>⏳ Chronologie des sagas</div>
        <div style={{ position: 'relative', display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          <div aria-hidden style={{ position: 'absolute', left: 8, right: 8, top: 22, height: 2, background: 'linear-gradient(90deg, var(--bd), var(--bd2), var(--bd))', zIndex: 0 }} />
          {DB_ROSTER.sagas.map((s, i) => {
            const meta = DB_SAGA_META[s];
            const active = saga === s;
            const isCur = cur?.saga === s;
            return (
              <button key={s} onClick={() => toggleSaga(s)} style={{
                position: 'relative', zIndex: 1, flex: '1 0 92px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', border: 'none', background: 'transparent', padding: 0,
              }}>
                <span style={{
                  width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 14,
                  background: active ? meta.color : isCur ? `${meta.color}33` : 'var(--su)', color: active ? '#0A1420' : isCur ? meta.color : 'var(--td3)',
                  border: `2px solid ${active || isCur ? meta.color : 'var(--bd2)'}`, boxShadow: active ? `0 0 12px ${meta.color}` : 'none', transition: 'all .15s',
                }}>{i + 1}</span>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 800, color: active ? meta.color : isCur ? 'var(--td2)' : 'var(--td3)' }}>{meta.label}</span>
              </button>
            );
          })}
        </div>
        {saga && <button onClick={() => { setSaga(null); setIdx(0); }} style={{ marginTop: 4, fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: 'var(--td3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕ toute la chronologie</button>}
      </div>
    </div>
  );
}
