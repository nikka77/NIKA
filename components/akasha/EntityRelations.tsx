// components/akasha/EntityRelations.tsx — liste structurée des liens (sortants + entrants).
import Link from 'next/link';
import EntityBadge from './EntityBadge';
import { relationLabel, type ResolvedRelation } from '@/lib/akasha/types';

const ACCENT = '#7B5CF0';

function RelationRow({ rel, direction }: { rel: ResolvedRelation; direction: 'out' | 'in' }) {
  const verb = relationLabel(rel.relation);
  return (
    <Link
      href={`/learn/akasha/${rel.target.slug}`}
      className="dom-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.7rem',
        flexWrap: 'wrap',
        background: 'var(--bg2)',
        border: '1px solid var(--bd)',
        borderRadius: 10,
        padding: '0.7rem 0.9rem',
        textDecoration: 'none',
        ['--dc' as string]: ACCENT,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--fo)',
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: ACCENT,
          background: 'rgba(123,92,240,0.12)',
          border: '1px solid rgba(123,92,240,0.3)',
          borderRadius: 6,
          padding: '2px 8px',
          whiteSpace: 'nowrap',
        }}
      >
        {direction === 'out' ? `${verb} →` : `← ${verb}`}
      </span>
      <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 700, fontSize: 15, color: 'var(--td)', flex: 1, minWidth: 0 }}>
        {rel.target.name}
      </span>
      <EntityBadge type={rel.target.type} size="sm" />
    </Link>
  );
}

export default function EntityRelations({
  out,
  incoming,
}: {
  out: ResolvedRelation[];
  incoming: ResolvedRelation[];
}) {
  const hasAny = out.length > 0 || incoming.length > 0;
  return (
    <section>
      <h2 className="akasha-section-title">Connexions</h2>
      {!hasAny && (
        <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>
          Aucune connexion répertoriée pour l’instant.
        </p>
      )}
      {out.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {out.map((r) => (
            <RelationRow key={r.id} rel={r} direction="out" />
          ))}
        </div>
      )}
      {incoming.length > 0 && (
        <>
          <h3
            style={{
              fontFamily: 'var(--fo)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--td3)',
              margin: '1.3rem 0 0.6rem',
            }}
          >
            Référencé par
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {incoming.map((r) => (
              <RelationRow key={r.id} rel={r} direction="in" />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
