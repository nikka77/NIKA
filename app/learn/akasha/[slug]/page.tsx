// app/learn/akasha/[slug]/page.tsx — fiche détaillée d'une entité du registre.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEntryBySlug, listEntries, listSharedVoice, listSimilar, popularityRank } from '@/lib/akasha/queries';
import { TYPE_META, universeMeta, type AkashaType, type AkashaEntryCard } from '@/lib/akasha/types';
import { flavorExcerpt, clampText } from '@/lib/akasha/flavor';
import { universeHubSlug, taxonomyByName, hubVisual, axisLabel } from '@/lib/akasha/universe-taxonomy';
import { deriveShape } from '@/lib/akasha/shape';
import { SITE_URL } from '@/lib/site';
import AkashaList from '@/components/akasha/AkashaList';
import UniverseShell from '@/components/akasha/UniverseShell';
import EntityAttributes from '@/components/akasha/EntityAttributes';
import CharacterZone from '@/components/akasha/zone/CharacterZone';
import OrganizationZone from '@/components/akasha/zone/OrganizationZone';
import EntityZone, { type AxisNeighbors } from '@/components/akasha/zone/EntityZone';
import DossierSections from '@/components/akasha/DossierSections';
import Crumbs from '@/components/akasha/Crumbs';

export const revalidate = 3600; // ISR 1 h — page la plus visitée du domaine, tournait sans cache

type Props = { params: Promise<{ slug: string }> };

/** Un fait PROPRE à la fiche, tiré des arêtes que sa page affiche déjà — jamais inventé, jamais
 *  déduit : chaque valeur est une ligne d'`akasha_relations` dont la cible porte ce nom.
 *
 *  Pourquoi seulement les arêtes, et pas les attributs : mesuré le 10/08/2026 sur les 336 fiches
 *  dont la méta description était identique à celle d'une autre à un nom près, trois variantes ont
 *  été simulées avant d'écrire une ligne de correctif —
 *    B (arêtes seules)                 : 165 fiches distinguées, suffixe posé sur 212
 *    A (arêtes + n'importe quel attribut) : 166, suffixe posé sur 333
 *    C (arêtes + attributs intrinsèques)  : 167, suffixe posé sur 238
 *  Les attributs achètent DEUX fiches et collent « Personnage secondaire. » à 121 d'entre elles :
 *  écarté sur le chiffre, pas sur le goût. Traces : data/audits/meta-partage-simulation-{A,B,C}-*. */
function faitPropre(entry: Awaited<ReturnType<typeof getEntryBySlug>>): string | null {
  if (!entry) return null;
  const cibles = (rels: typeof entry.relationsIn, kind: string) =>
    [...new Set(rels.filter((r) => r.relation === kind).map((r) => r.target?.name).filter(Boolean))];
  // Attaques et techniques : le porteur est LE fait qui les sépare (416 arêtes `maitrise` sur ce lot).
  // Libellé au féminin comme le gabarit « Attaque » de cette même page (« Maîtrisée par · N »).
  if (entry.type === 'power' || entry.type === 'skill') {
    const par = cibles(entry.relationsIn, 'maitrise');
    if (par.length) return `Maîtrisée par ${par.slice(0, 2).join(' et ')}`;
  }
  const SORTANTES: [string, string][] = [['appartient', 'Appartient à'], ['habite', 'Réside à'], ['exerce', 'Exerce']];
  for (const [rel, label] of SORTANTES) {
    const n = cibles(entry.relationsOut, rel);
    if (n.length) return `${label} ${n.slice(0, 2).join(' et ')}`;
  }
  return null;
}

/** Compose « socle + fait propre » SOUS une borne, dans le bon ORDRE : le fait est posé d'abord,
 *  la borne se paie sur le socle.
 *
 *  Ce qu'il y avait avant : `clampText(socle + '. ' + fait + '.', 165)`. La borne coupant par la
 *  QUEUE, elle mangeait d'abord le suffixe qu'elle était censée protéger. Mesuré le 10/08/2026 en
 *  rejouant la composition sur les 7 698 fiches paginées puis en DEMANDANT les pages : le fait
 *  propre était posé sur 498 fiches et coupé sur 105 d'entre elles (21,1 %) — `dynamic-action`
 *  servait « … Maîtrisée par Might… », `komurasaki` « … Appartient à Toko et… ».
 *  Traces : data/audits/chantier3-descriptions-*, data/audits/chantier3-controle-rejeu-*.
 *
 *  Le plancher n'a jamais à jouer aujourd'hui : mesuré sur les 498 faits posés, le plus long fait
 *  65 caractères, donc le budget laissé au socle ne descend pas sous 98. Il est là pour le jour où
 *  un nom à rallonge entrerait dans le corpus — mieux vaut alors une description tronquée qu'une
 *  fiche réduite à son seul suffixe.
 *
 *  Le `.replace(/\s+/g,' ').trim()` n'est pas cosmétique : l'ancien code faisait TOUJOURS passer la
 *  chaîne entière par clampText, qui normalise les blancs. En sortant du clamp on perdait ce
 *  service — simulé sur le corpus, trois noms du registre portent un blanc parasite (« Earth
 *  Release  (Presumed) », « Wind Release  (Affinity; Anime only) », « Fruit du démon artificiel de
 *  Végapunk » avec une espace de tête) et la description SORTAIT avec. Le correctif était en train
 *  d'introduire trois régressions pour en réparer cent cinq. */
const PLANCHER_SOCLE = 60;
function borner(socle: string, fait: string | null, max: number): string {
  if (!fait) return clampText(socle, max);
  const base = socle.replace(/\s+/g, ' ').trim().replace(/[\s.·—-]+$/, '');
  const queue = ` ${fait.replace(/\s+/g, ' ').trim()}.`;
  if (base.length + 1 + queue.length <= max) return `${base}.${queue}`;
  const budget = max - queue.length;
  if (budget < PLANCHER_SOCLE) return clampText(`${base}.${queue}`, max);
  // clampText finit sur « … ». Quand la coupe tombe juste après un point de fin de phrase, on
  // servait « … chapitre 500.… Réside à Konohagakure. » (constaté sur /learn/akasha/taji) : on
  // retire le point, l'ellipse suffit. Correction locale à cette composition — `clamp` est partagé
  // avec les extraits de cartes et de listes, on ne le touche pas d'ici.
  return `${clampText(base, budget).replace(/([.!?])…$/, '…')}${queue}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // `getEntryBySlug` est cache() : cet appel est le MÊME que celui de la page et de l'image OG.
  // Les relations lues plus bas ne coûtent donc aucune requête supplémentaire.
  const entry = await getEntryBySlug(slug);
  if (!entry) return { title: 'Entité introuvable — AKASHA' };
  const m = TYPE_META[entry.type];
  const url = `${SITE_URL}/learn/akasha/${entry.slug}`;
  // SEO : la bio VF canon (descFr) donne une méta description UNIQUE et riche. Mesuré le
  // 10/08/2026 en rejouant ce code sur les 7 654 fiches paginées : 6 909 fiches y trouvent une
  // phrase de prose, 740 retombent sur `summary`, 5 sur le gabarit.
  const descFr = typeof (entry.attributes as Record<string, unknown>).descFr === 'string'
    ? ((entry.attributes as Record<string, unknown>).descFr as string) : null;
  const prose = flavorExcerpt(descFr, 155);
  // Le summary générique (« Attaque de One Piece — attaque signature. ») se répète à l'identique
  // sur des centaines de fiches : 336 fiches (4,39 %) portaient une description identique à celle
  // d'une autre à un nom près, en 81 groupes dont un de 80. Le nom en préfixe ne suffit PAS —
  // Google déduplique sur le corps de la phrase. D'où le fait propre, ajouté seulement quand la
  // fiche n'a pas de prose à offrir (sinon il redirait ce que la prose dit déjà mieux).
  const fait = prose ? null : faitPropre(entry);
  const socle = entry.summary
    ? `${entry.name} — ${entry.summary}`
    : `${entry.name}, ${m.label.toLowerCase()} du registre AKASHA${entry.universe ? ` (${entry.universe})` : ''}.`;

  const description = prose ?? borner(socle, fait, 165);
  // La carte de partage montre 2 à 3 lignes de plus que Google : on lui sert la version longue.
  const ogDescription = flavorExcerpt(descFr, 200) ?? borner(socle, fait, 200);
  // og:title — le NOM d'abord, puis le type et le monde. Sans lui, WhatsApp, Discord, X et
  // l'aperçu Google affichaient « NIKA — La super-app de la Côte d'Azur » sur les 7 654 fiches :
  // hérité du openGraph de app/layout.tsx, que ce fichier ne redéfinissait pas (mesuré sur 22
  // fiches servies, 22 fois la même chaîne — data/audits/meta-partage-rendu-*).
  const ogTitle = `${entry.name} — ${m.label}${entry.universe ? ` · ${entry.universe}` : ''}`;
  return {
    title: `${entry.name} — ${m.label} | AKASHA`,
    description,
    alternates: { canonical: url },
    // `images` volontairement absent des deux blocs : c'est ce qui laisse Next injecter
    // l'image du fichier voisin opengraph-image.tsx (réparée par la vague 5). La déclarer ici
    // l'écraserait et lui ferait perdre son empreinte de cache.
    openGraph: { title: ogTitle, description: ogDescription, url, siteName: 'AKASHA — le registre', locale: 'fr_FR', type: 'article' },
    twitter: { card: 'summary_large_image', title: ogTitle, description: ogDescription },
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
          {/* Le DOSSIER (C3-2) — déplacé hors de CharacterZone : il vivait comme 3ᵉ enfant de
              `.ak-zone-grid` avec `gridColumn:'1/-1'`, ce qui cassait l'auto-placement CSS Grid et
              repoussait le canal sous le dossier sur 85,6 % des fiches personnage (celles qui ONT
              un dossier). Même point de montage que les branches Organisation/Ères/Entité
              ci-dessous, qui n'ont jamais eu ce bug. Zéro changement de donnée. */}
          <DossierSections
            sections={(entry.attributes as Record<string, unknown>).sections}
            accent={(entry.universe && universeMeta(entry.universe)?.color) || m.color}
            style={{ marginTop: 28 }}
          />
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

  // BRANCHE `eras` SUPPRIMÉE le 10/08/2026 (§8 question 3, dernier reste du LOT 5). Elle testait
  // `attributes.eras` non vide et détournait 14 fiches vers `EraZone` AVANT que `deriveShape` soit
  // seulement appelé : elles n'avaient donc ni `relations`, ni `orbit`, ni `axis`, ni « Attributs »,
  // ni « Voir aussi » — dont `konohagakure` (449 membres) et `grand-line` (112), les deux cas
  // d'école du seuil `orbit`. Le rouleau temporel est désormais le module `timeline` d'`EntityZone`,
  // monté par CAPACITÉ. Ne pas réintroduire d'aiguillage sur `attributes.eras` ici : c'est
  // `deriveShape` qui décide, et lui seul (lib/akasha/shape.ts).

  // Reste de la fiche (lieux, artefacts, métiers, pouvoirs/compétences hors « Attaque »), fiches à
  // ères comprises →
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
