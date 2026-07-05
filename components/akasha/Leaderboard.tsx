// components/akasha/Leaderboard.tsx — classement générique (Refonte L7) : rang + portrait centré +
// nom + métrique formatée. Server Component, liens vers les fiches.
import Link from 'next/link';
import { universeMeta, type AkashaEntryCard } from '@/lib/akasha/types';

export interface LeaderRow extends AkashaEntryCard { value: string; }

export default function Leaderboard({ title, icon, accent, rows }: { title: string; icon: string; accent: string; rows: LeaderRow[] }) {
  if (!rows.length) return null;
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
        <span aria-hidden style={{ fontSize: 20 }}>{icon}</span>
        <h2 style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 19, textTransform: 'uppercase', color: accent, margin: 0 }}>{title}</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((r, i) => {
          const um = r.universe ? universeMeta(r.universe) : null;
          const podium = i < 3;
          const medal = ['🥇', '🥈', '🥉'][i];
          return (
            <Link key={r.slug} href={`/learn/akasha/${r.slug}`} className="dom-card" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', background: podium ? `linear-gradient(100deg, ${accent}14, var(--bg2))` : 'var(--bg2)', border: `1px solid ${podium ? accent + '66' : 'var(--bd)'}`, borderRadius: 11, padding: '7px 11px' }}>
              <span style={{ width: 26, textAlign: 'center', flexShrink: 0, fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: podium ? 18 : 14, color: podium ? accent : 'var(--td3)' }}>{medal ?? i + 1}</span>
              <span style={{ position: 'relative', width: 38, height: 38, borderRadius: 9, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
                {r.image_url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img aria-hidden src={r.image_url} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', filter: 'blur(8px) brightness(0.5)', transform: 'scale(1.2)' }} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.image_url} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} />
                  </>
                ) : (
                  <span aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</span>
                )}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 13.5, fontWeight: 700, color: 'var(--td)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                {um && <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 10.5, color: um.color }}>{um.emoji} {r.universe}</span>}
              </span>
              <span style={{ flexShrink: 0, fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 14, color: accent }}>{r.value}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
