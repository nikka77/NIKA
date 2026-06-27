// components/home/moduleKit.tsx — petits composants partagés des modules hero (Learn/Sec/News/Tools).
// Paramétrés par couleur d'accent du domaine. Pas d'état → utilisables dans les modules client.
import Link from 'next/link';

export const gridV = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
export const itemV = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

export function card(accent: string): React.CSSProperties {
  return { position: 'relative', maxWidth: 392, margin: '0 auto', background: 'rgba(5,12,23,0.78)', border: `1px solid ${accent}66`, borderRadius: 18, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: 12, textAlign: 'left', boxShadow: '0 14px 42px rgba(0,0,0,0.45)', maxHeight: '64vh', overflowY: 'auto' };
}

export function Head({ accent, label, sub }: { accent: string; label: string; sub: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}` }} />
      <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--td)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)' }}>{sub}</span>
    </div>
  );
}

export function Chip({ accent, active, onClick, label, emoji }: { accent: string; active: boolean; onClick: () => void; label: string; emoji?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 20, cursor: 'pointer', border: `1px solid ${active ? accent : 'var(--bd2)'}`, background: active ? `${accent}22` : 'rgba(255,255,255,0.04)', color: active ? accent : 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 11, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap', transition: 'all .15s' }}>
      {active ? '✓ ' : emoji ? <span aria-hidden style={{ fontSize: 12 }}>{emoji}</span> : null}{label}
    </button>
  );
}

export function Price({ accent, value, suffix }: { accent: string; value: number | string; suffix?: string }) {
  return <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'baseline', gap: 2 }}><span style={{ fontFamily: 'var(--fn)', fontSize: 16, color: accent, lineHeight: 1 }}>{value}</span>{suffix && <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, color: 'var(--td2)' }}>{suffix}</span>}</span>;
}

export function Cta({ accent, accent2, href, label, mt = 10, fg = '#fff' }: { accent: string; accent2: string; href: string; label: string; mt?: number; fg?: string }) {
  return (
    <Link href={href} style={{ marginTop: mt, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', borderRadius: 12, background: `linear-gradient(180deg, ${accent2}, ${accent})`, color: fg, fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12.5, letterSpacing: '0.04em', textTransform: 'uppercase', boxShadow: `0 6px 22px ${accent}55`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: 'none' }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span><span aria-hidden style={{ fontSize: 14 }}>→</span>
    </Link>
  );
}

export function Trust({ text }: { text: string }) {
  return <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, color: 'var(--td2)', textAlign: 'center', margin: '9px 2px 1px', letterSpacing: '0.02em' }}>{text}</div>;
}
