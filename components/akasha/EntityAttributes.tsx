// components/akasha/EntityAttributes.tsx — rend `attributes` (jsonb) adapté au type.
// Refonte L3 : labels FR centralisés (mort du fallback snake_case anglais) + valeurs d'AXE cliquables
// (attributs de taxonomy → registre filtré) : chaque donnée affichée redevient un chemin.
import Link from 'next/link';
import { ATTRIBUTE_FIELDS, type AkashaType } from '@/lib/akasha/types';
import { ALLOWED_FILTER_ATTRS } from '@/lib/akasha/universe-taxonomy';
import { registryHref } from '@/lib/akasha/href';

function formatValue(value: unknown): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const s = value.filter((v) => v != null && v !== '').map(String).join(' · ');
    return s || null;
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o.lat === 'number' && typeof o.lng === 'number') {
      return `${o.lat.toFixed(4)}, ${o.lng.toFixed(4)}`;
    }
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
  const HIDDEN = new Set(['category', 'rosterLabel', 'eras', 'facts', 'quote', 'bio', 'trivia', 'abilities', 'descRaw', 'descLang', 'descFr', 'is_signature', 'source']);
  for (const [k, val] of Object.entries(attributes)) {
    if (knownKeys.has(k) || HIDDEN.has(k)) continue;
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
                  color: 'var(--td3)',
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
