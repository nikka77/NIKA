// app/learn/akasha/page.tsx — Registre AKASHA (liste + recherche + filtres par type).
import type { Metadata } from 'next';
import Link from 'next/link';
import DomainHero from '@/components/DomainHero';
import { getDailyCard, listCategoryCounts, listEntries, listFamilyCounts, listUniverseCounts } from '@/lib/akasha/queries';
import { asAkashaType, TYPE_META, universeMeta } from '@/lib/akasha/types';
import { ALLOWED_FILTER_ATTRS, axisValueLabel, universeHubSlug } from '@/lib/akasha/universe-taxonomy';
import DailyCard from '@/components/akasha/DailyCard';
import AkashaGrid from '@/components/akasha/AkashaGrid';
import AkashaFilters from '@/components/akasha/AkashaFilters';
import CollectionStrip from '@/components/akasha/CollectionStrip';
import DailyBooster from '@/components/akasha/DailyBooster';
import UniverseRail from '@/components/akasha/UniverseRail';
import CategoryRail from '@/components/akasha/CategoryRail';

export const metadata: Metadata = {
  title: 'AKASHA — Le registre de tout ce qui existe | NIKA LEARN',
  description:
    'Akasha : le registre universel NIKA. Personnages, lieux, artefacts, métiers, statuts, pouvoirs et compétences — réels ou imaginés, reliés entre eux.',
  keywords: ['akasha', 'registre', 'lore', 'wiki', 'personnages', 'univers', 'NIKA learn'],
};

const ACCENT = '#7B5CF0';

type SearchParams = { type?: string; universe?: string; cat?: string; fam?: string; attr?: string; val?: string; search?: string; page?: string };

function pageHref(target: number, type: string | undefined, search: string, universe?: string, cat?: string, fam?: string, attr?: string, val?: string): string {
  const p = new URLSearchParams();
  if (universe) p.set('universe', universe);
  if (type) p.set('type', type);
  if (cat) p.set('cat', cat);
  if (cat && fam) p.set('fam', fam);
  if (attr && val) { p.set('attr', attr); p.set('val', val); }
  if (search) p.set('search', search);
  if (target > 1) p.set('page', String(target));
  const qs = p.toString();
  return qs ? `/learn/akasha?${qs}` : '/learn/akasha';
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
  const page = Number(sp.page) || 1;
  const isRoot = !type && !universe && !cat && !fam && !axisOn && !search && page === 1;

  const [{ entries, total, page: current, totalPages }, universeCounts, categoryCounts, familyCounts, daily] = await Promise.all([
    listEntries({ type, universe, cat, fam, attr, val, search, page }),
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

        {isRoot && <DailyBooster />}

        {daily && <DailyCard entry={daily} />}

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

        <AkashaFilters active={type} search={search} universe={universe} />

        <CategoryRail counts={categoryCounts} active={cat} famCounts={familyCounts} activeFam={fam} universe={universe} type={type} search={search} />

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
              gap: '1.2rem',
              marginTop: '2.5rem',
            }}
          >
            {current > 1 ? (
              <Link href={pageHref(current - 1, type, search, universe, cat, fam, axisOn ? attr : undefined, axisOn ? val : undefined)} className="ak-page" style={pageBtnStyle}>
                ← Précédent
              </Link>
            ) : (
              <span style={{ ...pageBtnStyle, opacity: 0.35, pointerEvents: 'none' }}>← Précédent</span>
            )}
            <span style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)' }}>
              Page {current} / {totalPages}
            </span>
            {current < totalPages ? (
              <Link href={pageHref(current + 1, type, search, universe, cat, fam, axisOn ? attr : undefined, axisOn ? val : undefined)} className="ak-page" style={pageBtnStyle}>
                Suivant →
              </Link>
            ) : (
              <span style={{ ...pageBtnStyle, opacity: 0.35, pointerEvents: 'none' }}>Suivant →</span>
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
