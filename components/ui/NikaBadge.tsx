// components/ui/NikaBadge.tsx — badge membre NIKA réutilisable.
// Charge le SVG généré (/api/badge/[number]). Tooltip au hover. Ratio ovale 1.2:1.
import type { BadgeTier, KycLevel } from '@/lib/types';

const SIZES = { sm: 32, md: 64, lg: 96, xl: 128 } as const;
const TIER_LABEL: Record<BadgeTier, string> = {
  founder: 'Fondateur',
  pioneer: 'Pionnier',
  initie: 'Initié',
  member: 'Membre',
};

interface NikaBadgeProps {
  number: number;
  tier: BadgeTier;
  kycLevel: KycLevel;
  size?: keyof typeof SIZES; // 32 / 64 / 96 / 128px
  isPro?: boolean;
  className?: string;
}

export default function NikaBadge({ number, tier, kycLevel, size = 'md', isPro, className }: NikaBadgeProps) {
  const w = SIZES[size];
  const h = Math.round(w / 1.2); // ovale 1.2:1
  const src = `/api/badge/${number}?tier=${tier}&kyc=${kycLevel}`;
  const title = `#${number} · ${TIER_LABEL[tier]} · KYC ${kycLevel}${isPro ? ' · Pro' : ''}`;
  const dot = Math.max(8, Math.round(w * 0.2));

  return (
    <span className={className} title={title} aria-label={title}
      style={{ display: 'inline-block', position: 'relative', lineHeight: 0, width: w, height: h }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={title}
        width={w}
        height={h}
        style={{
          width: w,
          height: h,
          display: 'block',
          filter: isPro
            ? 'drop-shadow(0 0 3px rgba(212,160,23,0.85)) drop-shadow(0 2px 5px rgba(0,0,0,0.35))'
            : 'drop-shadow(0 2px 5px rgba(0,0,0,0.35))',
        }}
      />
      {isPro && (
        <span aria-hidden
          style={{
            position: 'absolute', top: 0, right: 0, width: dot, height: dot, borderRadius: '50%',
            background: 'var(--gold)', border: '1.5px solid #0B0B0B', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
          }} />
      )}
    </span>
  );
}
