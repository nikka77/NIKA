// components/akasha/CharacterCard.tsx — fiche personnage « carte à collectionner » premium.
// Cadre-rareté + fond cosmique + gemme + holo, illustration vignettée, panneau de stats riche.
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChakraNatureIcon, VillageEmblem, ClanCrest, familyLabel } from './NarutoIcons';
import { RARITY_META, TYPE_META, type AkashaEntryDetail } from '@/lib/akasha/types';

const ACCENT = '#7B5CF0';

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : str(v) ? [v as string] : [];
type Fam = { rel: string; name: string; slug?: string };
const familyList = (v: unknown): Fam[] =>
  Array.isArray(v) ? (v.filter((f) => f && typeof f === 'object' && 'name' in f) as Fam[]) : [];

function RarityGem({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden style={{ filter: `drop-shadow(0 0 4px ${color}aa)` }}>
      <path d="M12 2l8 6-8 14-8-14z" fill={color} />
      <path d="M4 8h16l-8 4z" fill="#fff" opacity="0.3" />
      <path d="M12 2l8 6h-16z" fill={color} opacity="0.7" />
    </svg>
  );
}

const ICONS: Record<string, ReactNode> = {
  age: <path d="M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  height: <path d="M12 3v18M8 6l4-4 4 4M8 18l4 4 4-4" />,
  weight: <path d="M12 3a3 3 0 013 3H9a3 3 0 013-3zM5 6h14l1.5 14H3.5z" />,
  blood: <path d="M12 2.5s6.5 7.4 6.5 12a6.5 6.5 0 11-13 0C5.5 9.9 12 2.5 12 2.5z" />,
  sex: <path d="M14 6a4 4 0 11-4 4M14 6h4M14 6V2" />,
  cal: <path d="M3 5h18v16H3zM3 9h18M8 3v4M16 3v4" />,
};

function Vital({ k, label, value }: { k: keyof typeof ICONS; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0.5rem 0.6rem', background: 'rgba(5,12,23,0.5)', border: '1px solid var(--bd)', borderRadius: 9 }}>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={ACCENT} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
        {ICONS[k]}
      </svg>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td)', fontWeight: 600, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 8.5, color: 'var(--td3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      </div>
    </div>
  );
}

function Chips({ items, color, max }: { items: string[]; color: string; max?: number }) {
  const shown = max ? items.slice(0, max) : items;
  const extra = max && items.length > max ? items.length - max : 0;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {shown.map((t, i) => (
        <span key={i} style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td2)', background: `${color}14`, border: `1px solid ${color}33`, borderRadius: 7, padding: '3px 9px' }}>{t}</span>
      ))}
      {extra > 0 && <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', padding: '3px 4px' }}>+{extra}</span>}
    </div>
  );
}

function Sec({ title, accent = ACCENT, children }: { title: string; accent?: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <span style={{ width: 3, height: 12, borderRadius: 2, background: accent, flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function CharacterCard({ entry }: { entry: AkashaEntryDetail }) {
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
  const tools = list(a.tools);
  const occupation = list(a.occupation);
  const affiliation = list(a.affiliation);
  const family = familyList(a.family);
  const debut = str(a.debut);

  return (
    <article
      className="ak-tcard"
      style={{
        position: 'relative', borderRadius: 20, padding: 5, overflow: 'hidden',
        background: `linear-gradient(160deg, ${frame}cc, ${frame}55 30%, var(--bg2) 75%)`,
        boxShadow: `0 0 0 1px ${frame}55, 0 26px 60px -28px ${frame}, inset 0 0 30px ${frame}22`,
      }}
    >
      {/* Cadre intérieur */}
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: 'var(--bg)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="ak-cosmic" aria-hidden />

        <div style={{ position: 'relative', zIndex: 1, padding: 14 }}>
          {/* ── Bannière ── */}
          <header style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: m.color, background: `${m.color}1A`, border: `1px solid ${m.color}45`, borderRadius: 20, padding: '2px 9px' }}>
                  <span aria-hidden>{m.icon}</span>{m.label}
                </span>
                {rar && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: frame, background: `${frame}1A`, border: `1px solid ${frame}66`, borderRadius: 20, padding: '2px 9px 2px 6px' }}>
                    <RarityGem color={frame} size={13} />{rar.label}
                  </span>
                )}
              </div>
              <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(27px,5.5vw,40px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.88, margin: 0, textShadow: `0 2px 18px ${frame}55` }}>
                {entry.name}
              </h1>
              {(str(a.role) || rank) && (
                <div style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: frame, marginTop: 6, fontWeight: 600 }}>
                  {[str(a.role), rank].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0, alignItems: 'center' }}>
              <VillageEmblem slug={villageSlug} size={38} />
              <ClanCrest slug={clanSlug} name={clan} size={38} />
            </div>
          </header>

          {/* ── Illustration ── */}
          <div style={{ position: 'relative', borderRadius: 13, overflow: 'hidden', border: `1px solid ${frame}66`, aspectRatio: '5 / 4', background: `linear-gradient(135deg, ${frame}30, ${frame}08)`, marginBottom: 12, boxShadow: `inset 0 0 40px rgba(0,0,0,0.55)` }}>
            {entry.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={entry.image_url} alt={entry.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, opacity: 0.5 }} aria-hidden>{m.icon}</div>
            )}
            {/* vignette + scrim */}
            <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 50% 0%, transparent 55%, rgba(5,12,23,0.55) 100%)' }} />
            {/* natures de chakra (icônes) */}
            {natures.length > 0 && (
              <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {natures.map((n, i) => <ChakraNatureIcon key={i} nature={n} size={23} />)}
              </div>
            )}
            {rank && (
              <span style={{ position: 'absolute', top: 8, right: 8, fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fff', background: `${frame}cc`, borderRadius: 7, padding: '3px 9px', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{rank}</span>
            )}
          </div>

          {/* ── Panneau de stats ── */}
          <div style={{ background: 'rgba(5,12,23,0.6)', border: '1px solid var(--bd)', borderRadius: 13, padding: 13, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* vitals */}
            <div className="g-3 max-sm:grid-cols-3" style={{ gap: 6 }}>
              <Vital k="age" label="Âge" value={str(a.age)} />
              <Vital k="height" label="Taille" value={str(a.height)} />
              <Vital k="weight" label="Poids" value={str(a.weight)} />
              <Vital k="blood" label="Sang" value={str(a.bloodType)} />
              <Vital k="sex" label="Sexe" value={str(a.sex) === 'Male' ? 'Homme' : str(a.sex) === 'Female' ? 'Femme' : str(a.sex)} />
              <Vital k="cal" label="Naissance" value={str(a.birthdate)} />
            </div>

            {natures.length > 0 && (
              <Sec title="Natures de chakra">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {natures.map((n, i) => <ChakraNatureIcon key={i} nature={n} size={24} withLabel />)}
                </div>
              </Sec>
            )}
            {classification.length > 0 && <Sec title="Classification">{<Chips items={classification} color={frame} />}</Sec>}
            {kekkei.length > 0 && <Sec title="Kekkei Genkai" accent="#D44B24"><Chips items={kekkei} color="#D44B24" /></Sec>}
            {affiliation.length > 0 && <Sec title="Affiliations" accent="#0EA878"><Chips items={affiliation} color="#0EA878" /></Sec>}
            {occupation.length > 0 && <Sec title="Fonctions" accent="#0094D4"><Chips items={occupation} color="#0094D4" /></Sec>}
            {jutsu.length > 0 && <Sec title={`Techniques · ${jutsu.length}`}><Chips items={jutsu} color={ACCENT} max={10} /></Sec>}
            {tools.length > 0 && <Sec title="Outils & armes" accent="#D4A017"><Chips items={tools} color="#D4A017" max={8} /></Sec>}

            {family.length > 0 && (
              <Sec title="Famille">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {family.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--fo)', fontSize: 13 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--td3)', minWidth: 84 }}>{familyLabel(f.rel)}</span>
                      {f.slug ? (
                        <Link href={`/learn/akasha/${f.slug}`} style={{ color: frame, textDecoration: 'none', fontWeight: 600 }}>{f.name}</Link>
                      ) : (
                        <span style={{ color: 'var(--td2)' }}>{f.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </Sec>
            )}
          </div>

          {/* ── Texte d'ambiance ── */}
          {entry.summary && (
            <p style={{ fontFamily: 'var(--fo)', fontStyle: 'italic', fontSize: 13.5, color: 'var(--td2)', lineHeight: 1.6, margin: '12px 0 0', padding: '10px 0 10px 12px', borderLeft: `2px solid ${frame}` }}>
              {entry.summary}
            </p>
          )}

          {/* ── Pied ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--bd)', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: frame }}>{entry.universe}</span>
            {debut && <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>1ʳᵉ apparition · {debut}</span>}
          </div>
        </div>
      </div>
    </article>
  );
}
