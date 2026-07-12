// app/learn/akasha/u/[slug]/[axis]/[value]/page.tsx — SOUS-PAGE D'AXE (Refonte L6 « Hubs souverains »).
// Ex. /learn/akasha/u/naruto/village/Konohagakure — page dédiée d'une valeur d'axe, avec l'identité
// visuelle de l'univers (HUB_VISUAL), les membres triés par popularité, et les valeurs sœurs. Config-
// driven depuis la taxonomy → aucun composant par univers. generateStaticParams + ISR.
// (Filtres facettés par sous-axe clan/rang/génération, scopés au village sélectionné.)
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SITE_URL } from '@/lib/site';
import { listEntries, listAxisCounts } from '@/lib/akasha/queries';
import { taxonomyBySlug, hubVisual, axisValueLabel, UNIVERSE_TAXONOMY } from '@/lib/akasha/universe-taxonomy';
import { universeMeta } from '@/lib/akasha/types';
import AkashaGrid from '@/components/akasha/AkashaGrid';
import { VillageEmblem, ClanCrest, RankBadge, GenerationBadge } from '@/components/akasha/NarutoIcons';

export const revalidate = 3600; // ISR 1 h

type Props = { params: Promise<{ slug: string; axis: string; value: string }>; searchParams?: Promise<Record<string, string | undefined>> };
const SUB_ATTRS = new Set(['clan', 'rank', 'generation']); // sous-filtres d'une page village (Naruto)

// Pré-génère les valeurs CURÉES de chaque axe (les plus visitées) ; le reste se génère à la demande (ISR).
export function generateStaticParams() {
  const out: { slug: string; axis: string; value: string }[] = [];
  for (const u of UNIVERSE_TAXONOMY) {
    for (const ax of u.axes) {
      for (const v of ax.values) out.push({ slug: u.slug, axis: ax.attr, value: encodeURIComponent(v.v) });
    }
  }
  return out;
}

async function resolve(params: Props['params']) {
  const { slug, axis, value } = await params;
  const taxo = taxonomyBySlug(slug);
  if (!taxo) return null;
  const axisDef = taxo.axes.find((a) => a.attr === axis);
  if (!axisDef) return null;
  const val = decodeURIComponent(value);
  return { taxo, axisDef, val, slug };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await resolve(params);
  if (!r) return { title: 'Introuvable — AKASHA' };
  const label = axisValueLabel(r.taxo.name, r.axisDef.attr, r.val);
  return {
    title: `${label} — ${r.axisDef.label} de ${r.taxo.name} | AKASHA`,
    description: `Tous les ${r.axisDef.label.toLowerCase()} « ${label} » de l'univers ${r.taxo.name} dans le registre AKASHA, classés par popularité.`,
    alternates: { canonical: `${SITE_URL}/learn/akasha/u/${r.slug}/${r.axisDef.attr}/${encodeURIComponent(r.val)}` },
  };
}

export default async function AxisValuePage({ params, searchParams }: Props) {
  const r = await resolve(params);
  if (!r) notFound();
  const { taxo, axisDef, val } = r;
  const m = universeMeta(taxo.name);
  const vis = hubVisual(taxo.slug);
  const label = axisValueLabel(taxo.name, axisDef.attr, val);
  const valMeta = axisDef.values.find((x) => x.v === val);
  const tint = valMeta?.tint ?? m.color;

  // Sous-filtres (clan/rang/génération) sur une page village Naruto — filtrage combiné.
  const sp = (await searchParams) ?? {};
  const subFilterOn = taxo.slug === 'naruto' && axisDef.attr === 'village';
  const subAttr = subFilterOn && sp.attr2 && SUB_ATTRS.has(sp.attr2) ? sp.attr2 : undefined;
  const subVal = subAttr && sp.val2 ? sp.val2 : undefined;
  const subAxes = subFilterOn ? taxo.axes.filter((a) => SUB_ATTRS.has(a.attr)) : [];
  // Facettes DU village : ne proposer que les clans/rangs/générations réellement présents (avec compte).
  const facets = subFilterOn ? await listAxisCounts(taxo.name, ['clan', 'rank', 'generation'], axisDef.attr, val) : null;

  const { entries, total } = await listEntries({ universe: taxo.name, attr: axisDef.attr, val, attr2: subAttr, val2: subVal, sort: 'pop' });
  if (total === 0 && !subVal) notFound();

  const basePath = `/learn/akasha/u/${taxo.slug}/${axisDef.attr}/${encodeURIComponent(val)}`;
  const subLabel = subAttr ? axisValueLabel(taxo.name, subAttr, subVal!) : null;
  // Valeurs sœurs (mêmes axe) → navigation latérale.
  const siblings = axisDef.values.filter((v) => v.v !== val);

  return (
    <main>
      <div style={{ position: 'relative', overflow: 'hidden', background: vis?.heroGradient ?? `linear-gradient(160deg, ${m.color}22, var(--bg) 70%)`, borderBottom: '1px solid var(--bd)', padding: 'clamp(1.8rem,4vw,3rem) 1.4rem 1.5rem' }}>
        {vis && <div className="ak-hub-pattern" style={{ ['--ak-bg' as string]: vis.bgPattern }} aria-hidden />}
        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
          {/* Fil d'Ariane hub */}
          <nav aria-label="Fil d'Ariane" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14, fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700 }}>
            <Link href="/learn/akasha" style={{ color: 'var(--td3)', textDecoration: 'none' }}>← Registre</Link>
            <span aria-hidden style={{ color: 'var(--td3)' }}>›</span>
            <Link href={`/learn/akasha/u/${taxo.slug}`} style={{ color: m.color, textDecoration: 'none' }}>{m.emoji} {taxo.name}</Link>
            <span aria-hidden style={{ color: 'var(--td3)' }}>›</span>
            <span style={{ color: 'var(--td3)' }}>{axisDef.label}</span>
          </nav>
          {/* Gros médaillon canon (Naruto clans/villages/rangs/générations) — objectif hub : l'emblème en héros. */}
          {taxo.slug === 'naruto' && (axisDef.attr === 'village' || axisDef.attr === 'clan' || axisDef.attr === 'rank' || axisDef.attr === 'generation') && (
            <div style={{ marginBottom: 12, filter: 'drop-shadow(0 5px 16px rgba(0,0,0,0.6))' }}>
              {axisDef.attr === 'village'
                ? <VillageEmblem slug={val.toLowerCase()} size={104} />
                : axisDef.attr === 'clan'
                ? <ClanCrest slug={val} name={label} size={104} />
                : axisDef.attr === 'rank'
                ? <RankBadge value={val} size={104} />
                : <GenerationBadge value={val} size={104} />}
            </div>
          )}
          <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: tint, marginBottom: 4 }}>
            {axisDef.icon} {axisDef.label}
          </div>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(34px,7vw,64px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, margin: 0, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {valMeta?.badge && <span aria-hidden style={{ fontSize: '0.8em' }}>{valMeta.badge}</span>}
            {label}
          </h1>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 13.5, color: 'var(--td2)', marginTop: 10 }}>
            <strong style={{ color: tint }}>{total}</strong> {total > 1 ? 'entrées' : 'entrée'} · classées par popularité{subLabel && <> · filtré : <strong style={{ color: tint }}>{subLabel}</strong></>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: 'clamp(1.4rem,3vw,2.2rem) 1.4rem clamp(3rem,7vw,5rem)' }}>
        {/* ── SOUS-FILTRES (clan / rang / génération) — réorg hub : filtrer les ninjas du village ── */}
        {subFilterOn && (
          <div style={{ marginBottom: 20 }}>
            {subAxes.map((ax) => {
              const fc = facets?.get(ax.attr);
              const present = ax.values.filter((v) => (fc?.get(v.v) ?? 0) > 0);
              if (!present.length) return null;
              return (
                <div key={ax.attr} style={{ marginBottom: 10 }}>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 6 }}>{ax.icon} {ax.label}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {present.map((v) => {
                      const active = subAttr === ax.attr && subVal === v.v;
                      const t = v.tint ?? m.color;
                      const href = active ? basePath : `${basePath}?attr2=${ax.attr}&val2=${encodeURIComponent(v.v)}`;
                      return (
                        <Link key={v.v} href={href} scroll={false} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px 3px 4px', borderRadius: 999, textDecoration: 'none', fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, border: `1px solid ${active ? 'transparent' : t + '44'}`, background: active ? t : `${t}12`, color: active ? '#0A1420' : 'var(--td2)' }}>
                          <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                            {ax.attr === 'clan' ? <ClanCrest slug={v.v} name={v.l ?? v.v} size={20} />
                              : ax.attr === 'rank' ? <RankBadge value={v.v} size={20} />
                              : <GenerationBadge value={v.v} size={20} />}
                          </span>
                          {v.l ?? v.v}
                          <span style={{ fontSize: 10, opacity: 0.75, fontVariantNumeric: 'tabular-nums' }}>{fc?.get(v.v)}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {subAttr && (
              <Link href={basePath} scroll={false} style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: 'var(--td3)', textDecoration: 'none' }}>✕ Effacer le filtre</Link>
            )}
          </div>
        )}

        {total === 0
          ? <div style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td3)', padding: '2rem 0', textAlign: 'center' }}>Aucun ninja de {label} ne correspond à ce filtre.</div>
          : <AkashaGrid entries={entries} />}

        {total > entries.length && (
          <div style={{ textAlign: 'center', marginTop: '1.6rem' }}>
            <Link href={`/learn/akasha?universe=${encodeURIComponent(taxo.name)}&attr=${encodeURIComponent(axisDef.attr)}&val=${encodeURIComponent(val)}&sort=pop`} style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: m.color, textDecoration: 'none', border: `1px solid ${m.color}55`, borderRadius: 10, padding: '10px 20px', display: 'inline-block' }}>
              Voir les {total} entrées →
            </Link>
          </div>
        )}

        {/* ── VALEURS SŒURS (même axe) ─────────────────────── */}
        {siblings.length > 0 && (
          <section style={{ marginTop: '2.6rem' }}>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 12 }}>
              Autres {axisDef.label.toLowerCase()}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {siblings.map((v) => {
                const t = v.tint ?? m.color;
                return (
                  <Link key={v.v} href={`/learn/akasha/u/${taxo.slug}/${axisDef.attr}/${encodeURIComponent(v.v)}`} className="ak-tab" style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, padding: '8px 13px', borderRadius: 11, border: `1px solid ${t}44`, background: `${t}12`, color: 'var(--td2)' }}>
                    {v.badge && <span aria-hidden>{v.badge}</span>}
                    {v.l ?? v.v}
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
