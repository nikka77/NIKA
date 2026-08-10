// components/akasha/EntityAttributes.tsx — rend `attributes` (jsonb) adapté au type.
// Refonte L3 : labels FR centralisés (mort du fallback snake_case anglais) + valeurs d'AXE cliquables
// (attributs de taxonomy → registre filtré) : chaque donnée affichée redevient un chemin.
import Link from 'next/link';
import { ATTRIBUTE_FIELDS, type AkashaType } from '@/lib/akasha/types';
import { ALLOWED_FILTER_ATTRS } from '@/lib/akasha/universe-taxonomy';
import { registryHref } from '@/lib/akasha/href';

/** Une entité NOMMÉE se lit par son nom, jamais par son enveloppe. Le corpus stocke des listes
 *  d'entités en objets `{ name, slug?, note?, n? }` — les clans, les Hokage et les fondateurs de
 *  Konohagakure, les porteurs de Samehada. Sans cette garde, `String(objet)` rendait littéralement
 *  « [object Object] » en liste, et « name: Naruto Uzumaki · slug: naruto-uzumaki » en valeur
 *  simple. Ajoutée le 10/08/2026 : la fusion d'EraZone en module `timeline` a fait monter le bloc
 *  « Attributs » sur 14 fiches qui ne l'avaient jamais eu, et 2 d'entre elles (konohagakure,
 *  samehada) auraient publié ce déchet — mesuré sur le corpus paginé, ce sont les 2 SEULES de toute
 *  la population qui rend ce bloc. Les 3 566 autres porteuses d'objets (voiceActors, family) sont
 *  des personnages, dont le gabarit ne monte pas ce composant : aucune ne change d'apparence. */
function nomme(v: unknown): string | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const n = (v as Record<string, unknown>).name;
  return typeof n === 'string' && n.trim() ? n.trim() : null;
}

function formatValue(value: unknown): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const s = value
      .filter((v) => v != null && v !== '')
      .map((v) => nomme(v) ?? String(v))
      .filter((v) => v !== '[object Object]') // objet sans `name` : on n'imprime pas son enveloppe
      .join(' · ');
    return s || null;
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o.lat === 'number' && typeof o.lng === 'number') {
      return `${o.lat.toFixed(4)}, ${o.lng.toFixed(4)}`;
    }
    const parNom = nomme(o);
    if (parNom) return parNom;
    const parts = Object.entries(o).map(([k, v]) => `${k}: ${String(v)}`);
    return parts.length ? parts.join(' · ') : null;
  }
  const s = String(value).trim();
  return s || null;
}

// Labels FR des clés jsonb hors ATTRIBUTE_FIELDS (le fallback affichait la clé snake_case brute).
const EXTRA_LABELS_FR: Record<string, string> = {
  roman_name: 'Nom original',
  fruit_type: 'Type de Fruit',
  meito_grade: 'Grade Meito',
  blade_type: 'Type de lame',
  boat_class: 'Classe de navire',
  total_prime: 'Prime totale',
  bounty: 'Prime',
  crew: 'Équipage',
  occupation: 'Fonction',
  favorites: 'Fans (MAL/AniList)',
  height_cm: 'Taille (cm)',
  devil_fruit: 'Fruit du Démon',
  devil_fruit_type: 'Type de Fruit',
  is_signature: 'Attaque signature',
  ki: 'Ki',
  maxKi: 'Ki maximum',
  race: 'Race',
  generation: 'Génération',
  partie: 'Partie',
  saga: 'Saga',
  division: 'Division',
  nen: 'Type de Nen',
  village: 'Village',
  clan: 'Clan',
  rank: 'Rang',
  faction: 'Faction',
  camp: 'Camp',
  col: 'Col',
  source: 'Source',
  // Clés des fiches à ères, devenues visibles le 10/08/2026 : la fusion d'EraZone en module
  // `timeline` fait monter ce bloc sur 14 fiches qui ne l'avaient jamais eu, et leur `attributes`
  // est resté en anglais (import de wikis). Sans ces 15 lignes, la page publiait « MOTTO »,
  // « FOUNDERS », « LEADERTITLE », « WIELDERS » — le repli snake_case, contraire à la règle
  // « textes en français toujours » (CLAUDE.md). Toutes mesurées sur les 14 fiches, aucune
  // inventée : 13 sur konohagakure, 4 sur samehada. `kanji` reste tel quel, c'est un mot français.
  motto: 'Devise',
  symbol: 'Symbole',
  founded: 'Fondation',
  founders: 'Fondateurs',
  landmarks: 'Lieux notables',
  population: 'Population',
  leader: 'Dirigeant',
  leaderTitle: 'Titre du dirigeant',
  villageRank: 'Rang du village',
  clans: 'Clans',
  hokage: 'Hokage',
  wielders: 'Porteurs',
  bearer: 'Porteur actuel',
  status: 'État',
  type: 'Nature',
};

export default function EntityAttributes({
  type,
  attributes,
  universe,
}: {
  type: AkashaType;
  attributes: Record<string, unknown>;
  universe?: string | null;
}) {
  const fields = ATTRIBUTE_FIELDS[type];
  const knownKeys = new Set(fields.map((f) => f.key));
  const rows: { key: string; label: string; value: string }[] = [];

  for (const f of fields) {
    const v = formatValue(attributes[f.key]);
    if (v) rows.push({ key: f.key, label: f.label, value: v });
  }
  // Clés supplémentaires (jsonb flexible) non listées dans ATTRIBUTE_FIELDS.
  // `category` est en chip « ◈ Collection » ; descRaw/descLang = matière de traduction (jamais affichés
  // bruts — règle FR) ; descFr est rendue en section Description ; les clés techniques restent internes.
  //
  // CETTE LISTE EST UNE LISTE DE PUBLICATION (audit du 07/08). Tout ce qui n'y figure pas s'affiche
  // sur la page publique — c'est ainsi que 3 861 fiches ont publié `descFrSource` (« claude-haiku-4-5
  // (blitz fenêtre…) », « groq/openai/gpt-oss-120b »… : la plomberie de l'usine), que les fiches à
  // dossier ont rendu « sections | [object Object] » (queries.ts réinjecte les sections DANS
  // attributes), et que des notes d'ops écrites pour nous — descFrRetiree, resumeCorrige — se sont
  // retrouvées mot pour mot devant le lecteur. Une clé technique NEUVE doit être ajoutée ICI le jour
  // où on l'écrit en base, pas le jour où on la découvre en ligne.
  const HIDDEN = new Set([
    'category', 'rosterLabel', 'eras', 'facts', 'quote', 'bio', 'trivia', 'abilities',
    'descRaw', 'descLang', 'descFr', 'is_signature', 'source',
    // provenance et plomberie d'usine
    'descFrSource', 'sectionsSource', 'import_source', 'sourceUrl', 'purgeAudit',
    // annotations d'ops (nos notes de travail, jamais du contenu de fiche)
    'descFrRetiree', 'descFrImpossible', 'descFrPurgee', 'resumeCorrige',
    // structures rendues par leurs propres composants (jamais en liste d'attributs)
    'sections', 'forms', 'statLabels', 'gallery', 'animations', 'quotes',
    // clés de jointure internes
    'villageSlug', 'clanSlug',
  ]);
  for (const [k, val] of Object.entries(attributes)) {
    if (knownKeys.has(k) || HIDDEN.has(k)) continue;
    // Tautologie mesurée sur 73 fiches : `element` et `category` portent la même valeur
    // (« Élément | Nature de chakra » sous « ◈ Nature de chakra ») — on ne redit pas la chip.
    if (k === 'element' && String(val) === String(attributes.category)) continue;
    const v = formatValue(val);
    if (v) rows.push({ key: k, label: EXTRA_LABELS_FR[k] ?? k.replace(/_/g, ' '), value: v });
  }

  if (!rows.length) return null;

  return (
    <section>
      <h2 className="akasha-section-title">Attributs</h2>
      <dl style={{ margin: 0, border: '1px solid var(--bd)', borderRadius: 12, overflow: 'hidden' }}>
        {rows.map((r, k) => {
          // Valeur d'AXE de taxonomy → lien vers le registre filtré (L3 : plus d'impasse).
          const linkable = universe && ALLOWED_FILTER_ATTRS.has(r.key) && typeof attributes[r.key] === 'string';
          return (
            <div
              key={r.label}
              style={{
                display: 'flex',
                gap: '1rem',
                padding: '0.7rem 1rem',
                background: k % 2 ? 'transparent' : 'var(--bg2)',
                borderTop: k ? '1px solid var(--bd)' : 'none',
              }}
            >
              <dt
                style={{
                  fontFamily: 'var(--fo)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--td2)',
                  width: 130,
                  flexShrink: 0,
                }}
              >
                {r.label}
              </dt>
              <dd style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td)', margin: 0 }}>
                {linkable ? (
                  <Link
                    href={registryHref({ universe: universe!, attr: r.key, val: attributes[r.key] as string })}
                    style={{ color: '#0094D4', fontWeight: 700, textDecoration: 'none' }}
                  >
                    {r.value} <span aria-hidden style={{ fontSize: 11, opacity: 0.7 }}>→</span>
                  </Link>
                ) : (
                  r.value
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
