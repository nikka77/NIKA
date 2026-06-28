// components/akasha/CharacterCard.tsx — face « carte TCG » (style Pokémon) d'un personnage.
// Cadre ornementé + fenêtre d'illustration dominante + encadrés de stats. Le détail complet
// vit dans <CharacterDossier> sous la carte.
import type { ReactNode } from 'react';
import { ChakraNatureIcon, VillageEmblem, ClanCrest } from './NarutoIcons';
import { RARITY_META, TYPE_META, type AkashaEntry } from '@/lib/akasha/types';

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : str(v) ? [v as string] : [];

function Gem({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden style={{ filter: `drop-shadow(0 0 3px ${color}aa)` }}>
      <path d="M12 2l8 6-8 14-8-14z" fill={color} />
      <path d="M4 8h16l-8 4z" fill="#fff" opacity="0.32" />
      <path d="M12 2l8 6h-16z" fill={color} opacity="0.7" />
    </svg>
  );
}

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

function AbilityBox({ icon, label, accent, children }: { icon: ReactNode; label: string; accent: string; children: ReactNode }) {
  return (
    <div style={{ background: 'rgba(5,12,23,0.55)', border: '1px solid var(--bd)', borderRadius: 10, padding: '9px 11px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <span style={{ display: 'inline-flex', width: 18, height: 18, alignItems: 'center', justifyContent: 'center', color: accent }}>{icon}</span>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--td3)' }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

const dnaIcon =<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden><path d="M7 3c0 5 10 7 10 11S7 19 7 21M17 3c0 5-10 7-10 11s10 2 10 6" /></svg>;
const swirlIcon = <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden><path d="M12 4a8 8 0 11-8 8 6 6 0 016-6 4 4 0 014 4 2 2 0 01-2 2" /></svg>;

export default function CharacterCard({ entry }: { entry: AkashaEntry }) {
  const a = entry.attributes as Record<string, unknown>;
  const rar = entry.rarity ? RARITY_META[entry.rarity] : null;
  const frame = rar?.color ?? '#5A88B0';
  const m = TYPE_META[entry.type];

  const villageSlug = str(a.villageSlug);
  const clanSlug = str(a.clanSlug);
  const clan = str(a.clan);
  const rank = str(a.rank);
  const natures = list(a.natureType);
  const classification = list(a.classification);
  const kekkei = list(a.kekkeiGenkai);
  const jutsu = list(a.jutsu);
  const signature = list(a.signature);

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
        <Corner pos="tl" color={`${frame}aa`} />
        <Corner pos="tr" color={`${frame}aa`} />
        <Corner pos="bl" color={`${frame}aa`} />
        <Corner pos="br" color={`${frame}aa`} />

        <div style={{ position: 'relative', zIndex: 1, padding: 13 }}>
          {/* ── Bandeau ── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,5.5vw,34px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, margin: 0, textShadow: `0 2px 16px ${frame}66` }}>
                {entry.name}
              </h1>
              {(clan || str(a.role)) && (
                <div style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', marginTop: 4 }}>{clan ? `Clan ${clan}` : str(a.role)}</div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
              {rank && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#fff', background: `${frame}cc`, borderRadius: 7, padding: '3px 9px' }}>
                  {rank}
                </span>
              )}
              {rar && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: frame }}>
                  <Gem color={frame} size={12} />{rar.label}
                </span>
              )}
            </div>
          </div>

          {/* ── Fenêtre d'illustration ── */}
          <div style={{ position: 'relative', borderRadius: 11, overflow: 'hidden', border: `2px solid ${frame}aa`, aspectRatio: '1 / 1', background: `linear-gradient(135deg, ${frame}33, ${frame}0A)`, boxShadow: 'inset 0 0 36px rgba(0,0,0,0.6)' }}>
            {entry.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={entry.image_url} alt={entry.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 70, opacity: 0.5 }} aria-hidden>{m.icon}</div>
            )}
            <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(130% 80% at 50% 0%, transparent 50%, rgba(5,12,23,0.6) 100%)' }} />
            {/* emblèmes village + clan */}
            <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
              <VillageEmblem slug={villageSlug} size={34} />
              <ClanCrest slug={clanSlug} name={clan} size={34} />
            </div>
            {/* natures de chakra */}
            {natures.length > 0 && (
              <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {natures.map((n, i) => <ChakraNatureIcon key={i} nature={n} size={24} />)}
              </div>
            )}
          </div>

          {/* ── Ligne type / espèce ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', margin: '11px 0', fontFamily: 'var(--fo)', fontSize: 11.5 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: m.color }}>
              <span aria-hidden>{m.icon}</span>{m.label}
            </span>
            {classification[0] && <><span style={{ color: 'var(--bd2)' }}>·</span><span style={{ color: 'var(--td2)' }}>{classification[0]}</span></>}
            {str(a.age) && <><span style={{ color: 'var(--bd2)' }}>·</span><span style={{ color: 'var(--td3)' }}>{str(a.age)} ans</span></>}
          </div>

          {/* ── Encadrés capacités ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {kekkei.length > 0 && (
              <AbilityBox icon={dnaIcon} label="Kekkei Genkai" accent="#D44B24">
                <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 700, fontSize: 14, color: 'var(--td)' }}>{kekkei.join(' · ')}</div>
              </AbilityBox>
            )}
            {(signature.length > 0 || jutsu.length > 0) && (
              <AbilityBox icon={swirlIcon} label="Techniques signature" accent={frame}>
                <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 15, color: 'var(--td)', lineHeight: 1.2 }}>
                  {(signature.length > 0 ? signature : jutsu.slice(0, 1)).join(' · ')}
                </div>
                {jutsu.length > 0 && (
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: 4 }}>
                    {jutsu.length} technique{jutsu.length > 1 ? 's' : ''} · onglet Aptitudes
                  </div>
                )}
              </AbilityBox>
            )}
          </div>

          {/* ── Texte d'ambiance ── */}
          {entry.summary && (
            <p style={{ fontFamily: 'var(--fo)', fontStyle: 'italic', fontSize: 12.5, color: 'var(--td2)', lineHeight: 1.55, margin: '11px 0 0', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderLeft: `2px solid ${frame}`, borderRadius: '0 6px 6px 0' }}>
              {entry.summary}
            </p>
          )}

          {/* ── Pied ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 9, borderTop: `1px solid ${frame}33`, gap: 8 }}>
            <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: frame }}>{entry.universe}</span>
            {str(a.debut) && <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, color: 'var(--td3)' }}>{str(a.debut)}</span>}
          </div>
        </div>
      </div>
    </article>
  );
}
