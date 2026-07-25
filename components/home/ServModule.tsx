'use client';
// components/home/ServModule.tsx — Module SERV (in-hero) : services à domicile / pros locaux. Accent #0EA878.
// 2 catégories : Réserver (parcourir par métier + urgence + filtres) · Proposer (devenir prestataire).
// Calqué sur Auto/Stay/Azur/Rent : prix Bebas, entrée échelonnée, press/focus (CSS .serv-mod), repli dégradé+emoji.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { SERV_CATS, servCatMeta, SERV_ZONES, PROS, PRO_PRICE_MIN, PRO_PRICE_MAX, type ServCat } from '@/lib/servData';

const SV = '#0EA878';   // accent SERV (émeraude)
const SV2 = '#22D89A';  // bord lumineux du CTA
const OK = '#22DD88';   // vert sélection
const UR = '#E0703A';   // accent urgence (terracotta chaud)

type Tab = 'reserver' | 'proposer';
const card: React.CSSProperties = {
  position: 'relative', maxWidth: 392, margin: '0 auto', background: 'rgba(5,12,23,0.78)', border: `1px solid ${SV}66`,
  borderRadius: 18, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: 12,
  textAlign: 'left', boxShadow: '0 14px 42px rgba(0,0,0,0.45)', maxHeight: '64vh', overflowY: 'auto',
};
const inp: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--bd2)', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td)', outline: 'none', width: '100%' };
const sectionLbl: React.CSSProperties = { fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td2)' };
const gridV = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const itemV = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };
const GRAD: Record<string, string> = {
  plomberie: 'linear-gradient(135deg,rgba(0,148,212,.30),rgba(14,168,120,.16))',
  electricite: 'linear-gradient(135deg,rgba(224,160,23,.30),rgba(14,168,120,.16))',
  menage: 'linear-gradient(135deg,rgba(14,168,120,.30),rgba(0,148,212,.14))',
  jardinage: 'linear-gradient(135deg,rgba(14,168,120,.34),rgba(90,136,176,.14))',
  demenagement: 'linear-gradient(135deg,rgba(90,136,176,.30),rgba(224,112,56,.16))',
  informatique: 'linear-gradient(135deg,rgba(123,92,240,.28),rgba(14,168,120,.16))',
  serrurerie: 'linear-gradient(135deg,rgba(224,112,56,.28),rgba(14,168,120,.16))',
  peinture: 'linear-gradient(135deg,rgba(224,112,56,.28),rgba(123,92,240,.16))',
};

export default function ServModule() {
  const [tab, setTab] = useState<Tab>('reserver');
  return (
    <div data-liquid-glass="panel" suppressHydrationWarning className="hero-domabar serv-mod" style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: SV, boxShadow: `0 0 8px ${SV}` }} />
        <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--td)' }}>Serv</span>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)' }}>· Un pro chez vous</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {([['reserver', 'Réserver', '🛠️'], ['proposer', 'Proposer', '＋']] as const).map(([k, l, ic]) => {
          const a = tab === k;
          return (
            <button key={k} onClick={() => setTab(k)} aria-pressed={a}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 4px', borderRadius: 11, cursor: 'pointer', border: `1px solid ${a ? SV : 'var(--bd2)'}`, background: a ? `${SV}22` : 'transparent', boxShadow: a ? `0 0 14px ${SV}55` : 'none', transition: 'all .2s' }}>
              <span style={{ fontSize: 14 }} aria-hidden>{ic}</span>
              <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 11.5, letterSpacing: '0.02em', textTransform: 'uppercase', color: a ? SV2 : 'var(--td2)' }}>{l}</span>
            </button>
          );
        })}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
          {tab === 'reserver' ? <ReserverTab /> : <ProposerTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─────────── RÉSERVER ─────────── */
function ReserverTab() {
  const [cats, setCats] = useState<string[]>([]);
  const [urgent, setUrgent] = useState(false);
  const [priceMax, setPriceMax] = useState(PRO_PRICE_MAX);
  const [sortBy, setSortBy] = useState<'price' | 'dist' | 'rating'>('rating');
  const [sel, setSel] = useState<string | null>(null);
  const [hours, setHours] = useState(2);
  const toggle = (k: string) => setCats(a => a.includes(k) ? a.filter(x => x !== k) : [...a, k]);

  const results = useMemo(() => {
    const r = PROS.filter(p => (cats.length === 0 || cats.includes(p.cat)) && p.price <= priceMax && (!urgent || p.urgent));
    r.sort((a, b) => sortBy === 'price' ? a.price - b.price : sortBy === 'dist' ? a.dist - b.dist : b.rating - a.rating);
    return r;
  }, [cats, urgent, priceMax, sortBy]);
  const selP = results.find(p => p.id === sel) ?? results[0] ?? null;
  const total = selP ? selP.price * hours : 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15, color: 'var(--td)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Réservez un pro</span>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 800, color: results.length ? OK : '#D44B24' }}>{results.length}</span>
      </div>
      <div className="hero-domabar" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        <Chip active={cats.length === 0} onClick={() => setCats([])} label="Tout" />
        {SERV_CATS.map(c => <Chip key={c.key} active={cats.includes(c.key)} onClick={() => toggle(c.key)} label={c.label} emoji={c.emoji} />)}
      </div>

      {/* Urgence + tri */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <button onClick={() => setUrgent(u => !u)} aria-pressed={urgent}
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${urgent ? UR : 'var(--bd2)'}`, background: urgent ? `${UR}22` : 'rgba(255,255,255,0.04)', color: urgent ? UR : 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700 }}>
          <span aria-hidden>⚡</span> Urgence
        </button>
        <div className="hero-domabar" style={{ display: 'flex', gap: 5, overflowX: 'auto', flex: 1, justifyContent: 'flex-end' }}>
          {([['rating', 'Top notés'], ['dist', 'Au plus près'], ['price', 'Prix ↑']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setSortBy(k)} aria-pressed={sortBy === k}
              style={{ flexShrink: 0, padding: '7px 10px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${sortBy === k ? SV : 'var(--bd2)'}`, background: sortBy === k ? `${SV}22` : 'transparent', color: sortBy === k ? SV2 : 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 600 }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Budget / h */}
      <div style={{ marginTop: 9 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <span style={sectionLbl}>Budget / h</span>
          <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: priceMax < PRO_PRICE_MAX ? SV2 : 'var(--td)' }}>{priceMax < PRO_PRICE_MAX ? `≤ ${priceMax} €` : 'illimité'}</span>
        </div>
        <input type="range" min={PRO_PRICE_MIN} max={PRO_PRICE_MAX} step={1} value={priceMax} onChange={e => setPriceMax(Number(e.target.value))} aria-label="Budget maximum par heure" className="serv-budget" style={{ width: '100%' }} />
      </div>

      <motion.div key={results.map(p => p.id).join() + sortBy + urgent} variants={gridV} initial="hidden" animate="show" className="hero-domabar" style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 280, overflowY: 'auto', padding: '10px 2px 4px' }}>
        {results.length === 0 && <div style={{ textAlign: 'center', padding: '18px 0', fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)' }}>Aucun pro ne correspond.<br /><button onClick={() => { setUrgent(false); setPriceMax(PRO_PRICE_MAX); setCats([]); }} style={{ marginTop: 8, background: 'none', border: 'none', color: SV2, cursor: 'pointer', fontFamily: 'var(--fo)', fontSize: 11, textDecoration: 'underline' }}>Réinitialiser</button></div>}
        {results.map(p => {
          const a = selP?.id === p.id;
          const cm = servCatMeta(p.cat);
          return (
            <motion.button variants={itemV} key={p.id} onClick={() => setSel(p.id)} aria-pressed={a}
              style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: 6, borderRadius: 12, cursor: 'pointer', border: `2px solid ${a ? OK : 'var(--bd2)'}`, boxShadow: a ? `0 0 16px ${OK}44` : 'none', background: a ? `${OK}14` : 'rgba(255,255,255,0.04)', textAlign: 'left', transition: 'all .18s' }}>
              <span style={{ position: 'relative', flexShrink: 0, width: 64, height: 64, borderRadius: 10, overflow: 'hidden' }}>
                <Thumb grad={GRAD[p.cat] || GRAD.menage} emoji={cm.emoji} h={64} />
                <span style={{ position: 'absolute', top: 4, right: 4 }}><CheckMark on={a} size={16} /></span>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: a ? OK : 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                  {p.verified && <span aria-label="Vérifié" title="Vérifié" style={{ flexShrink: 0, color: SV2, fontSize: 11 }}>✔︎</span>}
                </span>
                <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td2)', marginTop: 2 }}>{cm.label} · ⭐ {p.rating.toFixed(1)} ({p.reviews}) · {p.dist.toFixed(1)} km</span>
                <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, color: p.urgent ? UR : 'var(--td3)', marginTop: 1 }}>{p.urgent ? '⚡ Dispo aujourd’hui' : 'Sous 48 h'}</span>
              </span>
              <span style={{ flexShrink: 0, textAlign: 'right' }}><Price value={p.price} suffix="/h" size={17} /></span>
            </motion.button>
          );
        })}
      </motion.div>

      {selP ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '8px 2px 0', padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--bd2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={sectionLbl}>Durée est.</span>
              <button onClick={() => setHours(h => Math.max(1, h - 1))} aria-label="Moins une heure" style={miniStep}>−</button>
              <span style={{ fontFamily: 'var(--fn)', fontSize: 19, color: 'var(--td)', minWidth: 34, textAlign: 'center' }}>{hours} h</span>
              <button onClick={() => setHours(h => Math.min(12, h + 1))} aria-label="Plus une heure" style={miniStep}>+</button>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 8.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td2)' }}>Estimation</div>
              <Price value={total} suffix="€" size={22} />
            </div>
          </div>
          <Cta href={`/serv?pro=${selP.id}&hours=${hours}${urgent ? '&urgent=1' : ''}`} label={`Réserver · ${selP.name}`} />
        </>
      ) : <Cta href="/serv" label="Choisis un service" mt={10} disabled />}
      <Trust text="Pros vérifiés & assurés · devis avant intervention · paiement à la fin" />
    </div>
  );
}

/* ─────────── PROPOSER ─────────── */
function ProposerTab() {
  const [cat, setCat] = useState<ServCat | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [price, setPrice] = useState(40);
  const [sent, setSent] = useState(false);
  const ready = !!cat && !!zone;
  if (sent) return (
    <div style={{ textAlign: 'center', padding: '22px 10px' }}>
      <div style={{ fontSize: 30 }}>🛠️</div>
      <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 16, color: 'var(--td)', marginTop: 6 }}>Profil envoyé</div>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', marginTop: 4 }}>NIKA vérifie ton profil sous 48 h, puis tu reçois tes premières demandes près de chez toi.</div>
      <button onClick={() => { setSent(false); setCat(null); setZone(null); }} style={{ marginTop: 12, background: 'none', border: 'none', color: SV2, cursor: 'pointer', fontFamily: 'var(--fo)', fontSize: 11, textDecoration: 'underline' }}>Modifier</button>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '9px 11px', borderRadius: 12, border: `1px solid ${SV}44`, background: `${SV}14` }}>
        <span style={{ fontSize: 17 }}>📈</span>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 10.8, color: 'var(--td2)', lineHeight: 1.45 }}><strong style={{ color: 'var(--td)' }}>Développe ton activité.</strong> Reçois des demandes qualifiées près de chez toi, sans frais d’inscription — NIKA gère le paiement et les avis.</div>
      </div>
      <div>
        <div style={sectionLbl}>Ton métier</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {SERV_CATS.map(c => <Chip key={c.key} small active={cat === c.key} onClick={() => setCat(cat === c.key ? null : c.key)} label={c.label} emoji={c.emoji} />)}
        </div>
      </div>
      <div>
        <div style={sectionLbl}>Zone d’intervention</div>
        <div className="hero-domabar" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 6, paddingBottom: 2 }}>
          {SERV_ZONES.map(z => <Chip key={z} small active={zone === z} onClick={() => setZone(zone === z ? null : z)} label={z} />)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={sectionLbl}>Tarif / h</span>
        <button onClick={() => setPrice(p => Math.max(10, p - 5))} aria-label="Moins cher" style={miniStep}>−</button>
        <span style={{ fontFamily: 'var(--fn)', fontSize: 19, color: 'var(--td)', minWidth: 50, textAlign: 'center' }}>{price} €</span>
        <button onClick={() => setPrice(p => Math.min(150, p + 5))} aria-label="Plus cher" style={miniStep}>+</button>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', marginLeft: 'auto' }}>commission 0 € le 1ᵉʳ mois</span>
      </div>
      <Cta href="#" onClick={() => ready && setSent(true)} label={ready ? 'Proposer mes services' : 'Métier + zone'} disabled={!ready} mt={2} />
      <Trust text="Inscription gratuite · vérification sous 48 h · tu fixes tes tarifs" />
    </div>
  );
}

/* ─────────── Sous-composants ─────────── */
const miniStep: React.CSSProperties = { width: 28, height: 28, borderRadius: 8, border: `1px solid ${SV}88`, background: `${SV}24`, color: SV2, fontSize: 16, cursor: 'pointer', lineHeight: 1 };
function Thumb({ grad, emoji, h }: { grad: string; emoji: string; h: number }) {
  return <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: h * 0.42, background: grad }}><span aria-hidden>{emoji}</span></span>;
}
function CheckMark({ on, size = 20 }: { on: boolean; size?: number }) {
  if (on) return (
    <motion.svg initial={{ scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={OK} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 1px 2.5px rgba(0,0,0,0.9))' }}><path d="M20 6 9 17l-5-5" /></motion.svg>
  );
  const r = Math.round(size * 0.72);
  return <span aria-hidden style={{ display: 'block', width: r, height: r, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.55)', background: 'rgba(5,12,23,0.35)', boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }} />;
}
function Price({ value, suffix, color = SV2, size = 30 }: { value: string | number; suffix?: string; color?: string; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2 }}>
      <span style={{ fontFamily: 'var(--fn)', fontSize: size, lineHeight: 1, letterSpacing: '0.01em', color }}>{value}</span>
      {suffix && <span style={{ fontFamily: 'var(--fo)', fontSize: Math.round(size * 0.34), fontWeight: 700, color: 'var(--td2)' }}>{suffix}</span>}
    </span>
  );
}
function Chip({ active, onClick, label, emoji, small }: { active: boolean; onClick: () => void; label: string; emoji?: string; small?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: small ? '5px 10px' : '6px 11px', borderRadius: 20, cursor: 'pointer', border: `1px solid ${active ? OK : 'var(--bd2)'}`, background: active ? `${OK}1c` : 'rgba(255,255,255,0.04)', color: active ? OK : 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 11, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap', transition: 'all .15s' }}>
      {active ? <span aria-hidden>✓</span> : emoji ? <span aria-hidden style={{ fontSize: 12 }}>{emoji}</span> : null}{label}
    </button>
  );
}
function Cta({ href, label, mt = 10, disabled = false, onClick }: { href: string; label: string; mt?: number; disabled?: boolean; onClick?: () => void }) {
  const s: React.CSSProperties = {
    marginTop: mt, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', borderRadius: 12,
    background: disabled ? 'rgba(255,255,255,0.08)' : `linear-gradient(180deg, ${SV2}, ${SV})`, color: disabled ? 'var(--td2)' : '#04130D',
    fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12.5, letterSpacing: '0.04em', textTransform: 'uppercase',
    boxShadow: disabled ? 'none' : `0 6px 22px ${SV}66`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  };
  const inner = <><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>{!disabled && <span aria-hidden style={{ fontSize: 14 }}>→</span>}</>;
  if (disabled) return <span aria-disabled="true" style={{ ...s, cursor: 'not-allowed' }}>{inner}</span>;
  if (onClick) return <button onClick={onClick} style={{ ...s, width: '100%', border: 'none', cursor: 'pointer' }}>{inner}</button>;
  return <Link href={href} style={s}>{inner}</Link>;
}
function Trust({ text }: { text: string }) {
  return <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, color: 'var(--td2)', textAlign: 'center', margin: '9px 2px 1px', letterSpacing: '0.02em' }}>{text}</div>;
}
