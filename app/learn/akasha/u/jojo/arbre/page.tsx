// app/learn/akasha/u/jojo/arbre/page.tsx — L'ARBRE JOESTAR (LOT 4b).
// Surface bespoke JoJo uniquement (chemin STATIQUE en dur, comme /learn/akasha/u/naruto/rangs pour
// Naruto ou /learn/akasha/wanted pour One Piece) : zéro image nouvelle — les 18 fiches de la
// composante Joestar ont déjà toutes un portrait — et zéro donnée inventée : la topologie vient du
// canon (infobox jojo.fandom.com + descFr déjà en base), sourcée et tracée avant écriture dans
// scripts/akasha-jojo-family-tree-fixes.mjs puis scripts/akasha-jojo-tree-slugs.mjs.
//
// Mesuré le 08/08/2026 : 233 fiches JoJo, 50 arêtes `famille` au total dans l'univers, formant 12
// composantes connexes au total, dont 18 fiches dans l'UNIQUE composante qui touche Jonathan
// Joestar — c'est cette composante, et rien d'autre, qui constitue « l'arbre Joestar ». ONZE
// autres petits amas `famille` existent dans ce même univers (Nijimura, Kawajiri, Zeppeli, Kira,
// Polnareff, Una, Hirose, Hommes-Piliers, Poco, Geil, Weather Report/Pucci) : aucun ne touche la
// lignée par le graphe, aucun n'est montré ici — pas un second arbre. (Recompte du vérificateur
// final, 08/08/2026 : la vague précédente n'en citait que sept, Geil et Weather Report/Pucci
// manquaient du texte affiché ET du commentaire — BFS non dirigé refait sur akasha_relations,
// relation=famille, univers JoJo, 12 composantes exactement.)
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SITE_URL } from '@/lib/site';
import { getEntriesBySlugs } from '@/lib/akasha/queries';
import { taxonomyBySlug, hubVisual } from '@/lib/akasha/universe-taxonomy';
import { universeMeta } from '@/lib/akasha/types';
import UniverseShell from '@/components/akasha/UniverseShell';
import Reveal from '@/components/akasha/hub/Reveal';
import JoestarTree from '@/components/akasha/hub/JoestarTree';

export const revalidate = 3600; // ISR 1 h — même rythme que le hub JoJo

export const metadata: Metadata = {
  title: 'L’arbre Joestar — JoJo’s Bizarre Adventure | AKASHA · NIKA LEARN',
  description:
    'Six générations, une lignée de sang et d’adoption : de Jonathan Joestar (Phantom Blood) à Jolyne Cujoh (Stone Ocean), la généalogie complète des Joestar dans le registre AKASHA.',
  alternates: { canonical: `${SITE_URL}/learn/akasha/u/jojo/arbre` },
};

const UNIVERSE = "JoJo's Bizarre Adventure";

// Les 18 fiches de la composante Joestar (cf. components/akasha/hub/JoestarTree.tsx pour la
// topologie complète, sourcée) — un seul fetch, aucune requête par nœud.
const TREE_SLUGS = [
  'george-i-joestar', 'dario-brando',
  'jonathan-joestar', 'erina-pendleton', 'dio-brando', 'giorno-giovanna',
  'george-joestar-ii', 'lisa-lisa', 'straizo', 'ryouhei-higashikata',
  'joseph-joestar', 'suzie-q', 'tomoko-higashikata',
  'holy-kuujou', 'josuke-higashikata', 'shizuka-joestar',
  'jotaro-kujo', 'jolyne-cujoh',
];

export default async function JoestarTreePage() {
  const taxo = taxonomyBySlug('jojo');
  if (!taxo) notFound();
  const m = universeMeta(UNIVERSE);
  const vis = hubVisual('jojo');

  const entries = await getEntriesBySlugs(TREE_SLUGS);
  if (entries.length === 0) notFound();

  return (
    <main>
      <UniverseShell color={m.color} heroGradient={vis?.heroGradient} bgPattern={vis?.bgPattern} kanji={taxo.kanji} padding="clamp(1.8rem,4vw,3rem) 1.4rem 1.5rem">
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <nav aria-label="Fil d'Ariane" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14, fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700 }}>
            <Link href="/learn/akasha" style={{ color: 'var(--td3)', textDecoration: 'none' }}>← Registre</Link>
            <span aria-hidden style={{ color: 'var(--td3)' }}>›</span>
            <Link href="/learn/akasha/u/jojo" style={{ color: m.color, textDecoration: 'none' }}>{m.emoji} JoJo’s Bizarre Adventure</Link>
            <span aria-hidden style={{ color: 'var(--td3)' }}>›</span>
            <span style={{ color: 'var(--td3)' }}>L’arbre Joestar</span>
          </nav>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: m.color, marginBottom: 4 }}>
            🌳 Généalogie
          </div>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(34px,7vw,64px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, margin: 0 }}>
            L’arbre Joestar
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 13.5, color: 'var(--td2)', marginTop: 10, maxWidth: 620, lineHeight: 1.6 }}>
            JoJo est la seule série du registre dont la colonne vertébrale EST une généalogie : chaque partie suit un descendant de la même famille, sur un siècle.
          </p>
        </div>
      </UniverseShell>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(1.6rem,3vw,2.4rem) 1.4rem clamp(3rem,7vw,5rem)', display: 'flex', flexDirection: 'column', gap: '1.6rem' }}>
        <Reveal as="div">
          <JoestarTree entries={entries} color={m.color} />
        </Reveal>

        {/* ── CE QUE CET ARBRE NE MONTRE PAS — dégradation honnête, pas un secret ── */}
        <Reveal as="div">
          <div style={{ marginTop: 8, paddingTop: 20, borderTop: '1px solid var(--bd)' }}>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 8 }}>
              Ce que cet arbre ne montre pas
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 640 }}>
              <li style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', lineHeight: 1.6 }}>
                Sadao Kujo, père de Jotaro Kujo : cité par le canon, mais aucune fiche du registre ne le documente — la branche s’arrête là plutôt que d’inventer un lien.
              </li>
              <li style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', lineHeight: 1.6 }}>
                Steel Ball Run et JoJolion (Parties 7-8) suivent une lignée Joestar d’un autre univers narratif — le registre n’en documente pas la généalogie aujourd’hui, cet arbre ne la simule pas.
              </li>
              <li style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', lineHeight: 1.6 }}>
                Onze autres petits groupes familiaux existent dans le registre JoJo (Nijimura, Kawajiri, Zeppeli, Kira, Polnareff, Una, Hirose, les Hommes-Piliers, la famille Poco, la famille Geil, Weather Report &amp; Enrico Pucci) : aucun ne se relie aux Joestar par le graphe — ce ne sont pas des branches de cet arbre.
              </li>
            </ul>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
