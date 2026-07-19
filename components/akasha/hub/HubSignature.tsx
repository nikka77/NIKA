// components/akasha/hub/HubSignature.tsx — LE geste signature de chaque univers, config-driven
// (vis.signature). 100 % serveur (RSC) : hexagone du Nen, carte des villages, échelle des primes,
// organigramme du Gotei, frise des parties/sagas, panneaux de cols, duel Kira vs L.
import Link from 'next/link';
import { universeHubSlug, type HubVisual } from '@/lib/akasha/universe-taxonomy';
import NarutoWorldMap from '@/components/akasha/hub/NarutoWorldMap';
import BleachWorldsMap from '@/components/akasha/hub/BleachWorldsMap';
import BleachSeireitiMap from '@/components/akasha/hub/BleachSeireitiMap';
import { moreAxisIcon } from '@/components/akasha/MoreUniverseIcons';
import { dbAxisIcon } from '@/components/akasha/DragonBallIcons';
import type { ReactNode } from 'react';

export interface AxisChip { v: string; label: string; count: number; tint?: string; badge?: string }
export interface AxisView { attr: string; label: string; icon: string; chips: AxisChip[] }
export interface Bounty { slug: string; name: string; image_url: string | null; bountyValue: number }

const TITLE = (color: string) => ({ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 });

// Pointe vers la SOUS-PAGE D'AXE dédiée (L6) plutôt que le registre filtré ; repli registre si l'univers
// n'a pas de hub-slug (ne devrait pas arriver puisque la signature vient d'un hub).
function href(universe: string, attr: string, val: string) {
  const slug = universeHubSlug(universe);
  return slug ? `/learn/akasha/u/${slug}/${attr}/${encodeURIComponent(val)}` : `/learn/akasha?${new URLSearchParams({ universe, attr, val }).toString()}`;
}

// ── La roue du Nen (Hunter x Hunter) — hexagone canon, médaillons aux sommets (3d) ──
function NenWheel({ axis, universe, color }: { axis: AxisView; universe: string; color: string }) {
  // Ordre canon du diagramme d'affinités (horaire depuis le sommet).
  const order = ['Renforcement', 'Émission', 'Manipulation', 'Spécialisation', 'Matérialisation', 'Transformation'];
  const chips = order.map((v) => axis.chips.find((c) => c.v === v)).filter(Boolean) as AxisChip[];
  if (chips.length < 3) return null;
  const total = chips.reduce((s, c) => s + c.count, 0);
  // Coordonnées en % du conteneur (carré) — l'hexagone SVG dessous, les médaillons HTML dessus.
  const pos = (i: number, rPct: number) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    return { left: `${50 + Math.cos(a) * rPct}%`, top: `${50 + Math.sin(a) * rPct}%` };
  };
  return (
    <section>
      <div style={TITLE(color)}><span>La roue du Nen</span><span style={{ color: 'var(--td3)' }}>{total} utilisateurs · affinités canon</span></div>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 16, padding: 'clamp(10px,2vw,20px)' }}>
        <div style={{ position: 'relative', width: 'min(100%, 460px)', aspectRatio: '1', margin: '0 auto' }}>
          <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
            <polygon
              points={chips.map((_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 3; return `${50 + Math.cos(a) * 36},${50 + Math.sin(a) * 36}`; }).join(' ')}
              fill={`${color}0E`} stroke={`${color}50`} strokeWidth={0.6} />
            {chips.map((_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 3; return <line key={i} x1={50} y1={50} x2={50 + Math.cos(a) * 36} y2={50 + Math.sin(a) * 36} stroke="var(--bd)" strokeWidth={0.4} />; })}
            <circle cx={50} cy={50} r={9} fill="var(--bg3)" stroke={`${color}44`} strokeWidth={0.5} />
            <text x={50} y={53.5} textAnchor="middle" fontFamily="var(--fe)" fontStyle="italic" fontWeight={900} fontSize={9} fill={color}>念</text>
          </svg>
          {chips.map((c, i) => (
            <Link key={c.v} href={href(universe, axis.attr, c.v)} className="ak-tab" title={c.label}
              style={{ position: 'absolute', ...pos(i, 36), transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', padding: '7px 9px', borderRadius: 12, background: 'rgba(5,12,23,0.72)', border: `1px solid ${color}44`, minWidth: 78 }}>
              <span style={{ height: 34, display: 'flex', alignItems: 'center' }}>{moreAxisIcon('hunter-x-hunter', 'nen', c.v, 34)}</span>
              <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: 'var(--td)', lineHeight: 1.05, textAlign: 'center' }}>{c.label}</span>
              <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 13, color }}>{c.count}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Carte des Villages cachés (Naruto) ─────────────────────────────
// Naruto : carte interactive du continent shinobi. Autres univers : liste de cartes (fallback).
function VillageMap({ axis, universe, color }: { axis: AxisView; universe: string; color: string }) {
  if (universe === 'Naruto') {
    return <NarutoWorldMap color={color} counts={Object.fromEntries(axis.chips.map((c) => [c.v, c.count]))} />;
  }
  return (
    <section>
      <div style={TITLE(color)}><span>Le continent shinobi</span><span style={{ color: 'var(--td3)' }}>{axis.chips.length} villages cachés</span></div>
      <div className="g-2" style={{ display: 'grid', gap: 9 }}>
        {axis.chips.map((c) => {
          const tint = c.tint ?? color;
          return (
            <Link key={c.v} href={href(universe, axis.attr, c.v)} className="dom-card" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', background: `linear-gradient(110deg, ${tint}1F, var(--bg2))`, border: `1px solid ${tint}55`, borderRadius: 13, padding: '12px 14px', ['--dc' as string]: tint }}>
              <span style={{ fontSize: 26 }} aria-hidden>{c.badge ?? '🏯'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 17, color: 'var(--td)' }}>{c.label}</div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: tint }}>{c.count} ninjas répertoriés</div>
              </div>
              <span aria-hidden style={{ color: tint, fontSize: 16 }}>→</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ── Échelle des primes (One Piece) ─────────────────────────────────
function PowerLadder({ bounties, color }: { bounties: Bounty[]; color: string }) {
  if (!bounties.length) return null;
  const max = bounties[0].bountyValue || 1;
  const tier = (v: number) => (v >= 3e9 ? 'Empereur' : v >= 1e9 ? 'Yonko / Amiral' : v >= 3e8 ? 'Supernova' : 'Recherché');
  return (
    <section>
      <div style={TITLE(color)}><span>Échelle des primes</span><Link href="/learn/akasha/wanted" style={{ color: 'var(--td3)', textDecoration: 'none' }}>tout le classement →</Link></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {bounties.map((b, i) => (
          <Link key={b.slug} href={`/learn/akasha/${b.slug}`} className="akasha-card" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 11, padding: '6px 12px 6px 8px', ['--dc' as string]: color }}>
            <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15, color: i < 3 ? color : 'var(--td3)', width: 22, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
            <div style={{ width: 34, height: 34, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
              {b.image_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={b.image_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', filter: 'sepia(0.3)' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
              <div style={{ height: 5, borderRadius: 3, background: 'var(--bd)', marginTop: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.max(8, (Math.log10(b.bountyValue) / Math.log10(max)) * 100)}%`, background: '#D4A017', borderRadius: 3 }} />
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, color: '#D4A017' }}>฿{b.bountyValue.toLocaleString('fr-FR')}</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--td3)' }}>{tier(b.bountyValue)}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ── Frise des parties / sagas (JoJo, Dragon Ball) — stations à médaillons (3d) ──
function Frieze({ axis, universe, color, title, iconFor }: { axis: AxisView; universe: string; color: string; title: string; icon?: string; iconFor?: (v: string) => ReactNode }) {
  return (
    <section>
      <div style={TITLE(color)}><span>{title}</span><span style={{ color: 'var(--td3)' }}>{axis.chips.length} époques</span></div>
      <div className="hero-domabar" style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 6 }}>
        {axis.chips.map((c, i) => {
          const medallion = iconFor?.(c.v) ?? null;
          return (
            <div key={c.v} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 132, flexShrink: 0 }}>
              <div style={{ position: 'relative', width: '100%', height: 12 }}>
                <div style={{ position: 'absolute', top: 5, left: i === 0 ? '50%' : 0, right: i === axis.chips.length - 1 ? '50%' : 0, height: 2, background: 'var(--bd2)' }} />
                <div style={{ position: 'absolute', top: 1, left: '50%', transform: 'translateX(-50%)', width: 11, height: 11, borderRadius: '50%', border: `2px solid ${color}`, background: 'var(--bg)' }} />
              </div>
              <Link href={href(universe, axis.attr, c.v)} className="ak-tab" style={{ textDecoration: 'none', textAlign: 'center', padding: '9px 6px 8px', borderRadius: 11, marginTop: 6, width: '92%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                {medallion && <span style={{ height: 40, display: 'flex', alignItems: 'center', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}>{medallion}</span>}
                <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, color: 'var(--td2)', lineHeight: 1.15 }}>{c.label}</span>
                <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 16, color }}>{c.count}</span>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Organigramme / grille de valeurs (Gotei 13, cols) ──────────────
function Board({ axis, universe, color, title }: { axis: AxisView; universe: string; color: string; title: string; icon?: string }) {
  return (
    <section>
      <div style={TITLE(color)}><span>{title}</span><span style={{ color: 'var(--td3)' }}>{axis.chips.length}</span></div>
      <div className="g-3" style={{ display: 'grid', gap: 8 }}>
        {axis.chips.map((c) => (
          <Link key={c.v} href={href(universe, axis.attr, c.v)} className="dom-card" style={{ textDecoration: 'none', background: 'var(--bg2)', border: `1px solid ${color}33`, borderRadius: 11, padding: '11px 12px', textAlign: 'center', ['--dc' as string]: color }}>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: 'var(--td)', lineHeight: 1.2 }}>{c.badge ? `${c.badge} ` : ''}{c.label}</div>
            <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 16, color, marginTop: 3 }}>{c.count}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ── Gotei 13 : carte du Seireitei (Bleach). Autres univers à venir : grille générique (fallback).
function Gotei13({ axis, universe, color }: { axis: AxisView; universe: string; color: string }) {
  return <Board axis={axis} universe={universe} color={color} title="Le Gotei 13" icon="⚔️" />;
}

// ── Le duel Kira vs L (Death Note) — échiquier à médaillons sur papier réglé (3d) ──
function KiraDuel({ axis, universe }: { axis: AxisView; universe: string }) {
  const find = (v: string) => axis.chips.find((c) => c.v === v);
  const kira = find('Kira');
  const l = find('Cellule d’enquête');
  const others = axis.chips.filter((c) => c !== kira && c !== l);
  const medal = (v: string, size = 40) => moreAxisIcon('death-note', 'camp', v, size);
  const Side = ({ chip, side, col }: { chip?: AxisChip; side: string; col: string }) => {
    const inner = (
      <>
        {chip && <span style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))' }}>{medal(chip.v, 44)}</span>}
        <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: col, marginTop: 6 }}>{side}</div>
        <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 26, color: 'var(--td)', margin: '2px 0' }}>{chip?.count ?? 0}</div>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{chip?.label ?? side}</div>
      </>
    );
    const style = { flex: 1, textDecoration: 'none' as const, background: `linear-gradient(160deg, ${col}1C, rgba(9,21,42,0.6))`, border: `1px solid ${col}55`, borderRadius: 13, padding: '16px 14px', textAlign: 'center' as const, ['--dc' as string]: col };
    return chip ? (
      <Link href={href(universe, axis.attr, chip.v)} className="dom-card" style={style}>{inner}</Link>
    ) : (
      <div style={{ ...style, opacity: 0.6 }}>{inner}</div>
    );
  };
  return (
    <section>
      <div style={TITLE('#8A8F98')}><span>Le duel</span><span style={{ color: 'var(--td3)' }}>chaque camp avance ses pièces</span></div>
      {/* Papier réglé du cahier — la matière du Death Note, en retenue. */}
      <div style={{ borderRadius: 14, border: '1px solid var(--bd)', padding: '14px 14px 12px', background: 'repeating-linear-gradient(180deg, transparent 0 26px, rgba(138,143,152,0.07) 26px 27px), var(--bg2)' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
          <Side chip={kira} side="Kira" col="#D63C3C" />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 18, color: 'var(--td3)' }}>VS</span>
            <span aria-hidden style={{ width: 1, flex: 1, background: 'var(--bd2)' }} />
          </div>
          <Side chip={l} side="L & la cellule" col="#5A88B0" />
        </div>
        {others.length > 0 && (
          <div style={{ display: 'flex', gap: 7, marginTop: 11, flexWrap: 'wrap', justifyContent: 'center' }}>
            {others.map((c) => (
              <Link key={c.v} href={href(universe, axis.attr, c.v)} className="ak-tab" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, padding: '5px 11px', borderRadius: 20, border: '1px solid var(--bd2)', color: 'var(--td3)' }}>
                <span style={{ height: 20, display: 'flex', alignItems: 'center' }}>{medal(c.v, 20)}</span>
                {c.label} <span style={{ color: '#8A8F98' }}>{c.count}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Le tracé des cols (Initial D) — la route de montagne en serpentins (3d) ──
function PassRoad({ axis, universe, color }: { axis: AxisView; universe: string; color: string }) {
  const chips = axis.chips.slice(0, 6);
  if (chips.length === 0) return null;
  // Stations réparties le long d'une serpentine calculée (coordonnées en % du conteneur).
  const stations = chips.map((c, i) => {
    const t = chips.length > 1 ? i / (chips.length - 1) : 0.5;
    return { ...c, left: 8 + t * 84, top: i % 2 === 0 ? 26 : 68 };
  });
  const path = stations.map((s, i) => `${i === 0 ? 'M' : ''} ${s.left} ${s.top}${i < stations.length - 1 ? ` C ${s.left + 14} ${s.top}, ${stations[i + 1].left - 14} ${stations[i + 1].top},` : ''}`).join(' ');
  return (
    <section>
      <div style={TITLE(color)}><span>Le tracé des cols</span><span style={{ color: 'var(--td3)' }}>{chips.length} routes de légende</span></div>
      <div style={{ position: 'relative', borderRadius: 14, border: '1px solid var(--bd)', background: 'linear-gradient(160deg, rgba(10,16,26,0.9), var(--bg2))', minHeight: 190, padding: '10px 6px' }}>
        <svg viewBox="0 0 100 94" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
          <path d={path} fill="none" stroke="rgba(235,229,214,0.16)" strokeWidth={7} strokeLinecap="round" />
          <path d={path} fill="none" stroke={color} strokeWidth={0.9} strokeDasharray="3 2.4" strokeLinecap="round" />
        </svg>
        {stations.map((s) => (
          <Link key={s.v} href={href(universe, axis.attr, s.v)} className="ak-tab" title={s.label}
            style={{ position: 'absolute', left: `${s.left}%`, top: `${s.top}%`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', padding: '7px 9px', borderRadius: 12, background: 'rgba(5,12,23,0.78)', border: `1px solid ${color}44`, minWidth: 84 }}>
            <span style={{ height: 32, display: 'flex', alignItems: 'center', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))' }}>{moreAxisIcon('initial-d', 'col', s.v, 32)}</span>
            <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: 'var(--td)', lineHeight: 1.05, textAlign: 'center', whiteSpace: 'nowrap' }}>{s.label}</span>
            <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 13, color }}>{s.count}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function HubSignature({ signature, axes, universe, color, bounties }: { signature: HubVisual['signature']; axes: AxisView[]; universe: string; color: string; bounties?: Bounty[] }) {
  const axis = (attr: string) => axes.find((a) => a.attr === attr);
  switch (signature) {
    case 'nen': { const a = axis('nen'); return a ? <NenWheel axis={a} universe={universe} color={color} /> : null; }
    case 'villages': { const a = axis('village'); return a ? <VillageMap axis={a} universe={universe} color={color} /> : null; }
    case 'bounties': return bounties?.length ? <PowerLadder bounties={bounties} color={color} /> : null;
    case 'powerscale': { const a = axis('saga'); return a ? <Frieze axis={a} universe={universe} color={color} title="La saga des puissances" iconFor={(v) => dbAxisIcon('saga', v, 40)} /> : null; }
    case 'jojo': { const a = axis('partie'); return a ? <Frieze axis={a} universe={universe} color={color} title="La lignée Joestar — les parties" iconFor={(v) => moreAxisIcon('jojo', 'partie', v, 40)} /> : null; }
    case 'gotei': {
      if (universe === 'Bleach') return <BleachWorldsMap raceAxis={axis('race')} divisionAxis={axis('division')} universe={universe} color={color} />;
      const a = axis('division'); return a ? <Gotei13 axis={a} universe={universe} color={color} /> : null;
    }
    case 'passes': { const a = axis('col'); return a ? <PassRoad axis={a} universe={universe} color={color} /> : null; }
    case 'kiraduel': { const a = axis('camp'); return a ? <KiraDuel axis={a} universe={universe} /> : null; }
    default: return null;
  }
}
