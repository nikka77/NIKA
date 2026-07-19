'use client';
// components/akasha/hub/BleachWorldsMap.tsx — LA COSMOLOGIE BLEACH EN 4 MONDES (lot 3c, vision Dan) :
// Soul Society (avec le cercle du Gotei 13 IMBRIQUÉ en drill-down, et le Wandenreich tapi dans son
// ombre), la Terre (Karakura), et le Hueco Mundo. Chaque monde canalise ses races spirituelles
// (axe race, rempli à 100 %) — clic race → page d'axe. Géométrie calculée, zéro carte-source.
import { useState } from 'react';
import Link from 'next/link';
import BleachSeireitiMap from './BleachSeireitiMap';
import type { AxisView } from './HubSignature';

const REALMS: { key: string; name: string; kanji: string; sub: string; races: string[]; grad: string; tint: string }[] = [
  {
    key: 'soul-society', name: 'Soul Society', kanji: '尸魂界', sub: 'Le monde des âmes — siège du Gotei 13',
    races: ['Shinigami'], grad: 'linear-gradient(120deg, rgba(90,136,176,0.16), rgba(9,21,42,0.6))', tint: '#5A88B0',
  },
  {
    key: 'terre', name: 'Terre · Karakura', kanji: '現世', sub: 'Le monde des vivants — carrefour des âmes',
    races: ['Humain', 'Fullbringer', 'Visored'], grad: 'linear-gradient(120deg, rgba(235,229,214,0.07), rgba(9,21,42,0.55))', tint: '#EBE5D6',
  },
  {
    key: 'hueco-mundo', name: 'Hueco Mundo', kanji: '虚圏', sub: 'Le désert des Hollows — nuit éternelle',
    races: ['Hollow', 'Arrancar'], grad: 'linear-gradient(120deg, rgba(20,16,34,0.75), rgba(5,12,23,0.7))', tint: '#8A8F98',
  },
];

const WANDENREICH = { name: 'Wandenreich', kanji: '見えざる帝国', sub: 'L’empire invisible, tapi dans l’ombre du Seireitei', races: ['Quincy'] };

export default function BleachWorldsMap({ raceAxis, divisionAxis, color }: {
  raceAxis?: AxisView; divisionAxis?: AxisView; universe: string; color: string;
}) {
  const [goteiOpen, setGoteiOpen] = useState(false);
  const count = (race: string) => raceAxis?.chips.find((c) => c.v === race)?.count ?? 0;
  const raceHref = (race: string) => `/learn/akasha/u/bleach/race/${encodeURIComponent(race)}`;

  const RaceChips = ({ races, tint }: { races: string[]; tint: string }) => (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
      {races.filter((r) => count(r) > 0).map((r) => (
        <Link key={r} href={raceHref(r)} className="ak-tab"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 10, border: `1px solid ${tint}44`, background: 'rgba(5,12,23,0.45)', color: 'var(--td2)' }}>
          {r}
          <span style={{ fontSize: 10, fontWeight: 800, color: tint, background: 'rgba(5,12,23,0.5)', borderRadius: 20, padding: '1px 7px', fontVariantNumeric: 'tabular-nums' }}>{count(r)}</span>
        </Link>
      ))}
    </div>
  );

  return (
    <div>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, marginBottom: 4 }}>
        Les quatre mondes
      </div>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td3)', margin: '0 0 12px' }}>
        La cosmologie de Bleach, du Seireitei aux dunes du Hueco Mundo — chaque monde canalise ses races spirituelles.
      </p>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Fil spirituel vertical reliant les mondes. */}
        <span aria-hidden style={{ position: 'absolute', left: 26, top: 18, bottom: 18, width: 1, background: `linear-gradient(180deg, ${color}66, transparent 30%, ${color}33 50%, transparent 75%, #8A8F9866)`, pointerEvents: 'none' }} />

        {REALMS.map((realm) => (
          <div key={realm.key} style={{ position: 'relative', borderRadius: 14, border: '1px solid var(--bd)', background: realm.grad, padding: '16px 18px 14px 44px', overflow: 'hidden' }}>
            <span aria-hidden style={{ position: 'absolute', left: 21, top: 24, width: 11, height: 11, borderRadius: '50%', border: `2px solid ${realm.tint}`, background: 'var(--bg)' }} />
            <span aria-hidden style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--fe)', fontWeight: 900, fontSize: 54, color: `${realm.tint}12`, lineHeight: 1, pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap' }}>{realm.kanji}</span>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase', fontSize: 21, color: 'var(--td)' }}>{realm.name}</span>
              <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)' }}>{realm.sub}</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <RaceChips races={realm.races} tint={realm.tint} />
            </div>

            {/* Soul Society : le Gotei 13 est DANS ce monde — drill-down. */}
            {realm.key === 'soul-society' && divisionAxis && divisionAxis.chips.length >= 6 && (
              <div style={{ marginTop: 12 }}>
                <button type="button" onClick={() => setGoteiOpen((v) => !v)} aria-expanded={goteiOpen} className="ak-tab"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 10, border: `1px solid ${color}55`, background: `${color}14`, color, cursor: 'pointer' }}>
                  {goteiOpen ? 'Replier' : 'Entrer dans'} le Seireitei — Gotei 13
                  <span aria-hidden style={{ transform: goteiOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease', fontSize: 10 }}>▾</span>
                </button>
                {goteiOpen && (
                  <div style={{ marginTop: 12 }}>
                    <BleachSeireitiMap axis={divisionAxis} universe="Bleach" color={color} />
                  </div>
                )}
              </div>
            )}

            {/* Le Wandenreich vit dans l'ombre du Seireitei — bande sombre imbriquée. */}
            {realm.key === 'soul-society' && count('Quincy') > 0 && (
              <div style={{ marginTop: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(120deg, rgba(3,6,12,0.85), rgba(9,21,42,0.5))', padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase', fontSize: 14.5, color: 'var(--td2)' }}>{WANDENREICH.name}</span>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)' }}>{WANDENREICH.sub}</span>
                </div>
                <RaceChips races={WANDENREICH.races} tint="#8A8F98" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
