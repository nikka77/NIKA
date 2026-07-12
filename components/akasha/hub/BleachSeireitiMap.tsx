'use client';
// components/akasha/hub/BleachSeireitiMap.tsx — carte du Seireitei : les 13 portes/divisions du
// Gotei 13 disposées en cercle autour de la Chambre des 46 (comme dans le canon : le mur du
// Seireitei compte exactement 13 portes, une par division). Bleach n'a pas de carte-source
// pixel-exacte (contrairement à One Piece/Naruto) → diagramme circulaire plutôt que fond tracé.
// Sous la carte : passerelle vers Hueco Mundo (fiches déjà enrichies, pas de données spatiales).
import { useState } from 'react';
import Link from 'next/link';
import type { AxisView } from '@/components/akasha/hub/HubSignature';

const CAPTAINS: Record<string, string> = {
  '1ʳᵉ division': 'Genryūsai Yamamoto',
  '2ᵉ division': 'Soi Fon',
  '3ᵉ division': 'Gin Ichimaru',
  '4ᵉ division': 'Retsu Unohana',
  '5ᵉ division': 'Sōsuke Aizen',
  '6ᵉ division': 'Byakuya Kuchiki',
  '7ᵉ division': 'Sajin Komamura',
  '8ᵉ division': 'Shunsui Kyōraku',
  '9ᵉ division': 'Kaname Tōsen',
  '10ᵉ division': 'Tōshirō Hitsugaya',
  '11ᵉ division': 'Kenpachi Zaraki',
  '12ᵉ division': 'Mayuri Kurotsuchi',
  '13ᵉ division': 'Jūshirō Ukitake',
};
const KANJI: Record<string, string> = {
  '1ʳᵉ division': '一', '2ᵉ division': '二', '3ᵉ division': '三', '4ᵉ division': '四',
  '5ᵉ division': '五', '6ᵉ division': '六', '7ᵉ division': '七', '8ᵉ division': '八',
  '9ᵉ division': '九', '10ᵉ division': '十', '11ᵉ division': '十一', '12ᵉ division': '十二', '13ᵉ division': '十三',
};
// Ordre canon d'affichage (1 → 13), indépendant de l'ordre renvoyé par la base.
const ORDER = Array.from({ length: 13 }, (_, i) => `${i + 1}${i === 0 ? 'ʳᵉ' : 'ᵉ'} division`);

function href(universe: string, attr: string, val: string) {
  return `/learn/akasha/u/bleach/${attr}/${encodeURIComponent(val)}`;
}

export default function BleachSeireitiMap({ axis, universe, color }: { axis: AxisView; universe: string; color: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const bySlug = new Map(axis.chips.map((c) => [c.v, c]));
  const divisions = ORDER.map((v) => bySlug.get(v)).filter((c): c is NonNullable<typeof c> => !!c);
  if (divisions.length < 6) return null;

  const cx = 50, cy = 50, R = 39;
  const active = hover ? bySlug.get(hover) : null;

  return (
    <section>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>⚔️ Le Seireitei</span><span style={{ color: 'var(--td3)' }}>13 portes, 13 divisions</span>
      </div>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td3)', margin: '0 0 10px' }}>
        Chaque porte du mur du Seireitei est gardée par une division du Gotei 13. Clique une porte pour découvrir ses shinigami.
      </p>

      <div style={{ position: 'relative', width: '100%', maxWidth: 420, margin: '0 auto', aspectRatio: '1 / 1' }}>
        <div style={{ position: 'absolute', inset: '6%', borderRadius: '50%', border: `1px solid ${color}55`, background: `radial-gradient(circle, ${color}14, var(--bg2) 72%)` }} />
        <div style={{ position: 'absolute', inset: '30%', borderRadius: '50%', border: `1px dashed ${color}44` }} />

        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', width: '34%' }}>
          <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(11px, 3vw, 14px)', color: 'var(--td)', lineHeight: 1.1 }}>Chambre<br />des 46</div>
        </div>

        {divisions.map((c) => {
          const i = ORDER.indexOf(c.v);
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 13;
          const x = cx + Math.cos(angle) * R;
          const y = cy + Math.sin(angle) * R;
          const on = hover === c.v;
          return (
            <Link
              key={c.v}
              href={href(universe, axis.attr, c.v)}
              className="ak-svg-focusable"
              onPointerEnter={() => setHover(c.v)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(c.v)}
              onBlur={() => setHover(null)}
              aria-label={`${c.label} — capitaine ${CAPTAINS[c.v] ?? '?'} — ${c.count} shinigami`}
              style={{
                position: 'absolute', left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) scale(${on ? 1.18 : 1})`,
                width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: on ? color : 'var(--bg3)', border: `2px solid ${color}`, textDecoration: 'none',
                fontFamily: 'var(--fe)', fontWeight: 800, fontSize: 15, color: on ? 'var(--bg)' : color,
                transition: 'transform 0.15s ease, background 0.15s ease', outline: 'none', zIndex: on ? 3 : 1,
              }}
            >
              {KANJI[c.v] ?? i + 1}
            </Link>
          );
        })}

        {active && (
          <div style={{
            position: 'absolute', left: '50%', bottom: -8, transform: 'translate(-50%, 100%)', width: 'max-content', maxWidth: '92%',
            background: 'var(--bg3)', border: `1px solid ${color}66`, borderRadius: 10, padding: '7px 12px', textAlign: 'center', pointerEvents: 'none', zIndex: 4,
          }}>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: 'var(--td)' }}>{active.label}</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>Capitaine {CAPTAINS[active.v] ?? '—'} · {active.count} shinigami</div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: active ? 34 : 14 }}>
        <Link href="/learn/akasha/hueco-mundo" className="dom-card" style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 11, padding: '9px 12px', ['--dc' as string]: color }}>
          <span aria-hidden>🌙</span>
          <span style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: 'var(--td2)' }}>Hueco Mundo</span>
        </Link>
        <Link href="/learn/akasha/las-noches" className="dom-card" style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 11, padding: '9px 12px', ['--dc' as string]: color }}>
          <span aria-hidden>🏰</span>
          <span style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: 'var(--td2)' }}>Las Noches</span>
        </Link>
      </div>
    </section>
  );
}
