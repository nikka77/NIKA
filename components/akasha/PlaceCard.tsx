'use client';
// components/akasha/PlaceCard.tsx — carte « village » ÉVOLUTIVE : l'image + les infos changent selon
// l'ère chronologique sélectionnée (fondation → ère moderne). Modelée sur CharacterCard.
import { useState } from 'react';
import { RARITY_META, type AkashaEntry } from '@/lib/akasha/types';

export type Era = { label?: string; leader?: string; period?: string; event?: string; threat?: string; img?: string; summary?: string };

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

function Corner({ pos, color }: { pos: 'tl' | 'tr' | 'bl' | 'br'; color: string }) {
  const base: React.CSSProperties = { position: 'absolute', width: 16, height: 16, zIndex: 4, pointerEvents: 'none' };
  const side = {
    tl: { top: 7, left: 7, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}`, borderTopLeftRadius: 6 },
    tr: { top: 7, right: 7, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}`, borderTopRightRadius: 6 },
    bl: { bottom: 7, left: 7, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}`, borderBottomLeftRadius: 6 },
    br: { bottom: 7, right: 7, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}`, borderBottomRightRadius: 6 },
  }[pos];
  return <span aria-hidden style={{ ...base, ...side }} />;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0, textAlign: 'center', background: 'rgba(5,12,23,0.5)', border: '1px solid var(--bd)', borderRadius: 9, padding: '7px 6px' }}>
      <div style={{ fontFamily: 'var(--fo)', fontWeight: 700, fontSize: 12, color: 'var(--td)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 8.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--td3)', marginTop: 3 }}>{label}</div>
    </div>
  );
}

export default function PlaceCard({ entry, era, frame, baseImg, statLabels }: { entry: AkashaEntry; era: Era; frame: string; baseImg?: string | null; statLabels?: { leader?: string; event?: string; threat?: string } }) {
  const a = entry.attributes as Record<string, unknown>;
  const rar = entry.rarity ? RARITY_META[entry.rarity] : null;
  const subtitle = str(a.region) ?? str(a.origin);
  const kanji = str(a.kanji);
  const motto = str(a.motto);
  const topBadge = str(a.villageRank) ?? str(a.type);
  const sl = { leader: 'Dirigeant', event: 'Événement', threat: 'Menace', ...statLabels };
  const [broken, setBroken] = useState(false);
  const src = (!broken && str(era?.img)) || baseImg || null;

  return (
    <article
      className="ak-card"
      style={{
        position: 'relative', borderRadius: 18, padding: 4, overflow: 'hidden',
        background: `linear-gradient(155deg, ${frame}, ${frame}88 28%, #1a1f33 60%, ${frame}66)`,
        boxShadow: `0 0 0 1px ${frame}66, 0 24px 60px -26px ${frame}, inset 0 0 0 1px rgba(255,255,255,0.08)`,
      }}
    >
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: 'var(--bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="ak-cosmic" aria-hidden />
        <Corner pos="tl" color={`${frame}aa`} /><Corner pos="tr" color={`${frame}aa`} /><Corner pos="bl" color={`${frame}aa`} /><Corner pos="br" color={`${frame}aa`} />

        <div style={{ position: 'relative', zIndex: 1, padding: 13 }}>
          {/* Bandeau */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,5.5vw,34px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, margin: 0, textShadow: `0 2px 16px ${frame}66` }}>{entry.name}</h1>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 5 }}>
                {kanji && <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>{kanji}</span>}
                {subtitle && <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: frame, fontWeight: 700 }}>{subtitle}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
              {topBadge && <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 10.5, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#fff', background: `${frame}cc`, borderRadius: 7, padding: '3px 9px', textAlign: 'right', maxWidth: 140, lineHeight: 1.15 }}>{topBadge}</span>}
              {rar && <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: frame }}>◈ {rar.label}</span>}
            </div>
          </div>

          {/* Image d'ère (évolutive) */}
          <div style={{ position: 'relative', borderRadius: 11, overflow: 'hidden', border: `2px solid ${frame}aa`, aspectRatio: '16 / 10', background: `linear-gradient(135deg, ${frame}33, ${frame}0A)`, boxShadow: 'inset 0 0 36px rgba(0,0,0,0.6)', marginBottom: 12 }}>
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt={`${entry.name} — ${str(era?.label) ?? ''}`} onError={() => setBroken(true)} loading="lazy" className="ak-era-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, opacity: 0.5 }} aria-hidden>🏯</div>
            )}
            <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(130% 80% at 50% 0%, transparent 55%, rgba(5,12,23,0.55) 100%)' }} />
            {str(era?.label) && (
              <div style={{ position: 'absolute', left: 8, bottom: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', color: '#fff', background: `${frame}dd`, borderRadius: 6, padding: '3px 9px' }}>{era.label}</span>
                {str(era?.period) && <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 600, color: '#fff', background: 'rgba(5,12,23,0.7)', borderRadius: 6, padding: '3px 8px' }}>{era.period}</span>}
              </div>
            )}
          </div>

          {/* Stats d'ère (évolutives) */}
          {(str(era?.leader) || str(era?.event) || str(era?.threat)) && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 11 }}>
              {str(era?.leader) && <Stat label={sl.leader} value={era!.leader!} />}
              {str(era?.event) && <Stat label={sl.event} value={era!.event!} />}
              {str(era?.threat) && <Stat label={sl.threat} value={era!.threat!} />}
            </div>
          )}

          {/* Résumé d'ère */}
          {str(era?.summary) && (
            <p style={{ fontFamily: 'var(--fo)', fontStyle: 'italic', fontSize: 12.5, color: 'var(--td2)', lineHeight: 1.55, margin: 0, padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderLeft: `2px solid ${frame}`, borderRadius: '0 6px 6px 0' }}>{era.summary}</p>
          )}

          {/* Pied */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 11, paddingTop: 9, borderTop: `1px solid ${frame}33`, gap: 8 }}>
            <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: frame }}>{entry.universe}</span>
            {motto && <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, color: 'var(--td3)' }}>🔥 {motto}</span>}
          </div>
        </div>
      </div>
    </article>
  );
}
