'use client';
// components/akasha/zone/CharacterZone.tsx — fiche personnage v2 « zone » (refonte, lot 1).
// Remplace la composition carte TCG + dossier 9 onglets : UNE surface vivante (portrait grand
// format piloté par la frise d'arcs + grappes interactives) et UN panneau canal qui se re-scope
// à chaque sélection. Esprit AAA×Apple : grande typo, air, hairlines — tokens NIKA existants.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ArcFrieze from '../ArcFrieze';
import DatabookRadar, { type Stats } from '../DatabookRadar';
import { familyLabel } from '../NarutoIcons';
import { RARITY_META, universeMeta, universeWordmark, type AkashaEntryDetail } from '@/lib/akasha/types';
import { ALLOWED_FILTER_ATTRS, universeHubSlug } from '@/lib/akasha/universe-taxonomy';
import { normalizeForms } from '@/lib/akasha/forms';
import { ZoneProvider, useZone, type ZoneSelection } from './zone-context';
import { CanalRegion, ChipLink } from './zone-ui';

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : str(v) ? [v as string] : [];
type Fam = { rel: string; name: string; slug?: string };
const familyList = (v: unknown): Fam[] =>
  Array.isArray(v) ? v.filter((x): x is Fam => !!x && typeof x === 'object' && 'rel' in x && 'name' in x) : [];

// Libellés FR des attributs d'appartenance surfacés en grappe (ordre d'affichage).
const BELONG_ATTRS: [string, string][] = [
  ['clan', 'Clan'], ['village', 'Village'], ['organization', 'Organisation'], ['crew', 'Équipage'],
  ['faction', 'Faction'], ['division', 'Division'], ['camp', 'Camp'], ['partie', 'Partie'],
  ['race', 'Race'], ['nen', 'Nen'], ['generation', 'Génération'], ['rank', 'Rang'],
];

type SharedVoice = { slug: string; name: string; universe: string | null; image_url: string | null };

export default function CharacterZone({ entry, popRank, sharedVoice }: { entry: AkashaEntryDetail; popRank?: number | null; sharedVoice?: SharedVoice[] }) {
  return (
    <ZoneProvider>
      <ZoneInner entry={entry} popRank={popRank} sharedVoice={sharedVoice} />
    </ZoneProvider>
  );
}

function ZoneInner({ entry, popRank, sharedVoice }: { entry: AkashaEntryDetail; popRank?: number | null; sharedVoice?: SharedVoice[] }) {
  const { sel, select } = useZone();
  const [formIdx, setFormIdx] = useState(0);
  // Définition réelle de la source du portrait, lue au chargement (voir le plafond ×2 plus bas).
  const [natif, setNatif] = useState<{ w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const a = entry.attributes as Record<string, unknown>;
  const um = entry.universe ? universeMeta(entry.universe) : null;
  const accent = um?.color ?? '#7B5CF0';
  const rar = entry.rarity ? RARITY_META[entry.rarity] : null;
  const hub = entry.universe ? universeHubSlug(entry.universe) : undefined;

  // Formes : même règle que l'ancienne carte (normalizeForms) — la frise pilote portrait ET canal.
  const forms = normalizeForms(a) as Record<string, unknown>[];
  const f = (forms[formIdx] ?? {}) as Record<string, unknown>;
  const hasCurated = forms.length > 0;
  const fstr = (fv: unknown, base: unknown): string | null =>
    (typeof fv === 'string' && fv.trim() ? fv.trim() : hasCurated ? null : str(base));
  // Une forme sans visuel est LÉGITIME (décision 06/08) : pas de repli sur l'image de base —
  // le portrait rend une tuile stylisée (dégradé d'accent + initiale du label en Bebas).
  const portrait = str(f.url) ?? str(f.idle) ?? (hasCurated ? null : entry.image_url);
  // `onLoad` NE SUFFIT PAS : l'image est rendue côté serveur et le navigateur l'a souvent finie
  // avant que React n'attache l'écouteur — l'événement n'arrive alors jamais. On relit donc la
  // définition à la main quand l'image est déjà `complete`.
  useEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth) setNatif({ w: el.naturalWidth, h: el.naturalHeight });
  }, [portrait]);
  const formLabel = str(f.label) ?? `Forme ${formIdx + 1}`;
  const initiale = (formLabel.match(/\p{L}|\p{N}/u)?.[0] ?? '◆').toUpperCase();

  // Techniques : relations « maitrise » (signatures d'abord) + jutsu du databook (dédupliqués).
  const atkRels = entry.relationsOut
    .filter((r) => r.relation === 'maitrise')
    .sort((x, y) => (x.target.is_signature === 'true' ? 0 : 1) - (y.target.is_signature === 'true' ? 0 : 1));
  const linkedNames = new Set(atkRels.map((r) => r.target.name.toLowerCase()));
  const jutsuPlain = list(a.jutsu).filter((j) => !linkedNames.has(j.toLowerCase()));

  // Famille : le databook curé d'abord (il porte le lien précis — père, sœur, parrain…), puis
  // les arêtes « famille » du graphe pour les milliers de fiches qui n'ont pas de databook.
  // Dédup par nom : une même personne ne doit pas apparaître deux fois sous deux sources.
  //
  // LES DEUX SENS (10/08/2026). `famille` est déclarée RÉFLEXIVE dans le dictionnaire commun
  // (lib/akasha/relation-labels.ts, RELATIONS_REFLEXIVES) : « X est de la famille de Y » se lit
  // à l'identique chez Y. Elle ne se lisait pourtant que dans le sens SORTANT — le même demi-lien
  // que celui réparé le 07/08 sur allié/ennemi/rival, sur la grappe d'à côté. Mesuré sur le corpus
  // paginé (7 654 fiches, 16 788 arêtes) : 289 personnages gagnent 586 proches, dont 158 qui
  // n'avaient AUCUNE grappe Famille — Ichigo ne nommait ni Isshin ni Karin ni Yuzu (0 → 8),
  // Vegeta ni Bulma ni Trunks (0 → 11), Son Goku ni Chichi ni Gohan ni Bardock (0 → 7). Aucune
  // fiche ne perd une seule ligne : ce bloc n'ajoute que des noms absents du Set de dédup.
  const family = familyList(a.family);
  const nomsFamille = new Set(family.map((m) => m.name.toLowerCase()));
  for (const r of [...entry.relationsOut, ...entry.relationsIn]) {
    if (r.relation !== 'famille' || nomsFamille.has(r.target.name.toLowerCase())) continue;
    nomsFamille.add(r.target.name.toLowerCase());
    family.push({ rel: 'famille', name: r.target.name, slug: r.target.slug });
  }

  // Liens narratifs venus du GRAPHE (alliés, mentors, élèves, ennemis, rivaux). Jusqu'au 01/08
  // ces arêtes n'étaient affichées nulle part sur la fiche personnage : la refonte « zone »
  // ne lisait que les attributs, si bien que le travail de l'usine et des builds restait
  // invisible. Les appartenances taxonomiques (appartient/habite/exerce) sont déjà rendues
  // par la grappe « Appartenances » — inutile de les redire ici.
  const NATURES_LIENS: Record<string, string> = {
    allie: 'Allié', mentor: 'Mentor', eleve: 'Élève', ennemi: 'Ennemi', rival: 'Rival',
  };
  const liensTous = [
    ...entry.relationsOut.filter((r) => NATURES_LIENS[r.relation])
      .map((r) => ({ label: NATURES_LIENS[r.relation], name: r.target.name, slug: r.target.slug })),
    // Sens ENTRANT : les deux bouts sont résolus dans `target` (relationsIn porte l'autre
    // extrémité), et la nature s'inverse — « X est mon mentor » se lit « Élève · X » chez lui.
    ...entry.relationsIn.filter((r) => r.relation === 'mentor' || r.relation === 'eleve')
      .map((r) => ({ label: r.relation === 'mentor' ? 'Élève' : 'Mentor', name: r.target.name, slug: r.target.slug })),
    // Allié, ennemi, rival sont RÉFLEXIFS : le libellé ne s'inverse pas, mais le lien devait
    // quand même être lu dans les deux sens (audit du 07/08). Sans cette ligne, une fiche que
    // les autres citent sans les citer en retour s'affichait seule : son-goku, fiche n°1 du
    // site, portait 90 arêtes entrantes (Vegeta rival, Freezer ennemi, Krillin allié) et 1
    // sortante — sa page annonçait zéro allié et zéro ennemi.
    ...entry.relationsIn.filter((r) => r.relation === 'allie' || r.relation === 'ennemi' || r.relation === 'rival')
      .map((r) => ({ label: NATURES_LIENS[r.relation], name: r.target.name, slug: r.target.slug })),
  ].filter((l, i, t) => t.findIndex((x) => x.name === l.name && x.label === l.label) === i);
  // UN COMPTEUR SE CALCULE AVANT LA COUPE (10/08/2026). Le titre disait `Liens · ${liens.length}`
  // sur une liste DÉJÀ tronquée à 24 : il ne pouvait donc jamais annoncer plus de 24, quel qu'en
  // soit le nombre réel, et une fiche à 60 liens en promettait 24. Le total est vrai, la coupe est
  // dite, et le reste se lit dans le dossier — mais on n'annonce plus le plafond pour la mesure.
  const liensTotal = liensTous.length;
  const liens = liensTous.slice(0, 24);
  const belong: { attr: string; label: string; value: string }[] = [];
  for (const [attr, label] of BELONG_ATTRS) {
    const v = str(a[attr]);
    if (v) belong.push({ attr, label, value: v });
  }
  for (const aff of list(a.affiliation).slice(0, 3)) belong.push({ attr: 'affiliation', label: 'Affiliation', value: aff });

  // APPARTENANCES VENUES DU GRAPHE (10/08/2026). Le commentaire d'à côté affirmait que les arêtes
  // `appartient` / `habite` / `exerce` étaient « déjà rendues par la grappe Appartenances » — c'est
  // vrai des seules qui doublent un ATTRIBUT. Mesuré ce soir : 3 830 arêtes de personnages n'ont
  // aucun attribut jumeau et ne se voyaient donc NULLE PART sur la fiche. Nico Robin ne disait ni
  // Baroque Works ni Ohara ; Ichigo ne disait pas les Vizard ; les 19 fiches désisolées le soir
  // même affichaient le vide. Une arête écrite n'est pas une arête lue.
  // Elles rejoignent la même grappe, mais elles pointent vers une FICHE et non vers un axe : le
  // canal les ouvre au lieu de les filtrer. Le libellé dit la nature du lien, pas la clé technique.
  const NATURES_APPARTENANCE: Record<string, string> = {
    appartient: 'Appartient à', habite: 'Réside', exerce: 'Exerce',
  };
  const dejaDit = new Set(belong.map((b) => b.value.toLowerCase()));
  const appartenancesLiees = entry.relationsOut
    .filter((r) => NATURES_APPARTENANCE[r.relation] && !dejaDit.has(r.target.name.toLowerCase()))
    .map((r) => ({ label: NATURES_APPARTENANCE[r.relation], name: r.target.name, slug: r.target.slug }))
    .filter((x, i, tab) => tab.findIndex((y) => y.name === x.name) === i)
    .slice(0, 12);

  const fStats = f.stats && typeof f.stats === 'object' ? (f.stats as Stats) : undefined;
  const favN = typeof a.favorites === 'number' ? (a.favorites as number) : null;

  const onForm = (i: number) => {
    setFormIdx(i);
    select({ kind: 'forme', index: i });
  };

  return (
    <div className="ak-zone-grid">
      {/* ── SURFACE ─────────────────────────────────────────── */}
      <section style={{ minWidth: 0 }}>
        {/* En-tête : chips sobres puis NOM en très grand (énergie AAA, exécution hairline). */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <span style={chip('var(--td3)')}>Personnage</span>
          {rar && <span style={chip(rar.color)}>{rar.label}</span>}
          {entry.universe && (() => {
            const mark = universeWordmark(entry.universe);
            const inner = mark
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={mark} alt={entry.universe} style={{ height: 15, width: 'auto', maxWidth: 92, objectFit: 'contain', display: 'block' }} />
              : <>{entry.universe}</>;
            return hub ? (
              <Link href={`/learn/akasha/u/${hub}`} title={entry.universe} style={{ ...chip(accent), textDecoration: 'none' }}>{inner} ↗</Link>
            ) : (
              <span style={chip('var(--td3)')}>{inner}</span>
            );
          })()}
        </div>
        <h1 style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase', fontSize: 'clamp(38px,6.5vw,84px)', lineHeight: 0.88, letterSpacing: '-0.01em', color: 'var(--td)', margin: '0 0 10px' }}>
          {entry.name}
        </h1>
        {(favN || popRank) && (
          <div style={{ fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: 'var(--td3)', letterSpacing: '0.04em', marginBottom: 18, fontVariantNumeric: 'tabular-nums' }}>
            {favN && <span style={{ color: accent }}>★ {favN.toLocaleString('fr-FR')} fans</span>}
            {favN && popRank && entry.universe && <span> · #{popRank} de {entry.universe}</span>}
          </div>
        )}

        {/* Portrait full-bleed (C3-2) — bord à bord de la colonne surface, plus de maxWidth:560
            qui le faisait flotter plus étroit que sa propre colonne de grille. La frise juste
            dessous suit la même largeur (déjà « alignée sur le portrait » avant C3-2 : ce couplage
            est ce qu'il fallait préserver, pas la valeur 560 elle-même). */}
        {/* NI PORTRAIT NI FORME CURÉE → PAS DE CADRE DU TOUT (10/08/2026).
            La branche de repli rendait `null` À L'INTÉRIEUR du cadre : un rectangle bordé de
            729 × 912 px, vide, au milieu de la fiche. Constaté sur `sara-s-daughter`, seule fiche
            de personnage sans visuel du corpus — son image de wiki a disparu et la fille de Sāra
            n'en a pas d'autre (lui poser le portrait de sa MÈRE serait exactement l'erreur réparée
            le 09/08 sur quatre têtes d'affiche). Une case vide se voit et s'accepte ; un cadre vide
            promet une image qui ne viendra pas. Le reste de la fiche — nom, canal, grappes, dossier
            — remonte alors naturellement. */}
        {(portrait || hasCurated) && (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '4/5', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--bd2)', background: 'var(--bg2)', boxShadow: `0 40px 90px -50px ${accent}88` }}>
          {portrait ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img aria-hidden src={portrait} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(26px) brightness(0.45) saturate(1.1)', transform: 'scale(1.25)' }} />
              {/* PLAFOND DE DÉFINITION (×2 la source). Le cadre reste bord à bord — c'est l'image
                  NETTE qui refuse d'être étirée au-delà du double de sa définition native, et se
                  centre dans son propre halo flou. Mesuré le 08/08 : 6 des 8 têtes d'affiche ont
                  une source MyAnimeList 225×350, qu'un cadre de 729 px agrandissait ×2,6 — les
                  contours devenaient cotonneux au moment même où le portrait gagnait en présence.
                  Naruto (1440×1076) et Goku restent inchangés : leur source mérite la pleine
                  largeur. Le plafond s'applique à l'image seule, jamais au cadre : rien ne bouge
                  sous elle au chargement (aucun décalage de mise en page). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={imgRef} src={portrait} alt={entry.name}
                onLoad={(e) => setNatif({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                style={{
                  position: 'absolute', inset: 0, margin: 'auto', width: '100%', height: '100%', objectFit: 'contain',
                  maxWidth: natif ? `min(100%, ${natif.w * 2}px)` : '100%',
                  maxHeight: natif ? `min(100%, ${natif.h * 2}px)` : '100%',
                }} />
            </>
          ) : hasCurated ? (
            /* Tuile stylisée pleine surface — forme légitime sans visuel : même conteneur, aucune casse. */
            <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(145deg, ${accent} 0%, ${accent}66 55%, ${accent}22 100%)` }}>
              <span style={{ fontFamily: 'var(--fn)', fontWeight: 900, fontSize: 'clamp(96px,18vw,180px)', lineHeight: 1, color: '#fff', textShadow: '0 10px 50px rgba(3,7,15,0.5)' }}>{initiale}</span>
            </div>
          ) : null}
          {forms.length > 1 && str(f.label) && (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '26px 16px 12px', background: 'linear-gradient(180deg, transparent, rgba(3,7,15,0.85))', fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--td2)' }}>
              {str(f.label)}{str(f.arc) && <span style={{ color: 'var(--td3)' }}> · {str(f.arc)}</span>}
            </div>
          )}
        </div>
        )}

        {forms.length > 1 && (
          <div style={{ marginTop: 18 }}>
            <ArcFrieze forms={forms} sel={formIdx} onSelect={onForm} color={accent} />
          </div>
        )}

        {/* ── GRAPPES ── tout est cliquable → le canal se re-scope. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26, marginTop: 26, maxWidth: 640 }}>
          {(atkRels.length > 0 || jutsuPlain.length > 0) && (
            <Grappe title={`Techniques · ${atkRels.length + jutsuPlain.length}`} accent={accent}>
              {/* Le titre dit le total du graphe ; les chips s'arrêtent à 14 + un reliquat de
                  jutsu. L'écart est ASSUMÉ et il est dit plus bas par « + N autres » — ce qui
                  manquait, c'est justement de le dire (constat du 10/08 : une fiche à 105
                  techniques en montrait 14 sans un mot). */}
              {atkRels.slice(0, 14).map((r) => (
                <ChipLink key={r.id} accent={accent} active={sel?.kind === 'technique' && sel.name === r.target.name}
                  onClick={() => select({ kind: 'technique', name: r.target.name, slug: r.target.slug, signature: r.target.is_signature === 'true' })}>
                  {r.target.is_signature === 'true' && <span aria-hidden style={{ color: accent }}>★ </span>}{r.target.name}
                </ChipLink>
              ))}
              {jutsuPlain.slice(0, Math.max(0, 18 - atkRels.length)).map((j) => (
                <ChipLink key={j} accent={accent} active={sel?.kind === 'technique' && sel.name === j}
                  onClick={() => select({ kind: 'technique', name: j })}>
                  {j}
                </ChipLink>
              ))}
              {atkRels.length + jutsuPlain.length > 18 && (
                <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', alignSelf: 'center' }}>+ {atkRels.length + jutsuPlain.length - 18} autres</span>
              )}
            </Grappe>
          )}

          {family.length > 0 && (
            <Grappe title={`Famille · ${family.length}`} accent={accent}>
              {family.map((m, i) => (
                <ChipLink key={i} accent={accent} active={sel?.kind === 'famille' && sel.name === m.name}
                  onClick={() => select({ kind: 'famille', rel: m.rel, name: m.name, slug: m.slug })}>
                  {/* Le databook donne le lien précis (père, sœur…) ; le graphe ne sait que
                      « famille » — inutile de le répéter sous un titre qui le dit déjà. */}
                  {m.rel !== 'famille' && <span style={{ color: 'var(--td3)', fontWeight: 400 }}>{familyLabel(m.rel)} · </span>}{m.name}
                </ChipLink>
              ))}
            </Grappe>
          )}

          {liens.length > 0 && (
            <Grappe title={`Liens · ${liensTotal}`} accent={accent}>
              {liens.map((l, i) => (
                <ChipLink key={i} accent={accent} active={sel?.kind === 'famille' && sel.name === l.name}
                  onClick={() => select({ kind: 'famille', rel: l.label, name: l.name, slug: l.slug })}>
                  <span style={{ color: 'var(--td3)', fontWeight: 400 }}>{l.label} · </span>{l.name}
                </ChipLink>
              ))}
              {liensTotal > liens.length && (
                // Même aveu que la grappe Techniques : la coupe se dit, elle ne se cache pas.
                <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', alignSelf: 'center' }}>+ {liensTotal - liens.length} autres</span>
              )}
            </Grappe>
          )}

          {(belong.length > 0 || appartenancesLiees.length > 0) && (
            <Grappe title="Appartenances" accent={accent}>
              {belong.map((b, i) => (
                <ChipLink key={i} accent={accent} active={sel?.kind === 'appartenance' && sel.value === b.value}
                  onClick={() => select({ kind: 'appartenance', attr: b.attr, label: b.label, value: b.value })}>
                  <span style={{ color: 'var(--td3)', fontWeight: 400 }}>{b.label} · </span>{b.value}
                </ChipLink>
              ))}
              {appartenancesLiees.map((x, i) => (
                <ChipLink key={`g${i}`} accent={accent} active={sel?.kind === 'famille' && sel.name === x.name}
                  onClick={() => select({ kind: 'famille', rel: x.label, name: x.name, slug: x.slug })}>
                  <span style={{ color: 'var(--td3)', fontWeight: 400 }}>{x.label} · </span>{x.name}
                </ChipLink>
              ))}
            </Grappe>
          )}
        </div>
      </section>

      {/* ── LE DOSSIER ─ retiré d'ici (C3-2, préalable de mise en page). Il vivait comme 3ᵉ enfant
          de `.ak-zone-grid` avec `gridColumn:'1/-1'` : sur 85,6 % des fiches (celles qui ONT un
          dossier), ça cassait l'auto-placement CSS Grid sparse et repoussait le canal sous le
          dossier, en pleine largeur, au lieu de la colonne 380px à côté du portrait — mesuré en
          direct sur les 8 têtes d'affiche des 8 univers, dont naruto-uzumaki lui-même. Monté
          maintenant par `app/learn/akasha/[slug]/page.tsx` via `<DossierSections>`, APRÈS
          `<CharacterZone>` — exactement le point de montage déjà utilisé par OrganizationZone et
          EraZone, qui n'ont jamais eu ce bug parce que leur dossier n'a jamais vécu dans leur
          propre grille. Zéro changement de donnée : mêmes sections, même accent, même styles —
          `DossierSections` est un copier-coller à l'identique de ce bloc (composant déjà partagé
          par les 3 autres gabarits depuis le 05/08). */}

      {/* ── CANAL ───────────────────────────────────────────── */}
      <aside className="ak-canal" aria-live="polite">
        <Canal entry={entry} accent={accent} f={f} fstr={fstr} fStats={fStats} sharedVoice={sharedVoice} />
      </aside>
    </div>
  );
}

/* ── Briques surface ─────────────────────────────────────── */

function Grappe({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent, marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{children}</div>
    </div>
  );
}

const chip = (color: string): React.CSSProperties => ({
  fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
  padding: '3px 10px', borderRadius: 20, color, background: 'var(--bg2)', border: '1px solid var(--bd2)', display: 'inline-flex', alignItems: 'center', gap: 5,
});

/* ── Le canal : un seul panneau, re-scopé par la sélection ── */

function Canal({ entry, accent, f, fstr, fStats, sharedVoice }: {
  entry: AkashaEntryDetail; accent: string; f: Record<string, unknown>;
  fstr: (fv: unknown, base: unknown) => string | null; fStats?: Stats; sharedVoice?: SharedVoice[];
}) {
  const { sel, select } = useZone();
  // Libellés d'axes remappés par le build (ex. One Piece : PUI/TEC/AGI…) — calculés ICI, une
  // fois, pour que TOUS les radars du canal les reçoivent (le FormePanel les perdait, bug 06/08).
  const statLabels = ((entry.attributes as Record<string, unknown>).statLabels as Partial<Record<keyof Stats, string>> | undefined) ?? null;
  // Décision Dan 06/08 : seuls les databooks Naruto sont canon — hors Naruto, stats gardées
  // mais marquées « estimées » (aucune écriture en base, pur affichage).
  const statsEstimees = entry.universe !== 'Naruto';
  const scope = sel === null ? 'Identité'
    : sel.kind === 'technique' ? 'Technique'
    : sel.kind === 'famille' ? 'Famille'
    : sel.kind === 'appartenance' ? sel.label
    : 'Forme';

  return (
    <CanalRegion accent={accent}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid var(--bd)', paddingBottom: 10, marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--td3)' }}>
          Canal · <span style={{ color: accent }}>{scope}</span>
        </span>
        {sel !== null && (
          <button type="button" onClick={() => select(null)} className="ak-tab"
            style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 14, border: '1px solid var(--bd2)', background: 'transparent', color: 'var(--td3)', cursor: 'pointer' }}>
            ↩ Identité
          </button>
        )}
      </div>

      {sel === null && <IdentityPanel entry={entry} accent={accent} f={f} fstr={fstr} fStats={fStats} statLabels={statLabels} estime={statsEstimees} sharedVoice={sharedVoice} />}
      {sel?.kind === 'forme' && <FormePanel f={f} idx={sel.index} accent={accent} fStats={fStats} statLabels={statLabels} estime={statsEstimees} />}
      {sel?.kind === 'technique' && <TechniquePanel sel={sel} accent={accent} />}
      {sel?.kind === 'famille' && <FamillePanel sel={sel} accent={accent} />}
      {sel?.kind === 'appartenance' && <AppartenancePanel sel={sel} accent={accent} universe={entry.universe} />}
    </CanalRegion>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--bd)' }}>
      <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)', flexShrink: 0 }}>{k}</span>
      <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
    </div>
  );
}

function CanalTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase', fontSize: 22, lineHeight: 1.05, color: 'var(--td)', marginBottom: 12 }}>{children}</div>;
}

function IdentityPanel({ entry, accent, f, fstr, fStats, statLabels, estime, sharedVoice }: {
  entry: AkashaEntryDetail; accent: string; f: Record<string, unknown>;
  fstr: (fv: unknown, base: unknown) => string | null; fStats?: Stats;
  statLabels: Partial<Record<keyof Stats, string>> | null; estime: boolean; sharedVoice?: SharedVoice[];
}) {
  const a = entry.attributes as Record<string, unknown>;
  const bio = str(a.bio) || str(a.descFr) || entry.summary;
  const nindo = str(a.nindo);
  const nindoLabel = str(a.nindoLabel) ?? 'Credo';
  const voice = a.voiceActors && typeof a.voiceActors === 'object' ? (a.voiceActors as { jp?: string[]; en?: string[] }) : null;
  const rows: [string, string][] = [];
  const push = (k: string, v: string | null) => { if (v) rows.push([k, v]); };
  push('Âge', fstr(f.age, a.age));
  push('Taille', fstr(f.height, a.height));
  push('Poids', fstr(f.weight, a.weight));
  push('Sang', str(a.bloodType));
  push('Naissance', str(a.birthdate));
  push('Prime', str(a.bounty));
  push('Fruit', str(a.fruit));
  push('Ki', str(a.ki));

  return (
    <div>
      {rows.length > 0 && <div style={{ marginBottom: 14 }}>{rows.map(([k, v]) => <Row key={k} k={k} v={v} />)}</div>}
      {bio && <p style={{ fontFamily: 'var(--fo)', fontSize: 13.5, lineHeight: 1.75, color: 'var(--td2)', whiteSpace: 'pre-line', margin: '0 0 14px' }}>{bio}</p>}
      {nindo && (
        <blockquote style={{ margin: '0 0 14px', padding: '10px 14px', borderLeft: `2px solid ${accent}`, background: `${accent}0D`, borderRadius: '0 10px 10px 0' }}>
          <p style={{ margin: 0, fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 700, fontSize: 14.5, lineHeight: 1.45, color: 'var(--td)' }}>{nindo}</p>
          <div style={{ marginTop: 5, fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent }}>{nindoLabel}</div>
        </blockquote>
      )}
      {fStats && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <DatabookRadar stats={fStats} color={accent} size={196} labels={statLabels} estime={estime} />
        </div>
      )}
      {voice && (voice.jp?.length || voice.en?.length) ? (
        <div>
          {voice.jp?.[0] && <Row k="Voix · JP" v={voice.jp[0]} />}
          {voice.en?.[0] && <Row k="Voix · EN" v={voice.en[0]} />}
        </div>
      ) : null}
      {/* Passerelle seiyū : le seul pont naturel entre les 8 mondes (lot 4d). */}
      {sharedVoice && sharedVoice.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 8 }}>
            Partage sa voix avec
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {sharedVoice.map((sv) => {
              const svColor = sv.universe ? universeMeta(sv.universe).color : 'var(--td3)';
              return (
                <Link key={sv.slug} href={`/learn/akasha/${sv.slug}`} className="ak-tab" title={sv.universe ?? undefined}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, padding: '5px 11px', borderRadius: 9, border: '1px solid var(--bd2)', background: 'var(--bg)', color: 'var(--td2)' }}>
                  <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: svColor, display: 'inline-block' }} />
                  {sv.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FormePanel({ f, idx, accent, fStats, statLabels, estime }: {
  f: Record<string, unknown>; idx: number; accent: string; fStats?: Stats;
  statLabels: Partial<Record<keyof Stats, string>> | null; estime: boolean;
}) {
  // Repli aligné sur ArcFrieze : « Forme N », jamais « Forme » nu.
  const label = str(f.label) ?? `Forme ${idx + 1}`;
  return (
    <div>
      <CanalTitle>{label}</CanalTitle>
      {str(f.age) && <Row k="Âge" v={str(f.age)!} />}
      {str(f.arc) && <Row k="Arc" v={str(f.arc)!} />}
      {str(f.caption) && <p style={{ fontFamily: 'var(--fo)', fontSize: 13, lineHeight: 1.7, color: 'var(--td2)', margin: '12px 0 0' }}>{str(f.caption)}</p>}
      {fStats && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
          <DatabookRadar stats={fStats} color={accent} size={196} labels={statLabels} estime={estime} />
        </div>
      )}
    </div>
  );
}

function TechniquePanel({ sel, accent }: { sel: Extract<NonNullable<ZoneSelection>, { kind: 'technique' }>; accent: string }) {
  return (
    <div>
      {sel.signature && <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: accent, marginBottom: 6 }}>★ Technique signature</div>}
      <CanalTitle>{sel.name}</CanalTitle>
      {sel.slug ? (
        <Link href={`/learn/akasha/${sel.slug}`} className="ak-cta"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, padding: '9px 16px', borderRadius: 10, border: `1px solid ${accent}66`, background: `${accent}14`, color: accent, textDecoration: 'none' }}>
          Ouvrir la fiche →
        </Link>
      ) : (
        <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, lineHeight: 1.6, color: 'var(--td3)', margin: 0 }}>Technique du databook — pas encore de fiche dédiée.</p>
      )}
    </div>
  );
}

function FamillePanel({ sel, accent }: { sel: Extract<NonNullable<ZoneSelection>, { kind: 'famille' }>; accent: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 6 }}>{familyLabel(sel.rel)}</div>
      <CanalTitle>{sel.name}</CanalTitle>
      {sel.slug ? (
        <Link href={`/learn/akasha/${sel.slug}`} className="ak-cta"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, padding: '9px 16px', borderRadius: 10, border: `1px solid ${accent}66`, background: `${accent}14`, color: accent, textDecoration: 'none' }}>
          Ouvrir la fiche →
        </Link>
      ) : (
        <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, lineHeight: 1.6, color: 'var(--td3)', margin: 0 }}>Pas de fiche dédiée dans le registre.</p>
      )}
    </div>
  );
}

function AppartenancePanel({ sel, accent, universe }: { sel: Extract<NonNullable<ZoneSelection>, { kind: 'appartenance' }>; accent: string; universe: string | null }) {
  const linkable = universe && ALLOWED_FILTER_ATTRS.has(sel.attr);
  return (
    <div>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 6 }}>{sel.label}</div>
      <CanalTitle>{sel.value}</CanalTitle>
      {linkable ? (
        <Link href={`/learn/akasha?universe=${encodeURIComponent(universe!)}&attr=${encodeURIComponent(sel.attr)}&val=${encodeURIComponent(sel.value)}`} className="ak-cta"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, padding: '9px 16px', borderRadius: 10, border: `1px solid ${accent}66`, background: `${accent}14`, color: accent, textDecoration: 'none' }}>
          Voir tous les membres →
        </Link>
      ) : (
        <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, lineHeight: 1.6, color: 'var(--td3)', margin: 0 }}>Groupe non filtrable pour le moment.</p>
      )}
    </div>
  );
}
