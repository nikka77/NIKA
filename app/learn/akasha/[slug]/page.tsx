// app/learn/akasha/[slug]/page.tsx — fiche détaillée d'une entité du registre.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEntryBySlug, listSharedVoice, listSimilar, popularityRank } from '@/lib/akasha/queries';
import { TYPE_META, RARITY_META, universeMeta, type AkashaType } from '@/lib/akasha/types';
import { flavorExcerpt } from '@/lib/akasha/flavor';
import { universeHubSlug, taxonomyByName, hubVisual } from '@/lib/akasha/universe-taxonomy';
import { SITE_URL } from '@/lib/site';
import AkashaList from '@/components/akasha/AkashaList';
import UniverseShell from '@/components/akasha/UniverseShell';
import EntityBadge from '@/components/akasha/EntityBadge';
import EntityAttributes from '@/components/akasha/EntityAttributes';
import EntityRelations from '@/components/akasha/EntityRelations';
import Markdown from '@/components/akasha/Markdown';
import CharacterZone from '@/components/akasha/zone/CharacterZone';
import OrganizationZone from '@/components/akasha/zone/OrganizationZone';
import EraZone from '@/components/akasha/zone/EraZone';
import DossierSections from '@/components/akasha/DossierSections';
import Crumbs from '@/components/akasha/Crumbs';

export const revalidate = 3600; // ISR 1 h — page la plus visitée du domaine, tournait sans cache

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getEntryBySlug(slug);
  if (!entry) return { title: 'Entité introuvable — AKASHA' };
  const m = TYPE_META[entry.type];
  // SEO : la bio VF canon (descFr) donne une méta description UNIQUE et riche aux 3 315 fiches
  // traduites — bien mieux que le summary générique (« Personnage secondaire de… »).
  const descFr = typeof (entry.attributes as Record<string, unknown>).descFr === 'string'
    ? ((entry.attributes as Record<string, unknown>).descFr as string) : null;
  // Le summary générique (« Personnage secondaire de One Piece — Marine. ») se répète à l'identique
  // sur des centaines de fiches du même type/univers → méta description dupliquée aux yeux de Google.
  // Préfixer par le NOM (toujours unique) garantit une description distincte par fiche même sans descFr.
  return {
    title: `${entry.name} — ${m.label} | AKASHA`,
    description:
      flavorExcerpt(descFr, 155) ??
      (entry.summary ? `${entry.name} — ${entry.summary}` : null) ??
      `${entry.name}, ${m.label.toLowerCase()} du registre AKASHA${entry.universe ? ` (${entry.universe})` : ''}.`,
    alternates: { canonical: `${SITE_URL}/learn/akasha/${entry.slug}` },
  };
}

export default async function AkashaEntryPage({ params }: Props) {
  const { slug } = await params;
  const entry = await getEntryBySlug(slug);
  if (!entry) notFound();

  const m = TYPE_META[entry.type];
  const category = typeof (entry.attributes as Record<string, unknown>).category === 'string'
    ? ((entry.attributes as Record<string, unknown>).category as string)
    : null;
  // Chrome du monde (1b) : kanji + motif canon de l'univers de l'entrée — config, zéro requête.
  const worldKanji = entry.universe ? taxonomyByName(entry.universe)?.kanji : undefined;
  const worldVis = entry.universe ? hubVisual(universeHubSlug(entry.universe) ?? '') : undefined;
  const worldColor = entry.universe ? universeMeta(entry.universe).color : m.color;

  // Personnages → fiche « ZONE » (refonte lot 1) : surface vivante + panneau canal re-scopable.
  if (entry.type === 'character') {
    // Rang de popularité dans l'univers (#N par favoris) — 1 count HEAD, affiché sous le nom.
    const fav = typeof (entry.attributes as Record<string, unknown>).favorites === 'number'
      ? ((entry.attributes as Record<string, unknown>).favorites as number) : 0;
    const popRank = await popularityRank(entry.universe, fav);
    // Passerelle seiyū : mêmes cordes vocales, autres mondes (1 requête, ISR).
    const va = (entry.attributes as Record<string, unknown>).voiceActors as { jp?: string[] } | undefined;
    const jp = Array.isArray(va?.jp) ? va.jp[0] : undefined;
    const sharedVoice = jp ? await listSharedVoice(jp, entry.slug) : [];
    return (
      <main>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: 'clamp(1.4rem,3vw,2.4rem) 1.4rem clamp(3rem,7vw,5rem)' }}>
          <Crumbs universe={entry.universe} category={typeof (entry.attributes as Record<string, unknown>).category === 'string' ? ((entry.attributes as Record<string, unknown>).category as string) : null} name={entry.name} />
          <CharacterZone entry={entry} popRank={popRank} sharedVoice={sharedVoice} />
        </div>
      </main>
    );
  }

  // Organisations (équipages, clans…) → fiche « organigramme-zone » (refonte lot 4b).
  if (entry.type === 'status') {
    return (
      <main>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: 'clamp(1.4rem,3vw,2.4rem) 1.4rem clamp(3rem,7vw,5rem)' }}>
          <Crumbs universe={entry.universe} category={category} name={entry.name} />
          <OrganizationZone entry={entry} />
          {/* Le DOSSIER (05/08) — 141 fiches status portaient des sections que cette branche
              ne rendait jamais. Monté ICI, dans la page, plutôt que dans la zone : la zone est
              un composant client au layout dense, la page contrôle déjà le conteneur. */}
          <DossierSections
            sections={(entry.attributes as Record<string, unknown>).sections}
            accent={(entry.universe && universeMeta(entry.universe)?.color) || m.color}
            style={{ marginTop: 28 }}
          />
        </div>
      </main>
    );
  }

  // ── GABARIT FICHE ATTAQUE (L4) : les 2 000+ techniques ont leur propre mise en scène ──
  if ((entry.type === 'power' || entry.type === 'skill') && category === 'Attaque') {
    const um = entry.universe ? universeMeta(entry.universe) : null;
    const accent = um?.color ?? '#D44B24';
    const attrs = entry.attributes as Record<string, unknown>;
    const isSig = attrs.is_signature === true || attrs.is_signature === 'true';
    const discipline = typeof attrs.discipline === 'string' ? (attrs.discipline as string) : null;
    const descFrVal = typeof attrs.descFr === 'string' ? (attrs.descFr as string).trim() : null;
    // « Maîtrisée par » : personnages entrants, triés par popularité (favorites projeté).
    const users = entry.relationsIn
      .filter((r) => r.relation === 'maitrise' && r.target.type === 'character')
      .sort((a, b) => (Number(b.target.favorites) || 0) - (Number(a.target.favorites) || 0));
    return (
      <main>
        <UniverseShell color={accent} heroGradient={worldVis?.heroGradient} bgPattern={worldVis?.bgPattern} kanji={worldKanji} padding="clamp(2rem,5vw,3rem) 1.4rem 1.6rem">
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <Crumbs universe={entry.universe} category={category} name={entry.name} />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              {isSig && (
                <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20, color: '#E8623A', background: '#E8623A1A', border: '1px solid #E8623A66' }}>★ Attaque signature</span>
              )}
              {discipline && (
                <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20, color: accent, background: `${accent}14`, border: `1px solid ${accent}55` }}>{discipline}</span>
              )}
            </div>
            <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(30px,6vw,54px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.92, margin: 0 }}>{entry.name}</h1>
            {entry.universe && (
              <div style={{ marginTop: 8 }}>
                {universeHubSlug(entry.universe) ? (
                  <Link href={`/learn/akasha/u/${universeHubSlug(entry.universe)}`} style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: accent, textDecoration: 'none' }}>
                    {um?.emoji} {entry.universe} ↗
                  </Link>
                ) : (
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>{um?.emoji} {entry.universe}</span>
                )}
              </div>
            )}
            {(descFrVal || entry.summary) && (
              <p style={{ fontFamily: 'var(--fo)', fontSize: 15, fontStyle: descFrVal ? 'italic' : 'normal', color: 'var(--td2)', lineHeight: 1.7, margin: '1rem 0 0', maxWidth: 640, borderLeft: `2px solid ${accent}`, paddingLeft: 12 }}>
                {descFrVal ?? entry.summary}
              </p>
            )}
          </div>
        </UniverseShell>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(1.6rem,4vw,2.4rem) 1.4rem clamp(3rem,7vw,5rem)', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {users.length > 0 && (
            <section>
              <h2 className="akasha-section-title">Maîtrisée par · {users.length}</h2>
              <div className="g-fill-150" style={{ gap: 10 }}>
                {users.map((r) => (
                  <Link key={r.id} href={`/learn/akasha/${r.target.slug}`} className="dom-card" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 11, padding: '7px 9px' }}>
                    <span style={{ position: 'relative', width: 36, height: 36, borderRadius: 9, overflow: 'hidden', flexShrink: 0, background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {r.target.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.target.image_url} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
                      ) : (
                        <span aria-hidden>👤</span>
                      )}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: 'var(--td)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.target.name}</span>
                      {Number(r.target.favorites) > 0 && (
                        <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>★ {Number(r.target.favorites).toLocaleString('fr-FR')} fans</span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {/* Le DOSSIER — composant partagé depuis le 05/08 (il vivait ici en copie locale,
            et nulle part sur les gabarits status/ères/générique : 791 fiches muettes). */}
        <DossierSections sections={(entry.attributes as Record<string, unknown>).sections} accent={accent} />

        <EntityAttributes type={entry.type} attributes={entry.attributes} universe={entry.universe} />
          <SimilarSection universe={entry.universe} cat={category} type={entry.type} excludeSlug={entry.slug} />
        </div>
      </main>
    );
  }

  // Entités à ères chronologiques (lieux, artefacts…) → « rouleau temporel » (refonte lot 4c).
  if (Array.isArray((entry.attributes as Record<string, unknown>).eras) && ((entry.attributes as Record<string, unknown>).eras as unknown[]).length > 0) {
    return (
      <main>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: 'clamp(1.4rem,3vw,2.4rem) 1.4rem clamp(3rem,7vw,5rem)' }}>
          <Crumbs universe={entry.universe} category={category} name={entry.name} />
          <EraZone entry={entry} />
          {/* Le DOSSIER (05/08) — même réparation que la branche status : le rouleau temporel
              raconte les ères, les sections racontent le reste, les deux coexistent. */}
          <DossierSections
            sections={(entry.attributes as Record<string, unknown>).sections}
            accent={(entry.universe && universeMeta(entry.universe)?.color) || m.color}
            style={{ marginTop: 28 }}
          />
        </div>
      </main>
    );
  }

  return (
    <main>
      {/* ── BANDEAU ───────────────────────────────────────────── */}
      <UniverseShell color={worldColor} heroGradient={worldVis?.heroGradient} bgPattern={worldVis?.bgPattern} kanji={worldKanji} padding="clamp(2rem,5vw,3.2rem) 1.4rem 1.8rem">
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <Crumbs universe={entry.universe} category={category} name={entry.name} />

          <div style={{ display: 'flex', gap: '1.4rem', flexWrap: 'wrap', alignItems: 'flex-start', marginTop: '1.1rem' }}>
            {/* Visuel */}
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 16,
                overflow: 'hidden',
                flexShrink: 0,
                background: `linear-gradient(135deg, ${m.color}40, ${m.color}10)`,
                border: `1px solid ${m.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {entry.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.image_url} alt={entry.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span aria-hidden style={{ fontSize: 48, opacity: 0.6 }}>
                  {m.icon}
                </span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                <EntityBadge type={entry.type} />
                {entry.rarity && (
                  <span
                    style={{
                      fontFamily: 'var(--fo)',
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      padding: '3px 9px',
                      borderRadius: 20,
                      color: RARITY_META[entry.rarity].color,
                      background: `${RARITY_META[entry.rarity].color}14`,
                      border: `1px solid ${RARITY_META[entry.rarity].color}55`,
                    }}
                  >
                    {RARITY_META[entry.rarity].label}
                  </span>
                )}
              </div>

              <h1
                style={{
                  fontFamily: 'var(--fe)',
                  fontSize: 'clamp(30px,6vw,56px)',
                  fontWeight: 900,
                  fontStyle: 'italic',
                  textTransform: 'uppercase',
                  color: 'var(--td)',
                  lineHeight: 0.9,
                  margin: 0,
                }}
              >
                {entry.name}
              </h1>

              {entry.universe && (
                <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {universeHubSlug(entry.universe) ? (
                    <Link href={`/learn/akasha/u/${universeHubSlug(entry.universe)}`} style={{ color: 'var(--td2)', textDecoration: 'none', fontWeight: 700 }}>
                      {entry.universe} ↗
                    </Link>
                  ) : (
                    <span>{entry.universe}</span>
                  )}
                  {typeof (entry.attributes as Record<string, unknown>).category === 'string' && (
                    <Link
                      href={`/learn/akasha?universe=${encodeURIComponent(entry.universe)}&cat=${encodeURIComponent((entry.attributes as Record<string, unknown>).category as string)}`}
                      style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: '#0EA878', textDecoration: 'none', background: 'rgba(14,168,120,0.10)', border: '1px solid rgba(14,168,120,0.35)', borderRadius: 20, padding: '2px 10px' }}
                    >
                      ◈ Collection : {(entry.attributes as Record<string, unknown>).category as string}
                    </Link>
                  )}
                </div>
              )}

              {entry.summary && (
                <p style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td2)', lineHeight: 1.65, margin: '0.9rem 0 0', maxWidth: 560 }}>
                  {entry.summary}
                </p>
              )}
            </div>
          </div>
        </div>
      </UniverseShell>

      {/* ── CORPS ─────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: 'clamp(1.6rem,4vw,2.6rem) 1.4rem clamp(3rem,7vw,5rem)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2.2rem',
        }}
      >
        {(() => {
          // Bio VF canon (descFr) : affichée EN PLUS de la description build quand elle est
          // nettement plus riche — les 3 315 fiches traduites cessent d'être des coquilles vides.
          const descFrVal = typeof (entry.attributes as Record<string, unknown>).descFr === 'string'
            ? ((entry.attributes as Record<string, unknown>).descFr as string).trim() : null;
          const richer = descFrVal && descFrVal.length > (entry.description?.length ?? 0) + 40;
          // La description est déjà affichée en sous-titre du bandeau (entry.summary) quand les
          // deux champs sont synchronisés (cas de la majorité des fiches) → éviter la répétition.
          const descDiffersFromSummary = !!entry.description && entry.description.trim() !== (entry.summary ?? '').trim();
          if (!descDiffersFromSummary && !richer) return null;
          return (
            <section>
              <h2 className="akasha-section-title">Description</h2>
              {descDiffersFromSummary && <Markdown source={entry.description!} />}
              {richer && (
                <p style={{ fontFamily: 'var(--fo)', fontSize: 14.5, color: 'var(--td2)', lineHeight: 1.7, margin: entry.description ? '0.8rem 0 0' : 0, whiteSpace: 'pre-line' }}>
                  {descFrVal}
                </p>
              )}
            </section>
          );
        })()}

        {/* Le DOSSIER (05/08) — le gabarit générique (lieux, artefacts, techniques hors
            attaque, professions) n'affichait JAMAIS les sections : c'était le plus gros
            contingent des 791 fiches muettes. */}
        <DossierSections
          sections={(entry.attributes as Record<string, unknown>).sections}
          accent={(entry.universe && universeMeta(entry.universe)?.color) || m.color}
          style={{ marginBottom: 24 }}
        />

        <EntityAttributes type={entry.type} attributes={entry.attributes} universe={entry.universe} />

        <EntityRelations out={entry.relationsOut} incoming={entry.relationsIn} />

        <SimilarSection universe={entry.universe} cat={category} type={entry.type} excludeSlug={entry.slug} />
      </div>
    </main>
  );
}

/** « Voir aussi » — 6 entrées de la même collection (sinon du même type) : plus de cul-de-sac. */
async function SimilarSection({ universe, cat, type, excludeSlug }: { universe: string | null; cat: string | null; type: AkashaType; excludeSlug: string }) {
  const similar = await listSimilar({ universe, cat, type, excludeSlug });
  if (!similar.length) return null;
  return (
    <section>
      <h2 className="akasha-section-title">Voir aussi{cat ? ` — ${cat}` : ''}</h2>
      <AkashaList entries={similar} variant="strip" />
    </section>
  );
}
