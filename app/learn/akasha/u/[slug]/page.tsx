// app/learn/akasha/u/[slug]/page.tsx — HUB D'UNIVERS : la porte d'entrée d'un monde,
// organisée selon SA taxonomie canon (villages Naruto, équipages OP, parties JoJo…).
// 100 % config-driven : lib/akasha/universe-taxonomy.ts pilote les rails ; zéro code par univers.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SITE_URL } from '@/lib/site';
import { hubVisual, taxonomyBySlug, UNIVERSE_TAXONOMY } from '@/lib/akasha/universe-taxonomy';
import { universeMeta } from '@/lib/akasha/types';
import { countUniverse, getEntriesBySlugs, listAxisCounts, listCategoryCounts, listEvolutive, listStars, universeInsights } from '@/lib/akasha/queries';
import AkashaGrid from '@/components/akasha/AkashaGrid';
import HubHalo from '@/components/akasha/hub/HubHalo';
import Reveal from '@/components/akasha/hub/Reveal';
import ShareButton from '@/components/akasha/hub/ShareButton';
import HubInsights from '@/components/akasha/hub/HubInsights';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams(): { slug: string }[] {
  return UNIVERSE_TAXONOMY.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const taxo = taxonomyBySlug(slug);
  if (!taxo) return { title: 'Univers introuvable — AKASHA' };
  const total = await countUniverse(taxo.name);
  const axesFr = taxo.axes.map((a) => a.label.toLowerCase()).join(', ');
  const title = `${taxo.name} — ${total} entrées | AKASHA · NIKA`;
  const description = `${taxo.tagline} Explore les ${total} entrées de ${taxo.name} dans le registre AKASHA : ${axesFr}, personnages légendaires et collections.`;
  const url = `${SITE_URL}/learn/akasha/u/${taxo.slug}`;
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website', siteName: 'NIKA' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

const registryHref = (universe: string, extra?: Record<string, string>): string => {
  const p = new URLSearchParams({ universe, ...(extra ?? {}) });
  return `/learn/akasha?${p.toString()}`;
};

export default async function UniverseHubPage({ params }: Props) {
  const { slug } = await params;
  const taxo = taxonomyBySlug(slug);
  if (!taxo) notFound();

  const m = universeMeta(taxo.name);
  const vis = hubVisual(taxo.slug);
  const attrs = taxo.axes.map((a) => a.attr);
  const [total, stars, axisCounts, catCounts, piliers, insights, evolutive] = await Promise.all([
    countUniverse(taxo.name),
    listStars(taxo.name, 12),
    listAxisCounts(taxo.name, attrs),
    listCategoryCounts({ universe: taxo.name }),
    getEntriesBySlugs(taxo.piliers),
    universeInsights(taxo.name),
    listEvolutive(taxo.name, 8),
  ]);

  // Axes affichables : valeurs curées avec data d'abord, puis les valeurs « découvertes » (hors config) par volume.
  const axes = taxo.axes
    .map((axis) => {
      const counts = axisCounts.get(axis.attr) ?? new Map<string, number>();
      const curated = axis.values
        .map((x) => ({ v: x.v, label: x.l ?? x.v, count: counts.get(x.v) ?? 0, tint: x.tint, badge: x.badge }))
        .filter((x) => x.count > 0);
      const curatedSet = new Set(axis.values.map((x) => x.v));
      const extras = Array.from(counts.entries())
        .filter(([v, c]) => !curatedSet.has(v) && c >= 3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, Math.max(0, 14 - curated.length))
        .map(([v, count]) => ({ v, label: v, count, tint: undefined as string | undefined, badge: undefined as string | undefined }));
      return { ...axis, chips: [...curated, ...extras] };
    })
    .filter((axis) => axis.chips.length > 0);

  const sectionTitle = { fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: m.color, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 };

  return (
    <main>
      {/* ── HERO UNIVERS ─────────────────────────────────────── */}
      <div className="ak-hub-grain" style={{ background: vis?.heroGradient ?? `linear-gradient(180deg, ${m.color}2E 0%, ${m.color}0C 55%, var(--bg) 100%)`, borderBottom: '1px solid var(--bd)', padding: 'clamp(2.2rem,5vw,3.6rem) 1.4rem 1.8rem', position: 'relative', overflow: 'hidden' }}>
        {vis && <div className="ak-hub-pattern" aria-hidden style={{ ['--ak-bg' as string]: vis.bgPattern }} />}
        <HubHalo color={m.color} />
        <div className="ak-kanji-drift" aria-hidden style={{ position: 'absolute', top: '-0.3em', right: '-0.05em', fontFamily: 'var(--fe)', fontSize: 'clamp(120px,26vw,300px)', fontWeight: 900, color: `${m.color}14`, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>
          {taxo.kanji}
        </div>
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <nav aria-label="Fil d'Ariane" style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Link href="/learn" style={{ color: 'var(--td3)', textDecoration: 'none' }}>Learn</Link>
            <span aria-hidden>›</span>
            <Link href="/learn/akasha" style={{ color: 'var(--td3)', textDecoration: 'none' }}>Akasha</Link>
            <span aria-hidden>›</span>
            <span style={{ color: m.color }}>{taxo.name}</span>
          </nav>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: m.color, margin: '1rem 0 0.5rem' }}>
            {m.emoji} Univers · {total} entrées
          </div>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(44px,9vw,96px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.88, margin: 0 }}>
            {taxo.name}
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 'clamp(13.5px,1.5vw,16px)', color: 'var(--td2)', maxWidth: 520, lineHeight: 1.65, margin: '0.9rem 0 1.3rem' }}>
            {taxo.tagline}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link
              href={registryHref(taxo.name)}
              className="ak-cta"
              style={{ display: 'inline-block', fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.04em', textTransform: 'uppercase', padding: '10px 20px', borderRadius: 10, border: `1px solid ${m.color}66`, background: `${m.color}1F`, color: m.color, textDecoration: 'none', ['--ak-accent' as string]: `${m.color}99` }}
            >
              Tout le registre {taxo.name} →
            </Link>
            <Link
              href={`/learn/akasha/random?u=${encodeURIComponent(taxo.name)}`}
              className="ak-cta"
              style={{ display: 'inline-block', fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.04em', textTransform: 'uppercase', padding: '10px 20px', borderRadius: 10, border: '1px solid var(--bd2)', background: 'var(--bg2)', color: 'var(--td)', textDecoration: 'none' }}
            >
              ✦ Surprends-moi
            </Link>
            {(taxo.extras ?? []).map((x) => (
              <Link
                key={x.href}
                href={x.href}
                className="ak-cta"
                style={{ display: 'inline-block', fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.04em', textTransform: 'uppercase', padding: '10px 20px', borderRadius: 10, border: '1px solid var(--bd2)', background: 'var(--bg2)', color: 'var(--td)', textDecoration: 'none' }}
              >
                {x.icon} {x.label} →
              </Link>
            ))}
            <ShareButton title={`${taxo.name} — AKASHA`} text={taxo.tagline} color={m.color} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(1.4rem,3vw,2rem) 1.4rem clamp(3rem,7vw,5rem)', display: 'flex', flexDirection: 'column', gap: '2.1rem' }}>
        {/* ── TÊTES D'AFFICHE ────────────────────────────────── */}
        {stars.length > 0 && (
          <Reveal>
            <div style={sectionTitle}>
              <span>★ Têtes d’affiche</span>
              <span style={{ color: 'var(--td3)', letterSpacing: '0.03em' }}>{stars.length} légendes</span>
            </div>
            <div className="hero-domabar ak-star-rail" style={{ display: 'flex', gap: 11, overflowX: 'auto', paddingBottom: 8 }}>
              {stars.map((s, i) => (
                <Link key={s.slug} href={`/learn/akasha/${s.slug}`} className="ak-tab" style={{ flexShrink: 0, width: 104, textDecoration: 'none', textAlign: 'center' }}>
                  <div className="ak-star-bob" style={{ width: 104, height: 118, borderRadius: 13, overflow: 'hidden', border: `2px solid ${s.rarity === 'legendary' ? '#D4A017' : s.rarity === 'epic' ? '#7B5CF0' : 'var(--bd2)'}`, background: 'var(--bg2)', position: 'relative', animationDelay: `${(i % 6) * 0.22}s` }}>
                    {s.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.image_url} alt="" loading={i < 3 ? 'eager' : 'lazy'} fetchPriority={i === 0 ? 'high' : 'auto'} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
                    )}
                    {s.rarity === 'legendary' && (
                      <span style={{ position: 'absolute', top: 5, right: 5, fontSize: 11 }} aria-hidden>👑</span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: 'var(--td)', lineHeight: 1.2, marginTop: 6 }}>{s.name}</div>
                </Link>
              ))}
            </div>
          </Reveal>
        )}

        {/* ── INSIGHTS (chiffres-clés, rareté, top popularité, derniers ajoutés) ── */}
        <Reveal as="div"><HubInsights insights={insights} color={m.color} /></Reveal>

        {/* ── VOYAGES DANS LE TEMPS (pages évolutives) ───────── */}
        {evolutive.length > 0 && (
          <Reveal>
            <div style={sectionTitle}>
              <span>🕰️ Voyages dans le temps</span>
              <span style={{ color: 'var(--td3)', letterSpacing: '0.03em' }}>{evolutive.length} lieux & artefacts évolutifs</span>
            </div>
            <AkashaGrid entries={evolutive} />
          </Reveal>
        )}

        {/* ── AXES CANON (config-driven) ─────────────────────── */}
        {axes.map((axis) => (
          <Reveal key={axis.attr}>
            <div style={sectionTitle}>
              <span>{axis.icon} {axis.label}</span>
              <span style={{ color: 'var(--td3)', letterSpacing: '0.03em' }}>{axis.chips.length}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {axis.chips.map((c) => {
                const tint = c.tint ?? m.color;
                return (
                  <Link
                    key={c.v}
                    href={registryHref(taxo.name, { attr: axis.attr, val: c.v })}
                    className="ak-tab"
                    style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, padding: '8px 13px', borderRadius: 11, border: `1px solid ${tint}44`, background: `${tint}12`, color: 'var(--td2)' }}
                  >
                    {c.badge && <span aria-hidden>{c.badge}</span>}
                    {c.label}
                    <span style={{ fontSize: 10, fontWeight: 800, color: tint, background: `${tint}1F`, borderRadius: 20, padding: '1px 7px' }}>{c.count}</span>
                  </Link>
                );
              })}
            </div>
          </Reveal>
        ))}

        {/* ── COLLECTIONS DU MONDE ───────────────────────────── */}
        {catCounts.length > 0 && (
          <Reveal>
            <div style={sectionTitle}>
              <span>◈ Collections</span>
              <span style={{ color: 'var(--td3)', letterSpacing: '0.03em' }}>{catCounts.length}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {catCounts.map((c) => (
                <Link
                  key={c.category}
                  href={registryHref(taxo.name, { cat: c.category })}
                  className="ak-tab"
                  style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, padding: '8px 13px', borderRadius: 11, border: '1px solid rgba(14,168,120,0.35)', background: 'rgba(14,168,120,0.08)', color: '#0EA878' }}
                >
                  {c.category}
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#0EA878', background: 'rgba(5,12,23,0.4)', borderRadius: 20, padding: '1px 7px' }}>{c.count}</span>
                </Link>
              ))}
            </div>
          </Reveal>
        )}

        {/* ── PAGES PILIERS ──────────────────────────────────── */}
        {piliers.length > 0 && (
          <Reveal>
            <div style={sectionTitle}>
              <span>✦ Les piliers de {taxo.name}</span>
            </div>
            <AkashaGrid entries={piliers} />
          </Reveal>
        )}

        {/* ── COPY D'ATTERRISSAGE SEO ─────────────────────────── */}
        <Reveal as="div">
          <div style={{ fontFamily: 'var(--fo)', fontSize: 13.5, color: 'var(--td3)', lineHeight: 1.7, maxWidth: 760, borderTop: '1px solid var(--bd)', paddingTop: '1.4rem' }}>
            <p style={{ margin: 0 }}>
              Le hub <strong style={{ color: 'var(--td2)' }}>{taxo.name}</strong> du registre AKASHA rassemble <strong style={{ color: m.color }}>{total} entrées</strong> — {taxo.tagline.toLowerCase()} Parcours par {axes.map((a) => a.label.toLowerCase()).join(', ')}, découverte des personnages légendaires, des collections et des lieux emblématiques, le tout relié dans un même graphe.
            </p>
          </div>
        </Reveal>
      </div>

      {/* Données structurées : page de collection + FAQ (rich results) */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `${taxo.name} — AKASHA`,
          description: taxo.tagline,
          url: `${SITE_URL}/learn/akasha/u/${taxo.slug}`,
          isPartOf: { '@type': 'WebSite', name: 'NIKA', url: SITE_URL },
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: total,
            itemListElement: stars.slice(0, 10).map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.name, url: `${SITE_URL}/learn/akasha/${s.slug}` })),
          },
        }) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            { '@type': 'Question', name: `Combien d'entrées compte l'univers ${taxo.name} sur AKASHA ?`, acceptedAnswer: { '@type': 'Answer', text: `Le registre AKASHA recense ${total} entrées pour l'univers ${taxo.name} : personnages, lieux, artefacts, pouvoirs et collections.` } },
            ...axes.slice(0, 2).map((a) => ({ '@type': 'Question', name: `Quels ${a.label.toLowerCase()} trouve-t-on dans ${taxo.name} ?`, acceptedAnswer: { '@type': 'Answer', text: `${a.chips.map((c) => c.label).join(', ')}.` } })),
          ],
        }) }}
      />
    </main>
  );
}
