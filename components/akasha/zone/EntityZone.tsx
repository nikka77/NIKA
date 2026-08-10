'use client';
// components/akasha/zone/EntityZone.tsx — fiche « entité secondaire » (LOT 2b, refonte AKASHA).
// Remplace le gabarit générique historique pour les fiches power/artifact/place/profession/skill
// qui n'atteignent aucune des deux zones dédiées (personnage, organisation) — mesuré 10/08/2026 :
// 2 612 fiches (2 598 + les 14 à ères reprises ci-dessous). MÊME grammaire — surface vivante +
// canal re-scopable, posée sur le MÊME `zone-context` que CharacterZone/OrganizationZone (NON
// TOUCHÉES, ni le contexte ni les deux zones) — composée cette fois par CAPACITÉS
// (lib/akasha/shape.ts, LOT 2a) plutôt que par un gabarit typé : un module absent des capacités
// RÉELLES de l'entrée n'est jamais monté, jamais un état vide déguisé
// (tasks/akasha-architecture.md §1, renoncement 4).
//
// FUSION D'ERAZONE (10/08/2026, §8 question 3 « fondre en module `timeline`, au LOT 5 » — dernier
// reste du lot 5). `components/akasha/zone/EraZone.tsx` est SUPPRIMÉE : son rouleau temporel vit
// désormais ici en module `timeline`, monté par `deriveShape` sur la CAPACITÉ (des ères ou des
// formes), jamais sur un type ni sur un nom de composant. Ce que la branche `eras` de page.tsx
// coûtait aux 14 fiches qu'elle interceptait, mesuré fiche par fiche le 10/08 : aucune `relations`,
// aucun `orbit`, aucun `axis`, aucun bloc « Attributs », aucun « Voir aussi » — konohagakure
// (449 membres) et grand-line (112) étaient précisément les deux cas d'école du seuil `orbit` que
// le commentaire de shape.ts citait sans qu'ils empruntent jamais ce chemin (tasks/lessons.md,
// 08/08). Ce que ce module rend et qu'EntityZone n'avait pas : le portrait piloté par la frise, la
// citation encadrée, les quatre lignes d'ère dans le canal.
//
// Zéro requête neuve pour le canal (getEntryBySlug joint déjà tout) — le canal lit la relation
// ENTRANTE pertinente au TYPE (maitrise/pouvoir, possede/artefact, exerce/métier, habite/lieu).
// Seule exception, EXPLICITEMENT hors du canal : `axisNeighbors` (LOT 2c, repli des isolées) est
// calculé côté page (Server Component) via `listEntries`, la même requête déjà utilisée par le
// registre pour filtrer par axe — jamais une relation inventée, jamais un nouveau point d'accès.
import { useState } from 'react';
import Link from 'next/link';
import ArcFrieze from '../ArcFrieze';
import {
  RARITY_META, TYPE_META, universeMeta, universeWordmark,
  type AkashaEntryDetail, type AkashaEntryCard, type AkashaType,
} from '@/lib/akasha/types';
import { universeHubSlug, taxonomyByName, ALLOWED_FILTER_ATTRS } from '@/lib/akasha/universe-taxonomy';
import { registryHref } from '@/lib/akasha/href';
import { normalizeForms } from '@/lib/akasha/forms';
import { deriveShape, ORBIT_MIN_MEMBERS, type AkashaModule } from '@/lib/akasha/shape';
import { libelle } from '@/lib/akasha/relation-labels';
import { ZoneProvider, useZone } from './zone-context';

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const fav = (v: unknown): number => (typeof v === 'string' ? Number(v) || 0 : typeof v === 'number' ? v : 0);

/** La relation ENTRANTE la plus significative par type — vocabulaire exact du plan LOT 2b
 *  (tasks/akasha-architecture.md) : « maitrise entrante pour un pouvoir, possede pour un artefact,
 *  exerce pour un métier, habite pour un lieu ». `skill` suit `power` (même geste : technique
 *  maîtrisée par un personnage). `character`/`status` n'atteignent jamais cette zone.
 *  `place` porte DEUX relations (`rels`, pas `rel`) : mesuré 08/08/2026 sur `skypiea-lieu`, un lieu
 *  peut recevoir 17 arêtes `appartient` d'un personnage pour 2 `habite` seulement — même paire que
 *  `MEMBERSHIP_RELATIONS` de lib/akasha/shape.ts (le module `orbit` de CETTE zone doit rester
 *  EXACTEMENT le même ensemble que le garde-fou qui décide si `orbit` est monté, sinon « orbit est
 *  monté » et « ce puits a des membres » peuvent se contredire). */
const PRIMARY_RELATION: Partial<Record<AkashaType, { rels: string[]; label: string }>> = {
  power: { rels: ['maitrise'], label: 'Maîtrisé par' },
  skill: { rels: ['maitrise'], label: 'Maîtrisée par' },
  artifact: { rels: ['possede'], label: 'Possédé par' },
  profession: { rels: ['exerce'], label: 'Exercé par' },
  place: { rels: ['habite', 'appartient'], label: 'Habité par' },
};

// Les deux dictionnaires directionnels (RELATION_LABELS, RELATION_LABELS_ENTRANT) et `libelle()`
// vivent désormais dans lib/akasha/relation-labels.ts (LOT 3a, server-safe) — le profil relationnel
// des pages d'axe (lib/akasha/queries.ts) les réutilise pour ne jamais lire une arête à l'envers.
// SOURCE UNIQUE : ne pas redéclarer ces libellés ici.

// Garde-fou de volume du LOT 2b : au-delà de 12 éléments dans une grappe, replier en « + N autres ».
// Réutilise EXACTEMENT ORBIT_MIN_MEMBERS (lib/akasha/shape.ts) — les deux gardes partagent
// délibérément la même ligne (voir le commentaire de shape.ts à ce sujet).
const GRAPPE_CAP = ORBIT_MIN_MEMBERS;

/** Les trois champs libres d'une ère n'ont pas le même SENS selon la nature de l'entité : le
 *  « dirigeant » d'un village est le « porteur » d'une arme et le « maître » d'un pouvoir. Table
 *  reprise telle quelle d'EraZone (elle-même héritière de l'ancien PlaceView).
 *  Ce n'est PAS un aiguillage de composition — `deriveShape` a déjà décidé que le module
 *  `timeline` se monte, sur la seule présence d'une chronologie ; le type ne choisit ici que le MOT
 *  en tête de ligne, exactement comme `PRIMARY_RELATION` ci-dessus choisit « Maîtrisé par » ou
 *  « Possédé par ». Défaut = `place`, le cas le plus fréquent des fiches à ères (8 des 14). */
const ERA_LABELS: Partial<Record<AkashaType, { leader: string; event: string; threat: string }>> = {
  artifact: { leader: 'Porteur', event: 'Fait marquant', threat: 'Particularité' },
  profession: { leader: 'Figure', event: 'Technique clé', threat: 'Exigence' },
  status: { leader: 'Figure', event: 'Événement', threat: 'Dōjutsu' },
  power: { leader: 'Maître', event: 'Forme', threat: 'Rang' },
  skill: { leader: 'Porteur', event: 'Éveil', threat: 'Pouvoir' },
  place: { leader: 'Dirigeant', event: 'Événement', threat: 'Menace' },
};
const ERA_LABELS_DEFAUT = ERA_LABELS.place!;

/** Une étape de la chronologie, dans le vocabulaire commun aux deux sources qu'accepte
 *  `aUneChronologie` (lib/akasha/shape.ts) : `eras` (img/period/event/leader/threat/summary) et
 *  `forms` (url/idle/age/arc). Le module lit les deux plutôt que les seules `eras` — sinon une
 *  fiche à `forms` monterait `timeline` sans rien rendre, c'est-à-dire le « module fantôme » que
 *  shape.ts proscrit en toutes lettres. Mesuré le 10/08/2026 sur le corpus paginé (7 632 fiches) :
 *  0 fiche de cette population porte des `forms` — la branche existe pour la CAPACITÉ, pas pour un
 *  cas courant, et c'est bien pour ça qu'elle doit exister avant qu'une fiche en porte. */
interface Etape {
  label?: unknown; img?: unknown; url?: unknown; idle?: unknown;
  period?: unknown; age?: unknown; event?: unknown; arc?: unknown;
  leader?: unknown; threat?: unknown; summary?: unknown;
}

/** Chronologie de l'entrée + sa provenance. Les `eras` priment : quand les deux existent, ce sont
 *  elles qui portent les quatre lignes du canal (les `forms` n'en ont aucune). */
function lireChronologie(attributes: Record<string, unknown>): { etapes: Etape[]; source: 'eras' | 'forms' | null } {
  const eras = Array.isArray(attributes.eras)
    ? (attributes.eras as unknown[]).filter((e): e is Etape => e !== null && typeof e === 'object')
    : [];
  if (eras.length) return { etapes: eras, source: 'eras' };
  const forms = normalizeForms(attributes) as Etape[];
  if (forms.length) return { etapes: forms, source: 'forms' };
  return { etapes: [], source: null };
}

export interface AxisNeighbors {
  attr: string;
  label: string;
  value: string;
  entries: AkashaEntryCard[];
}

type Membre = { slug: string; name: string; img: string | null; favorites: number };
type Lien = { label: string; name: string; slug: string };

export default function EntityZone({ entry, axisNeighbors }: { entry: AkashaEntryDetail; axisNeighbors?: AxisNeighbors | null }) {
  return (
    <ZoneProvider>
      <ZoneInner entry={entry} axisNeighbors={axisNeighbors} />
    </ZoneProvider>
  );
}

function ZoneInner({ entry, axisNeighbors }: { entry: AkashaEntryDetail; axisNeighbors?: AxisNeighbors | null }) {
  const { sel, select } = useZone();
  // Étape courante de la frise. État LOCAL et non `ZoneSelection` : la frise ne re-scope pas le
  // canal sur un panneau à part, elle change ce que le canal montre DÉJÀ par défaut — c'est ce qui
  // fait qu'un seul geste pilote le portrait ET le canal (comportement d'EraZone, préservé).
  const [etapeIdx, setEtapeIdx] = useState(0);

  const shape = deriveShape(entry);
  const has = (mod: AkashaModule) => shape.includes(mod);

  const a = entry.attributes as Record<string, unknown>;
  const m = TYPE_META[entry.type];
  const um = entry.universe ? universeMeta(entry.universe) : null;
  const accent = um?.color ?? m.color;
  const rar = entry.rarity ? RARITY_META[entry.rarity] : null;
  const hub = entry.universe ? universeHubSlug(entry.universe) : undefined;
  const initiale = (entry.name.match(/\p{L}|\p{N}/u)?.[0] ?? '◆').toUpperCase();
  const bio = str(a.bio) || str(a.descFr) || entry.summary;

  // ── Module `timeline` (fusion d'EraZone) : la frise, le portrait d'époque, les lignes du canal.
  // `has('timeline')` et une chronologie non vide disent la MÊME chose (mêmes gardes, cf.
  // `aDesElementsObjets` dans shape.ts) — on exige les deux pour que le module ne puisse pas se
  // monter sans matière si l'une des deux dérivait un jour.
  const { etapes, source: chronoSource } = lireChronologie(a);
  const timeline = has('timeline') && etapes.length > 0;
  const etape: Etape | null = timeline ? etapes[Math.min(etapeIdx, etapes.length - 1)] ?? null : null;
  const eraLabels = ERA_LABELS[entry.type] ?? ERA_LABELS_DEFAUT;
  // L'illustration d'époque prime sur le portrait de la fiche ; à défaut (cahier-de-la-mort : 4
  // ères, 0 image) on retombe sur `image_url`, exactement comme le faisait EraZone.
  const portrait = (etape ? str(etape.img) ?? str(etape.url) ?? str(etape.idle) : null) ?? entry.image_url;
  // Cadre PAYSAGE quand une chronologie pilote le portrait — le 4/3 du portrait générique
  // enfermerait une illustration large dans deux bandes vides. Mêmes valeurs qu'EraZone
  // (16/10, 640 px) : ce chantier fusionne, il ne re-dessine pas.
  // (Le commentaire d'origine annonçait « les 61 illustrations d'ère du corpus, toutes en
  // 1100×613 ». Recompté le 10/08 : 36 fiches portent une illustration d'ère, pour 78 fichiers
  // distincts — et je n'ai pas mesuré leurs dimensions une par une. Un chiffre inventé dans un
  // commentaire se croit d'autant mieux qu'il est précis ; celui-là ne fondait pas le choix de
  // ratio, qui tient tout seul.)
  const cadre = timeline ? { ratio: '16/10', max: 640 } : { ratio: '4/3', max: 560 };
  const quote = a.quote && typeof a.quote === 'object' ? (a.quote as { text?: string; author?: string }) : null;

  const onEtape = (i: number) => {
    setEtapeIdx(i);
    // Ramener le canal à son panneau par défaut : c'est LUI qui porte les lignes de l'étape, donc
    // sans ce retour la frise piloterait le portrait sans que le canal suive (EraZone, l. 58).
    select(null);
  };

  // ── Réseau (niveau 4) : la relation pertinente au type, puis tout le reste. ──
  const primary = PRIMARY_RELATION[entry.type];
  const primaryRels = new Set(primary?.rels ?? []);
  // DÉDOUBLONNAGE PAR SLUG, obligatoire : `primary.rels` peut contenir DEUX relations (`place` lit
  // habite ET appartient), et un personnage porte parfois les deux vers le même lieu. Trois
  // conséquences, toutes visibles : le compteur du titre affichait des ARÊTES pour des PERSONNES
  // (« Habité par · 449 » pour 443 personnes sur konohagakure), React recevait deux enfants de même
  // `key` (avertissement « children duplicated and/or omitted » relevé en console le 10/08 sur
  // konohagakure, soul-society et hueco-mundo), et le puits `orbit` pouvait montrer deux fois le
  // même visage. Mesuré sur le corpus paginé : 16 fiches concernées — 3 arrivent ici par la fusion
  // d'EraZone, les 13 autres (sunagakure, karakura, kirigakure, loguetown-lieu…) portaient déjà le
  // défaut. On garde la première occurrence : le tri par popularité passe AVANT, et les deux
  // occurrences sont de toute façon la même personne.
  const primaryMembers: Membre[] = primary
    ? [
        ...new Map(
          entry.relationsIn
            .filter((r) => primaryRels.has(r.relation) && r.target.type === 'character')
            .map((r) => ({ slug: r.target.slug, name: r.target.name, img: r.target.image_url, favorites: fav(r.target.favorites) }))
            .sort((x, y) => y.favorites - x.favorites)
            .map((mb) => [mb.slug, mb] as const),
        ).values(),
      ]
    : [];
  const primarySlugs = new Set(primaryMembers.map((mb) => mb.slug));

  // `orbit` : CE MÊME ensemble rendu en puits (collectif dense) plutôt qu'en grappe pliée — le
  // garde-fou et le module partagent EXACTEMENT le même filtre (shape.ts, aUneAppartenanceDense),
  // donc jamais de désaccord entre « orbit est monté » et « ce puits a des membres ». Mesuré
  // 08/08/2026 : 21 fiches `place` de cette population dépassent 12 membres (sunagakure 81,
  // karakura 51, east-blue 49… jusqu'à 81) — restreint à `place` : c'est le seul type de cette
  // population dont `primary.rels` recoupe `MEMBERSHIP_RELATIONS`, donc le seul où ce puits a un
  // sens (un artefact « maîtrisé » par 100 personnages n'est pas un collectif, c'est une liste
  // d'usagers — il reste dans la grappe pliée, jamais en orbite).
  const isOrbit = has('orbit') && entry.type === 'place';
  const orbitLeader = isOrbit ? primaryMembers[0] : undefined;
  const orbitRing = isOrbit ? primaryMembers.slice(1, 9) : [];
  const orbitRest = isOrbit ? primaryMembers.slice(9) : [];

  // Tout le reste des arêtes (dans les deux sens), hors ce qui est déjà montré en primaire/orbite.
  const secondary: Lien[] = [
    ...entry.relationsOut.map((r) => ({ label: libelle(r.relation, false), name: r.target.name, slug: r.target.slug })),
    ...entry.relationsIn
      .filter((r) => !(primaryRels.has(r.relation) && r.target.type === 'character'))
      .map((r) => ({ label: libelle(r.relation, true), name: r.target.name, slug: r.target.slug })),
  ]
    .filter((l) => !primarySlugs.has(l.slug))
    .filter((l, i, t) => t.findIndex((x) => x.name === l.name && x.label === l.label) === i);

  // ── Rattachements (niveau 2) : valeurs d'axe peuplées, lues depuis la taxonomie RÉELLE de
  // l'univers (jamais une liste recopiée) — même source que `deriveShape`/`aUnAxePeuple`. ──
  const axes = entry.universe ? taxonomyByName(entry.universe)?.axes ?? [] : [];
  const belong: { attr: string; label: string; value: string }[] = [];
  for (const ax of axes) {
    const v = a[ax.attr];
    const value = typeof v === 'string' && v.trim() ? v.trim() : Array.isArray(v) && v.length && typeof v[0] === 'string' ? (v[0] as string) : null;
    if (value) belong.push({ attr: ax.attr, label: ax.label, value });
  }

  // ── LOT 2c — le repli des isolées. Une fiche SANS AUCUNE arête ne peut jamais montrer de
  // « Réseau » : `axisNeighbors` (calculé côté page, cf. en-tête de fichier) prend le relais,
  // mais avec un traitement VISUELLEMENT DISTINCT (cartes de fiches liées vers LEUR PROPRE fiche,
  // jamais des chips de re-scope identiques aux vraies relations) et un libellé qui dit la
  // différence : « partagent » un axe, jamais « allié de » — sinon on transforme une architecture
  // honnête en donnée trompeuse. ──
  const showAxisFallback = !has('relations') && !!axisNeighbors && axisNeighbors.entries.length > 0;

  const pickMembre = (mb: Membre, role: string) => select({ kind: 'membre', slug: mb.slug, name: mb.name, img: mb.img, favorites: mb.favorites, role });
  const pickLien = (l: Lien) => select({ kind: 'famille', rel: l.label, name: l.name, slug: l.slug });
  const pickAppartenance = (attr: string, label: string, value: string) => select({ kind: 'appartenance', attr, label, value });

  return (
    <div className="ak-zone-grid">
      {/* ── SURFACE ─────────────────────────────────────────── */}
      <section style={{ minWidth: 0 }}>
        {/* Niveau 0 — Socle : chips type/rareté/univers + nom géant. */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <span style={chip('var(--td3)')}>{m.label}</span>
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
        <h1 style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase', fontSize: 'clamp(34px,6vw,72px)', lineHeight: 0.9, letterSpacing: '-0.01em', color: 'var(--td)', margin: '0 0 18px' }}>
          {entry.name}
        </h1>

        {/* Niveau 1 — Signe : portrait (ou illustration de l'étape courante), sinon tuile générée. */}
        <div style={{ position: 'relative', width: '100%', maxWidth: cadre.max, aspectRatio: cadre.ratio, borderRadius: 18, overflow: 'hidden', border: '1px solid var(--bd2)', background: 'var(--bg2)', boxShadow: `0 40px 90px -50px ${accent}88` }}>
          {portrait ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img aria-hidden src={portrait} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(26px) brightness(0.45) saturate(1.1)', transform: 'scale(1.25)' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={portrait} alt={etape ? `${entry.name} — ${str(etape.label) ?? ''}` : entry.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
            </>
          ) : (
            <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(145deg, ${accent} 0%, ${accent}66 55%, ${accent}22 100%)` }}>
              <span style={{ fontFamily: 'var(--fn)', fontWeight: 900, fontSize: 'clamp(80px,15vw,150px)', lineHeight: 1, color: '#fff', textShadow: '0 10px 50px rgba(3,7,15,0.5)' }}>{initiale}</span>
            </div>
          )}
          {/* Cartouche de l'étape, en pied d'image — dit lequel des N moments on regarde. */}
          {etape && (str(etape.label) || str(etape.period) || str(etape.age)) && (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '26px 16px 12px', background: 'linear-gradient(180deg, transparent, rgba(3,7,15,0.85))', fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--td2)' }}>
              {str(etape.label)}
              {(str(etape.period) ?? str(etape.age)) && <span style={{ color: 'var(--td3)' }}> · {str(etape.period) ?? str(etape.age)}</span>}
            </div>
          )}
        </div>

        {/* Module `timeline` — la frise. Une seule étape ne se pilote pas : le cartouche du portrait
            et les lignes du canal la disent déjà (même seuil qu'EraZone et que CharacterZone). */}
        {timeline && etapes.length > 1 && (
          <div style={{ marginTop: 18, maxWidth: cadre.max }}>
            <ArcFrieze
              forms={etapes.map((e) =>
                chronoSource === 'eras'
                  ? { label: e.label, url: e.img, age: e.period, arc: e.event }
                  : (e as Record<string, unknown>),
              )}
              sel={Math.min(etapeIdx, etapes.length - 1)}
              onSelect={onEtape}
              color={accent}
              heading={chronoSource === 'eras' ? `◆ Chronologie — ${etapes.length} ères` : undefined}
              // Le rendu « sprite » (contain + pixelated) ne vaut que pour les vignettes idle des
              // formes ; les illustrations d'ère sont des images pleines, en cover net.
              pixelated={chronoSource === 'forms'}
            />
          </div>
        )}

        {/* La citation encadrée — présente sur les 14 fiches à ères et NULLE PART ailleurs dans
            cette population (mesuré 10/08 : `attributes.quote.text` peuplé sur 14/2 612). Sans ce
            bloc, la fusion aurait effacé la seule voix canon de ces fiches. */}
        {quote?.text && (
          <blockquote style={{ margin: '20px 0 0', maxWidth: cadre.max, padding: '12px 16px', borderLeft: `2px solid ${accent}`, background: `${accent}0D`, borderRadius: '0 10px 10px 0' }}>
            <p style={{ margin: 0, fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 700, fontSize: 15.5, lineHeight: 1.45, color: 'var(--td)' }}>{quote.text}</p>
            {quote.author && <div style={{ marginTop: 5, fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: accent }}>{quote.author}</div>}
          </blockquote>
        )}

        {/* Niveau 2 — Rattachements : axes canon peuplés, cliquables → canal re-scopé. */}
        {belong.length > 0 && (
          <div style={{ marginTop: 24, maxWidth: 640 }}>
            <Grappe title="Rattachements" accent={accent}>
              {belong.map((b, i) => (
                <ChipBtn key={i} accent={accent} active={sel?.kind === 'appartenance' && sel.value === b.value}
                  onClick={() => pickAppartenance(b.attr, b.label, b.value)}>
                  <span style={{ color: 'var(--td3)', fontWeight: 400 }}>{b.label} · </span>{b.value}
                </ChipBtn>
              ))}
            </Grappe>
          </div>
        )}

        {/* Niveau 4 — Réseau : le puits (collectif dense), ou la grappe primaire pliée à 12. */}
        {isOrbit && orbitLeader ? (
          <div style={{ marginTop: 26, maxWidth: 640 }}>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent, marginBottom: 12 }}>
              {primary!.label} · {primaryMembers.length}
            </div>
            <div style={{ position: 'relative', width: 'min(100%, 420px)', aspectRatio: '1', margin: '0 auto' }}>
              <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
                <circle cx={50} cy={50} r={36} fill="none" stroke="var(--bd2)" strokeWidth={0.35} strokeDasharray="1.6 1.8" />
                <circle cx={50} cy={50} r={17} fill={`${accent}0A`} stroke={`${accent}44`} strokeWidth={0.4} />
              </svg>
              <button type="button" onClick={() => pickMembre(orbitLeader, 'Figure la plus notable')}
                aria-pressed={sel?.kind === 'membre' && sel.slug === orbitLeader.slug}
                style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 2 }}>
                <span style={{ width: 92, height: 92, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${sel?.kind === 'membre' && sel.slug === orbitLeader.slug ? accent : 'var(--bd2)'}`, boxShadow: `0 0 30px -8px ${accent}AA`, background: 'var(--bg2)', display: 'block' }}>
                  {orbitLeader.img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={orbitLeader.img} alt={orbitLeader.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
                  )}
                </span>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 800, color: 'var(--td)', lineHeight: 1.1, maxWidth: 120, textAlign: 'center' }}>{orbitLeader.name}</span>
              </button>
              {orbitRing.map((mb, i) => {
                const ang = -Math.PI / 2 + (i * 2 * Math.PI) / orbitRing.length;
                const left = 50 + Math.cos(ang) * 36;
                const top = 50 + Math.sin(ang) * 36;
                const on = sel?.kind === 'membre' && sel.slug === mb.slug;
                return (
                  <button key={mb.slug} type="button" onClick={() => pickMembre(mb, 'Figure liée')} title={mb.name} aria-pressed={on}
                    style={{ position: 'absolute', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, -50%)', background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 1 }}>
                    <span style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${on ? accent : 'var(--bd)'}`, boxShadow: on ? `0 0 16px -4px ${accent}` : '0 4px 12px -8px rgba(0,0,0,0.8)', background: 'var(--bg2)', display: 'block' }}>
                      {mb.img && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mb.img} alt={mb.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Le reste du collectif, en chips pliées sous le puits. Cette ligne ne disait qu'un
                NOMBRE (« + 440 autres au registre », un texte mort) : sur les 4 fiches à ères qui
                atteignent ce puits, la fusion aurait alors fait passer le lecteur de 18 figures
                cliquables (grappe « Figures du lieu » d'EraZone) à 9 — une perte nette. Avec ce
                repli, il en atteint 21 (1 puits + 8 anneau + 12 chips) et le compteur résiduel reste
                honnête. Gain collatéral pour les 21 fiches `orbit` déjà en place. */}
            {orbitRest.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center' }}>
                  {orbitRest.slice(0, GRAPPE_CAP).map((mb) => (
                    <ChipBtn key={mb.slug} accent={accent} active={sel?.kind === 'membre' && sel.slug === mb.slug}
                      onClick={() => pickMembre(mb, 'Figure liée')}>
                      {mb.name}
                    </ChipBtn>
                  ))}
                  {orbitRest.length > GRAPPE_CAP && (
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', alignSelf: 'center' }}>+ {orbitRest.length - GRAPPE_CAP} autres au registre</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : primaryMembers.length > 0 && primary ? (
          <div style={{ marginTop: 26, maxWidth: 640 }}>
            <Grappe title={`${primary.label} · ${primaryMembers.length}`} accent={accent}>
              {primaryMembers.slice(0, GRAPPE_CAP).map((mb) => (
                <ChipBtn key={mb.slug} accent={accent} active={sel?.kind === 'membre' && sel.slug === mb.slug}
                  onClick={() => pickMembre(mb, primary.label)}>
                  {mb.name}
                </ChipBtn>
              ))}
              {primaryMembers.length > GRAPPE_CAP && (
                <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', alignSelf: 'center' }}>+ {primaryMembers.length - GRAPPE_CAP} autres</span>
              )}
            </Grappe>
          </div>
        ) : null}

        {secondary.length > 0 && (
          <div style={{ marginTop: 26, maxWidth: 640 }}>
            <Grappe title={`Autres liens · ${secondary.length}`} accent={accent}>
              {secondary.slice(0, GRAPPE_CAP).map((l, i) => (
                <ChipBtn key={i} accent={accent} active={sel?.kind === 'famille' && sel.name === l.name && sel.rel === l.label}
                  onClick={() => pickLien(l)}>
                  <span style={{ color: 'var(--td3)', fontWeight: 400 }}>{l.label} · </span>{l.name}
                </ChipBtn>
              ))}
              {secondary.length > GRAPPE_CAP && (
                <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', alignSelf: 'center' }}>+ {secondary.length - GRAPPE_CAP} autres</span>
              )}
            </Grappe>
          </div>
        )}

        {/* LOT 2c — repli des isolées : voisins d'AXE, jamais une relation. Distinct par la forme
            (cartes de fiches, pas des chips), par l'interaction (lien direct vers la fiche, jamais
            un re-scope du canal) et par le libellé (« partagent… », jamais un verbe de relation). */}
        {showAxisFallback && axisNeighbors && (
          <div style={{ marginTop: 26, maxWidth: 640 }}>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 6 }}>
              Aucune relation au registre
            </div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td3)', marginBottom: 12, lineHeight: 1.5 }}>
              Partagent {axisNeighbors.label.toLowerCase()} « {axisNeighbors.value} » — pas une relation, un rapprochement par attribut.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {axisNeighbors.entries.map((n) => (
                <Link key={n.slug} href={`/learn/akasha/${n.slug}`} className="ak-tab"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', padding: '7px 10px', borderRadius: 10, border: '1px dashed var(--bd2)', background: 'var(--bg2)' }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: `${accent}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {n.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.image_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span aria-hidden style={{ fontSize: 13, opacity: 0.7 }}>{TYPE_META[n.type].icon}</span>
                    )}
                  </span>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: 'var(--td2)' }}>{n.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── CANAL ───────────────────────────────────────────── */}
      <aside className="ak-canal" aria-live="polite">
        <Canal entry={entry} accent={accent} bio={bio} primary={primary} primaryCount={primaryMembers.length}
          etape={etape} eraLabels={eraLabels} />
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

function ChipBtn({ accent, active, onClick, children }: { accent: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={!!active} className="ak-tab"
      style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${active ? accent : 'var(--bd2)'}`, background: active ? `${accent}1C` : 'var(--bg2)', color: active ? accent : 'var(--td2)', transition: 'all .15s' }}>
      {children}
    </button>
  );
}

const chip = (color: string): React.CSSProperties => ({
  fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
  padding: '3px 10px', borderRadius: 20, color, background: 'var(--bg2)', border: '1px solid var(--bd2)', display: 'inline-flex', alignItems: 'center', gap: 5,
});

/* ── Le canal : un seul panneau, re-scopé par la sélection ── */

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

function Canal({ entry, accent, bio, primary, primaryCount, etape, eraLabels }: {
  entry: AkashaEntryDetail; accent: string; bio: string | null;
  primary?: { rels: string[]; label: string }; primaryCount: number;
  /** Étape courante du module `timeline`, ou null quand l'entrée n'a pas de chronologie. */
  etape: Etape | null;
  eraLabels: { leader: string; event: string; threat: string };
}) {
  const { sel, select } = useZone();
  const resume = etape ? str(etape.summary) : null;
  // Le panneau par défaut s'annonce par le nom de l'ÉTAPE quand il y en a une : c'est ce qui rend
  // visible qu'un clic sur la frise a bougé le canal, et pas seulement l'image (EraZone, l. 165).
  const scope: string = sel === null ? (etape ? str(etape.label) ?? 'Identité' : 'Identité')
    : sel.kind === 'membre' ? (sel.role ?? 'Membre')
    : sel.kind === 'famille' ? sel.rel
    : sel.kind === 'appartenance' ? sel.label
    : 'Identité';
  const retour = etape ? '↩ L’ère' : '↩ Identité';

  return (
    <div style={{ border: '1px solid var(--bd)', borderTop: `2px solid ${accent}`, borderRadius: 14, background: 'var(--bg2)', padding: '16px 18px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid var(--bd)', paddingBottom: 10, marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--td3)' }}>
          Canal · <span style={{ color: accent }}>{scope}</span>
        </span>
        {sel !== null && (
          <button type="button" onClick={() => select(null)} className="ak-tab"
            style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 14, border: '1px solid var(--bd2)', background: 'transparent', color: 'var(--td3)', cursor: 'pointer' }}>
            {retour}
          </button>
        )}
      </div>

      {sel === null && (
        <div>
          <div style={{ marginBottom: 14 }}>
            {/* Les lignes de l'ÉTAPE en tête : ce sont elles que la frise pilote. Les lignes
                d'identité restent DESSOUS, jamais remplacées — la fusion ajoute, elle n'échange
                pas. Sur une entrée sans chronologie, ce bloc est identique à ce qu'il était. */}
            {etape && str(etape.period) && <Row k="Période" v={str(etape.period)!} />}
            {etape && !str(etape.period) && str(etape.age) && <Row k="Période" v={str(etape.age)!} />}
            {etape && str(etape.leader) && <Row k={eraLabels.leader} v={str(etape.leader)!} />}
            {etape && str(etape.event) && <Row k={eraLabels.event} v={str(etape.event)!} />}
            {etape && str(etape.arc) && !str(etape.event) && <Row k={eraLabels.event} v={str(etape.arc)!} />}
            {etape && str(etape.threat) && <Row k={eraLabels.threat} v={str(etape.threat)!} />}
            {entry.universe && <Row k="Univers" v={entry.universe} />}
            {primary && primaryCount > 0 && <Row k={primary.label} v={String(primaryCount)} />}
          </div>
          {resume && (
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13.5, lineHeight: 1.75, color: 'var(--td2)', whiteSpace: 'pre-line', margin: '0 0 14px' }}>{resume}</p>
          )}
          {/* La bio passe au second plan quand l'étape a déjà son récit (elle raconte la fiche, pas
              le moment) — et disparaît si elle répète mot pour mot ce résumé. */}
          {bio && bio !== resume && (
            <p style={resume
              ? { fontFamily: 'var(--fo)', fontSize: 12.5, lineHeight: 1.7, color: 'var(--td3)', whiteSpace: 'pre-line', margin: 0 }
              : { fontFamily: 'var(--fo)', fontSize: 13.5, lineHeight: 1.75, color: 'var(--td2)', whiteSpace: 'pre-line', margin: 0 }}>{bio}</p>
          )}
          {!resume && !bio && (
            <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, lineHeight: 1.6, color: 'var(--td3)', margin: 0 }}>Aucune biographie au registre pour l&rsquo;instant.</p>
          )}
        </div>
      )}

      {sel?.kind === 'membre' && (
        <div>
          {sel.img && (
            <div style={{ width: 120, height: 150, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--bd2)', marginBottom: 12, background: 'var(--bg3)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sel.img} alt={sel.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
            </div>
          )}
          <CanalTitle>{sel.name}</CanalTitle>
          {typeof sel.favorites === 'number' && sel.favorites > 0 && (
            <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: accent, marginBottom: 12, fontVariantNumeric: 'tabular-nums' }}>★ {sel.favorites.toLocaleString('fr-FR')} fans</div>
          )}
          <Link href={`/learn/akasha/${sel.slug}`} className="ak-cta"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, padding: '9px 16px', borderRadius: 10, border: `1px solid ${accent}66`, background: `${accent}14`, color: accent, textDecoration: 'none' }}>
            Ouvrir la fiche →
          </Link>
        </div>
      )}

      {sel?.kind === 'famille' && (
        <div>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 6 }}>{sel.rel}</div>
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
      )}

      {sel?.kind === 'appartenance' && (() => {
        const linkable = entry.universe && ALLOWED_FILTER_ATTRS.has(sel.attr);
        return (
          <div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 6 }}>{sel.label}</div>
            <CanalTitle>{sel.value}</CanalTitle>
            {linkable ? (
              <Link href={registryHref({ universe: entry.universe!, attr: sel.attr, val: sel.value })} className="ak-cta"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, padding: '9px 16px', borderRadius: 10, border: `1px solid ${accent}66`, background: `${accent}14`, color: accent, textDecoration: 'none' }}>
                Voir tous les membres →
              </Link>
            ) : (
              <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, lineHeight: 1.6, color: 'var(--td3)', margin: 0 }}>Groupe non filtrable pour le moment.</p>
            )}
          </div>
        );
      })()}
    </div>
  );
}
