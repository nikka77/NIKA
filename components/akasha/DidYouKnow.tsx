// components/akasha/DidYouKnow.tsx — « Le savais-tu ? » : un fait canon tiré des bios VF (descFr),
// pick déterministe par jour (et par univers sur les hubs). 100 % data-driven, zéro contenu manuel.
// Server Component (requête directe). Rendu discret : encart éditorial cliquable vers la fiche.
import Link from 'next/link';
import { getDidYouKnow } from '@/lib/akasha/queries';
import { flavorExcerpt } from '@/lib/akasha/flavor';
import { universeMeta } from '@/lib/akasha/types';

export default async function DidYouKnow({ universe, accent }: { universe?: string; accent?: string }) {
  const seed = new Date().toISOString().slice(0, 10);
  const entry = await getDidYouKnow(seed, universe);
  if (!entry) return null;
  const fact = flavorExcerpt(entry.descFr, 220);
  if (!fact) return null;
  const color = accent ?? (entry.universe ? universeMeta(entry.universe).color : '#7B5CF0');

  return (
    <Link
      href={`/learn/akasha/${entry.slug}`}
      className="dom-card"
      style={{
        display: 'block', textDecoration: 'none', position: 'relative', overflow: 'hidden',
        background: `linear-gradient(120deg, ${color}12 0%, var(--bg2) 60%)`,
        border: `1px solid ${color}40`, borderRadius: 14, padding: '0.95rem 1.1rem',
      }}
    >
      <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color, marginBottom: 5 }}>
        Le savais-tu ?
      </div>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 13, fontStyle: 'italic', color: 'var(--td2)', lineHeight: 1.6, margin: 0 }}>
        « {fact} »
      </p>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, color: 'var(--td3)', marginTop: 7 }}>
        — {entry.name}{entry.universe ? ` · ${entry.universe}` : ''} →
      </div>
    </Link>
  );
}
