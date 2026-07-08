// components/akasha/hub/HubSignature.tsx — LE geste signature de chaque univers, config-driven
// (vis.signature). 100 % serveur (RSC) : hexagone du Nen, carte des villages, échelle des primes,
// organigramme du Gotei, frise des parties/sagas, panneaux de cols, duel Kira vs L.
import Link from 'next/link';
import { universeHubSlug, type HubVisual } from '@/lib/akasha/universe-taxonomy';
import { VillageEmblem } from '@/components/akasha/NarutoIcons';

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

// ── Hexagone du Nen (Hunter x Hunter) ──────────────────────────────
function NenWheel({ axis, universe, color }: { axis: AxisView; universe: string; color: string }) {
  const order = ['Renforcement', 'Émission', 'Manipulation', 'Spécialisation', 'Matérialisation', 'Transformation'];
  const chips = order.map((v) => axis.chips.find((c) => c.v === v)).filter(Boolean) as AxisChip[];
  if (chips.length < 3) return null;
  const S = 300, cx = S / 2, cy = 150, R = 110;
  const pt = (i: number, r: number) => [cx + Math.cos(-Math.PI / 2 + i * Math.PI / 3) * r, cy + Math.sin(-Math.PI / 2 + i * Math.PI / 3) * r];
  const poly = chips.map((_, i) => pt(i, R).join(',')).join(' ');
  return (
    <section>
      <div style={TITLE(color)}><span>💠 La roue du Nen</span><span style={{ color: 'var(--td3)' }}>affinités canon</span></div>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 16, padding: 8 }}>
        <svg viewBox={`0 0 ${S} 300`} width="100%" style={{ maxHeight: 320 }}>
          <polygon points={poly} fill={`${color}12`} stroke={`${color}55`} strokeWidth={1.5} />
          {chips.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--bd)" strokeWidth={1} />; })}
          {chips.map((c, i) => {
            const [x, y] = pt(i, R);
            return (
              <a key={c.v} href={href(universe, axis.attr, c.v)}>
                <circle cx={x} cy={y} r={30} fill="var(--bg3)" stroke={color} strokeWidth={2} />
                <text x={x} y={y - 3} textAnchor="middle" fontFamily="var(--fo)" fontSize={9.5} fontWeight={700} fill="var(--td)">{c.label.slice(0, 9)}</text>
                <text x={x} y={y + 11} textAnchor="middle" fontFamily="var(--fe)" fontStyle="italic" fontSize={13} fontWeight={800} fill={color}>{c.count}</text>
              </a>
            );
          })}
          <text x={cx} y={cy + 4} textAnchor="middle" fontFamily="var(--fe)" fontStyle="italic" fontSize={16} fontWeight={900} fill="var(--td3)">念</text>
        </svg>
      </div>
    </section>
  );
}

// ── Carte des Villages cachés (Naruto) ─────────────────────────────
function VillageMap({ axis, universe, color }: { axis: AxisView; universe: string; color: string }) {
  return (
    <section>
      <div style={TITLE(color)}><span>🗺️ Le continent shinobi</span><span style={{ color: 'var(--td3)' }}>{axis.chips.length} villages cachés</span></div>
      <div className="g-2" style={{ display: 'grid', gap: 9 }}>
        {axis.chips.map((c) => {
          const tint = c.tint ?? color;
          return (
            <Link key={c.v} href={href(universe, axis.attr, c.v)} className="dom-card" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', background: `linear-gradient(110deg, ${tint}1F, var(--bg2))`, border: `1px solid ${tint}55`, borderRadius: 13, padding: '12px 14px', ['--dc' as string]: tint }}>
              {universe === 'Naruto'
                ? <span style={{ display: 'flex', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}><VillageEmblem slug={c.v.toLowerCase()} size={38} /></span>
                : <span style={{ fontSize: 26 }} aria-hidden>{c.badge ?? '🏯'}</span>}
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
      <div style={TITLE(color)}><span>🏴‍☠️ Échelle des primes</span><Link href="/learn/akasha/wanted" style={{ color: 'var(--td3)', textDecoration: 'none' }}>tout le classement →</Link></div>
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

// ── Frise des parties / sagas (JoJo, Dragon Ball) ──────────────────
function Frieze({ axis, universe, color, title, icon }: { axis: AxisView; universe: string; color: string; title: string; icon: string }) {
  return (
    <section>
      <div style={TITLE(color)}><span>{icon} {title}</span></div>
      <div className="hero-domabar" style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 6 }}>
        {axis.chips.map((c, i) => (
          <div key={c.v} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 128, flexShrink: 0 }}>
            <div style={{ position: 'relative', width: '100%', height: 12 }}>
              <div style={{ position: 'absolute', top: 5, left: i === 0 ? '50%' : 0, right: i === axis.chips.length - 1 ? '50%' : 0, height: 2, background: 'var(--bd2)' }} />
              <div style={{ position: 'absolute', top: 1, left: '50%', transform: 'translateX(-50%)', width: 11, height: 11, borderRadius: '50%', border: `2px solid ${color}`, background: 'var(--bg)' }} />
            </div>
            <Link href={href(universe, axis.attr, c.v)} className="ak-tab" style={{ textDecoration: 'none', textAlign: 'center', padding: '8px 6px', borderRadius: 11, marginTop: 6, width: '92%' }}>
              <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 20, color }}>{c.count}</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, color: 'var(--td2)', lineHeight: 1.15, marginTop: 2 }}>{c.label}</div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Organigramme / grille de valeurs (Gotei 13, cols) ──────────────
function Board({ axis, universe, color, title, icon }: { axis: AxisView; universe: string; color: string; title: string; icon: string }) {
  return (
    <section>
      <div style={TITLE(color)}><span>{icon} {title}</span><span style={{ color: 'var(--td3)' }}>{axis.chips.length}</span></div>
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

// ── Duel Kira vs L (Death Note) ────────────────────────────────────
function KiraDuel({ axis, universe }: { axis: AxisView; universe: string }) {
  const find = (v: string) => axis.chips.find((c) => c.v === v);
  const kira = find('Kira');
  const l = find('Cellule d’enquête');
  const others = axis.chips.filter((c) => c !== kira && c !== l);
  // Chip absente → carte NON cliquable (fini le lien mort href='#' — audit L6).
  const Side = ({ chip, side, col }: { chip?: AxisChip; side: string; col: string }) => {
    const inner = (
      <>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: col }}>{side}</div>
        <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 26, color: 'var(--td)', margin: '4px 0' }}>{chip?.count ?? 0}</div>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{chip?.label ?? side}</div>
      </>
    );
    const style = { flex: 1, textDecoration: 'none' as const, background: `linear-gradient(160deg, ${col}22, var(--bg2))`, border: `1px solid ${col}66`, borderRadius: 13, padding: '16px 14px', textAlign: 'center' as const, ['--dc' as string]: col };
    return chip ? (
      <Link href={href(universe, axis.attr, chip.v)} className="dom-card" style={style}>{inner}</Link>
    ) : (
      <div style={{ ...style, opacity: 0.6 }}>{inner}</div>
    );
  };
  return (
    <section>
      <div style={TITLE('#8A8F98')}><span>♟️ Le duel</span></div>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
        <Side chip={kira} side="Kira" col="#D63C3C" />
        <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 18, color: 'var(--td3)' }}>VS</div>
        <Side chip={l} side="L & la cellule" col="#5A88B0" />
      </div>
      {others.length > 0 && (
        <div style={{ display: 'flex', gap: 7, marginTop: 9, flexWrap: 'wrap', justifyContent: 'center' }}>
          {others.map((c) => (
            <Link key={c.v} href={href(universe, axis.attr, c.v)} className="ak-tab" style={{ textDecoration: 'none', fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, padding: '5px 11px', borderRadius: 20, border: '1px solid var(--bd2)', color: 'var(--td3)' }}>
              {c.label} <span style={{ color: '#8A8F98' }}>{c.count}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default function HubSignature({ signature, axes, universe, color, bounties }: { signature: HubVisual['signature']; axes: AxisView[]; universe: string; color: string; bounties?: Bounty[] }) {
  const axis = (attr: string) => axes.find((a) => a.attr === attr);
  switch (signature) {
    case 'nen': { const a = axis('nen'); return a ? <NenWheel axis={a} universe={universe} color={color} /> : null; }
    case 'villages': { const a = axis('village'); return a ? <VillageMap axis={a} universe={universe} color={color} /> : null; }
    case 'bounties': return bounties?.length ? <PowerLadder bounties={bounties} color={color} /> : null;
    case 'powerscale': { const a = axis('saga'); return a ? <Frieze axis={a} universe={universe} color={color} title="La saga des puissances" icon="📈" /> : null; }
    case 'jojo': { const a = axis('partie'); return a ? <Frieze axis={a} universe={universe} color={color} title="Les parties" icon="🎭" /> : null; }
    case 'gotei': { const a = axis('division'); return a ? <Board axis={a} universe={universe} color={color} title="Le Gotei 13" icon="⚔️" /> : null; }
    case 'passes': { const a = axis('col'); return a ? <Board axis={a} universe={universe} color={color} title="Les cols" icon="⛰️" /> : null; }
    case 'kiraduel': { const a = axis('camp'); return a ? <KiraDuel axis={a} universe={universe} /> : null; }
    default: return null;
  }
}
