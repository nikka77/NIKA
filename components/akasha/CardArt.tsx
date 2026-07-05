'use client';
// components/akasha/CardArt.tsx — zone « databook » de la carte (contrôlée par <CharacterCard>).
// Si le mode porte des stats : petit cadre du sprite IDLE animé (gauche) + radar de stats (droite).
// Sinon : grande illustration (comportement d'origine, autres personnages).
import { ChakraNatureIcon, VillageEmblem, ClanCrest } from './NarutoIcons';
import DatabookRadar, { type Stats } from './DatabookRadar';

export type CardForm = { label: string; url: string; caption?: string; idle?: string; stats?: Stats };

export default function CardArt({
  forms, sel, onSelect, name, frame, villageSlug, clanSlug, clan, natures, fallbackIcon, idle, stats, statLabels,
}: {
  forms: CardForm[]; sel: number; onSelect: (i: number) => void;
  name: string; frame: string; villageSlug: string | null; clanSlug: string | null; clan: string | null;
  natures: string[]; fallbackIcon: string; idle?: string | null; stats?: Stats | null;
  statLabels?: Partial<Record<keyof Stats, string>> | null;
}) {
  const current = forms[sel]?.url ?? forms[0]?.url ?? null;
  const databook = !!stats;

  const Emblems = (
    <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 5, zIndex: 2 }}>
      <VillageEmblem slug={villageSlug} size={30} />
      <ClanCrest slug={clanSlug} name={clan} size={30} />
    </div>
  );

  return (
    <div>
      {databook ? (
        // ── Layout databook : cadre sprite (gauche) + radar (droite) ──
        <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
          <div style={{ width: '45%', flexShrink: 0, position: 'relative', borderRadius: 11, overflow: 'hidden', border: `2px solid ${frame}aa`, background: `linear-gradient(135deg, ${frame}33, ${frame}0A)`, boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6)', aspectRatio: '3 / 4' }}>
            <div className="ak-cosmic" aria-hidden />
            {(idle || current) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={idle || current || ''} src={idle || current || ''} alt={name} className="ak-era-img" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: idle ? 'contain' : 'cover', objectPosition: 'center', imageRendering: idle ? 'pixelated' : 'auto' }} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, opacity: 0.5 }} aria-hidden>{fallbackIcon}</div>
            )}
            {Emblems}
            <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 1px, transparent 1px 3px)', mixBlendMode: 'multiply', pointerEvents: 'none' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRadius: 11, border: '1px solid var(--bd)', background: 'rgba(5,8,18,0.5)', padding: '4px 4px 2px' }}>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--td3)', textAlign: 'center', paddingTop: 3 }}>★ DATABOOK</div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {stats && <DatabookRadar stats={stats} color={frame} labels={statLabels} />}
            </div>
          </div>
        </div>
      ) : (
        // ── Layout d'origine : grande illustration ──
        <div style={{ position: 'relative', borderRadius: 11, overflow: 'hidden', border: `2px solid ${frame}aa`, aspectRatio: '1 / 1', background: `linear-gradient(135deg, ${frame}33, ${frame}0A)`, boxShadow: 'inset 0 0 36px rgba(0,0,0,0.6)' }}>
          {current ? (
            // Image ENTIÈRE centrée (jamais rognée, quel que soit le format) sur un fond flouté d'elle-même
            // qui remplit le cadre → pas de bande vide, sujet toujours au centre.
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img aria-hidden src={current} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', filter: 'blur(20px) saturate(1.25) brightness(0.5)', transform: 'scale(1.18)' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={current} src={current} alt={name} className="ak-art-img ak-era-img" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} />
            </>
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 70, opacity: 0.5 }} aria-hidden>{fallbackIcon}</div>
          )}
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(130% 80% at 50% 0%, transparent 50%, rgba(5,12,23,0.6) 100%)' }} />
          {Emblems}
          {natures.length > 0 && (
            <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {natures.map((n, i) => <ChakraNatureIcon key={i} nature={n} size={24} />)}
            </div>
          )}
        </div>
      )}

      {/* natures (databook) — petite rangée sous la zone */}
      {databook && natures.length > 0 && (
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
          {natures.map((n, i) => <ChakraNatureIcon key={i} nature={n} size={22} withLabel />)}
        </div>
      )}

      {/* sélecteur de formes déplacé HORS de la carte → onglets au-dessus (voir CharacterView / FormTabs) */}
      {forms[sel]?.caption && (
        <div style={{ textAlign: 'center', marginTop: 8, fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', fontStyle: 'italic' }}>{forms[sel].caption}</div>
      )}
    </div>
  );
}
