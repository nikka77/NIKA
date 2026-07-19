'use client';
// components/akasha/zone/EraZone.tsx — fiche À ÈRES « rouleau temporel » (lot 4c).
// Généralisation du pattern CharacterZone aux 37+ entités chronologiques (lieux, artefacts,
// organisations à frises) : la frise pilote UNE grande illustration d'époque, le canal se
// re-scope sur l'ère courante (dirigeant, événement, menace, récit) ; les habitants liés
// (« habite », Konoha : 452 relations) forment la grappe vivante du lieu.
import { useState } from 'react';
import Link from 'next/link';
import ArcFrieze from '../ArcFrieze';
import { RARITY_META, TYPE_META, universeMeta, universeWordmark, type AkashaEntryDetail } from '@/lib/akasha/types';
import { universeHubSlug } from '@/lib/akasha/universe-taxonomy';
import { ZoneProvider, useZone } from './zone-context';

interface Era { img?: string; label?: string; period?: string; event?: string; leader?: string; threat?: string; summary?: string }
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const fav = (v: unknown): number => (typeof v === 'string' ? Number(v) || 0 : typeof v === 'number' ? v : 0);

// Libellés des champs d'ère selon le type d'entité (repris de l'ancien PlaceView).
const STAT_LABELS: Record<string, { leader: string; event: string; threat: string }> = {
  artifact: { leader: 'Porteur', event: 'Fait marquant', threat: 'Particularité' },
  profession: { leader: 'Figure', event: 'Technique clé', threat: 'Exigence' },
  status: { leader: 'Figure', event: 'Événement', threat: 'Dōjutsu' },
  power: { leader: 'Maître', event: 'Forme', threat: 'Rang' },
  skill: { leader: 'Porteur', event: 'Éveil', threat: 'Pouvoir' },
  place: { leader: 'Dirigeant', event: 'Événement', threat: 'Menace' },
};

export default function EraZone({ entry }: { entry: AkashaEntryDetail }) {
  return (
    <ZoneProvider>
      <ZoneInner entry={entry} />
    </ZoneProvider>
  );
}

function ZoneInner({ entry }: { entry: AkashaEntryDetail }) {
  const { sel, select } = useZone();
  const [eraIdx, setEraIdx] = useState(0);
  const a = entry.attributes as Record<string, unknown>;
  const um = entry.universe ? universeMeta(entry.universe) : null;
  const accent = um?.color ?? TYPE_META[entry.type].color;
  const hub = entry.universe ? universeHubSlug(entry.universe) : undefined;
  const rar = entry.rarity ? RARITY_META[entry.rarity] : null;
  const labels = STAT_LABELS[entry.type] ?? STAT_LABELS.place;

  const eras = (Array.isArray(a.eras) ? (a.eras as Era[]) : []).filter((e) => e && typeof e === 'object');
  const era = eras[eraIdx] ?? {};
  const image = str(era.img) ?? entry.image_url;
  const friezeItems: Record<string, unknown>[] = eras.map((e) => ({ label: e.label, url: e.img, age: e.period, arc: e.event }));
  const quote = a.quote && typeof a.quote === 'object' ? (a.quote as { text?: string; author?: string }) : null;

  // Habitants / figures liées (relations entrantes « habite »), triés par popularité.
  const residents = entry.relationsIn
    .filter((r) => r.relation === 'habite' && r.target.type === 'character')
    .map((r) => ({ slug: r.target.slug, name: r.target.name, img: r.target.image_url, favorites: fav(r.target.favorites) }))
    .sort((x, y) => y.favorites - x.favorites);

  const onEra = (i: number) => { setEraIdx(i); select(null); };

  return (
    <div className="ak-zone-grid">
      {/* ── SURFACE : l'illustration d'époque pilotée par la frise ── */}
      <section style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <span style={chip('var(--td3)')}>{TYPE_META[entry.type].label}</span>
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
        <h1 style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase', fontSize: 'clamp(34px,6vw,72px)', lineHeight: 0.9, letterSpacing: '-0.01em', color: 'var(--td)', margin: '0 0 18px' }}>
          {entry.name}
        </h1>

        <div style={{ position: 'relative', width: '100%', maxWidth: 640, aspectRatio: '16/10', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--bd2)', background: 'var(--bg2)', boxShadow: `0 40px 90px -50px ${accent}88` }}>
          {image && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img aria-hidden src={image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(26px) brightness(0.45)', transform: 'scale(1.25)' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt={`${entry.name} — ${str(era.label) ?? ''}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
            </>
          )}
          {eras.length > 0 && (str(era.label) || str(era.period)) && (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '26px 16px 12px', background: 'linear-gradient(180deg, transparent, rgba(3,7,15,0.85))', fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--td2)' }}>
              {str(era.label)}{str(era.period) && <span style={{ color: 'var(--td3)' }}> · {str(era.period)}</span>}
            </div>
          )}
        </div>

        {eras.length > 1 && (
          <div style={{ marginTop: 18, maxWidth: 640 }}>
            <ArcFrieze forms={friezeItems} sel={eraIdx} onSelect={onEra} color={accent} heading={`◆ Chronologie — ${eras.length} ères`} pixelated={false} />
          </div>
        )}

        {quote?.text && (
          <blockquote style={{ margin: '20px 0 0', maxWidth: 640, padding: '12px 16px', borderLeft: `2px solid ${accent}`, background: `${accent}0D`, borderRadius: '0 10px 10px 0' }}>
            <p style={{ margin: 0, fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 700, fontSize: 15.5, lineHeight: 1.45, color: 'var(--td)' }}>{quote.text}</p>
            {quote.author && <div style={{ marginTop: 5, fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: accent }}>{quote.author}</div>}
          </blockquote>
        )}

        {residents.length > 0 && (
          <div style={{ marginTop: 24, maxWidth: 640 }}>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent, marginBottom: 10 }}>
              Figures du lieu · {residents.length}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {residents.slice(0, 18).map((rz) => {
                const on = sel?.kind === 'membre' && sel.slug === rz.slug;
                return (
                  <button key={rz.slug} type="button" className="ak-tab" aria-pressed={on}
                    onClick={() => select({ kind: 'membre', slug: rz.slug, name: rz.name, img: rz.img, favorites: rz.favorites, role: 'Figure du lieu' })}
                    style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${on ? accent : 'var(--bd2)'}`, background: on ? `${accent}1C` : 'var(--bg2)', color: on ? accent : 'var(--td2)' }}>
                    {rz.name}
                  </button>
                );
              })}
              {residents.length > 18 && <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', alignSelf: 'center' }}>+ {residents.length - 18} autres</span>}
            </div>
          </div>
        )}
      </section>

      {/* ── CANAL : l'ère courante, ou la figure sélectionnée ── */}
      <aside className="ak-canal" aria-live="polite">
        <Canal entry={entry} accent={accent} era={era} labels={labels} />
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
      <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td)', textAlign: 'right' }}>{v}</span>
    </div>
  );
}

function Canal({ entry, accent, era, labels }: { entry: AkashaEntryDetail; accent: string; era: Era; labels: { leader: string; event: string; threat: string } }) {
  const { sel, select } = useZone();
  const a = entry.attributes as Record<string, unknown>;
  const bio = str(a.bio) || str(a.descFr) || entry.summary;
  const membre = sel?.kind === 'membre' ? sel : null;

  return (
    <div style={{ border: '1px solid var(--bd)', borderTop: `2px solid ${accent}`, borderRadius: 14, background: 'var(--bg2)', padding: '16px 18px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid var(--bd)', paddingBottom: 10, marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--td3)' }}>
          Canal · <span style={{ color: accent }}>{membre ? membre.role ?? 'Figure' : str(era.label) ?? 'Identité'}</span>
        </span>
        {membre && (
          <button type="button" onClick={() => select(null)} className="ak-tab"
            style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 14, border: '1px solid var(--bd2)', background: 'transparent', color: 'var(--td3)', cursor: 'pointer' }}>
            ↩ L'ère
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
            {str(era.period) && <Row k="Période" v={era.period!} />}
            {str(era.leader) && <Row k={labels.leader} v={era.leader!} />}
            {str(era.event) && <Row k={labels.event} v={era.event!} />}
            {str(era.threat) && <Row k={labels.threat} v={era.threat!} />}
          </div>
          {str(era.summary) && <p style={{ fontFamily: 'var(--fo)', fontSize: 13.5, lineHeight: 1.75, color: 'var(--td2)', whiteSpace: 'pre-line', margin: '0 0 14px' }}>{era.summary}</p>}
          {bio && bio !== str(era.summary) && <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, lineHeight: 1.7, color: 'var(--td3)', whiteSpace: 'pre-line', margin: 0 }}>{bio}</p>}
        </div>
      )}
    </div>
  );
}
