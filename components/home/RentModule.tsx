'use client';
// components/home/RentModule.tsx — Module RENT (in-hero) : location de matériel entre particuliers. Accent #5A88B0.
// 2 catégories : Louer (parcourir par catégorie + filtres) · Proposer (mettre son matériel en location).
// Calqué sur Auto/Stay/Azur : prix Bebas, entrée échelonnée, press/focus (CSS .rent-mod), repli dégradé+emoji.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { RENT_CATS, rentCatMeta, GEAR, GEAR_PRICE_MAX, type RentCat, type Gear } from '@/lib/rentData';

const RT = '#5A88B0';   // accent RENT (bleu ardoise)
const RT2 = '#7BA8CC';  // bord lumineux du CTA
const OK = '#22DD88';   // vert sélection

type Tab = 'louer' | 'proposer';
const card: React.CSSProperties = {
  position: 'relative', maxWidth: 392, margin: '0 auto', background: 'rgba(5,12,23,0.78)', border: `1px solid ${RT}66`,
  borderRadius: 18, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: 12,
  textAlign: 'left', boxShadow: '0 14px 42px rgba(0,0,0,0.45)', maxHeight: '64vh', overflowY: 'auto',
};
const inp: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--bd2)', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td)', outline: 'none', width: '100%' };
const sectionLbl: React.CSSProperties = { fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td2)' };
const gridV = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const itemV = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };
const GRAD: Record<string, string> = {
  sport: 'linear-gradient(135deg,rgba(14,168,120,.30),rgba(90,136,176,.16))',
  bricolage: 'linear-gradient(135deg,rgba(224,112,56,.28),rgba(90,136,176,.16))',
  photo: 'linear-gradient(135deg,rgba(123,92,240,.28),rgba(90,136,176,.16))',
  camping: 'linear-gradient(135deg,rgba(14,168,120,.28),rgba(8,104,160,.16))',
  materiel: 'linear-gradient(135deg,rgba(212,75,36,.26),rgba(123,92,240,.16))',
  vehicule: 'linear-gradient(135deg,rgba(90,136,176,.34),rgba(8,104,160,.16))',
};

export default function RentModule() {
  const [tab, setTab] = useState<Tab>('louer');
  return (
    <div className="hero-domabar rent-mod" style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: RT, boxShadow: `0 0 8px ${RT}` }} />
        <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--td)' }}>Rent</span>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)' }}>· Matériel entre voisins</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {([['louer', 'Louer', '🔍'], ['proposer', 'Proposer', '＋']] as const).map(([k, l, ic]) => {
          const a = tab === k;
          return (
            <button key={k} onClick={() => setTab(k)} aria-pressed={a}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 4px', borderRadius: 11, cursor: 'pointer', border: `1px solid ${a ? RT : 'var(--bd2)'}`, background: a ? `${RT}22` : 'transparent', boxShadow: a ? `0 0 14px ${RT}55` : 'none', transition: 'all .2s' }}>
              <span style={{ fontSize: 14 }} aria-hidden>{ic}</span>
              <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 11.5, letterSpacing: '0.02em', textTransform: 'uppercase', color: a ? RT2 : 'var(--td2)' }}>{l}</span>
            </button>
          );
        })}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
          {tab === 'louer' ? <LouerTab /> : <ProposerTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─────────── LOUER ─────────── */
function LouerTab() {
  const [cats, setCats] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState(GEAR_PRICE_MAX);
  const [sortBy, setSortBy] = useState<'price' | 'dist' | 'rating'>('price');
  const [sel, setSel] = useState<string | null>(null);
  const [days, setDays] = useState(2);
  const toggle = (k: string) => setCats(a => a.includes(k) ? a.filter(x => x !== k) : [...a, k]);

  const results = useMemo(() => {
    const r = GEAR.filter(g => (cats.length === 0 || cats.includes(g.cat)) && g.price <= priceMax);
    r.sort((a, b) => sortBy === 'price' ? a.price - b.price : sortBy === 'dist' ? a.dist - b.dist : b.rating - a.rating);
    return r;
  }, [cats, priceMax, sortBy]);
  const selG = results.find(g => g.id === sel) ?? results[0] ?? null;
  const total = selG ? selG.price * days : 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15, color: 'var(--td)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Louez près de chez vous</span>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 800, color: results.length ? OK : '#D44B24' }}>{results.length}</span>
      </div>
      <div className="hero-domabar" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        <Chip active={cats.length === 0} onClick={() => setCats([])} label="Tout" />
        {RENT_CATS.map(c => <Chip key={c.key} active={cats.includes(c.key)} onClick={() => toggle(c.key)} label={c.label} emoji={c.emoji} />)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 9 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <span style={sectionLbl}>Budget / jour</span>
            <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: priceMax < GEAR_PRICE_MAX ? RT2 : 'var(--td)' }}>{priceMax < GEAR_PRICE_MAX ? `≤ ${priceMax} €` : 'illimité'}</span>
          </div>
          <input type="range" min={5} max={GEAR_PRICE_MAX} step={5} value={priceMax} onChange={e => setPriceMax(Number(e.target.value))} aria-label="Budget maximum par jour" className="rent-budget" style={{ width: '100%' }} />
        </div>
      </div>
      <div className="hero-domabar" style={{ display: 'flex', gap: 5, overflowX: 'auto', marginTop: 8 }}>
        {([['price', 'Prix ↑'], ['dist', 'Au plus près'], ['rating', 'Mieux notés']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setSortBy(k)} aria-pressed={sortBy === k}
            style={{ flexShrink: 0, padding: '7px 11px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${sortBy === k ? RT : 'var(--bd2)'}`, background: sortBy === k ? `${RT}22` : 'transparent', color: sortBy === k ? RT2 : 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 600 }}>{l}</button>
        ))}
      </div>
      <motion.div key={results.map(g => g.id).join() + sortBy} variants={gridV} initial="hidden" animate="show" className="hero-domabar" style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 290, overflowY: 'auto', padding: '10px 2px 4px' }}>
        {results.length === 0 && <div style={{ textAlign: 'center', padding: '18px 0', fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)' }}>Rien dans ce budget.<br /><button onClick={() => setPriceMax(GEAR_PRICE_MAX)} style={{ marginTop: 8, background: 'none', border: 'none', color: RT2, cursor: 'pointer', fontFamily: 'var(--fo)', fontSize: 11, textDecoration: 'underline' }}>Élargir</button></div>}
        {results.map(g => {
          const a = selG?.id === g.id;
          const cm = rentCatMeta(g.cat);
          return (
            <motion.button variants={itemV} key={g.id} onClick={() => setSel(g.id)} aria-pressed={a}
              style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: 6, borderRadius: 12, cursor: 'pointer', border: `2px solid ${a ? OK : 'var(--bd2)'}`, boxShadow: a ? `0 0 16px ${OK}44` : 'none', background: a ? `${OK}14` : 'rgba(255,255,255,0.04)', textAlign: 'left', transition: 'all .18s' }}>
              <span style={{ position: 'relative', flexShrink: 0, width: 88, height: 62, borderRadius: 9, overflow: 'hidden' }}>
                <Thumb grad={GRAD[g.cat] || GRAD.vehicule} emoji={g.emoji} h={62} />
                <span style={{ position: 'absolute', top: 4, right: 4 }}><CheckMark on={a} size={16} /></span>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: a ? OK : 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.title}</span>
                <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td2)', marginTop: 2 }}>{cm.label} · ⭐ {g.rating.toFixed(1)} · {g.dist.toFixed(1)} km</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}><Avatar name={g.owner} size={15} /><span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, color: 'var(--td3)' }}>{g.owner}</span></span>
              </span>
              <span style={{ flexShrink: 0, textAlign: 'right' }}><Price value={g.price} suffix="/j" size={17} /></span>
            </motion.button>
          );
        })}
      </motion.div>
      {selG ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '8px 2px 0', padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--bd2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={sectionLbl}>Jours</span>
              <button onClick={() => setDays(d => Math.max(1, d - 1))} aria-label="Moins un jour" style={miniStep}>−</button>
              <span style={{ fontFamily: 'var(--fn)', fontSize: 19, color: 'var(--td)', minWidth: 28, textAlign: 'center' }}>{days}</span>
              <button onClick={() => setDays(d => Math.min(30, d + 1))} aria-label="Plus un jour" style={miniStep}>+</button>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 8.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td2)' }}>Total</div>
              <Price value={total} suffix="€" size={22} />
            </div>
          </div>
          <Cta href={`/rent?item=${selG.id}&days=${days}`} label={`Réserver · ${selG.title} · ${days} j`} />
        </>
      ) : <Cta href="/rent" label="Choisis du matériel" mt={10} disabled />}
      <Trust text="Caution couverte · assurance casse incluse · remise en main propre" />
    </div>
  );
}

/* ─────────── PROPOSER ─────────── */
function ProposerTab() {
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState<RentCat | null>(null);
  const [price, setPrice] = useState(20);
  const [sent, setSent] = useState(false);
  const ready = title.trim().length > 1 && !!cat;
  if (sent) return (
    <div style={{ textAlign: 'center', padding: '22px 10px' }}>
      <div style={{ fontSize: 30 }}>📦</div>
      <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 16, color: 'var(--td)', marginTop: 6 }}>Annonce en ligne</div>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', marginTop: 4 }}>« {title.trim()} » est visible par tes voisins. Tu seras prévenu à la première demande.</div>
      <button onClick={() => { setSent(false); setTitle(''); setCat(null); }} style={{ marginTop: 12, background: 'none', border: 'none', color: RT2, cursor: 'pointer', fontFamily: 'var(--fo)', fontSize: 11, textDecoration: 'underline' }}>Proposer un autre objet</button>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '9px 11px', borderRadius: 12, border: `1px solid ${RT}44`, background: `${RT}14` }}>
        <span style={{ fontSize: 17 }}>💶</span>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 10.8, color: 'var(--td2)', lineHeight: 1.45 }}><strong style={{ color: 'var(--td)' }}>Rentabilise ce qui dort.</strong> Mets ton matériel en location et gagne un complément chaque mois — assurance & caution gérées par NIKA.</div>
      </div>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Quel objet ? (ex : VTT électrique)" style={inp} maxLength={42} />
      <div>
        <div style={sectionLbl}>Catégorie</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {RENT_CATS.map(c => <Chip key={c.key} small active={cat === c.key} onClick={() => setCat(cat === c.key ? null : c.key)} label={c.label} emoji={c.emoji} />)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={sectionLbl}>Prix / jour</span>
        <button onClick={() => setPrice(p => Math.max(1, p - 1))} aria-label="Moins cher" style={miniStep}>−</button>
        <span style={{ fontFamily: 'var(--fn)', fontSize: 19, color: 'var(--td)', minWidth: 44, textAlign: 'center' }}>{price} €</span>
        <button onClick={() => setPrice(p => Math.min(300, p + 1))} aria-label="Plus cher" style={miniStep}>+</button>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', marginLeft: 'auto' }}>~{price * 8} €/mois*</span>
      </div>
      <Cta href="#" onClick={() => ready && setSent(true)} label={ready ? 'Publier l’annonce' : 'Objet + catégorie'} disabled={!ready} mt={2} />
      <Trust text="*estimation pour 8 jours loués / mois · publication gratuite" />
    </div>
  );
}

/* ─────────── Sous-composants ─────────── */
const miniStep: React.CSSProperties = { width: 28, height: 28, borderRadius: 8, border: `1px solid ${RT}88`, background: `${RT}24`, color: RT2, fontSize: 16, cursor: 'pointer', lineHeight: 1 };
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
function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const ini = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return <span aria-hidden style={{ flexShrink: 0, width: size, height: size, borderRadius: '50%', background: `${RT}28`, border: `1px solid ${RT}77`, color: RT2, fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: size * 0.42, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ini}</span>;
}
function Price({ value, suffix, color = RT2, size = 30 }: { value: string | number; suffix?: string; color?: string; size?: number }) {
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
    background: disabled ? 'rgba(255,255,255,0.08)' : `linear-gradient(180deg, ${RT2}, ${RT})`, color: disabled ? 'var(--td2)' : '#fff',
    fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12.5, letterSpacing: '0.04em', textTransform: 'uppercase',
    boxShadow: disabled ? 'none' : `0 6px 22px ${RT}66`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  };
  const inner = <><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>{!disabled && <span aria-hidden style={{ fontSize: 14 }}>→</span>}</>;
  if (disabled) return <span aria-disabled="true" style={{ ...s, cursor: 'not-allowed' }}>{inner}</span>;
  if (onClick) return <button onClick={onClick} style={{ ...s, width: '100%', border: 'none', cursor: 'pointer' }}>{inner}</button>;
  return <Link href={href} style={s}>{inner}</Link>;
}
function Trust({ text }: { text: string }) {
  return <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, color: 'var(--td2)', textAlign: 'center', margin: '9px 2px 1px', letterSpacing: '0.02em' }}>{text}</div>;
}
