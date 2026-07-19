// components/akasha/hub/HubInsights.tsx — sections « data dormante » du hub : chiffres-clés animés,
// donut de rareté, top 10 popularité (favorites MAL), derniers ajoutés. 100 % serveur (RSC).
import Link from 'next/link';
import { RARITY_META, TYPE_META, type AkashaEntryCard, type AkashaType } from '@/lib/akasha/types';
import type { UniverseInsights } from '@/lib/akasha/queries';
import CountUp from './CountUp';

const TITLE = (color: string) => ({ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 });

const TYPE_ORDER: AkashaType[] = ['character', 'power', 'skill', 'artifact', 'place', 'status', 'profession'];
const RARITY_ORDER = ['legendary', 'epic', 'rare', 'common'] as const;

function RarityDonut({ byRarity, size = 120 }: { byRarity: Record<string, number>; size?: number }) {
  const total = RARITY_ORDER.reduce((s, r) => s + (byRarity[r] ?? 0), 0) || 1;
  const R = size / 2 - 9;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--bd)" strokeWidth={9} />
      {RARITY_ORDER.map((r) => {
        const v = byRarity[r] ?? 0;
        if (!v) return null;
        const len = (v / total) * C;
        const el = <circle key={r} cx={size / 2} cy={size / 2} r={R} fill="none" stroke={RARITY_META[r].color} strokeWidth={9} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />;
        offset += len;
        return el;
      })}
    </svg>
  );
}

export default function HubInsights({ insights, color }: { insights: UniverseInsights; color: string }) {
  const { total, byType, byRarity, topFav, recent } = insights;
  const maxFav = topFav[0]?.favorites || 1;
  const types = TYPE_ORDER.filter((t) => byType[t]);

  return (
    <>
      {/* Chiffres-clés animés */}
      <section>
        <div style={TITLE(color)}><span># Le monde en chiffres</span></div>
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          {types.map((t) => (
            <div key={t} style={{ flex: '1 0 92px', minWidth: 92, background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 12, padding: '11px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 22, color: 'var(--td)', lineHeight: 1 }}><CountUp to={byType[t]} /></div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--td3)', marginTop: 3 }}>{TYPE_META[t].plural}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Donut de rareté du panthéon */}
      {Object.keys(byRarity).length > 0 && (
        <section>
          <div style={TITLE(color)}><span>◆ Composition du panthéon</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 14, padding: '14px 16px', flexWrap: 'wrap' }}>
            <RarityDonut byRarity={byRarity} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 180 }}>
              {RARITY_ORDER.filter((r) => byRarity[r]).map((r) => (
                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 11, height: 11, borderRadius: 3, background: RARITY_META[r].color, flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td2)', flex: 1 }}>{RARITY_META[r].label}</span>
                  <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 15, color: RARITY_META[r].color }}>{byRarity[r]}</span>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)', width: 42, textAlign: 'right' }}>{Math.round((byRarity[r] / total) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Top 10 popularité (favorites MAL) */}
      {topFav.length > 0 && (
        <section>
          <div style={TITLE(color)}><span>🔥 Les plus aimés</span><span style={{ color: 'var(--td3)' }}>top {topFav.length} · votes de fans</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topFav.map((s, i) => (
              <Link key={s.slug} href={`/learn/akasha/${s.slug}`} className="akasha-card" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 11, padding: '6px 12px 6px 8px', ['--dc' as string]: color }}>
                <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15, color: i < 3 ? color : 'var(--td3)', width: 24, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                <div style={{ width: 34, height: 34, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
                  {s.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--bd)', marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max(6, (s.favorites / maxFav) * 100)}%`, background: color, borderRadius: 3 }} />
                  </div>
                </div>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, color: 'var(--td3)', flexShrink: 0 }}>★ {s.favorites.toLocaleString('fr-FR')}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Derniers ajoutés */}
      {recent.length > 0 && (
        <section>
          <div style={TITLE(color)}><span>✚ Derniers arrivés</span></div>
          <div className="hero-domabar" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
            {recent.map((s: AkashaEntryCard) => (
              <Link key={s.slug} href={`/learn/akasha/${s.slug}`} className="ak-tab" style={{ flexShrink: 0, width: 88, textDecoration: 'none', textAlign: 'center' }}>
                <div style={{ width: 88, height: 100, borderRadius: 11, overflow: 'hidden', border: '1px solid var(--bd2)', background: 'var(--bg2)' }}>
                  {s.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
                  )}
                </div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, color: 'var(--td2)', lineHeight: 1.15, marginTop: 5 }}>{s.name}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
