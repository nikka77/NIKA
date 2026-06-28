'use client';
// components/akasha/CharacterDossier.tsx — dossier complet d'un personnage, en onglets (max d'infos rangé).
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ChakraNatureIcon, familyLabel, CategoryIcon } from './NarutoIcons';
import EntityRelations from './EntityRelations';
import type { AkashaEntryDetail } from '@/lib/akasha/types';

const ACCENT = '#7B5CF0';

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : str(v) ? [v as string] : [];
type Fam = { rel: string; name: string; slug?: string };
const familyList = (v: unknown): Fam[] =>
  Array.isArray(v) ? (v.filter((f) => f && typeof f === 'object' && 'name' in f) as Fam[]) : [];

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
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 0.7rem', background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: 9 }}>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={ACCENT} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>{ICONS[k]}</svg>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td)', fontWeight: 600, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 8.5, color: 'var(--td3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      </div>
    </div>
  );
}

function Chips({ items, color }: { items: string[]; color: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((t, i) => (
        <span key={i} style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td2)', background: `${color}14`, border: `1px solid ${color}33`, borderRadius: 7, padding: '3px 9px' }}>{t}</span>
      ))}
    </div>
  );
}

function Sec({ title, accent = ACCENT, icon, children }: { title: string; accent?: string; icon?: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {icon ? <CategoryIcon name={icon} size={20} /> : <span style={{ width: 3, height: 12, borderRadius: 2, background: accent, flexShrink: 0 }} />}
        <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function CharacterDossier({ entry }: { entry: AkashaEntryDetail }) {
  const a = entry.attributes as Record<string, unknown>;
  const natures = list(a.natureType);
  const classification = list(a.classification);
  const kekkei = list(a.kekkeiGenkai);
  const jutsu = list(a.jutsu);
  const animations = (Array.isArray(a.animations) ? (a.animations as { label: string; src: string; blend?: string }[]) : []).filter((x) => x && typeof x.src === 'string');
  const tools = list(a.tools);
  const occupation = list(a.occupation);
  const affiliation = list(a.affiliation);
  const family = familyList(a.family);
  const vitals = [str(a.age), str(a.height), str(a.weight), str(a.bloodType), str(a.sex), str(a.birthdate)].some(Boolean);

  const tabs = [
    { key: 'identite', label: 'Identité', show: vitals || classification.length || affiliation.length || occupation.length },
    { key: 'aptitudes', label: 'Aptitudes', show: natures.length || kekkei.length || jutsu.length },
    { key: 'arsenal', label: 'Arsenal', show: tools.length },
    { key: 'famille', label: 'Famille', show: family.length },
    { key: 'liens', label: 'Liens', show: entry.relationsOut.length || entry.relationsIn.length },
  ].filter((t) => t.show);

  const [active, setActive] = useState(tabs[0]?.key ?? 'identite');
  if (!tabs.length) return null;

  return (
    <div>
      {/* onglets */}
      <div className="hero-domabar" style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 6, marginBottom: 14 }}>
        {tabs.map((t) => {
          const on = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className="ak-dtab"
              style={{
                fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer',
                padding: '7px 14px', borderRadius: 20,
                border: `1px solid ${on ? ACCENT : 'var(--bd2)'}`,
                background: on ? 'rgba(123,92,240,0.16)' : 'transparent',
                color: on ? ACCENT : 'var(--td2)',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 14, padding: 15, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {active === 'identite' && (
          <>
            {vitals && (
              <div className="g-3 max-sm:grid-cols-3" style={{ gap: 7 }}>
                <Vital k="age" label="Âge" value={str(a.age)} />
                <Vital k="height" label="Taille" value={str(a.height)} />
                <Vital k="weight" label="Poids" value={str(a.weight)} />
                <Vital k="blood" label="Sang" value={str(a.bloodType)} />
                <Vital k="sex" label="Sexe" value={str(a.sex) === 'Male' ? 'Homme' : str(a.sex) === 'Female' ? 'Femme' : str(a.sex)} />
                <Vital k="cal" label="Naissance" value={str(a.birthdate)} />
              </div>
            )}
            {classification.length > 0 && <Sec title="Classification" icon="classification"><Chips items={classification} color="#7B5CF0" /></Sec>}
            {affiliation.length > 0 && <Sec title="Affiliations" accent="#0EA878" icon="affiliations"><Chips items={affiliation} color="#0EA878" /></Sec>}
            {occupation.length > 0 && <Sec title="Fonctions" accent="#0094D4" icon="fonctions"><Chips items={occupation} color="#0094D4" /></Sec>}
          </>
        )}

        {active === 'aptitudes' && (
          <>
            {natures.length > 0 && (
              <Sec title="Natures de chakra" accent="#F0C040">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {natures.map((n, i) => <ChakraNatureIcon key={i} nature={n} size={24} withLabel />)}
                </div>
              </Sec>
            )}
            {kekkei.length > 0 && <Sec title="Kekkei Genkai" accent="#D44B24" icon="kekkei"><Chips items={kekkei} color="#D44B24" /></Sec>}
            {jutsu.length > 0 && <Sec title={`Techniques · ${jutsu.length}`} icon="techniques"><Chips items={jutsu} color={ACCENT} /></Sec>}
            {animations.length > 0 && (
              <Sec title="Techniques animées" icon="techniques">
                <div className="g-2" style={{ gap: 8 }}>
                  {animations.map((an, i) => (
                    <div key={i} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--bd)', background: 'var(--bg)' }}>
                      <div style={{ aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={an.src} alt={an.label} style={{ width: '100%', height: '100%', objectFit: an.blend ? 'contain' : 'cover', mixBlendMode: an.blend === 'screen' ? 'screen' : undefined }} />
                      </div>
                      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 600, color: 'var(--td2)', textAlign: 'center', padding: 6 }}>{an.label}</div>
                    </div>
                  ))}
                </div>
              </Sec>
            )}
          </>
        )}

        {active === 'arsenal' && tools.length > 0 && (
          <Sec title="Outils & armes" accent="#D4A017" icon="outils"><Chips items={tools} color="#D4A017" /></Sec>
        )}

        {active === 'famille' && family.length > 0 && (
          <Sec title="Famille">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {family.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--fo)', fontSize: 13.5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--td3)', minWidth: 92 }}>{familyLabel(f.rel)}</span>
                  {f.slug ? (
                    <Link href={`/learn/akasha/${f.slug}`} style={{ color: ACCENT, textDecoration: 'none', fontWeight: 600 }}>{f.name}</Link>
                  ) : (
                    <span style={{ color: 'var(--td2)' }}>{f.name}</span>
                  )}
                </div>
              ))}
            </div>
          </Sec>
        )}

        {active === 'liens' && <EntityRelations out={entry.relationsOut} incoming={entry.relationsIn} />}
      </div>
    </div>
  );
}
