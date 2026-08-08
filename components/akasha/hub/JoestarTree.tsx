// components/akasha/hub/JoestarTree.tsx — L'ARBRE JOESTAR (LOT 4b). Seconde surface bespoke JoJo
// (tasks/akasha-architecture.md §6.5 : « la seule que cet univers mérite en propre »), à côté de
// la frise des 8 parties déjà livrée (HubSignature, signature: 'jojo'). 100 % serveur (RSC).
//
// STRUCTURE, PAS DONNÉES EN DUR : ce fichier ne code que la TOPOLOGIE (qui descend de qui, dans
// quel ordre) — même geste que RUNGS/HORS_ECHELLE de app/learn/akasha/u/naruto/rangs/page.tsx.
// Noms, portraits, existence des fiches : tout vient d'un fetch live (getEntriesBySlugs), passé en
// prop. Un slug absent de `entries` (fiche supprimée demain) fait DISPARAÎTRE son nœud, jamais un
// portrait cassé ni un nom halluciné — c'est la dégradation exigée par la tâche.
//
// LA MESURE (08/08/2026, recomptée trois fois — cf. scripts/akasha-jojo-family-tree-fixes.mjs,
// scripts/akasha-jojo-tree-slugs.mjs, puis le vérificateur final par requête directe) : 233 fiches
// JoJo, 50 arêtes `famille` (pas 35, pas 45 — le chiffre a bougé pendant cette vague : -1 fausse
// arête Roses→Holy retirée, +5 arêtes manquantes posées, +1 arête Josuke↔Tomoko posée =
// 45-1+5+1), formant 12 composantes connexes au total. La composante connexe qui contient Jonathan
// Joestar compte 18 fiches — c'est TOUT ce que le corpus relie par le sang ou l'adoption à la
// lignée Joestar. ONZE autres petits amas `famille` existent dans ce même univers (Nijimura,
// Kawajiri, Zeppeli, Kira, Polnareff, Una, Hirose, Hommes-Piliers, Poco, Geil, Weather
// Report/Pucci) mais ne touchent PAS Jonathan Joestar par le graphe : ce ne sont pas des branches
// de CET arbre, volontairement absents ici (montrés nulle part ailleurs non plus — pas de second
// arbre, pas de mandat pour ça). Correction du vérificateur final (08/08/2026) : la vague
// précédente n'en comptait que sept dans ce commentaire ET dans le texte affiché au lecteur —
// Geil (enya-geil, j-geil) et Weather Report/Enrico Pucci manquaient des deux, pas seulement d'un.
//
// SIX GÉNÉRATIONS = Jonathan → Jolyne (une par protagoniste, Parties 1/2/3/4/6). Une ligne « avant »
// (le père de Jonathan et le père biologique de Dio) est montrée au-dessus, plus petite, hors du
// compte des six — l'omettre aurait été une donnée cachée, la compter aurait menti sur le chiffre
// du plan. Giorno (Partie 5) est SUIVI, pas RANGÉ dans une génération numérotée : son père est DIO
// habitant le corps volé de Jonathan (attributes.family de giorno-giovanna : father→DIO,
// ancestor→Jonathan — deux rels différents, pas la même distance), le placer sur une rangée
// générationnelle donnerait une fausse précision. Il est donc rattaché sous Dio, avec sa propre note.
import Link from 'next/link';
import type { AkashaEntryCard } from '@/lib/akasha/types';

type Node = { slug: string; caption: string; note?: string; portraitSize?: number };
type Row = {
  gen: string; // "" pour la ligne « avant », sinon "1".."6"
  partie?: string;
  couples: Node[][]; // chaque élément = 1 personne seule, ou [A, B] = couple joint par ⚭
  satellites?: Node[]; // attachés, hors lignée de sang directe (beaux-parents, branches annexes)
};

const ROWS: Row[] = [
  {
    gen: '', partie: 'Avant la lignée',
    couples: [[{ slug: 'george-i-joestar', caption: 'Père de Jonathan Joestar.' }]],
    satellites: [{ slug: 'dario-brando', caption: 'Père biologique de Dio Brando — sans lien de sang Joestar.' }],
  },
  {
    gen: '1', partie: 'Partie 1 · Phantom Blood',
    couples: [[
      { slug: 'jonathan-joestar', caption: 'Protagoniste de Phantom Blood.' },
      { slug: 'erina-pendleton', caption: 'Épouse de Jonathan.' },
    ]],
    satellites: [
      {
        slug: 'dio-brando',
        caption: 'Frère adoptif — fils de Dario Brando, recueilli par George Joestar Ier. Antagoniste de la lignée sur trois parties.',
      },
      {
        slug: 'giorno-giovanna',
        caption: 'Fils de DIO, conçu dans le corps volé de Jonathan Joestar (Partie 5) — un lien de sang Joestar par un chemin qu’aucune génération n’explique proprement.',
        note: 'Non rangé sur une rangée numérotée : sa fiche donne « père → DIO » et « ancêtre → Jonathan Joestar » (deux distances différentes), le placer sur une génération inventerait une précision que le canon n’a pas.',
      },
    ],
  },
  {
    gen: '2',
    couples: [[
      { slug: 'george-joestar-ii', caption: 'Fils de Jonathan & Erina.' },
      { slug: 'lisa-lisa', caption: 'Épouse de George Joestar II — révélée être Elizabeth Joestar.' },
    ]],
    satellites: [
      { slug: 'straizo', caption: 'Père adoptif de Lisa Lisa, allié Hamon de Jonathan.' },
      { slug: 'ryouhei-higashikata', caption: 'Grand-père de Josuke Higashikata, père de Tomoko — branche Higashikata, sans lien de sang Joestar.' },
    ],
  },
  {
    gen: '3', partie: 'Partie 2 · Battle Tendency',
    couples: [[
      { slug: 'joseph-joestar', caption: 'Fils de George Joestar II & Lisa Lisa — protagoniste de Battle Tendency.' },
      { slug: 'suzie-q', caption: 'Épouse de Joseph.' },
    ]],
    satellites: [{ slug: 'tomoko-higashikata', caption: 'Mère de Josuke, hors mariage avec Joseph — fille de Ryouhei Higashikata.' }],
  },
  {
    gen: '4', partie: 'Parties 3 & 4 · les enfants de Joseph',
    couples: [
      [{ slug: 'holy-kuujou', caption: 'Fille de Joseph & Suzie Q.' }],
      [{ slug: 'josuke-higashikata', caption: 'Fils de Joseph & Tomoko Higashikata — protagoniste de Diamond is Unbreakable. Demi-frère de Holy.' }],
      [{ slug: 'shizuka-joestar', caption: 'Fille adoptive de Joseph & Suzie Q.' }],
    ],
  },
  {
    gen: '5', partie: 'Partie 3 · Stardust Crusaders',
    couples: [[{ slug: 'jotaro-kujo', caption: 'Fils de Holy Kuujou — protagoniste de Stardust Crusaders.', note: 'Père : Sadao Kujo, cité par le canon — aucune fiche dans le corpus, branche non représentée.' }]],
  },
  {
    gen: '6', partie: 'Partie 6 · Stone Ocean',
    couples: [[{ slug: 'jolyne-cujoh', caption: 'Fille de Jotaro — protagoniste de Stone Ocean.' }]],
  },
];

function initial(name: string): string {
  return (name.match(/\p{L}|\p{N}/u)?.[0] ?? '◆').toUpperCase();
}

function Portrait({ entry, size, color }: { entry: AkashaEntryCard; size: number; color: string }) {
  return entry.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={entry.image_url} alt="" width={size} height={size} loading="lazy"
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top center', border: `2px solid ${color}55`, background: 'var(--bg3)', flexShrink: 0 }}
    />
  ) : (
    // Tuile stylisée — aucune image nouvelle générée, un nœud sans portrait se rend en initiale
    // sur dégradé (même vocabulaire que la station sans sprite d'ArcFrieze).
    <div
      aria-hidden
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0, border: `2px solid ${color}55`,
        background: `linear-gradient(145deg, ${color} 0%, ${color}66 55%, ${color}22 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--fn)', fontWeight: 900, fontSize: size * 0.42, lineHeight: 1, color: '#fff',
        textShadow: '0 1px 6px rgba(3,7,15,0.45)',
      }}
    >
      {initial(entry.name)}
    </div>
  );
}

function PersonChip({ node, entry, color, lead }: { node: Node; entry: AkashaEntryCard; color: string; lead: boolean }) {
  const size = node.portraitSize ?? (lead ? 52 : 40);
  return (
    <Link
      href={`/learn/akasha/${entry.slug}`}
      className="ak-tab"
      style={{
        display: 'flex', gap: 10, alignItems: 'flex-start', textDecoration: 'none', minWidth: 0,
        padding: lead ? '9px 12px' : '7px 10px', borderRadius: 13,
        border: `1px ${lead ? 'solid' : 'dashed'} ${lead ? `${color}44` : 'var(--bd2)'}`,
        background: lead ? `${color}0D` : 'var(--bg2)',
        maxWidth: lead ? 300 : 240,
      }}
    >
      <Portrait entry={entry} size={size} color={color} />
      <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 1 }}>
        <span style={{ fontFamily: 'var(--fo)', fontSize: lead ? 13.5 : 12, fontWeight: 800, color: 'var(--td)', lineHeight: 1.2 }}>
          {entry.name}
        </span>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', lineHeight: 1.4 }}>
          {node.caption}
        </span>
      </span>
    </Link>
  );
}

export default function JoestarTree({ entries, color }: { entries: AkashaEntryCard[]; color: string }) {
  const bySlug = new Map(entries.map((e) => [e.slug, e]));

  // Ne garde que les rangées dont AU MOINS un nœud « couple » résout vraiment en base — une
  // rangée entièrement fantôme (fiches supprimées) disparaît plutôt que de montrer une case vide.
  const rows = ROWS
    .map((row) => ({
      ...row,
      couples: row.couples.map((c) => c.filter((n) => bySlug.has(n.slug))).filter((c) => c.length > 0),
      satellites: (row.satellites ?? []).filter((n) => bySlug.has(n.slug)),
    }))
    .filter((row) => row.couples.length > 0 || row.satellites.length > 0);

  if (rows.length === 0) return null;

  const genRows = rows.filter((r) => r.gen);
  const totalPeople = rows.reduce((n, r) => n + r.couples.flat().length + r.satellites.length, 0);

  return (
    <section>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>L’arbre Joestar</span>
        <span style={{ color: 'var(--td3)' }}>{genRows.length} générations · {totalPeople} fiches</span>
      </div>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', lineHeight: 1.6, margin: '0 0 16px', maxWidth: 640 }}>
        Une lignée de sang et d’adoption qui traverse la série, de Jonathan (Partie 1) à Jolyne (Partie 6) — chaque protagoniste en descend. Les branches en pointillé sont attachées par mariage ou adoption, pas par le sang Joestar.
      </p>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 16, padding: 'clamp(12px,2.4vw,22px)', display: 'flex', flexDirection: 'column' }}>
        {rows.map((row, i) => {
          const last = i === rows.length - 1;
          return (
            <div key={i} style={{ display: 'flex', gap: 14, position: 'relative', paddingBottom: last ? 0 : 22 }}>
              {/* rail + pastille de génération — même vocabulaire vertical que /u/naruto/rangs */}
              <div style={{ position: 'relative', width: 34, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {!last && <span aria-hidden style={{ position: 'absolute', top: 34, bottom: -8, width: 2, background: 'var(--bd2)' }} />}
                {row.gen ? (
                  <span style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${color}`, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 14, color, flexShrink: 0 }}>
                    {row.gen}
                  </span>
                ) : (
                  <span aria-hidden style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--bd2)', background: 'var(--bg)', flexShrink: 0, marginTop: 10 }} />
                )}
              </div>

              <div style={{ minWidth: 0, flex: 1, paddingTop: row.gen ? 2 : 8 }}>
                {row.partie && (
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 8 }}>
                    {row.partie}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {row.couples.map((couple, ci) => (
                    <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {couple.map((n, ni) => (
                        <span key={n.slug} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {ni > 0 && <span aria-hidden style={{ color: 'var(--td3)', fontSize: 13 }}>⚭</span>}
                          <PersonChip node={n} entry={bySlug.get(n.slug)!} color={color} lead />
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
                {row.satellites.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {row.satellites.map((n) => (
                      <PersonChip key={n.slug} node={n} entry={bySlug.get(n.slug)!} color={color} lead={false} />
                    ))}
                  </div>
                )}
                {row.couples.flat().concat(row.satellites).some((n) => n.note) && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {row.couples.flat().concat(row.satellites).filter((n) => n.note).map((n) => (
                      <p key={n.slug} style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)', lineHeight: 1.5, margin: 0, maxWidth: 560, fontStyle: 'italic' }}>
                        {n.note}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
