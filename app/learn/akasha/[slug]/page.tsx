// app/learn/akasha/[slug]/page.tsx — fiche détaillée d'une entité du registre.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEntryBySlug, listEntries, listSharedVoice, listSimilar, popularityRank } from '@/lib/akasha/queries';
import { TYPE_META, universeMeta, type AkashaType, type AkashaEntryCard } from '@/lib/akasha/types';
import { flavorExcerpt } from '@/lib/akasha/flavor';
import { universeHubSlug, taxonomyByName, hubVisual, axisLabel } from '@/lib/akasha/universe-taxonomy';
import { deriveShape } from '@/lib/akasha/shape';
import { SITE_URL } from '@/lib/site';
import AkashaList from '@/components/akasha/AkashaList';
import UniverseShell from '@/components/akasha/UniverseShell';
import EntityAttributes from '@/components/akasha/EntityAttributes';
import CharacterZone from '@/components/akasha/zone/CharacterZone';
import OrganizationZone from '@/components/akasha/zone/OrganizationZone';
import EraZone from '@/components/akasha/zone/EraZone';
import EntityZone, { type AxisNeighbors } from '@/components/akasha/zone/EntityZone';
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

  // Reste de la fiche (lieux, artefacts, métiers, pouvoirs/compétences hors « Attaque ») →
  // EntityZone (refonte LOT 2b) : composition par CAPACITÉS réelles (deriveShape, LOT 2a), plus de
  // 4ᵉ gabarit typé. Point de montage identique à celui documenté par le plan (« à la place de la
  // branche fallback, ~ligne 196 ») — même schéma que les branches Organisation/Ères ci-dessus :
  // la zone porte portrait + canal, la page monte sections/attributs/voir-aussi en pleine largeur.
  const shape = deriveShape(entry);

  // LOT 2c — le repli des isolées. Calculé ICI (Server Component), jamais dans la zone (client) :
  // une fiche SANS AUCUNE arête mais avec un axe canon peuplé montre des voisins qui PARTAGENT
  // cette valeur d'axe — construits depuis les ATTRIBUTS via `listEntries` (même requête que le
  // registre filtré), jamais depuis une relation inventée. `estPeuplee` n'étant pas exportée de
  // lib/akasha/shape.ts (fonction pure scellée par le LOT 2a, non retouchée ici), la même garde
  // (chaîne non vide / tableau non vide) est répétée localement.
  let axisNeighbors: AxisNeighbors | null = null;
  if (shape.includes('axis') && !shape.includes('relations') && entry.universe) {
    const attrs = entry.attributes as Record<string, unknown>;
    const populated = (v: unknown) => (typeof v === 'string' ? v.trim() !== '' : Array.isArray(v) ? v.length > 0 : false);
    const axis = taxonomyByName(entry.universe)?.axes.find((ax) => populated(attrs[ax.attr]));
    const raw = axis ? attrs[axis.attr] : null;
    const value = typeof raw === 'string' ? raw : Array.isArray(raw) && typeof raw[0] === 'string' ? (raw[0] as string) : null;
    if (axis && value) {
      const { entries: siblings } = await listEntries({ universe: entry.universe, attr: axis.attr, val: value });
      const neighbors: AkashaEntryCard[] = siblings.filter((e) => e.slug !== entry.slug).slice(0, 6);
      if (neighbors.length > 0) {
        axisNeighbors = { attr: axis.attr, label: axisLabel(entry.universe, axis.attr) ?? axis.label, value, entries: neighbors };
      }
    }
  }

  return (
    <main>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: 'clamp(1.4rem,3vw,2.4rem) 1.4rem clamp(3rem,7vw,5rem)' }}>
        <Crumbs universe={entry.universe} category={category} name={entry.name} />
        <EntityZone entry={entry} axisNeighbors={axisNeighbors} />
        {/* Le DOSSIER (05/08) — même point de montage que les branches Organisation/Ères :
            la zone porte le portrait+canal, la page monte les sections en pleine largeur. */}
        <DossierSections
          sections={(entry.attributes as Record<string, unknown>).sections}
          accent={(entry.universe && universeMeta(entry.universe)?.color) || m.color}
          style={{ marginTop: 28 }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: 28 }}>
          <EntityAttributes type={entry.type} attributes={entry.attributes} universe={entry.universe} />
          <SimilarSection universe={entry.universe} cat={category} type={entry.type} excludeSlug={entry.slug} />
        </div>
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
