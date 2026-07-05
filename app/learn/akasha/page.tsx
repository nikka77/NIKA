// app/learn/akasha/page.tsx — Registre AKASHA (liste + recherche + filtres par type).
import type { Metadata } from 'next';
import Link from 'next/link';
import DomainHero from '@/components/DomainHero';
import { getDailyCard, listCategoryCounts, listEntries, listFamilyCounts, listUniverseCounts } from '@/lib/akasha/queries';
import { asAkashaType, RARITY_META, TYPE_META, universeMeta } from '@/lib/akasha/types';
import { ALLOWED_FILTER_ATTRS, axisValueLabel, universeHubSlug } from '@/lib/akasha/universe-taxonomy';
import DailyCard from '@/components/akasha/DailyCard';
import AkashaGrid from '@/components/akasha/AkashaGrid';
import AkashaFilters from '@/components/akasha/AkashaFilters';
import CollectionStrip from '@/components/akasha/CollectionStrip';
import DailyBooster from '@/components/akasha/DailyBooster';
import UniverseRail from '@/components/akasha/UniverseRail';
import CategoryRail from '@/components/akasha/CategoryRail';
import DidYouKnow from '@/components/akasha/DidYouKnow';
import FilterBar from '@/components/akasha/FilterBar';
import { registryHref } from '@/lib/akasha/href';

export const metadata: Metadata = {
  title: 'AKASHA — Le registre de tout ce qui existe | NIKA LEARN',
  description:
    'Akasha : le registre universel NIKA. Personnages, lieux, artefacts, métiers, statuts, pouvoirs et compétences — réels ou imaginés, reliés entre eux.',
  keywords: ['akasha', 'registre', 'lore', 'wiki', 'personnages', 'univers', 'NIKA learn'],
};

const ACCENT = '#7B5CF0';

type SearchParams = { type?: string; universe?: string; cat?: string; fam?: string; attr?: string; val?: string; search?: string; rarity?: string; sort?: string; page?: string };

// Toutes les URLs passent par le builder CENTRAL registryHref (lib/akasha/href) — Refonte L3.
function pageHref(target: number, type: string | undefined, search: string, universe?: string, cat?: string, fam?: string, attr?: string, val?: string, rarity?: string, sort?: string): string {
  return registryHref({ universe, type, cat, fam, attr, val, rarity, sort, search, page: target });
}

export default async function AkashaPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const sp = (await searchParams) ?? {};
  const type = asAkashaType(sp.type);
  const universe = (sp.universe ?? '').trim() || undefined;
  const cat = (sp.cat ?? '').trim() || undefined;
  const fam = (sp.fam ?? '').trim() || undefined;
  const attr = (sp.attr ?? '').trim() || undefined;
  const val = (sp.val ?? '').trim() || undefined;
  const axisOn = !!(attr && val && ALLOWED_FILTER_ATTRS.has(attr));
  const search = (sp.search ?? '').trim();
  const rarity = ['legendary', 'epic', 'rare', 'common'].includes((sp.rarity ?? '').trim()) ? (sp.rarity ?? '').trim() : undefined;
  const sort = ['pop', 'alpha'].includes((sp.sort ?? '').trim()) ? (sp.sort ?? '').trim() : undefined;
  const page = Number(sp.page) || 1;
  const isRoot = !type && !universe && !cat && !fam && !axisOn && !search && !rarity && !sort && page === 1;

  const [{ entries, total, page: current, totalPages }, universeCounts, categoryCounts, familyCounts, daily] = await Promise.all([
    listEntries({ type, universe, cat, fam, attr, val, search, rarity, sort, page }),
    listUniverseCounts(),
    listCategoryCounts({ type, universe }),
    listFamilyCounts({ universe, cat }),
    isRoot ? getDailyCard(new Date().toISOString().slice(0, 10)) : Promise.resolve(null),
  ]);
  const hubSlug = universe ? universeHubSlug(universe) : undefined;

  return (
    <main>
      {/* ── HERO ──────────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(180deg, #0B0820 0%, #140C30 55%, var(--bg) 100%)',
          borderBottom: '1px solid var(--bd)',
          padding: 'clamp(2.5rem,6vw,4.5rem) 1.4rem 2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <DomainHero slug="learn" />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <Link
            href="/learn"
            style={{
              fontFamily: 'var(--fo)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--td3)',
              textDecoration: 'none',
            }}
          >
            ← NIKA LEARN
          </Link>

          <div
            style={{
              fontFamily: 'var(--fo)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: ACCENT,
              margin: '1rem 0 0.6rem',
            }}
          >
            ✦ Registre universel
          </div>

          <h1
            className="akasha-title"
            style={{
              fontFamily: 'var(--fe)',
              fontSize: 'clamp(52px,11vw,120px)',
              fontWeight: 900,
              fontStyle: 'italic',
              textTransform: 'uppercase',
              color: 'var(--td)',
              lineHeight: 0.86,
              margin: 0,
            }}
          >
            Akasha
          </h1>

          <p
            style={{
              fontFamily: 'var(--fo)',
              fontSize: 'clamp(14px,1.6vw,17px)',
              color: 'var(--td2)',
              maxWidth: 520,
              lineHeight: 1.7,
              margin: '1rem 0 1.8rem',
            }}
          >
            Le registre de tout ce qui existe, réel ou imaginé — personnages, lieux, artefacts,
            métiers, pouvoirs et compétences, reliés entre eux.
          </p>

          {/* Recherche : formulaire GET → URL partageable, zéro JS client */}
          <form
            method="get"
            action="/learn/akasha"
            style={{ display: 'flex', gap: 8, maxWidth: 520, flexWrap: 'wrap' }}
          >
            {type && <input type="hidden" name="type" value={type} />}
            {universe && <input type="hidden" name="universe" value={universe} />}
            {cat && <input type="hidden" name="cat" value={cat} />}
            {cat && fam && <input type="hidden" name="fam" value={fam} />}
            {axisOn && <input type="hidden" name="attr" value={attr} />}
            {axisOn && <input type="hidden" name="val" value={val} />}
            <input
              name="search"
              defaultValue={search}
              placeholder="Rechercher une entité, un univers…"
              aria-label="Rechercher dans le registre"
              className="ak-search"
              style={{
                flex: 1,
                minWidth: 200,
                fontFamily: 'var(--fo)',
                fontSize: 14,
                color: 'var(--td)',
                background: 'var(--bg2)',
                border: '1px solid var(--bd2)',
                borderRadius: 10,
                padding: '11px 14px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                fontFamily: 'var(--fe)',
                fontSize: 14,
                fontWeight: 800,
                fontStyle: 'italic',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                padding: '11px 22px',
                borderRadius: 10,
                border: 'none',
                background: ACCENT,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Chercher
            </button>
          </form>
        </div>
      </div>

      {/* ── FILTRES + GRILLE ──────────────────────────────────── */}
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: 'clamp(1.4rem,3vw,2rem) 1.4rem clamp(3rem,7vw,5rem)',
        }}
      >
        <CollectionStrip />

        {/* CTA Album (L5) : le but de la collection devient visible — sets à compléter. */}
        <Link href="/learn/akasha/album" className="dom-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, textDecoration: 'none', background: 'linear-gradient(120deg, rgba(212,160,23,0.10), var(--bg2))', border: '1px solid rgba(212,160,23,0.4)', borderRadius: 13, padding: '0.75rem 1rem', marginBottom: '1.4rem' }}>
          <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 15, textTransform: 'uppercase', color: 'var(--td)' }}>🗂 L&rsquo;Album — 20 sets à compléter</span>
          <span aria-hidden style={{ fontFamily: 'var(--fo)', fontSize: 16, color: '#D4A017' }}>→</span>
        </Link>

        {isRoot && <DailyBooster />}

        {daily && <DailyCard entry={daily} />}

        {isRoot && (
          <div style={{ marginBottom: '1.4rem' }}>
            <DidYouKnow />
          </div>
        )}

        <UniverseRail counts={universeCounts} active={universe} type={type} search={search} />

        {universe && hubSlug && (
          <Link
            href={`/learn/akasha/u/${hubSlug}`}
            className="ak-tab"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', fontFamily: 'var(--fe)', fontSize: 13.5, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.04em', textTransform: 'uppercase', padding: '9px 18px', borderRadius: 11, marginBottom: '1.2rem', border: `1px solid ${universeMeta(universe).color}66`, background: `${universeMeta(universe).color}1A`, color: universeMeta(universe).color }}
          >
            {universeMeta(universe).emoji} Explorer le hub {universe} →
          </Link>
        )}

        <AkashaFilters active={type} search={search} universe={universe} keep={{ cat, fam, attr: axisOn ? attr : undefined, val: axisOn ? val : undefined, rarity, sort }} />

        {/* ── GEMMES DE RARETÉ (?rarity=) — filtre TCG, toggle par palier ── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '0.2rem 0 1.1rem' }}>
          {(['legendary', 'epic', 'rare', 'common'] as const).map((r) => {
            const meta = RARITY_META[r];
            const active = rarity === r;
            return (
              <Link
                key={r}
                href={pageHref(1, type, search, universe, cat, fam, axisOn ? attr : undefined, axisOn ? val : undefined, active ? undefined : r)}
                className={active ? `ak-r-${r}` : undefined}
                style={{
                  fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                  padding: '5px 12px', borderRadius: 20, textDecoration: 'none',
                  color: active ? meta.color : 'var(--td3)',
                  background: active ? `${meta.color}1A` : 'var(--bg2)',
                  border: `1px solid ${active ? meta.color : 'var(--bd2)'}`,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, transform: 'rotate(45deg)', background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
                {meta.label}
              </Link>
            );
          })}
          {rarity && (
            <Link href={pageHref(1, type, search, universe, cat, fam, axisOn ? attr : undefined, axisOn ? val : undefined)} style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: 'var(--td3)', textDecoration: 'none', padding: '5px 10px' }}>
              ✕ Toutes raretés
            </Link>
          )}
        </div>

        <CategoryRail counts={categoryCounts} active={cat} famCounts={familyCounts} activeFam={fam} universe={universe} type={type} search={search} />

        {/* ── FILTRES ACTIFS (chips supprimables) + TRI — fin des filtres fantômes ── */}
        <FilterBar f={{ universe, type, cat, fam, attr: axisOn ? attr : undefined, val: axisOn ? val : undefined, rarity, sort, search }} />
        {total > 0 && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', margin: '0 0 0.9rem' }}>
            <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--td3)' }}>Tri :</span>
            {([['', 'Rareté'], ['pop', 'Popularité'], ['alpha', 'A → Z']] as const).map(([key, label]) => {
              const active = (sort ?? '') === key;
              return (
                <Link key={label} href={pageHref(1, type, search, universe, cat, fam, axisOn ? attr : undefined, axisOn ? val : undefined, rarity, key || undefined)}
                  style={{ fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, textDecoration: 'none', padding: '4px 11px', borderRadius: 20, color: active ? '#7B5CF0' : 'var(--td3)', background: active ? 'rgba(123,92,240,0.14)' : 'transparent', border: `1px solid ${active ? '#7B5CF0' : 'var(--bd2)'}` }}>
                  {label}
                </Link>
              );
            })}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: '1rem',
            flexWrap: 'wrap',
            margin: '1.3rem 0 1rem',
          }}
        >
          <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', letterSpacing: '0.03em' }}>
            {total} entrée{total > 1 ? 's' : ''}
            {universe ? ` · ${universe}` : ''}
            {type ? ` · ${TYPE_META[type].plural}` : ''}
            {cat ? ` · ${cat}` : ''}
            {cat && fam ? ` · ${fam.includes('·') ? fam.slice(fam.lastIndexOf('·') + 1).trim() : fam}` : ''}
            {axisOn ? ` · ${axisValueLabel(universe ?? '', attr!, val!)}` : ''}
            {search ? ` · « ${search} »` : ''}
          </div>
          <Link
            href="/learn/akasha/random"
            style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: '#7B5CF0', textDecoration: 'none', border: '1px solid rgba(123,92,240,0.4)', borderRadius: 8, padding: '5px 12px' }}
          >
            ✦ Surprends-moi
          </Link>
        </div>

        {entries.length > 0 ? (
          <AkashaGrid entries={entries} />
        ) : (
          <div
            style={{
              background: 'var(--bg2)',
              border: '1px dashed rgba(123,92,240,0.3)',
              borderRadius: 14,
              padding: '3.5rem 2rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 42, marginBottom: '0.7rem' }}>✦</div>
            <p style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', fontWeight: 700, color: 'var(--td)', marginBottom: '0.4rem' }}>
              Aucune entité dans ce filtre
            </p>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '1.2rem' }}>
              {search || type || universe || cat || fam || axisOn
                ? 'Essaie une autre recherche ou réinitialise les filtres.'
                : 'Le registre se remplit — reviens bientôt.'}
            </p>
            {(search || type || universe || cat || fam || axisOn) && (
              <Link
                href="/learn/akasha"
                style={{
                  fontFamily: 'var(--fo)',
                  fontSize: 13,
                  fontWeight: 700,
                  color: ACCENT,
                  textDecoration: 'none',
                  border: '1px solid rgba(123,92,240,0.4)',
                  borderRadius: 8,
                  padding: '8px 16px',
                }}
              >
                Réinitialiser
              </Link>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap' as const,
              marginTop: '2.5rem',
            }}
          >
            {current > 1 ? (
              <Link href={pageHref(current - 1, type, search, universe, cat, fam, axisOn ? attr : undefined, axisOn ? val : undefined, rarity, sort)} className="ak-page" style={pageBtnStyle}>
                ←
              </Link>
            ) : (
              <span style={{ ...pageBtnStyle, opacity: 0.35, pointerEvents: 'none' }}>←</span>
            )}
            {/* Fenêtre de pages numérotées : 1 … c-1 c c+1 … N (Refonte L3) */}
            {(() => {
              const wanted = new Set([1, current - 1, current, current + 1, totalPages].filter((n) => n >= 1 && n <= totalPages));
              const nums = Array.from(wanted).sort((a, b) => a - b);
              const items: (number | '…')[] = [];
              nums.forEach((n, i) => { if (i > 0 && n - nums[i - 1] > 1) items.push('…'); items.push(n); });
              return items.map((it, i) =>
                it === '…' ? (
                  <span key={`e${i}`} style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>…</span>
                ) : it === current ? (
                  <span key={it} style={{ ...pageBtnStyle, background: 'rgba(123,92,240,0.18)', borderColor: '#7B5CF0', color: '#7B5CF0', pointerEvents: 'none' }}>{it}</span>
                ) : (
                  <Link key={it} href={pageHref(it, type, search, universe, cat, fam, axisOn ? attr : undefined, axisOn ? val : undefined, rarity, sort)} className="ak-page" style={pageBtnStyle}>{it}</Link>
                ),
              );
            })()}
            {current < totalPages ? (
              <Link href={pageHref(current + 1, type, search, universe, cat, fam, axisOn ? attr : undefined, axisOn ? val : undefined, rarity, sort)} className="ak-page" style={pageBtnStyle}>
                →
              </Link>
            ) : (
              <span style={{ ...pageBtnStyle, opacity: 0.35, pointerEvents: 'none' }}>→</span>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

const pageBtnStyle = {
  fontFamily: 'var(--fo)',
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--td)',
  textDecoration: 'none',
  border: '1px solid var(--bd2)',
  borderRadius: 8,
  padding: '8px 16px',
} as const;
