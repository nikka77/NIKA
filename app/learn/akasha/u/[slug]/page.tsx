// app/learn/akasha/u/[slug]/page.tsx — HUB D'UNIVERS : la porte d'entrée d'un monde,
// organisée selon SA taxonomie canon (villages Naruto, équipages OP, parties JoJo…).
// 100 % config-driven : lib/akasha/universe-taxonomy.ts pilote les rails ; zéro code par univers.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SITE_URL } from '@/lib/site';
import { hubVisual, taxonomyBySlug, UNIVERSE_TAXONOMY } from '@/lib/akasha/universe-taxonomy';
import { RARITY_META, TYPE_META, universeMeta, universeWordmark, universeBanner } from '@/lib/akasha/types';
import { flavorText } from '@/lib/akasha/flavor';
import { countUniverse, getEntriesBySlugs, listAxisCounts, listBounties, listCategoryCounts, listEvolutive, listStars, listUniverseIndex, universeInsights } from '@/lib/akasha/queries';
import AkashaGrid from '@/components/akasha/AkashaGrid';
import HubHalo from '@/components/akasha/hub/HubHalo';
import Reveal from '@/components/akasha/hub/Reveal';
import ShareButton from '@/components/akasha/hub/ShareButton';
import HubInsights from '@/components/akasha/hub/HubInsights';
import DidYouKnow from '@/components/akasha/DidYouKnow';
import HubCollection from '@/components/akasha/hub/HubCollection';
import ContinueBanner from '@/components/akasha/hub/ContinueBanner';
import HubSignature from '@/components/akasha/hub/HubSignature';
import { VillageEmblem, ClanCrest, RankBadge, GenerationBadge } from '@/components/akasha/NarutoIcons';

// Icône par catégorie de collection (assets existants cat/ + refs). Retombe sur ◈ si non mappé.
const CAT_ICON: Record<string, string> = {
  Jutsu: '/images/akasha/cat/techniques.webp', Technique: '/images/akasha/cat/techniques.webp',
  'Arme & outil': '/images/akasha/cat/outils.webp', Organisation: '/images/akasha/cat/affiliations.webp',
  'Métier': '/images/akasha/cat/fonctions.webp', 'Kekkei genkai': '/images/akasha/cat/kekkei.webp',
  Classification: '/images/akasha/cat/classification.webp', Clan: '/images/akasha/cat/clan.webp',
  Village: '/images/akasha/emblems/konoha.webp', 'Dōjutsu': '/images/akasha/cat/dojutsu.webp',
  'Nature de chakra': '/images/akasha/cat/nature.webp', 'Titre & rang': '/images/akasha/cat/titre-rang.webp',
};
import HubSearch from '@/components/akasha/hub/HubSearch';

type Props = { params: Promise<{ slug: string }> };

// ISR : le hub ne dépend que de la base (counts, stars, insights) qui ne bouge qu'au reseed.
// On rend statiquement chaque hub et on revalide toutes les heures → 0 requête Supabase par visite.
export const revalidate = 3600;

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
  const bounties = vis?.signature === 'bounties' ? await listBounties(8) : [];
  const searchIndex = await listUniverseIndex(taxo.name);

  // Garde-fou : un univers sans aucune donnée exploitable n'est pas une page indexable.
  if (total === 0 && stars.length === 0 && piliers.length === 0) notFound();

  // Personnage du jour propre au hub (pick déterministe seed = date + univers).
  const daySeed = new Date().toISOString().slice(0, 10) + taxo.slug;
  let dh = 0;
  for (const ch of daySeed) dh = (dh * 31 + ch.charCodeAt(0)) >>> 0;
  const dailyStar = stars.length ? stars[dh % stars.length] : null;

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
        {universeBanner(taxo.name) && (
          <>
            <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: `url(${universeBanner(taxo.name)})`, backgroundSize: 'cover', backgroundPosition: 'center 32%', zIndex: 0 }} />
            <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(90deg, color-mix(in srgb, var(--bg) 94%, transparent) 0%, color-mix(in srgb, var(--bg) 66%, transparent) 40%, color-mix(in srgb, var(--bg) 20%, transparent) 72%, transparent 100%), linear-gradient(180deg, color-mix(in srgb, var(--bg) 64%, transparent) 0%, transparent 32%, color-mix(in srgb, var(--bg) 82%, transparent) 84%, var(--bg) 100%)' }} />
          </>
        )}
        {vis && <div className="ak-hub-pattern" aria-hidden style={{ ['--ak-bg' as string]: vis.bgPattern, zIndex: 1 }} />}
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
          <h1 style={{ margin: 0, lineHeight: 0.88 }}>
            {universeWordmark(taxo.name)
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={universeWordmark(taxo.name)!} alt={taxo.name} style={{ height: 'clamp(58px,11vw,120px)', width: 'auto', maxWidth: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.55))' }} />
              : <span style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(44px,9vw,96px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)' }}>{taxo.name}</span>}
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
        {/* ── RECHERCHE INSTANTANÉE + ONGLETS TYPE ───────────── */}
        <div>
          <HubSearch index={searchIndex} universe={taxo.name} color={m.color} />
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 10 }}>
            {(['character', 'place', 'artifact', 'power', 'skill', 'status'] as const).filter((t) => insights.byType[t]).map((t) => (
              <Link key={t} href={`/learn/akasha?universe=${encodeURIComponent(taxo.name)}&type=${t}`} className="ak-tab" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 20, border: '1px solid var(--bd2)', background: 'var(--bg2)', color: 'var(--td2)' }}>
                {TYPE_META[t].icon} {TYPE_META[t].plural}
                <span style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--td3)' }}>{insights.byType[t]}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── REPRISE + PERSO DU JOUR ────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '-0.6rem' }}>
          <ContinueBanner universe={taxo.name} color={m.color} />
          {dailyStar && (() => {
            // Perso du jour v2 (L6) : portrait centré + rareté + flavor VF canon.
            const rar = dailyStar.rarity ? RARITY_META[dailyStar.rarity] : null;
            const flavor = flavorText(dailyStar.descFr, 130);
            return (
              <Link href={`/learn/akasha/${dailyStar.slug}`} className={`dom-card ak-r-${dailyStar.rarity ?? 'common'}`} style={{ display: 'flex', alignItems: 'stretch', gap: 12, textDecoration: 'none', background: 'var(--bg2)', border: `1px solid ${rar?.color ?? 'var(--bd)'}`, borderRadius: 13, padding: 10, overflow: 'hidden' }}>
                <div style={{ position: 'relative', width: 62, height: 82, borderRadius: 9, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
                  {dailyStar.image_url && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img aria-hidden src={dailyStar.image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', filter: 'blur(10px) brightness(0.5)', transform: 'scale(1.2)' }} />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={dailyStar.image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} />
                    </>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: m.color }}>★ Personnage du jour</span>
                    {rar && <span style={{ fontFamily: 'var(--fo)', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: rar.color, background: `${rar.color}18`, border: `1px solid ${rar.color}55`, borderRadius: 20, padding: '1px 7px' }}>{rar.label}</span>}
                  </div>
                  <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 18, color: 'var(--td)', lineHeight: 1.05 }}>{dailyStar.name}</div>
                  {flavor && <div style={{ fontFamily: 'var(--fo)', fontSize: 11.5, fontStyle: 'italic', color: 'var(--td3)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>« {flavor} »</div>}
                </div>
                <span aria-hidden style={{ alignSelf: 'center', color: m.color, fontSize: 18, paddingRight: 2 }}>→</span>
              </Link>
            );
          })()}
        </div>

        {/* ── COLLECTION / TÊTES D'AFFICHE (Pokédex + progression) ── */}
        {stars.length > 0 && (
          <Reveal as="div">
            <HubCollection stars={stars} piliers={piliers} universe={taxo.name} color={m.color} ranks={vis?.ranks ?? ['Novice', 'Initié', 'Adepte', 'Expert', 'Maître', 'Légende']} />
          </Reveal>
        )}

        {/* ── SIGNATURE BESPOKE DE L'UNIVERS ─────────────────── */}
        {vis?.signature && (
          <Reveal as="div"><HubSignature signature={vis.signature} axes={axes} universe={taxo.name} color={m.color} bounties={bounties} /></Reveal>
        )}

        {/* ── INSIGHTS (chiffres-clés, rareté, top popularité, derniers ajoutés) ── */}
        <Reveal as="div"><HubInsights insights={insights} color={m.color} /></Reveal>

        {/* ── LE SAVAIS-TU ? — fait canon du jour tiré des bios VF de CET univers ── */}
        <Reveal as="div"><DidYouKnow universe={taxo.name} accent={m.color} /></Reveal>

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
                const href = `/learn/akasha/u/${taxo.slug}/${axis.attr}/${encodeURIComponent(c.v)}`;
                // Boutons-médaillon pour les axes clan/village/rang/génération Naruto (emblèmes canon + icônes Higgsfield).
                const emblem = taxo.slug === 'naruto' && axis.attr === 'clan'
                  ? <ClanCrest slug={c.v} name={c.label} size={48} />
                  : taxo.slug === 'naruto' && axis.attr === 'village'
                  ? <VillageEmblem slug={c.v.toLowerCase()} size={48} />
                  : taxo.slug === 'naruto' && axis.attr === 'rank'
                  ? <RankBadge value={c.v} size={48} />
                  : taxo.slug === 'naruto' && axis.attr === 'generation'
                  ? <GenerationBadge value={c.v} size={48} />
                  : null;
                if (emblem) {
                  return (
                    <Link key={c.v} href={href} className="ak-tab" title={c.label}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none', fontFamily: 'var(--fo)', width: 96, padding: '13px 8px 10px', borderRadius: 15, border: `1px solid ${tint}44`, background: `${tint}12` }}>
                      <span style={{ height: 48, display: 'flex', alignItems: 'center', filter: 'drop-shadow(0 2px 7px rgba(0,0,0,0.5))' }}>{emblem}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--td)', textAlign: 'center', lineHeight: 1.1 }}>{c.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: tint, background: `${tint}1F`, borderRadius: 20, padding: '1px 7px' }}>{c.count}</span>
                    </Link>
                  );
                }
                return (
                  <Link
                    key={c.v}
                    href={href}
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
              {catCounts.map((c) => {
                const icon = CAT_ICON[c.category];
                return (
                <Link
                  key={c.category}
                  href={registryHref(taxo.name, { cat: c.category })}
                  className="ak-tab"
                  style={{ display: 'flex', alignItems: 'center', gap: icon ? 8 : 7, textDecoration: 'none', fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, padding: icon ? '6px 12px 6px 8px' : '8px 13px', borderRadius: 11, border: '1px solid rgba(14,168,120,0.35)', background: 'rgba(14,168,120,0.08)', color: '#0EA878' }}
                >
                  {icon
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={icon} alt="" width={24} height={24} style={{ objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
                    : <span aria-hidden style={{ opacity: 0.7 }}>◈</span>}
                  {c.category}
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#0EA878', background: 'rgba(5,12,23,0.4)', borderRadius: 20, padding: '1px 7px' }}>{c.count}</span>
                </Link>
                );
              })}
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

        {/* ── EXPLORER UN AUTRE UNIVERS (maillage inter-hubs) ── */}
        <Reveal>
          <div style={sectionTitle}><span>🌐 Explorer un autre monde</span></div>
          <div className="hero-domabar" style={{ display: 'flex', gap: 9, overflowX: 'auto', paddingBottom: 6 }}>
            {UNIVERSE_TAXONOMY.filter((u) => u.slug !== taxo.slug).map((u) => {
              const um = universeMeta(u.name);
              return (
                <Link key={u.slug} href={`/learn/akasha/u/${u.slug}`} className="ak-tab" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', padding: '9px 15px', borderRadius: 12, border: `1px solid ${um.color}55`, background: `${um.color}14`, color: um.color }}>
                  <span aria-hidden>{um.emoji}</span> {u.name}
                </Link>
              );
            })}
          </div>
        </Reveal>

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
