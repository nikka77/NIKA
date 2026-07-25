'use client';
// components/home/FoodModule.tsx — Module FOOD.
// Variante /food (`pros`) : molette mode + logos + aperçu pro à gauche (jeu démo/réel).
// Variante home (`nightPros`) : molette + logos des enseignes perso (Rakomoria, Afroweek…),
//   et au clic la CARTE perso (NightProviderCard) défile EN DESSOUS du module.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue, useTransform, animate, type MotionValue } from 'framer-motion';
import NightProviderCard, { type NightProvider } from '@/components/food/NightProviderCard';
import { NIGHT_THEMES } from '@/lib/night-themes';

const GOLD = '#D4A017';

export type Mode = 'livraison' | 'surplace' | 'emporter';
const MODES: { key: Mode; label: string; icon: string }[] = [
  { key: 'livraison', label: 'Livraison', icon: '🛵' },
  { key: 'surplace', label: 'Sur place', icon: '🍽️' },
  { key: 'emporter', label: 'À emporter', icon: '🥡' },
];

export type Dish = { name: string; price: string; emoji: string };
export type Pro = {
  id: string; name: string; emoji: string; cuisine: string; rating: number; area: string;
  color: string; modes: Mode[]; dishes: Dish[];
};
type Featured = 'sponsored' | 'popular' | 'favorite';
type NightEntry = { provider: NightProvider; status: 'open' | 'closed' | 'sold_out'; modes: Mode[]; category?: string; featured?: Featured; rank?: number };
// Badge de mise en avant (widget « accès rapide »).
const FEATURED_BADGE: Record<Featured, { label: string; icon: string; color: string }> = {
  sponsored: { label: 'Sponsorisé', icon: '★', color: '#F2B705' },
  popular: { label: 'Populaire', icon: '🔥', color: '#E2571E' },
  favorite: { label: 'Favori', icon: '♥', color: '#E0467C' },
};

const DEMO_PROS: Pro[] = [
  { id: 'pipo', name: 'Chez Pipo', emoji: '🫓', cuisine: 'Socca & cuisine niçoise', rating: 4.7, area: 'Le Port', color: '#D4A017', modes: ['surplace', 'emporter'],
    dishes: [{ name: 'Socca', price: '3,50 €', emoji: '🫓' }, { name: 'Pissaladière', price: '4,00 €', emoji: '🧅' }, { name: 'Tourte de blettes', price: '4,50 €', emoji: '🥬' }] },
  { id: 'merenda', name: 'La Merenda', emoji: '🍲', cuisine: 'Cuisine niçoise', rating: 4.8, area: 'Vieux-Nice', color: '#E07038', modes: ['surplace'],
    dishes: [{ name: 'Daube niçoise', price: '19 €', emoji: '🍲' }, { name: 'Beignets de courgettes', price: '9 €', emoji: '🥒' }, { name: 'Pâtes au pistou', price: '15 €', emoji: '🌿' }] },
  { id: 'acchiardo', name: 'Acchiardo', emoji: '🥟', cuisine: 'Trattoria niçoise', rating: 4.6, area: 'Vieux-Nice', color: '#0EA878', modes: ['surplace', 'emporter'],
    dishes: [{ name: 'Gnocchis maison', price: '14 €', emoji: '🥟' }, { name: 'Farcis niçois', price: '13 €', emoji: '🫑' }, { name: 'Tiramisu', price: '7 €', emoji: '🍮' }] },
  { id: 'cresci', name: 'Pizza Cresci', emoji: '🍕', cuisine: 'Pizzeria feu de bois', rating: 4.5, area: 'Centre', color: '#D44B24', modes: ['livraison', 'emporter'],
    dishes: [{ name: 'Pizza Reine', price: '12 €', emoji: '🍕' }, { name: 'Calzone', price: '13 €', emoji: '🥟' }, { name: 'Focaccia', price: '6 €', emoji: '🫓' }] },
  { id: 'fenocchio', name: 'Fenocchio', emoji: '🍦', cuisine: 'Glacier artisanal', rating: 4.7, area: 'Vieux-Nice', color: '#7B5CF0', modes: ['emporter', 'surplace'],
    dishes: [{ name: '2 boules', price: '5 €', emoji: '🍦' }, { name: 'Sorbet figue', price: '5 €', emoji: '🍧' }, { name: 'Granité citron', price: '4 €', emoji: '🧊' }] },
  { id: 'sushi', name: 'Sushi Gourmet', emoji: '🍣', cuisine: 'Sushi & poké', rating: 4.4, area: 'Libération', color: '#0094D4', modes: ['livraison', 'emporter'],
    dishes: [{ name: 'Plateau 24 pièces', price: '22 €', emoji: '🍣' }, { name: 'Poké saumon', price: '14 €', emoji: '🥗' }, { name: 'California', price: '9 €', emoji: '🍱' }] },
  { id: 'pilha', name: 'Lou Pilha Leva', emoji: '🥖', cuisine: 'Street food niçois', rating: 4.5, area: 'Vieux-Nice', color: '#D4A017', modes: ['surplace', 'emporter'],
    dishes: [{ name: 'Pan bagnat', price: '7 €', emoji: '🥖' }, { name: 'Socca', price: '3,50 €', emoji: '🫓' }, { name: 'Beignets', price: '8 €', emoji: '🍤' }] },
  { id: 'antoine', name: "Bistrot d'Antoine", emoji: '🥩', cuisine: 'Bistrot français', rating: 4.8, area: 'Vieux-Nice', color: '#E07038', modes: ['surplace'],
    dishes: [{ name: 'Entrecôte', price: '26 €', emoji: '🥩' }, { name: 'Œuf cocotte', price: '11 €', emoji: '🍳' }, { name: 'Tarte du jour', price: '8 €', emoji: '🥧' }] },
];

const ITEM_H = 38;
const WHEEL_OFFS = [-3, -2, -1, 0, 1, 2, 3];
const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 };

// Un cran de la molette : position/inclinaison/opacité dérivées en continu du drag.
function WheelItem({ dragY, off, m, onPick, accent }: { dragY: MotionValue<number>; off: number; m: typeof MODES[number]; onPick: () => void; accent: string }) {
  const center = useTransform(dragY, v => off * ITEM_H + v);
  const rotateX = useTransform(center, v => Math.max(-88, Math.min(88, -(v / ITEM_H) * 50)));
  const opacity = useTransform(center, v => Math.max(0.1, 1 - Math.abs(v) / ITEM_H * 0.5));
  const scale = useTransform(center, v => Math.max(0.7, 1 - Math.abs(v) / ITEM_H * 0.15));
  const color = useTransform(center, v => (Math.abs(v) < ITEM_H * 0.5 ? accent : 'var(--td2)'));
  return (
    <motion.button type="button" onClick={onPick} aria-label={m.label}
      style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: ITEM_H, marginTop: -ITEM_H / 2, y: off * ITEM_H, rotateX, scale, opacity, transformOrigin: 'center center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, border: 'none', background: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
      <span style={{ fontSize: 16, lineHeight: 1 }}>{m.icon}</span>
      <motion.span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12, letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap', color }}>{m.label}</motion.span>
    </motion.button>
  );
}

// Libellé « Je veux » réutilisé par la molette et le mode statique.
function WantLabel() {
  return <div style={{ fontFamily: 'var(--fo)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 2 }}>Je veux</div>;
}

// Mode unique : pas de molette (un seul mode servi → on évite un cran « mort »).
function StaticMode({ m, accent }: { m: typeof MODES[number]; accent: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <WantLabel />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10, border: `1px solid ${accent}66`, background: `${accent}14`, boxShadow: `0 0 12px ${accent}22` }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>{m.icon}</span>
          <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12, letterSpacing: '0.03em', textTransform: 'uppercase', color: accent }}>{m.label}</span>
        </div>
      </div>
    </div>
  );
}

// Molette 3D réutilisable (continue au drag, snap au relâcher).
// `modes` : sous-ensemble réellement servi (par défaut les 3) → pas de cran mort.
function ModeWheel({ value, onChange, accent = GOLD, modes = MODES }: { value: Mode; onChange: (m: Mode) => void; accent?: string; modes?: typeof MODES }) {
  const dragY = useMotionValue(0);
  const wrap = (i: number) => ((i % modes.length) + modes.length) % modes.length;
  const modeIndex = Math.max(0, modes.findIndex(m => m.key === value));
  const cycle = (dir: number) => onChange(modes[wrap(modeIndex + dir)].key);
  const step = (s: number) => { cycle(s); dragY.set(s * ITEM_H); animate(dragY, 0, SPRING); };
  const onWheelEnd = () => { const o = dragY.get(); const steps = Math.round(-o / ITEM_H); if (steps) cycle(steps); dragY.set(o + steps * ITEM_H); animate(dragY, 0, SPRING); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <WantLabel />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center' }}>
        <button onClick={() => step(-1)} aria-label="Mode précédent" style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, fontSize: 11, lineHeight: 1, padding: '1px 0', opacity: 0.85 }}>▲</button>
        <div style={{ position: 'relative', height: ITEM_H * 3, overflow: 'hidden' }}>
          <div aria-hidden style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: ITEM_H, transform: 'translateY(-50%)', borderRadius: 9, border: `1px solid ${accent}66`, background: `${accent}14`, boxShadow: `0 0 12px ${accent}22`, pointerEvents: 'none', zIndex: 2 }} />
          <motion.div drag="y" dragConstraints={{ top: -ITEM_H * 2, bottom: ITEM_H * 2 }} dragElastic={0.14} dragMomentum={false} onDragEnd={onWheelEnd}
            style={{ position: 'absolute', inset: 0, perspective: 600, y: dragY, cursor: 'grab', touchAction: 'none' }}>
            {WHEEL_OFFS.map(off => {
              const m = modes[wrap(modeIndex + off)];
              return <WheelItem key={off} dragY={dragY} off={off} m={m} accent={accent} onPick={() => onChange(m.key)} />;
            })}
          </motion.div>
        </div>
        <button onClick={() => step(1)} aria-label="Mode suivant" style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, fontSize: 11, lineHeight: 1, padding: '1px 0', opacity: 0.85 }}>▼</button>
      </div>
    </div>
  );
}

// ===== Variante /food : molette + logos + aperçu pro à gauche =====
function DemoFoodModule({ pros, place }: { pros?: Pro[]; place: string }) {
  const data = pros && pros.length ? pros : DEMO_PROS;
  const [mode, setMode] = useState<Mode>('surplace');
  const [selId, setSelId] = useState<string | null>(null);
  const filtered = useMemo(() => data.filter(p => p.modes.includes(mode)), [mode, data]);
  const selected = selId ? data.find(p => p.id === selId) ?? null : null;
  const pick = (m: Mode) => { setMode(m); if (selId) { const p = data.find(x => x.id === selId); if (!p || !p.modes.includes(m)) setSelId(null); } };

  return (
    <div data-liquid-glass="panel" suppressHydrationWarning style={{ maxWidth: 384, margin: '0 auto', background: 'rgba(5,12,23,0.7)', border: `1px solid ${GOLD}55`, borderRadius: 18, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: 10, display: 'flex', gap: 10, textAlign: 'left', height: 200, boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
      <div style={{ width: '46%', flexShrink: 0, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AnimatePresence mode="wait" initial={false}>
          {selected ? (
            <motion.div key="prev" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.28 }}
              style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
              <button onClick={() => setSelId(null)} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--fo)', fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 6 }}>← Modes</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: '50%', flexShrink: 0, fontSize: 18, background: `linear-gradient(135deg, ${selected.color}cc, ${selected.color}66)`, boxShadow: `0 0 10px ${selected.color}66` }}>{selected.emoji}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 13.5, lineHeight: 1.05, color: 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.name}</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, color: GOLD, marginTop: 1 }}>{selected.rating > 0 ? `★ ${selected.rating.toFixed(1)} · ` : ''}{selected.area}</div>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, color: 'var(--td3)', marginBottom: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.cuisine}</div>
              {selected.dishes.length > 0 ? (
                <div className="hero-domabar" style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', flex: 1 }}>
                  {selected.dishes.slice(0, 3).map(dd => (
                    <div key={dd.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 8, background: 'rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: 13 }}>{dd.emoji}</span>
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{dd.name}</span>
                      {dd.price && <span style={{ fontFamily: 'var(--fe)', fontWeight: 800, fontSize: 10, color: 'var(--td)' }}>{dd.price}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', fontStyle: 'italic' }}>Menu complet sur la fiche →</div>
              )}
              <Link href="/food" style={{ marginTop: 7, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 10px', borderRadius: 10, background: GOLD, color: '#1a1205', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Voir le menu →</Link>
            </motion.div>
          ) : (
            <motion.div key="wheel" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }} transition={{ duration: 0.28 }} style={{ height: '100%' }}>
              <ModeWheel value={mode} onChange={pick} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 6 }}>
          {filtered.length} {filtered.length > 1 ? 'adresses' : 'adresse'} · {place}
        </div>
        {filtered.length > 0 ? (
          <div className="hero-domabar" style={{ display: 'flex', flexWrap: 'wrap', gap: 7, overflowY: 'auto', alignContent: 'flex-start', flex: 1, paddingRight: 2 }}>
            <AnimatePresence initial={false}>
              {filtered.map((p, i) => {
                const a = p.id === selId;
                return (
                  <motion.button key={p.id} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2, delay: i * 0.03 }}
                    onClick={() => setSelId(a ? null : p.id)} aria-label={p.name}
                    style={{ width: 'calc(50% - 3.5px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '7px 4px 6px', borderRadius: 12, cursor: 'pointer', border: `1px solid ${a ? p.color : 'var(--bd)'}`, background: a ? `${p.color}22` : 'rgba(255,255,255,0.04)', boxShadow: a ? `0 0 12px ${p.color}55` : 'none', transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: '50%', flexShrink: 0, fontSize: 16, background: `linear-gradient(135deg, ${p.color}dd, ${p.color}77)`, boxShadow: `0 2px 6px ${p.color}55` }}>{p.emoji}</span>
                    <span style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, color: 'var(--td)', lineHeight: 1.12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</span>
                    {p.rating > 0 && <span style={{ fontFamily: 'var(--fo)', fontSize: 8.5, color: GOLD }}>★ {p.rating.toFixed(1)}</span>}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)', fontStyle: 'italic', padding: '0 6px' }}>
            Aucune adresse pour ce mode pour l&apos;instant.
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Variante home : molette + logos enseignes perso, aperçu (carte) qui défile dessous =====
function NightFoodModule({ entries, place, defaultOpen }: { entries: NightEntry[]; place: string; defaultOpen?: boolean }) {
  // Modes réellement servis par au moins une enseigne (pas de cran « mort » sur la molette).
  const availableModes = useMemo(() => MODES.filter(m => entries.some(e => e.modes.includes(m.key))), [entries]);
  const [mode, setMode] = useState<Mode>(availableModes[0]?.key ?? 'livraison');
  const [selId, setSelId] = useState<string | null>(defaultOpen ? entries[0]?.provider.id ?? null : null);
  const filtered = useMemo(() => entries.filter(e => e.modes.includes(mode)), [mode, entries]);
  const selected = selId ? filtered.find(e => e.provider.id === selId) ?? null : null;
  const moduleAccent = selected ? (NIGHT_THEMES[selected.provider.slug]?.accent || GOLD) : GOLD;

  return (
    <div style={{ maxWidth: 384, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Haut : molette (ou mode unique) + logos enseignes */}
      <div data-liquid-glass="panel" suppressHydrationWarning style={{ background: 'rgba(5,12,23,0.7)', border: `1px solid ${moduleAccent}55`, borderRadius: 18, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: 10, display: 'flex', gap: 10, textAlign: 'left', height: 168, boxShadow: '0 10px 30px rgba(0,0,0,0.35)', transition: 'border-color 0.3s' }}>
        <div style={{ width: '46%', flexShrink: 0 }}>
          {availableModes.length > 1
            ? <ModeWheel value={mode} onChange={setMode} accent={moduleAccent} modes={availableModes} />
            : <StaticMode m={availableModes[0] ?? MODES[0]} accent={moduleAccent} />}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 6 }}>
            {filtered.length} {filtered.length > 1 ? 'enseignes' : 'enseigne'} · {entries[0]?.provider.city || place}
          </div>
          {filtered.length > 0 ? (
            <div className="hero-domabar" style={{ display: 'flex', flexWrap: 'wrap', gap: 7, overflowY: 'auto', alignContent: 'flex-start', flex: 1, paddingRight: 2 }}>
              {filtered.map(e => {
                const th = NIGHT_THEMES[e.provider.slug];
                const accent = th?.accent || GOLD;
                const a = e.provider.id === selId;
                return (
                  <button key={e.provider.id} onClick={() => setSelId(e.provider.id)} aria-label={th?.name || e.provider.name}
                    style={{ position: 'relative', width: 'calc(50% - 3.5px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '7px 4px 6px', borderRadius: 12, cursor: 'pointer', border: `1px solid ${a ? accent : 'var(--bd)'}`, background: a ? `${accent}22` : 'rgba(255,255,255,0.04)', boxShadow: a ? `0 0 12px ${accent}55` : 'none', transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s' }}>
                    {e.featured && (
                      <span title={FEATURED_BADGE[e.featured].label} aria-label={FEATURED_BADGE[e.featured].label}
                        style={{ position: 'absolute', top: 3, right: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 15, height: 15, borderRadius: '50%', background: FEATURED_BADGE[e.featured].color, color: '#15110a', fontSize: 8.5, fontWeight: 800, lineHeight: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.45)', zIndex: 2 }}>
                        {FEATURED_BADGE[e.featured].icon}
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: 'rgba(0,0,0,0.3)', border: `1px solid ${accent}55` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {th?.logo ? <img src={th.logo} alt={th?.name || e.provider.name} width={28} height={28} style={{ width: 28, height: 28, objectFit: 'contain' }} /> : <span style={{ fontSize: 15 }}>{th?.flag || '🍽️'}</span>}
                    </span>
                    <span style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, color: 'var(--td)', lineHeight: 1.12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{th?.name || e.provider.name}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)', fontStyle: 'italic', padding: '0 6px' }}>
              Aucune enseigne en {MODES.find(m => m.key === mode)?.label.toLowerCase()} ce soir.
            </div>
          )}
        </div>
      </div>

      {/* Aperçu : la carte perso de l'enseigne sélectionnée défile en dessous */}
      <AnimatePresence mode="wait">
        {selected ? (
          <motion.div key={selected.provider.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.32 }}>
            <NightProviderCard provider={selected.provider} status={selected.status} compact />
          </motion.div>
        ) : (
          <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            style={{ textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 11, letterSpacing: '0.04em', color: 'var(--td3)', padding: '6px 0' }}>
            ↑ Choisis une enseigne pour voir son menu
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FoodModule({ pros, place = 'Nice', nightPros, defaultOpen }: { pros?: Pro[]; place?: string; nightPros?: NightEntry[]; defaultOpen?: boolean }) {
  if (nightPros && nightPros.length) return <NightFoodModule entries={nightPros} place={place} defaultOpen={defaultOpen} />;
  return <DemoFoodModule pros={pros} place={place} />;
}
