// app/learn/akasha/u/naruto/rangs/page.tsx — L'ÉCHELLE DES RANGS (LOT 4a).
// Surface bespoke Naruto uniquement (chemin STATIQUE en dur, comme /learn/akasha/wanted pour One
// Piece) : zéro image nouvelle — 7 médaillons déjà détourés sur disque (RankBadge) — et zéro
// donnée nouvelle — l'axe `rank` existe déjà (universe-taxonomy.ts), 473 personnages mesurés.
//
// Trois décisions canon tranchées ici (voir tasks/akasha-architecture.md §LOT 4 et le rapport de
// vague) :
// 1. La hiérarchie shinobi RÉELLE a SIX paliers : Académie → Genin → Chūnin → Tokubetsu Jōnin →
//    Jōnin → Kage. C'est une VOIE DE PROMOTION (examens, ancienneté).
// 2. Anbu N'EST PAS un septième palier : c'est une AFFECTATION (force spéciale sous l'autorité du
//    Kage), pas un grade personnel — ses agents restent formellement chūnin ou jōnin sous le
//    masque (Kakashi reste « Jōnin » à l'état civil pendant son mandat de capitaine Anbu). Rendu
//    en annexe distincte, jamais comme 6ᵉ rang.
// 3. Quatre fiches (Sannin, Head Ninja, S-rank, S-rank Missing-nin — 1 personnage chacune)
//    portent une valeur de `rank` qui n'est ni un grade ni une affectation (titre honorifique,
//    fonction locale, classification de danger). Documentées en note de bas de page — jamais
//    silencieuses, jamais forcées dans l'échelle. (08/08/2026 : recompte du vérificateur final —
//    la vague précédente n'en listait que trois, Kakuzu/« S-rank Missing-nin » manquait.)
//
// Aucune gamification : pas de progression, pas de déblocage, pas de score — une échelle de
// LECTURE du canon (décision Dan, refonte zones 14/07). Les comptes viennent de listAxisCounts
// (même fonction que le rail de chips du hub) : aucun chiffre codé en dur.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SITE_URL } from '@/lib/site';
import { listAxisCounts, listEntries, getEntriesBySlugs } from '@/lib/akasha/queries';
import { taxonomyBySlug, hubVisual, axisValueLabel } from '@/lib/akasha/universe-taxonomy';
import { universeMeta } from '@/lib/akasha/types';
import UniverseShell from '@/components/akasha/UniverseShell';
import Reveal from '@/components/akasha/hub/Reveal';
import AkashaList from '@/components/akasha/AkashaList';
import { RankBadge } from '@/components/akasha/NarutoIcons';

export const revalidate = 3600; // ISR 1 h — mêmes données que le rail de chips du hub Naruto

// Voir app/learn/akasha/wanted/page.tsx : `alternates` et `description` étaient bien propres à la
// page, mais sans bloc `openGraph` Next hérite EN ENTIER de celui du layout racine — la carte de
// partage vendait « NIKA — La super-app de la Côte d'Azur ». Ce segment `u/naruto` est littéral :
// il ne descend PAS de `u/[slug]`, et n'hérite donc ni de son generateMetadata ni de son
// opengraph-image. Mesuré en demandant la page le 10/08/2026.
const OG_TITRE = 'L’échelle des rangs — Naruto';
const DESCRIPTION = 'De l’Académie au Kage : les six grades canon de la hiérarchie shinobi de Konoha, et où se classent les personnages du registre AKASHA.';

export const metadata: Metadata = {
  title: 'L’échelle des rangs — Naruto | AKASHA · NIKA LEARN',
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/learn/akasha/u/naruto/rangs` },
  openGraph: {
    title: OG_TITRE, description: DESCRIPTION, url: `${SITE_URL}/learn/akasha/u/naruto/rangs`,
    siteName: 'AKASHA — le registre', locale: 'fr_FR', type: 'website',
  },
  twitter: { card: 'summary_large_image', title: OG_TITRE, description: DESCRIPTION },
};

const UNIVERSE = 'Naruto';

// Voie de promotion canon, dans l'ordre — vérifiée contre l'axe `rank` déjà curé
// (universe-taxonomy.ts) : mêmes 6 valeurs, même ordre, zéro divergence à documenter.
// `labelPlural` : la seule valeur qui soit un nom commun français (« Élève de l'Académie ») a
// besoin d'un accord pluriel explicite pour le lien « Voir les N … » — les cinq autres grades
// (Genin, Chūnin, Tokubetsu Jōnin, Jōnin, Kage) sont des emprunts japonais invariants en français,
// `label.toLowerCase()` suffit. Bug réel corrigé le 08/08/2026 : « Voir les 55 élève de
// l'académie » (accord manquant) — vérifié sur la page rendue par le vérificateur final.
const RUNGS: { v: string; gloss: string; labelPlural?: string }[] = [
  {
    v: 'Academy Student',
    gloss: 'Élève de l’Académie Ninja de Konoha : pas encore un shinobi en titre — le point de départ commun avant l’examen de sortie.',
    labelPlural: 'élèves de l’académie',
  },
  {
    v: 'Genin',
    gloss: 'Premier grade réel, obtenu à l’examen de l’Académie. Affecté en équipe de trois sous un jōnin-sensei pour les missions de rang D à C.',
  },
  {
    v: 'Chūnin',
    gloss: 'Grade intermédiaire validé par l’examen Chūnin : apte à diriger une mission seul et à encadrer des genin.',
  },
  {
    v: 'Tokubetsu Jōnin',
    gloss: '« Jōnin spécial » : expertise reconnue dans UN domaine précis (interrogatoire, médecine, sceaux, invocation…), sans l’éventail généraliste exigé d’un jōnin complet.',
  },
  {
    v: 'Jōnin',
    gloss: 'Grade le plus élevé de la voie standard : shinobi complet, apte à diriger seul missions et équipes — le vivier des futurs Kage.',
  },
  {
    v: 'Kage',
    gloss: 'Le ninja le plus fort d’un village, désigné pour le diriger : Hokage, Kazekage, Mizukage, Raikage, Tsuchikage.',
  },
];

const ANBU_GLOSS =
  'Ansatsu Senjutsu Tokushu Butai — force spéciale d’assassinat et de renseignement, sous l’autorité directe du Kage. Ce n’est PAS un grade personnel : ses agents restent formellement chūnin ou jōnin sous le masque, et redeviennent visibles à leur sortie — Kakashi Hatake, capitaine Anbu de l’escouade Ro, est resté « Jōnin » à l’état civil pendant tout son mandat (sa fiche le confirme : rang enregistré Jōnin, pas Anbu).';

// Fiches dont le champ `rank` porte une valeur hors échelle — mesurées (node/ops), pas devinées.
// Chacune est réelle et accessible : elle ne « casse » pas l’échelle, elle vit à côté.
const HORS_ECHELLE: { slug: string; rawRank: string; reason: string }[] = [
  {
    slug: 'orochimaru',
    rawRank: 'Sannin',
    reason: 'un TITRE honorifique (l’un des trois légendaires Sannin de Konoha) — sa fiche le classe déjà dans l’axe Générations, pas dans un grade.',
  },
  {
    slug: 'head-ninja-of-kumogakure',
    rawRank: 'Head Ninja',
    // 10/08 (chantier 4) : justification corrigée. Elle disait « dans un film » — faux : le Head
    // Ninja de Kumo apparaît dans l’affaire Hyūga, et le wiki en fait un vrai grade (« a rank
    // between jōnin and Kage, and unique to its own village », Category:Ninja Ranks, source Rin no
    // Sho p. 262). Il est donc désormais dans l’axe `rank` curé — mais il reste hors de CETTE
    // échelle-ci, qui rend la voie de promotion de Konoha, pas celle de Kumogakure.
    reason: 'un grade PROPRE À KUMOGAKURE — le wiki le situe entre jōnin et Kage, mais « unique à son village » : il ne se range pas dans la voie de promotion de Konoha rendue ici.',
  },
  {
    slug: 'kisame-hoshigaki',
    rawRank: 'S-rank',
    reason: 'une CLASSIFICATION DE DANGER (le niveau de menace d’un missing-nin ou d’une mission), pas un grade de carrière.',
  },
  {
    slug: 'kakuzu',
    rawRank: 'S-rank Missing-nin',
    reason: 'la même CLASSIFICATION DE DANGER que Kisame Hoshigaki, avec une formulation de fiche différente (« missing-nin » explicite) — pas un grade de carrière.',
  },
];

export default async function NarutoRanksPage() {
  const taxo = taxonomyBySlug('naruto');
  if (!taxo) notFound();
  const m = universeMeta(UNIVERSE);
  const vis = hubVisual('naruto');

  const [counts, tierResults, anbuResult, offScale] = await Promise.all([
    listAxisCounts(UNIVERSE, ['rank']),
    Promise.all(RUNGS.map((r) => listEntries({ universe: UNIVERSE, attr: 'rank', val: r.v, sort: 'pop' }))),
    listEntries({ universe: UNIVERSE, attr: 'rank', val: 'Anbu', sort: 'pop' }),
    getEntriesBySlugs(HORS_ECHELLE.map((h) => h.slug)),
  ]);

  const rankCounts = counts.get('rank') ?? new Map<string, number>();
  const rungs = RUNGS.map((r, i) => ({ ...r, count: rankCounts.get(r.v) ?? 0, members: tierResults[i].entries }));
  const ladderTotal = rungs.reduce((a, r) => a + r.count, 0);
  const anbuCount = rankCounts.get('Anbu') ?? 0;
  const offScaleBySlug = new Map(offScale.map((e) => [e.slug, e]));

  return (
    <main>
      <UniverseShell color={m.color} heroGradient={vis?.heroGradient} bgPattern={vis?.bgPattern} kanji={taxo.kanji} padding="clamp(1.8rem,4vw,3rem) 1.4rem 1.5rem">
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <nav aria-label="Fil d'Ariane" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14, fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700 }}>
            <Link href="/learn/akasha" style={{ color: 'var(--td3)', textDecoration: 'none' }}>← Registre</Link>
            <span aria-hidden style={{ color: 'var(--td3)' }}>›</span>
            <Link href="/learn/akasha/u/naruto" style={{ color: m.color, textDecoration: 'none' }}>{m.emoji} Naruto</Link>
            <span aria-hidden style={{ color: 'var(--td3)' }}>›</span>
            <span style={{ color: 'var(--td3)' }}>Échelle des rangs</span>
          </nav>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: m.color, marginBottom: 4 }}>
            🎖️ Hiérarchie shinobi
          </div>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(34px,7vw,64px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, margin: 0 }}>
            L’échelle des rangs
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 13.5, color: 'var(--td2)', marginTop: 10, maxWidth: 620, lineHeight: 1.6 }}>
            <strong style={{ color: m.color }}>{ladderTotal}</strong> personnages classés sur les six grades canon de la voie shinobi, de l’Académie au Kage — plus <strong style={{ color: m.color }}>{anbuCount}</strong> affectés à l’Anbu, en annexe.
          </p>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginTop: 8, maxWidth: 620, lineHeight: 1.6 }}>
            Une échelle de lecture, pas une progression : elle classe ce que le canon a déjà écrit — elle ne se débloque pas.
          </p>
        </div>
      </UniverseShell>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(1.6rem,3vw,2.4rem) 1.4rem clamp(3rem,7vw,5rem)' }}>
        {/* ── LES SIX PALIERS ─────────────────────────────────── */}
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rungs.map((r, i) => {
            const label = axisValueLabel(UNIVERSE, 'rank', r.v);
            const pct = ladderTotal > 0 ? Math.max(4, Math.round((r.count / ladderTotal) * 100)) : 0;
            const last = i === rungs.length - 1;
            return (
              <Reveal key={r.v} as="div" delay={i * 40}>
                <li style={{ display: 'flex', gap: 16, position: 'relative', paddingBottom: last ? 0 : 26 }}>
                  {/* rail + nœud — même vocabulaire que ArcFrieze, en vertical */}
                  <div style={{ position: 'relative', width: 46, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {!last && <span aria-hidden style={{ position: 'absolute', top: 46, bottom: -6, width: 2, background: 'var(--bd2)' }} />}
                    <RankBadge value={r.v} size={46} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1, paddingTop: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
                      <h2 style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 20, textTransform: 'uppercase', color: 'var(--td)', margin: 0 }}>
                        {label}
                      </h2>
                      {label !== r.v && <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)' }}>· {r.v}</span>}
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 800, color: m.color, background: `${m.color}1A`, borderRadius: 20, padding: '1px 9px' }}>
                        {r.count}
                      </span>
                    </div>
                    <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.55, margin: '6px 0 10px', maxWidth: 560 }}>
                      {r.gloss}
                    </p>
                    <div style={{ height: 5, borderRadius: 3, background: 'var(--bd)', overflow: 'hidden', maxWidth: 320, marginBottom: 12 }}>
                      <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: m.color, borderRadius: 3 }} />
                    </div>
                    {r.members.length > 0 && <AkashaList entries={r.members.slice(0, 6)} variant="strip" />}
                    {r.count > 0 && (
                      <Link
                        href={`/learn/akasha/u/naruto/rank/${encodeURIComponent(r.v)}`}
                        style={{ display: 'inline-block', marginTop: 8, fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, color: m.color, textDecoration: 'none' }}
                      >
                        Voir les {r.count} {r.labelPlural ?? label.toLowerCase()} →
                      </Link>
                    )}
                  </div>
                </li>
              </Reveal>
            );
          })}
        </ol>

        {/* ── ANBU — AFFECTATION, PAS UN RANG ────────────────── */}
        <Reveal as="div">
          <div style={{ marginTop: 30, padding: '16px 18px', borderRadius: 12, border: '1px dashed var(--bd2)', background: 'var(--bg2)' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <RankBadge value="Anbu" size={40} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
                  <h2 style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 16, textTransform: 'uppercase', color: 'var(--td)', margin: 0 }}>
                    Anbu
                  </h2>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--td3)' }}>
                    hors échelle · affectation
                  </span>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 800, color: 'var(--td2)', background: 'var(--bd)', borderRadius: 20, padding: '1px 9px' }}>
                    {anbuCount}
                  </span>
                </div>
                <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td2)', lineHeight: 1.55, margin: '6px 0 10px', maxWidth: 560 }}>
                  {ANBU_GLOSS}
                </p>
                {anbuResult.entries.length > 0 && <AkashaList entries={anbuResult.entries.slice(0, 6)} variant="strip" />}
                {anbuCount > 0 && (
                  <Link
                    href="/learn/akasha/u/naruto/rank/Anbu"
                    style={{ display: 'inline-block', marginTop: 8, fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, color: 'var(--td2)', textDecoration: 'none' }}
                  >
                    Voir les {anbuCount} Anbu →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── HORS ÉCHELLE — ni un rang, ni une affectation ──── */}
        <Reveal as="div">
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--bd)' }}>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 8 }}>
              Hors échelle · {HORS_ECHELLE.length} fiches
            </div>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', lineHeight: 1.6, margin: '0 0 12px', maxWidth: 600 }}>
              {HORS_ECHELLE.length} fiches portent, dans leur champ « rang », une valeur qui n’est ni un grade ni une affectation — elles n’entrent pas dans l’échelle, mais restent accessibles :
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {HORS_ECHELLE.map((h) => {
                const e = offScaleBySlug.get(h.slug);
                return (
                  <li key={h.slug} style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', lineHeight: 1.5 }}>
                    <Link href={`/learn/akasha/${h.slug}`} style={{ color: 'var(--td2)', fontWeight: 700, textDecoration: 'none' }}>
                      {e?.name ?? h.slug}
                    </Link>
                    {' '}— rang enregistré « {h.rawRank} » : {h.reason}
                  </li>
                );
              })}
            </ul>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
