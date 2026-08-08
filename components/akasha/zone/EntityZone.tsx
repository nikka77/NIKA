'use client';
// components/akasha/zone/EntityZone.tsx — fiche « entité secondaire » (LOT 2b, refonte AKASHA).
// Remplace le gabarit générique historique pour les fiches power/artifact/place/profession/skill
// qui n'atteignent aucune des trois zones dédiées (personnage, organisation, à ères) — mesuré
// 08/08/2026 : 2 599 fiches (Naruto 1 775, One Piece 568, Dragon Ball 160, JoJo 49, Bleach 25,
// Initial D 11, HxH 7, Death Note 4). MÊME grammaire — surface vivante + canal re-scopable, posée
// sur le MÊME `zone-context` que CharacterZone/OrganizationZone/EraZone (NON TOUCHÉES, ni le
// contexte ni les trois zones) — composée cette fois par CAPACITÉS (lib/akasha/shape.ts, LOT 2a)
// plutôt que par un 4ᵉ gabarit typé : un module absent des capacités RÉELLES de l'entrée n'est
// jamais monté, jamais un état vide déguisé (tasks/akasha-architecture.md §1, renoncement 4).
//
// Zéro requête neuve pour le canal (getEntryBySlug joint déjà tout) — le canal lit la relation
// ENTRANTE pertinente au TYPE (maitrise/pouvoir, possede/artefact, exerce/métier, habite/lieu).
// Seule exception, EXPLICITEMENT hors du canal : `axisNeighbors` (LOT 2c, repli des isolées) est
// calculé côté page (Server Component) via `listEntries`, la même requête déjà utilisée par le
// registre pour filtrer par axe — jamais une relation inventée, jamais un nouveau point d'accès.
import Link from 'next/link';
import {
  RARITY_META, TYPE_META, universeMeta, universeWordmark,
  type AkashaEntryDetail, type AkashaEntryCard, type AkashaType,
} from '@/lib/akasha/types';
import { universeHubSlug, taxonomyByName, ALLOWED_FILTER_ATTRS } from '@/lib/akasha/universe-taxonomy';
import { registryHref } from '@/lib/akasha/href';
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

  // ── Réseau (niveau 4) : la relation pertinente au type, puis tout le reste. ──
  const primary = PRIMARY_RELATION[entry.type];
  const primaryRels = new Set(primary?.rels ?? []);
  const primaryMembers: Membre[] = primary
    ? entry.relationsIn
        .filter((r) => primaryRels.has(r.relation) && r.target.type === 'character')
        .map((r) => ({ slug: r.target.slug, name: r.target.name, img: r.target.image_url, favorites: fav(r.target.favorites) }))
        .sort((x, y) => y.favorites - x.favorites)
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

        {/* Niveau 1 — Signe : portrait, ou tuile générée (initiale + dégradé d'accent). */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 560, aspectRatio: '4/3', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--bd2)', background: 'var(--bg2)', boxShadow: `0 40px 90px -50px ${accent}88` }}>
          {entry.image_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img aria-hidden src={entry.image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(26px) brightness(0.45) saturate(1.1)', transform: 'scale(1.25)' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={entry.image_url} alt={entry.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
            </>
          ) : (
            <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(145deg, ${accent} 0%, ${accent}66 55%, ${accent}22 100%)` }}>
              <span style={{ fontFamily: 'var(--fn)', fontWeight: 900, fontSize: 'clamp(80px,15vw,150px)', lineHeight: 1, color: '#fff', textShadow: '0 10px 50px rgba(3,7,15,0.5)' }}>{initiale}</span>
            </div>
          )}
        </div>

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
            {orbitRest.length > 0 && (
              <div style={{ marginTop: 16, fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', textAlign: 'center' }}>
                + {orbitRest.length} autres au registre
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
        <Canal entry={entry} accent={accent} bio={bio} primary={primary} primaryCount={primaryMembers.length} />
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

function Canal({ entry, accent, bio, primary, primaryCount }: {
  entry: AkashaEntryDetail; accent: string; bio: string | null;
  primary?: { rels: string[]; label: string }; primaryCount: number;
}) {
  const { sel, select } = useZone();
  const scope: string = sel === null ? 'Identité'
    : sel.kind === 'membre' ? (sel.role ?? 'Membre')
    : sel.kind === 'famille' ? sel.rel
    : sel.kind === 'appartenance' ? sel.label
    : 'Identité';

  return (
    <div style={{ border: '1px solid var(--bd)', borderTop: `2px solid ${accent}`, borderRadius: 14, background: 'var(--bg2)', padding: '16px 18px 18px' }}>
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

      {sel === null && (
        <div>
          <div style={{ marginBottom: 14 }}>
            {entry.universe && <Row k="Univers" v={entry.universe} />}
            {primary && primaryCount > 0 && <Row k={primary.label} v={String(primaryCount)} />}
          </div>
          {bio ? (
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13.5, lineHeight: 1.75, color: 'var(--td2)', whiteSpace: 'pre-line', margin: 0 }}>{bio}</p>
          ) : (
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
