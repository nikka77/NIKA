// components/akasha/EntityAttributes.tsx — rend `attributes` (jsonb) adapté au type.
import { ATTRIBUTE_FIELDS, type AkashaType } from '@/lib/akasha/types';

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

export default function EntityAttributes({
  type,
  attributes,
}: {
  type: AkashaType;
  attributes: Record<string, unknown>;
}) {
  const fields = ATTRIBUTE_FIELDS[type];
  const knownKeys = new Set(fields.map((f) => f.key));
  const rows: { label: string; value: string }[] = [];

  for (const f of fields) {
    const v = formatValue(attributes[f.key]);
    if (v) rows.push({ label: f.label, value: v });
  }
  // Clés supplémentaires (jsonb flexible) non listées dans ATTRIBUTE_FIELDS.
  for (const [k, val] of Object.entries(attributes)) {
    if (knownKeys.has(k)) continue;
    const v = formatValue(val);
    if (v) rows.push({ label: k.replace(/_/g, ' '), value: v });
  }

  if (!rows.length) return null;

  return (
    <section>
      <h2 className="akasha-section-title">Attributs</h2>
      <dl style={{ margin: 0, border: '1px solid var(--bd)', borderRadius: 12, overflow: 'hidden' }}>
        {rows.map((r, k) => (
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
            <dd style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td)', margin: 0 }}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
