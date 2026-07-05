// components/akasha/CardBack.tsx — DOS DE CARTE officiel AKASHA, teinté par univers (CSS pur, zéro asset).
// Utilisé comme face cachée du booster, slots « ??? » de l'album (L5), verso de partage.
// RSC-safe (aucun état) — l'identité vient de universeMeta (couleur + emoji).
import { universeMeta } from '@/lib/akasha/types';

export default function CardBack({ universe, height = 130 }: { universe?: string | null; height?: number | string }) {
  const um = universe ? universeMeta(universe) : null;
  const c = um?.color ?? '#7B5CF0';
  return (
    <div
      aria-hidden
      style={{
        position: 'relative', width: '100%', height, borderRadius: 12, overflow: 'hidden',
        border: `1px solid ${c}55`,
        background: `radial-gradient(120% 100% at 50% 0%, ${c}30 0%, #0B0F1E 55%, #070A14 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* motif géométrique (losanges) — signature du dos, teintée univers */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.14, background: `repeating-linear-gradient(45deg, ${c} 0 1px, transparent 1px 14px), repeating-linear-gradient(-45deg, ${c} 0 1px, transparent 1px 14px)` }} />
      {/* médaillon central */}
      <div style={{ position: 'relative', width: 54, height: 54, borderRadius: '50%', border: `2px solid ${c}88`, background: `radial-gradient(circle, ${c}2E 0%, transparent 70%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 22px ${c}44` }}>
        <span style={{ fontSize: 26, filter: `drop-shadow(0 2px 8px ${c})` }}>{um?.emoji ?? '✦'}</span>
      </div>
      <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 11, letterSpacing: '0.34em', textTransform: 'uppercase', color: `${c}AA` }}>
        AKASHA
      </div>
    </div>
  );
}
