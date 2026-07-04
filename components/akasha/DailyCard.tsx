// components/akasha/DailyCard.tsx — la CARTE DU JOUR du registre : pick déterministe
// (seed = date) parmi les rares+, mise en avant en bannière sur le hub AKASHA.
import Link from 'next/link';
import { RARITY_META, universeMeta, type AkashaEntryCard } from '@/lib/akasha/types';

export default function DailyCard({ entry }: { entry: AkashaEntryCard }) {
  const um = entry.universe ? universeMeta(entry.universe) : null;
  const rar = entry.rarity ? RARITY_META[entry.rarity] : null;
  const accent = rar?.color ?? '#7B5CF0';

  return (
    <Link
      href={`/learn/akasha/${entry.slug}`}
      className="dom-card"
      style={{
        display: 'flex', alignItems: 'stretch', gap: 0, textDecoration: 'none',
        background: `linear-gradient(100deg, ${accent}1F 0%, var(--bg2) 55%)`,
        border: `1px solid ${accent}55`, borderRadius: 15, overflow: 'hidden',
        marginBottom: '1.4rem', position: 'relative',
      }}
    >
      <div style={{ width: 110, flexShrink: 0, position: 'relative', background: `linear-gradient(135deg, ${accent}33, transparent)` }}>
        {entry.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, padding: '0.9rem 1.1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent }}>
          ✦ Carte du jour
        </div>
        <div style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(19px,3vw,26px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 1 }}>
          {entry.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          {um && (
            <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, color: um.color }}>
              {um.emoji} {entry.universe}
            </span>
          )}
          {rar && (
            <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, color: rar.color, background: `${rar.color}14`, border: `1px solid ${rar.color}55` }}>
              {rar.label}
            </span>
          )}
        </div>
        {entry.summary && (
          <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', lineHeight: 1.5, margin: '0.2rem 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {entry.summary}
          </p>
        )}
      </div>
      <div aria-hidden style={{ alignSelf: 'center', paddingRight: 16, fontFamily: 'var(--fo)', fontSize: 18, color: accent }}>→</div>
    </Link>
  );
}
