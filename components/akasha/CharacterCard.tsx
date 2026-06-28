// components/akasha/CharacterCard.tsx — face « carte TCG » (style Pokémon) d'un personnage.
// Cadre ornementé + fenêtre d'illustration dominante + encadrés de stats. Le détail complet
// vit dans <CharacterDossier> sous la carte.
import type { ReactNode } from 'react';
import CardArt from './CardArt';
import { CategoryIcon } from './NarutoIcons';
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
  const gallery = list(a.gallery);
  const galleryForms = gallery.map((url, i) => ({ label: ['Partie I', 'Partie II', 'Partie III'][i] ?? `Forme ${i + 1}`, url }));
  const curatedForms = (Array.isArray(a.forms) ? (a.forms as { label?: string; url?: string; caption?: string }[]) : [])
    .filter((f) => f && typeof f.url === 'string')
    .map((f) => ({ label: f.label ?? 'Forme', url: f.url as string, caption: f.caption }));
  const forms = curatedForms.length ? curatedForms : galleryForms;

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

          {/* ── Illustration + versions ── */}
          <div style={{ marginBottom: 12 }}>
            <CardArt
              forms={forms.length ? forms : entry.image_url ? [{ label: 'Forme', url: entry.image_url }] : []}
              name={entry.name}
              frame={frame}
              villageSlug={villageSlug}
              clanSlug={clanSlug}
              clan={clan}
              natures={natures}
              fallbackIcon={m.icon}
            />
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
              <AbilityBox icon={<CategoryIcon name="kekkei" size={16} />} label="Kekkei Genkai" accent="#D44B24">
                <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 700, fontSize: 14, color: 'var(--td)' }}>{kekkei.join(' · ')}</div>
              </AbilityBox>
            )}
            {(signature.length > 0 || jutsu.length > 0) && (
              <AbilityBox icon={<CategoryIcon name="techniques" size={16} />} label="Techniques signature" accent={frame}>
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
