'use client';
// components/akasha/AkashaList.tsx — LISTE + APERÇU (cycle 3, « zéro carte » — décision Dan).
// Remplace les grilles de tuiles : rangées denses séparées par des hairlines (façon écran de
// sélection AAA / Linear) + panneau d'aperçu sticky qui se re-scope au survol/clic. La rangée
// est un vrai lien (SSR/SEO intacts) ; l'aperçu par défaut est la première entrée.
// Mobile (< 980px) : rangées seules, navigation directe.
// `variant: 'strip'` (lot 1c) — même vocabulaire sans boîte-carte pour les grappes secondaires
// (piliers de hub, voyages dans le temps, « voir aussi », vitrines de collection) : un rail
// horizontal de rangées compactes, sans panneau d'aperçu. AUCUN composant de plus (règle de la maison).
import { useState } from 'react';
import Link from 'next/link';
import { RARITY_META, TYPE_META, universeMeta, universeWordmark, type AkashaEntryCard } from '@/lib/akasha/types';
import { flavorText } from '@/lib/akasha/flavor';

export default function AkashaList({ entries, variant = 'list' }: { entries: AkashaEntryCard[]; variant?: 'list' | 'strip' }) {
  const [idx, setIdx] = useState(0);
  const sel = entries[Math.min(idx, entries.length - 1)];
  if (!entries.length) return null;

  if (variant === 'strip') return <Strip entries={entries} />;

  return (
    <div className="ak-list-grid">
      {/* ── LES RANGÉES ─────────────────────────────────────── */}
      <div role="list" style={{ minWidth: 0, borderTop: '1px solid var(--bd)' }}>
        {entries.map((e, i) => {
          const uni = e.universe ? universeMeta(e.universe) : null;
          const rar = e.rarity ? RARITY_META[e.rarity] : null;
          const on = i === idx;
          return (
            <Link
              key={e.slug}
              role="listitem"
              href={`/learn/akasha/${e.slug}`}
              className="ak-list-row"
              onMouseEnter={() => setIdx(i)}
              onFocus={() => setIdx(i)}
              style={{ ['--uc' as string]: uni?.color ?? 'var(--purple)', background: on ? 'var(--bg2)' : 'transparent', boxShadow: on ? 'inset 2px 0 0 var(--uc)' : 'none' }}
            >
              <span className="ak-list-thumb" aria-hidden>
                {e.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.image_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
                ) : (
                  <span style={{ width: 10, height: 10, transform: 'rotate(45deg)', borderRadius: 2, background: TYPE_META[e.type].color, display: 'block', margin: 'auto' }} />
                )}
              </span>
              <span style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 13.5, fontWeight: 700, color: on ? 'var(--td)' : 'var(--td2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {e.name}
                </span>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 600, color: 'var(--td3)', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {uni && <><span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: uni.color, display: 'inline-block', flexShrink: 0 }} />{e.universe}</>}
                  {e.category && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>· {e.category}</span>}
                </span>
              </span>
              {rar && e.rarity !== 'common' && (
                <span aria-hidden title={rar.label} style={{ width: 8, height: 8, transform: 'rotate(45deg)', borderRadius: 2, background: rar.color, boxShadow: `0 0 7px ${rar.color}`, flexShrink: 0 }} />
              )}
              <span aria-hidden style={{ fontFamily: 'var(--fo)', fontSize: 12, color: on ? 'var(--uc)' : 'var(--td3)', flexShrink: 0 }}>→</span>
            </Link>
          );
        })}
      </div>

      {/* ── L'APERÇU (sticky, re-scopé au survol) ───────────── */}
      {sel && <Preview key={sel.slug} entry={sel} />}
    </div>
  );
}

/** Rail horizontal de rangées compactes — même hairline que la liste, sans panneau d'aperçu.
 *  Pas de boîte (aucun `border` plein, aucun `borderRadius: 12`, aucune pastille en absolu) :
 *  vignette arrondie type avatar, nom, point-univers. */
function Strip({ entries }: { entries: AkashaEntryCard[] }) {
  return (
    <div role="list" className="hero-domabar ak-strip" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}>
      {entries.map((e) => {
        const uni = e.universe ? universeMeta(e.universe) : null;
        const rar = e.rarity ? RARITY_META[e.rarity] : null;
        return (
          <Link key={e.slug} role="listitem" href={`/learn/akasha/${e.slug}`} className="ak-strip-item">
            <span className="ak-strip-thumb" aria-hidden style={{ ['--tc' as string]: TYPE_META[e.type].color }}>
              {e.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.image_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
              ) : (
                <span style={{ width: 12, height: 12, transform: 'rotate(45deg)', borderRadius: 3, background: TYPE_META[e.type].color, display: 'block' }} />
              )}
              {/* PAS DE PASTILLE EN POSITION ABSOLUE ICI (08/08). Une vignette + une pastille de
                  rareté posée dans son coin, c'est exactement la signature de la « boîte-carte »
                  que ce lot devait faire disparaître — la variante `strip` la réintroduisait au
                  moment même où elle remplaçait AkashaMosaic. La rareté se dit dans le filet du
                  nom, en typographie, pas en décoration flottante. */}
            </span>
            <span className="ak-strip-name">
              {e.name}
              {rar && rar !== RARITY_META.common && (
                // La rareté DANS la ligne, en typographie : elle se lit, elle ne décore pas.
                <span style={{ marginLeft: 6, fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: rar.color }}>
                  {rar.label}
                </span>
              )}
            </span>
            {uni && (
              <span className="ak-strip-uni">
                <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: uni.color, display: 'inline-block', flexShrink: 0 }} />
                {e.universe}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function Preview({ entry }: { entry: AkashaEntryCard }) {
  const uni = entry.universe ? universeMeta(entry.universe) : null;
  const accent = uni?.color ?? 'var(--purple)';
  const rar = entry.rarity ? RARITY_META[entry.rarity] : null;
  const mark = entry.universe ? universeWordmark(entry.universe) : null;
  const flavor = flavorText(entry.descFr);
  const text = flavor ?? entry.summary;

  return (
    <aside className="ak-canal ak-list-preview" aria-live="polite" style={{ borderTop: `2px solid ${accent}` }}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', overflow: 'hidden', background: 'var(--bg3)' }}>
        {entry.image_url && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img aria-hidden src={entry.image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(22px) brightness(0.45) saturate(1.15)', transform: 'scale(1.25)' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={entry.image_url} alt={entry.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
          </>
        )}
      </div>
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: TYPE_META[entry.type].color }}>
            {TYPE_META[entry.type].label}
          </span>
          {rar && <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: rar.color }}>{rar.label}</span>}
          {mark && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mark} alt={entry.universe ?? ''} style={{ height: 13, width: 'auto', maxWidth: 80, objectFit: 'contain', marginLeft: 'auto' }} />
          )}
        </div>
        <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase', fontSize: 'clamp(20px,2vw,26px)', lineHeight: 0.95, color: 'var(--td)', marginBottom: 8 }}>
          {entry.name}
        </div>
        {text && (
          <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, lineHeight: 1.65, color: 'var(--td2)', fontStyle: flavor ? 'italic' : 'normal', margin: '0 0 12px', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {flavor ? `« ${text} »` : text}
          </p>
        )}
        <Link href={`/learn/akasha/${entry.slug}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, padding: '9px 16px', border: `1px solid ${accent}66`, background: `${accent}12`, color: accent, textDecoration: 'none', borderRadius: 6 }}>
          Ouvrir la fiche →
        </Link>
      </div>
    </aside>
  );
}
