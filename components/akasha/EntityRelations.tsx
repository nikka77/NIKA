// components/akasha/EntityRelations.tsx — connexions groupées par relation, en puces colorées par type.
import Link from 'next/link';
import { relationLabel, TYPE_META, type ResolvedRelation } from '@/lib/akasha/types';

const ACCENT = '#7B5CF0';

function groupByRelation(rels: ResolvedRelation[]): [string, ResolvedRelation[]][] {
  const map = new Map<string, ResolvedRelation[]>();
  for (const r of rels) {
    const arr = map.get(r.relation);
    if (arr) arr.push(r);
    else map.set(r.relation, [r]);
  }
  return Array.from(map.entries());
}

function TargetChip({ rel }: { rel: ResolvedRelation }) {
  const m = TYPE_META[rel.target.type];
  return (
    <Link
      href={`/learn/akasha/${rel.target.slug}`}
      className="ak-conn-chip"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
        background: `${m.color}14`, border: `1px solid ${m.color}40`, color: 'var(--td)',
        borderRadius: 20, padding: '5px 11px 5px 8px', ['--dc' as string]: m.color,
      }}
    >
      <span aria-hidden style={{ fontSize: 13, lineHeight: 1 }}>{m.icon}</span>
      <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600 }}>{rel.target.name}</span>
    </Link>
  );
}

function Group({ relation, items, dir }: { relation: string; items: ResolvedRelation[]; dir: 'out' | 'in' }) {
  const verb = relationLabel(relation);
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <span
        style={{
          fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.05em',
          textTransform: 'uppercase', color: ACCENT, background: 'rgba(123,92,240,0.12)',
          border: '1px solid rgba(123,92,240,0.3)', borderRadius: 7, padding: '5px 10px',
          whiteSpace: 'nowrap', marginTop: 1,
        }}
      >
        {dir === 'out' ? `${verb} →` : `← ${verb}`}
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, flex: 1, minWidth: 0 }}>
        {items.map((r) => <TargetChip key={r.id} rel={r} />)}
      </div>
    </div>
  );
}

export default function EntityRelations({ out, incoming }: { out: ResolvedRelation[]; incoming: ResolvedRelation[] }) {
  const hasAny = out.length > 0 || incoming.length > 0;
  const outG = groupByRelation(out);
  const inG = groupByRelation(incoming);

  return (
    <section>
      <h2 className="akasha-section-title">Connexions</h2>
      {!hasAny && (
        <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>Aucune connexion répertoriée pour l’instant.</p>
      )}
      {outG.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {outG.map(([rel, items]) => <Group key={rel} relation={rel} items={items} dir="out" />)}
        </div>
      )}
      {inG.length > 0 && (
        <>
          <h3 style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--td3)', margin: '1.4rem 0 0.8rem' }}>
            Référencé par
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {inG.map(([rel, items]) => <Group key={rel} relation={rel} items={items} dir="in" />)}
          </div>
        </>
      )}
    </section>
  );
}
