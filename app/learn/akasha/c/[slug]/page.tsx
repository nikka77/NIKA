// app/learn/akasha/c/[slug]/page.tsx — VITRINE DE COLLECTION (Refonte L7) : une catégorie mise en
// scène en sections par sous-type canon (Fruits par type, épées par grade Meito). Config-driven.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { COLLECTION_SHOWCASES, showcaseBySlug } from '@/lib/akasha/collections';
import { listCollectionEntries } from '@/lib/akasha/queries';
import { universeMeta, type AkashaEntryCard } from '@/lib/akasha/types';
import { hubVisual, taxonomyByName, universeHubSlug } from '@/lib/akasha/universe-taxonomy';
import AkashaList from '@/components/akasha/AkashaList';
import UniverseShell from '@/components/akasha/UniverseShell';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return COLLECTION_SHOWCASES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = showcaseBySlug(slug);
  if (!c) return { title: 'Collection introuvable — AKASHA' };
  const url = `${SITE_URL}/learn/akasha/c/${slug}`;
  const title = `${c.title} — ${c.universe} | AKASHA`;
  const ogTitle = `${c.title} — ${c.universe}`;
  // Sans ces deux blocs, la page héritait de l'openGraph de app/layout.tsx : les 5 collections du
  // plan de site partageaient la carte « NIKA — La super-app de la Côte d'Azur ». Mesuré au rendu
  // le 10/08/2026, cf. data/audits/meta-partage-routes-voisines-*.
  return {
    title,
    description: c.tagline,
    alternates: { canonical: url },
    openGraph: { title: ogTitle, description: c.tagline, url, siteName: 'AKASHA — le registre', locale: 'fr_FR', type: 'article' },
    twitter: { card: 'summary_large_image', title: ogTitle, description: c.tagline },
  };
}

export default async function CollectionShowcasePage({ params }: Props) {
  const c = showcaseBySlug((await params).slug);
  if (!c) notFound();
  const m = universeMeta(c.universe);
  const vis = hubVisual(universeHubSlug(c.universe) ?? '');
  const kanji = taxonomyByName(c.universe)?.kanji;
  // cap volontairement large (même convention que listUniverseIndex) : le Grimoire des Jutsu
  // porte à lui seul 1 408 fiches — un cap à 500 en tronquait silencieusement 908 (08/08).
  const items = await listCollectionEntries(c.category, c.subAttr, { universe: c.universe, requireSub: c.requireSub, cap: 1500 });
  if (items.length === 0) notFound();

  // Regroupe par sous-type dans l'ordre curé ; le reste (hors sections) → « Autres ».
  const known = new Set(c.sections.map((s) => s.v));
  const groups = c.sections
    .map((s) => ({ ...s, entries: items.filter((e) => e.sub === s.v) }))
    .filter((g) => g.entries.length > 0);
  const others = items.filter((e) => !e.sub || !known.has(e.sub));

  return (
    <main>
      <UniverseShell color={m.color} heroGradient={vis?.heroGradient} bgPattern={vis?.bgPattern} kanji={kanji} padding="clamp(2rem,5vw,3.4rem) 1.4rem 1.6rem">
        <div style={{ maxWidth: 1050, margin: '0 auto' }}>
          <nav aria-label="Fil d'Ariane" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14, fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700 }}>
            <Link href="/learn/akasha" style={{ color: 'var(--td3)', textDecoration: 'none' }}>← Registre</Link>
            <span aria-hidden style={{ color: 'var(--td3)' }}>›</span>
            {universeHubSlug(c.universe) && (
              <>
                <Link href={`/learn/akasha/u/${universeHubSlug(c.universe)}`} style={{ color: m.color, textDecoration: 'none' }}>{c.universe}</Link>
                <span aria-hidden style={{ color: 'var(--td3)' }}>›</span>
              </>
            )}
            <span style={{ color: 'var(--td3)' }}>Collections</span>
          </nav>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: m.color, marginBottom: 4 }}>◈ Collection · {items.length} entrées</div>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(34px,7vw,66px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, margin: 0 }}>{c.title}</h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 'clamp(13px,1.5vw,15px)', color: 'var(--td2)', maxWidth: 540, lineHeight: 1.6, margin: '0.9rem 0 0' }}>{c.tagline}</p>
          {/* Compteurs par section */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 14 }}>
            {groups.map((g) => (
              <a key={g.v} href={`#${g.v}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, color: g.tint, background: `${g.tint}18`, border: `1px solid ${g.tint}55`, borderRadius: 20, padding: '4px 11px' }}>
                {g.l} <span style={{ opacity: 0.8 }}>{g.entries.length}</span>
              </a>
            ))}
          </div>
        </div>
      </UniverseShell>

      <div style={{ maxWidth: 1050, margin: '0 auto', padding: 'clamp(1.4rem,3vw,2.2rem) 1.4rem clamp(3rem,7vw,5rem)', display: 'flex', flexDirection: 'column', gap: '2.4rem' }}>
        {groups.map((g) => (
          <section key={g.v} id={g.v} style={{ scrollMarginTop: 80 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span aria-hidden style={{ width: 9, height: 9, borderRadius: '50%', background: g.tint, boxShadow: `0 0 8px ${g.tint}`, flexShrink: 0 }} />
              <h2 style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 21, textTransform: 'uppercase', color: g.tint, margin: 0 }}>{g.l}</h2>
              <span style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: 'var(--td3)' }}>· {g.entries.length}</span>
            </div>
            <AkashaList entries={g.entries as AkashaEntryCard[]} />
          </section>
        ))}
        {others.length > 0 && (
          <section id="autres">
            <h2 style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 21, textTransform: 'uppercase', color: 'var(--td3)', margin: '0 0 12px' }}>Autres · {others.length}</h2>
            <AkashaList entries={others as AkashaEntryCard[]} />
          </section>
        )}
      </div>
    </main>
  );
}
