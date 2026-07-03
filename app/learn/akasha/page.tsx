// app/learn/akasha/page.tsx — Registre AKASHA (liste + recherche + filtres par type).
import type { Metadata } from 'next';
import Link from 'next/link';
import DomainHero from '@/components/DomainHero';
import { listCategoryCounts, listEntries, listUniverseCounts } from '@/lib/akasha/queries';
import { asAkashaType, TYPE_META } from '@/lib/akasha/types';
import AkashaGrid from '@/components/akasha/AkashaGrid';
import AkashaFilters from '@/components/akasha/AkashaFilters';
import CollectionStrip from '@/components/akasha/CollectionStrip';
import UniverseRail from '@/components/akasha/UniverseRail';
import CategoryRail from '@/components/akasha/CategoryRail';

export const metadata: Metadata = {
  title: 'AKASHA — Le registre de tout ce qui existe | NIKA LEARN',
  description:
    'Akasha : le registre universel NIKA. Personnages, lieux, artefacts, métiers, statuts, pouvoirs et compétences — réels ou imaginés, reliés entre eux.',
  keywords: ['akasha', 'registre', 'lore', 'wiki', 'personnages', 'univers', 'NIKA learn'],
};

const ACCENT = '#7B5CF0';

type SearchParams = { type?: string; universe?: string; cat?: string; search?: string; page?: string };

function pageHref(target: number, type: string | undefined, search: string, universe?: string, cat?: string): string {
  const p = new URLSearchParams();
  if (universe) p.set('universe', universe);
  if (type) p.set('type', type);
  if (cat) p.set('cat', cat);
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
  const search = (sp.search ?? '').trim();
  const page = Number(sp.page) || 1;

  const [{ entries, total, page: current, totalPages }, universeCounts, categoryCounts] = await Promise.all([
    listEntries({ type, universe, cat, search, page }),
    listUniverseCounts(),
    listCategoryCounts({ type, universe }),
  ]);

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

        <UniverseRail counts={universeCounts} active={universe} type={type} search={search} />

        <AkashaFilters active={type} search={search} universe={universe} />

        <CategoryRail counts={categoryCounts} active={cat} universe={universe} type={type} search={search} />

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
            {search ? ` · « ${search} »` : ''}
          </div>
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
              {search || type || universe || cat
                ? 'Essaie une autre recherche ou réinitialise les filtres.'
                : 'Le registre se remplit — reviens bientôt.'}
            </p>
            {(search || type || universe || cat) && (
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
              <Link href={pageHref(current - 1, type, search, universe, cat)} className="ak-page" style={pageBtnStyle}>
                ← Précédent
              </Link>
            ) : (
              <span style={{ ...pageBtnStyle, opacity: 0.35, pointerEvents: 'none' }}>← Précédent</span>
            )}
            <span style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)' }}>
              Page {current} / {totalPages}
            </span>
            {current < totalPages ? (
              <Link href={pageHref(current + 1, type, search, universe, cat)} className="ak-page" style={pageBtnStyle}>
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
