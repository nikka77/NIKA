'use client';
// components/akasha/zone/OrganizationZone.tsx — fiche ORGANISATION « organigramme-zone » (lot 4b).
// Les status (équipages, clans, organisations) passent du gabarit générique le plus pauvre au
// plus spectaculaire : le collectif comme PUITS — figure centrale au cœur, premier cercle en orbite
// (taille/éclat = favorites), équipage complet en grappe ; prime totale en héros pour One Piece.
// Surface | canal re-scopable (contrat zone-context), membres via relations « appartient ».
//
// ENSEIGNE (10/08/2026) — le puits représente le collectif par le visage de ses MEMBRES et ne
// lisait jamais `entry.image_url` : le visuel du collectif LUI-MÊME (pavillon, blason, photo de
// groupe) était en base et ne se voyait qu'en liste, en mosaïque, en recherche et dans l'image
// OpenGraph. Même défaut que les 3 830 arêtes de personnages réparées le même soir : la donnée
// existe, la page ne la lit pas. Mesuré sur le corpus paginé le 10/08 (7 654 fiches, 16 788
// arêtes) : le corpus compte 333 fiches `status` — et non les 402 qu'annonçait la ligne 3 de cet
// en-tête — dont 260 portent un visuel. 221 d'entre elles ont AUSSI des membres : le puits garde
// donc tout son sens, il lui manquait l'enseigne au-dessus. Les 39 restantes n'affichaient qu'un
// « Aucun membre relié » ; elles reçoivent le visuel en grand, à la place du puits vide.
// Contrôle avant/après : 0/9 puis 9/9 fiches de 6 univers rendent leur propre visuel dans une
// balise <img> SERVIE (scripts/akasha-verif-visuel-status-rendu.mjs — la charge RSC porte l'URL
// dans les DEUX états, un grep de l'URL ne prouve donc rien).
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { RARITY_META, universeMeta, universeWordmark, type AkashaEntryDetail } from '@/lib/akasha/types';
import { universeHubSlug } from '@/lib/akasha/universe-taxonomy';
import { autresAretes } from '@/lib/akasha/relation-labels';
import { ZoneProvider, useZone, type ZoneSelection } from './zone-context';
import { CanalRegion, ChipLink } from './zone-ui';

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const fav = (v: unknown): number => (typeof v === 'string' ? Number(v) || 0 : typeof v === 'number' ? v : 0);
const primeMd = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null;
  const n = Number(raw.replace(/[^0-9]/g, ''));
  return n > 0 ? `${(n / 1e9).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Md ฿` : null;
};

export default function OrganizationZone({ entry }: { entry: AkashaEntryDetail }) {
  return (
    <ZoneProvider>
      <ZoneInner entry={entry} />
    </ZoneProvider>
  );
}

function ZoneInner({ entry }: { entry: AkashaEntryDetail }) {
  const { sel, select } = useZone();
  const a = entry.attributes as Record<string, unknown>;
  const um = entry.universe ? universeMeta(entry.universe) : null;
  const accent = um?.color ?? '#E07038';
  const hub = entry.universe ? universeHubSlug(entry.universe) : undefined;
  const rar = entry.rarity ? RARITY_META[entry.rarity] : null;
  const scope = str(a.scope) ?? 'Organisation';
  const prime = primeMd(a.total_prime);
  const enseigne = str(entry.image_url);

  // Membres (personnages « appartient » entrants), triés par popularité — la masse du puits.
  const members = entry.relationsIn
    .filter((r) => r.relation === 'appartient' && r.target.type === 'character')
    .map((r) => ({ slug: r.target.slug, name: r.target.name, img: r.target.image_url, favorites: fav(r.target.favorites) }))
    .sort((x, y) => y.favorites - x.favorites);
  const leader = members[0];
  const ring = members.slice(1, 9);
  const rest = members.slice(9);
  // Artefacts du collectif (navires, reliques rattachées).
  const arsenal = entry.relationsIn
    .filter((r) => r.relation === 'appartient' && r.target.type === 'artifact')
    .map((r) => ({ slug: r.target.slug, name: r.target.name }));

  // ── LE RESTE DES ARÊTES (10/08/2026) — voir lib/akasha/relation-labels.ts, `autresAretes`.
  // Cette zone ne lisait QUE `relationsIn`, et seulement `appartient` : une arête SORTANTE écrite
  // sur une fiche organisation n'avait aucun point de rendu, dans aucune grappe. Mesuré sur le
  // corpus paginé (16 910 arêtes) : 550 demi-arêtes de fiches `status` tombaient dans le vide,
  // dont 280 sortantes — les 16 techniques du clan Aburame, les 13 du clan Hyūga, l'appartenance
  // de Team Guy à Konohagakure — et 270 entrantes d'une autre nature qu'`appartient` : les 8
  // Hokage qui EXERCENT la fonction Hokage n'étaient nommés nulle part sur sa fiche, et
  // l'équipage du Chapeau de Paille recevait 104 arêtes alliées/ennemies muettes. 159 fiches
  // gagnent cette grappe.
  // Le sens vient de `libelle()` et de lui seul : « Maîtrise · Byakugan » sortant, « Exercé par ·
  // Tsunade » entrant. Poser le libellé sortant sur l'arête entrante ferait dire à la fiche Hokage
  // qu'elle exerce Tsunade — la faute exacte du 08/08 sur « Fruit du Démon ».
  const autresTous = autresAretes(
    entry.relationsOut,
    entry.relationsIn,
    // Ce que le puits et l'arsenal montrent déjà, et rien d'autre : `appartient` entrant depuis un
    // personnage (membres) ou depuis un artefact (arsenal).
    (relation, entrant, target) =>
      entrant && relation === 'appartient' && (target.type === 'character' || target.type === 'artifact'),
  );
  const autres = autresTous.slice(0, 12);

  const pick = (m: { slug: string; name: string; img?: string | null; favorites: number }, role: string) =>
    select({ kind: 'membre', slug: m.slug, name: m.name, img: m.img, favorites: m.favorites, role });

  return (
    <div className="ak-zone-grid">
      {/* ── SURFACE : le puits et ses orbites ────────────────── */}
      <section style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <span style={chip('var(--td3)')}>{scope}</span>
          {rar && <span style={chip(rar.color)}>{rar.label}</span>}
          {entry.universe && (() => {
            const mark = universeWordmark(entry.universe);
            const inner = mark
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={mark} alt={entry.universe} style={{ height: 15, width: 'auto', maxWidth: 92, objectFit: 'contain', display: 'block' }} />
              : <>{entry.universe}</>;
            return hub
              ? <Link href={`/learn/akasha/u/${hub}`} title={entry.universe} style={{ ...chip(accent), textDecoration: 'none' }}>{inner} ↗</Link>
              : <span style={chip('var(--td3)')}>{inner}</span>;
          })()}
        </div>
        {/* L'ENSEIGNE, au-dessus du nom : c'est l'identité VISUELLE du collectif (son pavillon,
            son blason, sa photo de groupe) — pas un membre. Elle ne s'affiche en compact que
            lorsque le puits a de la matière ; sans membre elle prend la place du puits, plus bas. */}
        {enseigne && leader && (
          <div style={{ marginBottom: 14 }}>
            <Enseigne src={enseigne} nom={entry.name} accent={accent} hauteur={128} />
          </div>
        )}
        <h1 style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase', fontSize: 'clamp(32px,5.5vw,68px)', lineHeight: 0.9, letterSpacing: '-0.01em', color: 'var(--td)', margin: '0 0 10px' }}>
          {entry.name}
        </h1>
        <div style={{ display: 'flex', gap: 18, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 20, fontVariantNumeric: 'tabular-nums' }}>
          {prime && (
            <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(20px,3vw,30px)', color: '#D4A017' }}>
              {prime}
              <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--td3)', marginLeft: 8 }}>Prime totale</span>
            </span>
          )}
          <span style={{ fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: 'var(--td3)' }}>
            <span style={{ color: accent }}>{members.length}</span> membre{members.length > 1 ? 's' : ''} au registre
          </span>
        </div>

        {/* Le puits : figure centrale + premier cercle en orbite (positions polaires). */}
        {leader ? (
          <div style={{ position: 'relative', width: 'min(100%, 520px)', aspectRatio: '1', margin: '0 auto' }}>
            <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
              <circle cx={50} cy={50} r={36} fill="none" stroke="var(--bd2)" strokeWidth={0.35} strokeDasharray="1.6 1.8" />
              <circle cx={50} cy={50} r={17} fill={`${accent}0A`} stroke={`${accent}44`} strokeWidth={0.4} />
            </svg>
            {/* Figure centrale — la plus grande masse. */}
            <button type="button" onClick={() => pick(leader, 'Figure centrale')}
              aria-pressed={sel?.kind === 'membre' && sel.slug === leader.slug}
              style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 2 }}>
              <span style={{ width: 104, height: 104, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${sel?.kind === 'membre' && sel.slug === leader.slug ? accent : 'var(--bd2)'}`, boxShadow: `0 0 34px -8px ${accent}AA`, background: 'var(--bg2)', display: 'block' }}>
                {leader.img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={leader.img} alt={leader.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
                )}
              </span>
              <span style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 800, color: 'var(--td)', lineHeight: 1.1, maxWidth: 130, textAlign: 'center' }}>{leader.name}</span>
            </button>
            {/* Premier cercle — orbite polaire, éclat selon les favoris. */}
            {ring.map((mb, i) => {
              const ang = -Math.PI / 2 + (i * 2 * Math.PI) / ring.length;
              const left = 50 + Math.cos(ang) * 36;
              const top = 50 + Math.sin(ang) * 36;
              const on = sel?.kind === 'membre' && sel.slug === mb.slug;
              return (
                <button key={mb.slug} type="button" onClick={() => pick(mb, 'Premier cercle')} title={mb.name} aria-pressed={on}
                  style={{ position: 'absolute', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, -50%)', background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 1 }}>
                  <span style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${on ? accent : 'var(--bd)'}`, boxShadow: on ? `0 0 18px -4px ${accent}` : '0 4px 14px -8px rgba(0,0,0,0.8)', background: 'var(--bg2)', display: 'block', transition: 'border-color .15s, box-shadow .15s' }}>
                    {mb.img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mb.img} alt={mb.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ) : enseigne ? (
          /* PUITS VIDE, MAIS LE COLLECTIF A UN VISAGE. 39 fiches mesurées (10/08) portent un
             visuel sans aucun membre relié : elles n'affichaient qu'une phrase d'excuse alors que
             leur pavillon dormait en base. Le compte honnête (« 0 membre au registre ») est déjà
             dit juste au-dessus — la phrase ne disait rien de plus. */
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Enseigne src={enseigne} nom={entry.name} accent={accent} hauteur={288} />
          </div>
        ) : (
          <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>Aucun membre relié dans le registre pour l'instant.</p>
        )}

        {/* Le reste de l'équipage — grappe compacte. */}
        {rest.length > 0 && (
          <div style={{ marginTop: 22, maxWidth: 640 }}>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent, marginBottom: 10 }}>
              Membres · {rest.length}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {rest.map((mb) => (
                <ChipLink key={mb.slug} accent={accent} active={sel?.kind === 'membre' && sel.slug === mb.slug}
                  onClick={() => pick(mb, 'Membre')}>
                  {mb.name}
                </ChipLink>
              ))}
            </div>
          </div>
        )}

        {arsenal.length > 0 && (
          <div style={{ marginTop: 22, maxWidth: 640 }}>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#D4A017', marginBottom: 10 }}>
              Arsenal & navires · {arsenal.length}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {arsenal.map((it) => (
                <ChipLink key={it.slug} accent="#D4A017" href={`/learn/akasha/${it.slug}`}>
                  {it.name}
                </ChipLink>
              ))}
            </div>
          </div>
        )}

        {/* TOUT LE RESTE DU GRAPHE, DANS LES DEUX SENS. Chips de NAVIGATION (href), pas de
            re-scope : le canal de cette zone ne connaît qu'un panneau « membre » (photo + favoris),
            qui ne sait rien dire d'une technique ni d'un lieu. Même geste que l'arsenal juste
            au-dessus, qui navigue déjà. Le compteur du titre est le TOTAL, la coupe est dite. */}
        {autres.length > 0 && (
          <div style={{ marginTop: 22, maxWidth: 640 }}>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent, marginBottom: 10 }}>
              Autres liens · {autresTous.length}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {autres.map((x) => (
                <ChipLink key={`${x.target.slug}|${x.label}`} accent={accent} href={`/learn/akasha/${x.target.slug}`} title={x.label}>
                  <span style={{ color: 'var(--td3)', fontWeight: 400 }}>{x.label} · </span>{x.target.name}
                </ChipLink>
              ))}
              {autresTous.length > autres.length && (
                <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', alignSelf: 'center' }}>+ {autresTous.length - autres.length} autres</span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── CANAL ────────────────────────────────────────────── */}
      <aside className="ak-canal" aria-live="polite">
        <Canal entry={entry} accent={accent} scope={scope} prime={prime} memberCount={members.length} />
      </aside>
    </div>
  );
}

/** L'ENSEIGNE d'un collectif — le cadre suit la NATURE du visuel, pas l'inverse.
 *
 *  Mesuré sur les 260 visuels `status` téléchargés le 10/08 (aucun échec, aucun carton d'erreur
 *  300 × 171) : ils se répartissent en trois natures qui n'appellent pas le même cadre —
 *  112 en 16:9 ou plus large (photos de groupe et plans de série : « Ep373OriginalCaptains »,
 *  « Team_8 », « Allied_Shinobi_Forces »), 54 carrés (les blasons de clan de
 *  /images/akasha/ref/*.webp et les symboles de wiki) et 49 pavillons nommés « Jolly Roger ».
 *  Un cadre à ratio fixe trancherait la moitié du corpus : en `cover` il décapiterait les photos
 *  de groupe, en `contain` il laisserait un pavillon carré flotter dans deux bandes vides.
 *
 *  D'où l'invariant retenu : c'est la HAUTEUR qui est fixe, la largeur suit l'image
 *  (`height:100%; width:auto`) — même grammaire que le wordmark d'univers juste au-dessus dans ce
 *  fichier. Un blason carré devient un médaillon, une photo 16:9 devient une bande, rien n'est
 *  jamais rogné et rien ne bouge verticalement au chargement.
 *
 *  Halo flou de l'image sur elle-même : repris tel quel de CharacterZone. Il porte les 39 visuels
 *  à canal alpha (pavillons détourés), qui sans lui flotteraient sur le fond de page.
 *
 *  PLAFOND ×2 (leçon du 08/08 : « éprouver un agrandissement sur la PIRE source, pas sur la fiche
 *  de référence »). La plus petite source du corpus fait 149 px de haut, donc la variante compacte
 *  (128) n'agrandit JAMAIS, et la variante pleine (288) reste sous le double pour tout le corpus
 *  sauf ces quelques miniatures — que le plafond ramène à leur définition. Il s'applique à
 *  l'IMAGE, jamais au cadre. */
function Enseigne({ src, nom, accent, hauteur }: { src: string; nom: string; accent: string; hauteur: number }) {
  const [natif, setNatif] = useState<{ w: number; h: number } | null>(null);
  const ref = useRef<HTMLImageElement>(null);
  // `onLoad` ne suffit pas : l'image est rendue côté serveur et le navigateur l'a souvent finie
  // avant que React n'attache l'écouteur — même correctif que CharacterZone.
  useEffect(() => {
    const el = ref.current;
    if (el?.complete && el.naturalWidth) setNatif({ w: el.naturalWidth, h: el.naturalHeight });
  }, [src]);
  const h = natif ? Math.min(hauteur, natif.h * 2) : hauteur;
  return (
    <div style={{
      position: 'relative', display: 'inline-flex', height: h, maxWidth: '100%',
      borderRadius: 14, overflow: 'hidden', border: '1px solid var(--bd2)', background: 'var(--bg2)',
      boxShadow: `0 26px 60px -46px ${accent}AA`,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img aria-hidden src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(22px) brightness(0.45) saturate(1.1)', transform: 'scale(1.35)' }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={ref} src={src} alt={nom}
        onLoad={(e) => setNatif({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        style={{ position: 'relative', height: '100%', width: 'auto', maxWidth: '100%', objectFit: 'contain', display: 'block' }} />
    </div>
  );
}

const chip = (color: string): React.CSSProperties => ({
  fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
  padding: '3px 10px', borderRadius: 20, color, background: 'var(--bg2)', border: '1px solid var(--bd2)', display: 'inline-flex', alignItems: 'center', gap: 5,
});

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--bd)' }}>
      <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)', flexShrink: 0 }}>{k}</span>
      <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
    </div>
  );
}

function Canal({ entry, accent, scope, prime, memberCount }: { entry: AkashaEntryDetail; accent: string; scope: string; prime: string | null; memberCount: number }) {
  const { sel, select } = useZone();
  const a = entry.attributes as Record<string, unknown>;
  const bio = str(a.bio) || str(a.descFr) || entry.summary;
  const membre = sel?.kind === 'membre' ? sel : null;

  return (
    <CanalRegion accent={accent}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid var(--bd)', paddingBottom: 10, marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--td3)' }}>
          Canal · <span style={{ color: accent }}>{membre ? membre.role ?? 'Membre' : 'Identité'}</span>
        </span>
        {membre && (
          <button type="button" onClick={() => select(null)} className="ak-tab"
            style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 14, border: '1px solid var(--bd2)', background: 'transparent', color: 'var(--td3)', cursor: 'pointer' }}>
            ↩ Identité
          </button>
        )}
      </div>

      {membre ? (
        <div>
          {membre.img && (
            <div style={{ width: 120, height: 150, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--bd2)', marginBottom: 12, background: 'var(--bg3)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={membre.img} alt={membre.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
            </div>
          )}
          <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase', fontSize: 22, lineHeight: 1.05, color: 'var(--td)', marginBottom: 8 }}>{membre.name}</div>
          {typeof membre.favorites === 'number' && membre.favorites > 0 && (
            <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: accent, marginBottom: 12, fontVariantNumeric: 'tabular-nums' }}>★ {membre.favorites.toLocaleString('fr-FR')} fans</div>
          )}
          <Link href={`/learn/akasha/${membre.slug}`} className="ak-cta"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, padding: '9px 16px', borderRadius: 10, border: `1px solid ${accent}66`, background: `${accent}14`, color: accent, textDecoration: 'none' }}>
            Ouvrir la fiche →
          </Link>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 14 }}>
            <Row k="Portée" v={scope} />
            {entry.universe && <Row k="Univers" v={entry.universe} />}
            <Row k="Effectif au registre" v={String(memberCount)} />
            {prime && <Row k="Prime totale" v={prime} />}
          </div>
          {bio && <p style={{ fontFamily: 'var(--fo)', fontSize: 13.5, lineHeight: 1.75, color: 'var(--td2)', whiteSpace: 'pre-line', margin: 0 }}>{bio}</p>}
        </div>
      )}
    </CanalRegion>
  );
}
