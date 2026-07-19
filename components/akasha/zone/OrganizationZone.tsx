'use client';
// components/akasha/zone/OrganizationZone.tsx — fiche ORGANISATION « organigramme-zone » (lot 4b).
// Les 402 status (équipages, clans, organisations) passent du gabarit générique le plus pauvre au
// plus spectaculaire : le collectif comme PUITS — figure centrale au cœur, premier cercle en orbite
// (taille/éclat = favorites), équipage complet en grappe ; prime totale en héros pour One Piece.
// Surface | canal re-scopable (contrat zone-context), membres via relations « appartient ».
import Link from 'next/link';
import { RARITY_META, universeMeta, universeWordmark, type AkashaEntryDetail } from '@/lib/akasha/types';
import { universeHubSlug } from '@/lib/akasha/universe-taxonomy';
import { ZoneProvider, useZone, type ZoneSelection } from './zone-context';

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const fav = (v: unknown): number => (typeof v === 'string' ? Number(v) || 0 : typeof v === 'number' ? v : 0);
const primeMd = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null;
  const n = Number(raw.replace(/[^0-9]/g, ''));
  return n > 0 ? `${(n / 1e9).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Md ฿` : null;
};

export default function OrganizationZone({ entry }: { entry: AkashaEntryDetail }) {
  return (
    <ZoneProvider>
      <ZoneInner entry={entry} />
    </ZoneProvider>
  );
}

function ZoneInner({ entry }: { entry: AkashaEntryDetail }) {
  const { sel, select } = useZone();
  const a = entry.attributes as Record<string, unknown>;
  const um = entry.universe ? universeMeta(entry.universe) : null;
  const accent = um?.color ?? '#E07038';
  const hub = entry.universe ? universeHubSlug(entry.universe) : undefined;
  const rar = entry.rarity ? RARITY_META[entry.rarity] : null;
  const scope = str(a.scope) ?? 'Organisation';
  const prime = primeMd(a.total_prime);

  // Membres (personnages « appartient » entrants), triés par popularité — la masse du puits.
  const members = entry.relationsIn
    .filter((r) => r.relation === 'appartient' && r.target.type === 'character')
    .map((r) => ({ slug: r.target.slug, name: r.target.name, img: r.target.image_url, favorites: fav(r.target.favorites) }))
    .sort((x, y) => y.favorites - x.favorites);
  const leader = members[0];
  const ring = members.slice(1, 9);
  const rest = members.slice(9);
  // Artefacts du collectif (navires, reliques rattachées).
  const arsenal = entry.relationsIn
    .filter((r) => r.relation === 'appartient' && r.target.type === 'artifact')
    .map((r) => ({ slug: r.target.slug, name: r.target.name }));

  const pick = (m: { slug: string; name: string; img?: string | null; favorites: number }, role: string) =>
    select({ kind: 'membre', slug: m.slug, name: m.name, img: m.img, favorites: m.favorites, role });

  return (
    <div className="ak-zone-grid">
      {/* ── SURFACE : le puits et ses orbites ────────────────── */}
      <section style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <span style={chip('var(--td3)')}>{scope}</span>
          {rar && <span style={chip(rar.color)}>{rar.label}</span>}
          {entry.universe && (() => {
            const mark = universeWordmark(entry.universe);
            const inner = mark
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={mark} alt={entry.universe} style={{ height: 15, width: 'auto', maxWidth: 92, objectFit: 'contain', display: 'block' }} />
              : <>{entry.universe}</>;
            return hub
              ? <Link href={`/learn/akasha/u/${hub}`} title={entry.universe} style={{ ...chip(accent), textDecoration: 'none' }}>{inner} ↗</Link>
              : <span style={chip('var(--td3)')}>{inner}</span>;
          })()}
        </div>
        <h1 style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase', fontSize: 'clamp(32px,5.5vw,68px)', lineHeight: 0.9, letterSpacing: '-0.01em', color: 'var(--td)', margin: '0 0 10px' }}>
          {entry.name}
        </h1>
        <div style={{ display: 'flex', gap: 18, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 20, fontVariantNumeric: 'tabular-nums' }}>
          {prime && (
            <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(20px,3vw,30px)', color: '#D4A017' }}>
              {prime}
              <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--td3)', marginLeft: 8 }}>Prime totale</span>
            </span>
          )}
          <span style={{ fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: 'var(--td3)' }}>
            <span style={{ color: accent }}>{members.length}</span> membre{members.length > 1 ? 's' : ''} au registre
          </span>
        </div>

        {/* Le puits : figure centrale + premier cercle en orbite (positions polaires). */}
        {leader ? (
          <div style={{ position: 'relative', width: 'min(100%, 520px)', aspectRatio: '1', margin: '0 auto' }}>
            <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
              <circle cx={50} cy={50} r={36} fill="none" stroke="var(--bd2)" strokeWidth={0.35} strokeDasharray="1.6 1.8" />
              <circle cx={50} cy={50} r={17} fill={`${accent}0A`} stroke={`${accent}44`} strokeWidth={0.4} />
            </svg>
            {/* Figure centrale — la plus grande masse. */}
            <button type="button" onClick={() => pick(leader, 'Figure centrale')}
              aria-pressed={sel?.kind === 'membre' && sel.slug === leader.slug}
              style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 2 }}>
              <span style={{ width: 104, height: 104, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${sel?.kind === 'membre' && sel.slug === leader.slug ? accent : 'var(--bd2)'}`, boxShadow: `0 0 34px -8px ${accent}AA`, background: 'var(--bg2)', display: 'block' }}>
                {leader.img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={leader.img} alt={leader.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
                )}
              </span>
              <span style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 800, color: 'var(--td)', lineHeight: 1.1, maxWidth: 130, textAlign: 'center' }}>{leader.name}</span>
            </button>
            {/* Premier cercle — orbite polaire, éclat selon les favoris. */}
            {ring.map((mb, i) => {
              const ang = -Math.PI / 2 + (i * 2 * Math.PI) / ring.length;
              const left = 50 + Math.cos(ang) * 36;
              const top = 50 + Math.sin(ang) * 36;
              const on = sel?.kind === 'membre' && sel.slug === mb.slug;
              return (
                <button key={mb.slug} type="button" onClick={() => pick(mb, 'Premier cercle')} title={mb.name} aria-pressed={on}
                  style={{ position: 'absolute', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, -50%)', background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 1 }}>
                  <span style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${on ? accent : 'var(--bd)'}`, boxShadow: on ? `0 0 18px -4px ${accent}` : '0 4px 14px -8px rgba(0,0,0,0.8)', background: 'var(--bg2)', display: 'block', transition: 'border-color .15s, box-shadow .15s' }}>
                    {mb.img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mb.img} alt={mb.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>Aucun membre relié dans le registre pour l'instant.</p>
        )}

        {/* Le reste de l'équipage — grappe compacte. */}
        {rest.length > 0 && (
          <div style={{ marginTop: 22, maxWidth: 640 }}>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent, marginBottom: 10 }}>
              Membres · {rest.length}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {rest.map((mb) => (
                <button key={mb.slug} type="button" onClick={() => pick(mb, 'Membre')} className="ak-tab"
                  aria-pressed={sel?.kind === 'membre' && sel.slug === mb.slug}
                  style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${sel?.kind === 'membre' && sel.slug === mb.slug ? accent : 'var(--bd2)'}`, background: sel?.kind === 'membre' && sel.slug === mb.slug ? `${accent}1C` : 'var(--bg2)', color: sel?.kind === 'membre' && sel.slug === mb.slug ? accent : 'var(--td2)' }}>
                  {mb.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {arsenal.length > 0 && (
          <div style={{ marginTop: 22, maxWidth: 640 }}>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#D4A017', marginBottom: 10 }}>
              Arsenal & navires · {arsenal.length}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {arsenal.map((it) => (
                <Link key={it.slug} href={`/learn/akasha/${it.slug}`} className="ak-tab"
                  style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 9, textDecoration: 'none', border: '1px solid rgba(212,160,23,0.4)', background: 'rgba(212,160,23,0.08)', color: '#D4A017' }}>
                  {it.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── CANAL ────────────────────────────────────────────── */}
      <aside className="ak-canal" aria-live="polite">
        <Canal entry={entry} accent={accent} scope={scope} prime={prime} memberCount={members.length} />
      </aside>
    </div>
  );
}

const chip = (color: string): React.CSSProperties => ({
  fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
  padding: '3px 10px', borderRadius: 20, color, background: 'var(--bg2)', border: '1px solid var(--bd2)', display: 'inline-flex', alignItems: 'center', gap: 5,
});

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--bd)' }}>
      <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)', flexShrink: 0 }}>{k}</span>
      <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
    </div>
  );
}

function Canal({ entry, accent, scope, prime, memberCount }: { entry: AkashaEntryDetail; accent: string; scope: string; prime: string | null; memberCount: number }) {
  const { sel, select } = useZone();
  const a = entry.attributes as Record<string, unknown>;
  const bio = str(a.bio) || str(a.descFr) || entry.summary;
  const membre = sel?.kind === 'membre' ? sel : null;

  return (
    <div style={{ border: '1px solid var(--bd)', borderTop: `2px solid ${accent}`, borderRadius: 14, background: 'var(--bg2)', padding: '16px 18px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid var(--bd)', paddingBottom: 10, marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--td3)' }}>
          Canal · <span style={{ color: accent }}>{membre ? membre.role ?? 'Membre' : 'Identité'}</span>
        </span>
        {membre && (
          <button type="button" onClick={() => select(null)} className="ak-tab"
            style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 14, border: '1px solid var(--bd2)', background: 'transparent', color: 'var(--td3)', cursor: 'pointer' }}>
            ↩ Identité
          </button>
        )}
      </div>

      {membre ? (
        <div>
          {membre.img && (
            <div style={{ width: 120, height: 150, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--bd2)', marginBottom: 12, background: 'var(--bg3)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={membre.img} alt={membre.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
            </div>
          )}
          <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase', fontSize: 22, lineHeight: 1.05, color: 'var(--td)', marginBottom: 8 }}>{membre.name}</div>
          {typeof membre.favorites === 'number' && membre.favorites > 0 && (
            <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: accent, marginBottom: 12, fontVariantNumeric: 'tabular-nums' }}>★ {membre.favorites.toLocaleString('fr-FR')} fans</div>
          )}
          <Link href={`/learn/akasha/${membre.slug}`} className="ak-cta"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, padding: '9px 16px', borderRadius: 10, border: `1px solid ${accent}66`, background: `${accent}14`, color: accent, textDecoration: 'none' }}>
            Ouvrir la fiche →
          </Link>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 14 }}>
            <Row k="Portée" v={scope} />
            {entry.universe && <Row k="Univers" v={entry.universe} />}
            <Row k="Effectif au registre" v={String(memberCount)} />
            {prime && <Row k="Prime totale" v={prime} />}
          </div>
          {bio && <p style={{ fontFamily: 'var(--fo)', fontSize: 13.5, lineHeight: 1.75, color: 'var(--td2)', whiteSpace: 'pre-line', margin: 0 }}>{bio}</p>}
        </div>
      )}
    </div>
  );
}
