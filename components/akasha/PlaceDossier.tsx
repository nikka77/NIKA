'use client';
// components/akasha/PlaceDossier.tsx — dossier en onglets d'un LIEU (village) : identité, histoire,
// hokage, clans, lieux emblématiques, habitants, liens. Pendant place de CharacterDossier.
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import EntityRelations from './EntityRelations';
import type { AkashaEntryDetail } from '@/lib/akasha/types';

const ACCENT = '#7B5CF0';
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : []);
type Named = { name?: string; slug?: string; note?: string; n?: string };
const named = (v: unknown): Named[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object' && 'name' in x) as Named[]) : []);

function Sec({ title, accent = ACCENT, children }: { title: string; accent?: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ width: 3, height: 12, borderRadius: 2, background: accent, flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
function Chips({ items, color = ACCENT }: { items: string[]; color?: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((t, i) => (
        <span key={i} style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td2)', background: `${color}14`, border: `1px solid ${color}33`, borderRadius: 7, padding: '3px 9px' }}>{t}</span>
      ))}
    </div>
  );
}
function LinkChips({ items, color = ACCENT }: { items: Named[]; color?: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((it, i) =>
        it.slug ? (
          <Link key={i} href={`/learn/akasha/${it.slug}`} style={{ fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 600, color, textDecoration: 'none', background: `${color}22`, border: `1px solid ${color}55`, borderRadius: 7, padding: '3px 9px' }}>{it.name}</Link>
        ) : (
          <span key={i} style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td2)', background: `${color}14`, border: `1px solid ${color}33`, borderRadius: 7, padding: '3px 9px' }}>{it.name}</span>
        ),
      )}
    </div>
  );
}
function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontFamily: 'var(--fo)', fontSize: 13, alignItems: 'baseline' }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--td3)', minWidth: 92, flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--td2)', minWidth: 0 }}>{children}</span>
    </div>
  );
}

export default function PlaceDossier({ entry }: { entry: AkashaEntryDetail }) {
  const a = entry.attributes as Record<string, unknown>;
  const region = str(a.region);
  const founded = str(a.founded);
  const founders = named(a.founders);
  const symbol = str(a.symbol);
  const motto = str(a.motto);
  const leader = a.leader && typeof a.leader === 'object' ? (a.leader as Named) : null;
  const leaderTitle = str(a.leaderTitle);
  const population = str(a.population);
  const villageRank = str(a.villageRank);
  const status = str(a.status);
  const bio = str(a.bio);
  const trivia = list(a.trivia);
  const hokage = named(a.hokage);
  const clans = named(a.clans);
  const landmarks = list(a.landmarks);
  // Roster tiré des relations entrantes : habitants (place, « habite ») OU praticiens (profession, « exerce »).
  const roster = entry.relationsIn.filter((r) => ['habite', 'exerce', 'appartient', 'maitrise'].includes(r.relation) && r.target.type === 'character');
  const rosterLabel = str(a.rosterLabel) ?? (entry.type === 'profession' ? 'Praticiens' : entry.type === 'status' ? 'Membres' : entry.type === 'power' ? 'Maîtres' : entry.type === 'skill' ? 'Porteurs' : 'Habitants');
  // Champs artefact / génériques
  const origin = str(a.origin);
  const artType = str(a.type);
  const material = str(a.material);
  const bearer = str(a.bearer);
  const abilities = list(a.abilities);
  const wielders = named(a.wielders);
  const facts = (Array.isArray(a.facts) ? a.facts : []).filter((f): f is { label: string; value: string } => !!f && typeof f === 'object' && 'label' in f && 'value' in f);

  const idOK = !!(region || founded || founders.length || symbol || leader || population || villageRank || status || origin || artType || material || bearer || facts.length);
  const ficheTitle = entry.type === 'place' ? 'Fiche du village' : entry.type === 'artifact' ? "Fiche de l'artefact" : entry.type === 'profession' ? 'Fiche du métier' : 'Fiche';

  const tabs = [
    { key: 'identite', label: 'Identité', show: idOK },
    { key: 'histoire', label: 'Histoire', show: !!(bio || trivia.length) },
    { key: 'pouvoirs', label: 'Pouvoirs', show: abilities.length > 0 },
    { key: 'porteurs', label: 'Porteurs', show: wielders.length > 0 },
    { key: 'hokage', label: 'Hokage', show: hokage.length > 0 },
    { key: 'clans', label: 'Clans', show: clans.length > 0 },
    { key: 'lieux', label: 'Lieux', show: landmarks.length > 0 },
    { key: 'roster', label: rosterLabel, show: roster.length > 0 },
    { key: 'liens', label: 'Liens', show: entry.relationsOut.length > 0 || entry.relationsIn.length > 0 },
  ].filter((t) => t.show);
  const [active, setActive] = useState(tabs[0]?.key ?? 'identite');
  if (!tabs.length) return null;

  return (
    <div>
      <div className="hero-domabar" style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 6, marginBottom: 14 }}>
        {tabs.map((t) => {
          const on = active === t.key;
          return (
            <button key={t.key} onClick={() => setActive(t.key)} className="ak-dtab"
              style={{ fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer', padding: '7px 14px', borderRadius: 20, border: `1px solid ${on ? ACCENT : 'var(--bd2)'}`, background: on ? 'rgba(123,92,240,0.16)' : 'transparent', color: on ? ACCENT : 'var(--td2)' }}>
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 14, padding: 15, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {active === 'identite' && (
          <Sec title={ficheTitle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {region && <InfoRow label="Région">{region}</InfoRow>}
              {origin && <InfoRow label="Origine">{origin}</InfoRow>}
              {artType && <InfoRow label="Type">{artType}</InfoRow>}
              {material && <InfoRow label="Nature">{material}</InfoRow>}
              {bearer && <InfoRow label="Porteur">{bearer}</InfoRow>}
              {founded && <InfoRow label="Fondation">{founded}</InfoRow>}
              {founders.length > 0 && (
                <InfoRow label="Fondateurs">
                  {founders.map((f, i) => (
                    <span key={i}>
                      {i > 0 && ' · '}
                      {f.slug ? <Link href={`/learn/akasha/${f.slug}`} style={{ color: ACCENT, textDecoration: 'none', fontWeight: 600 }}>{f.name}</Link> : f.name}
                    </span>
                  ))}
                </InfoRow>
              )}
              {leader && (
                <InfoRow label="Dirigeant">
                  {leader.slug ? <Link href={`/learn/akasha/${leader.slug}`} style={{ color: ACCENT, textDecoration: 'none', fontWeight: 600 }}>{leader.name}</Link> : leader.name}
                  {leaderTitle && <span style={{ color: 'var(--td3)' }}> · {leaderTitle}</span>}
                </InfoRow>
              )}
              {symbol && <InfoRow label="Symbole">{symbol}</InfoRow>}
              {motto && <InfoRow label="Devise">🔥 {motto}</InfoRow>}
              {population && <InfoRow label="Population">{population}</InfoRow>}
              {villageRank && <InfoRow label="Rang">{villageRank}</InfoRow>}
              {status && <InfoRow label="Statut">{status}</InfoRow>}
              {facts.map((f, i) => <InfoRow key={i} label={f.label}>{f.value}</InfoRow>)}
            </div>
          </Sec>
        )}

        {active === 'histoire' && (
          <>
            {bio && (
              <Sec title="Histoire">
                <p style={{ margin: 0, fontFamily: 'var(--fo)', fontSize: 13, lineHeight: 1.65, color: 'var(--td2)' }}>{bio}</p>
              </Sec>
            )}
            {trivia.length > 0 && (
              <Sec title="Le saviez-vous ?">
                <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {trivia.map((t, i) => <li key={i} style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td2)', lineHeight: 1.55 }}>{t}</li>)}
                </ul>
              </Sec>
            )}
          </>
        )}

        {active === 'pouvoirs' && (
          <Sec title={`Pouvoirs · ${abilities.length}`} accent="#D44B24">
            <Chips items={abilities} color="#D44B24" />
          </Sec>
        )}

        {active === 'porteurs' && (
          <Sec title={`Porteurs · ${wielders.length}`} accent="#0094D4">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {wielders.map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 9, fontFamily: 'var(--fo)', fontSize: 13.5 }}>
                  <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12, color: '#0094D4', minWidth: 20, flexShrink: 0 }}>{i + 1}</span>
                  {w.slug ? (
                    <Link href={`/learn/akasha/${w.slug}`} style={{ color: ACCENT, textDecoration: 'none', fontWeight: 700 }}>{w.name}</Link>
                  ) : (
                    <span style={{ color: 'var(--td)', fontWeight: 700 }}>{w.name}</span>
                  )}
                  {w.note && <span style={{ color: 'var(--td3)', fontSize: 11.5 }}>{w.note}</span>}
                </div>
              ))}
            </div>
          </Sec>
        )}

        {active === 'hokage' && (
          <Sec title={`Lignée des Hokage · ${hokage.length}`} accent="#D4A017">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {hokage.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 9, fontFamily: 'var(--fo)', fontSize: 13.5 }}>
                  <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 13, color: '#D4A017', minWidth: 34, flexShrink: 0 }}>{h.n}</span>
                  {h.slug ? (
                    <Link href={`/learn/akasha/${h.slug}`} style={{ color: ACCENT, textDecoration: 'none', fontWeight: 700 }}>{h.name}</Link>
                  ) : (
                    <span style={{ color: 'var(--td)', fontWeight: 700 }}>{h.name}</span>
                  )}
                  {h.note && <span style={{ color: 'var(--td3)', fontSize: 11.5 }}>{h.note}</span>}
                </div>
              ))}
            </div>
          </Sec>
        )}

        {active === 'clans' && (
          <Sec title={`Grands clans · ${clans.length}`} accent="#D44B24">
            <LinkChips items={clans} color="#D44B24" />
          </Sec>
        )}

        {active === 'lieux' && (
          <Sec title={`Lieux emblématiques · ${landmarks.length}`} accent="#0EA878">
            <Chips items={landmarks} color="#0EA878" />
          </Sec>
        )}

        {active === 'roster' && (
          <Sec title={`${rosterLabel} · ${roster.length}`} accent="#0094D4">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {roster.map((r) => (
                <Link key={r.id} href={`/learn/akasha/${r.target.slug}`} style={{ width: 82, textDecoration: 'none', flexShrink: 0 }}>
                  <div style={{ width: 82, height: 82, borderRadius: 12, overflow: 'hidden', background: `linear-gradient(135deg, ${ACCENT}30, ${ACCENT}0A)`, border: `1px solid ${ACCENT}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {r.target.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.target.image_url} alt={r.target.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span aria-hidden style={{ fontSize: 26, opacity: 0.6 }}>◈</span>
                    )}
                  </div>
                  <div style={{ marginTop: 5, fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 600, color: 'var(--td2)', lineHeight: 1.2, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.target.name}</div>
                </Link>
              ))}
            </div>
          </Sec>
        )}

        {active === 'liens' && <EntityRelations out={entry.relationsOut} incoming={entry.relationsIn} />}
      </div>
    </div>
  );
}
