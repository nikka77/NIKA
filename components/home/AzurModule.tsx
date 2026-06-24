'use client';
// components/home/AzurModule.tsx — Module AZUR (in-hero) : Mer & Bateaux. Accent #0868A0.
// 3 catégories : Bateau (location + filtres) · Sorties (excursions) · Sports nautiques.
// Calqué sur Auto/StayModule : prix Bebas, entrée échelonnée, press/focus (CSS .azur-mod), repli dégradé+emoji.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BOAT_KINDS, boatKindMeta, BOATS, BOAT_PRICE_MIN, BOAT_PRICE_MAX,
  EXCURSIONS, SPORTS, type Skipper,
} from '@/lib/azurData';

const AZ = '#0868A0';   // accent AZUR (bleu profond mer)
const AZ2 = '#1391C8';  // bord lumineux du CTA
const OK = '#22DD88';   // vert sélection
const PORTS = ['Nice', 'Cannes', 'Antibes', 'Villefranche', 'Mandelieu', 'Golfe-Juan'];

type Tab = 'bateau' | 'sorties' | 'sports';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'bateau', label: 'Bateau', icon: '🛥️' },
  { key: 'sorties', label: 'Sorties', icon: '🐬' },
  { key: 'sports', label: 'Sports', icon: '🤿' },
];

const card: React.CSSProperties = {
  position: 'relative', maxWidth: 392, margin: '0 auto', background: 'rgba(5,12,23,0.78)', border: `1px solid ${AZ}66`,
  borderRadius: 18, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: 12,
  textAlign: 'left', boxShadow: '0 14px 42px rgba(0,0,0,0.45)', maxHeight: '64vh', overflowY: 'auto',
};
const sectionLbl: React.CSSProperties = { fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td2)' };
const gridV = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const itemV = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };
const GRAD: Record<string, string> = {
  'semi-rigide': 'linear-gradient(135deg,rgba(8,104,160,.36),rgba(0,148,212,.16))',
  'sans-permis': 'linear-gradient(135deg,rgba(0,148,212,.30),rgba(14,168,120,.16))',
  'voilier': 'linear-gradient(135deg,rgba(90,136,176,.32),rgba(8,104,160,.16))',
  'catamaran': 'linear-gradient(135deg,rgba(8,104,160,.34),rgba(14,168,120,.14))',
  'yacht': 'linear-gradient(135deg,rgba(8,104,160,.40),rgba(123,92,240,.16))',
  'sea': 'linear-gradient(135deg,rgba(0,148,212,.34),rgba(8,104,160,.18))',
};
const skipLabel = (s: Skipper) => s === 'avec' ? 'avec skipper' : s === 'option' ? 'skipper en option' : 'sans skipper';

export default function AzurModule() {
  const [tab, setTab] = useState<Tab>('bateau');
  return (
    <div className="hero-domabar azur-mod" style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: AZ, boxShadow: `0 0 8px ${AZ}` }} />
        <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--td)' }}>Azur</span>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)' }}>· Mer & bateaux</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {TABS.map(t => {
          const a = t.key === tab;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} aria-pressed={a}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 4px', borderRadius: 11, cursor: 'pointer', border: `1px solid ${a ? AZ : 'var(--bd2)'}`, background: a ? `${AZ}22` : 'transparent', boxShadow: a ? `0 0 14px ${AZ}55` : 'none', transition: 'all .2s' }}>
              <span style={{ fontSize: 16, filter: a ? `drop-shadow(0 0 6px ${AZ}cc)` : 'none' }}>{t.icon}</span>
              <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 10.5, letterSpacing: '0.02em', textTransform: 'uppercase', color: a ? AZ2 : 'var(--td2)' }}>{t.label}</span>
            </button>
          );
        })}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
          {tab === 'bateau' && <BateauTab />}
          {tab === 'sorties' && <SortiesTab />}
          {tab === 'sports' && <SportsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─────────── BATEAU ─────────── */
function BateauTab() {
  const [kinds, setKinds] = useState<string[]>([]);
  const [seatsMin, setSeatsMin] = useState(1);
  const [priceMax, setPriceMax] = useState(BOAT_PRICE_MAX);
  const [skip, setSkip] = useState<'all' | 'avec' | 'sans'>('all');
  const [ports, setPorts] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'price' | 'price-desc' | 'seats'>('price');
  const [sel, setSel] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [days, setDays] = useState(1);
  const toggle = (arr: string[], set: (v: string[]) => void, k: string) => set(arr.includes(k) ? arr.filter(x => x !== k) : [...arr, k]);

  const results = useMemo(() => {
    const r = BOATS.filter(b =>
      (kinds.length === 0 || kinds.includes(b.kind)) &&
      b.seats >= seatsMin && b.price <= priceMax &&
      (ports.length === 0 || ports.includes(b.port)) &&
      (skip === 'all' || (skip === 'avec' ? b.skipper !== 'sans' : b.skipper !== 'avec')));
    r.sort((a, b) => sortBy === 'price' ? a.price - b.price : sortBy === 'price-desc' ? b.price - a.price : b.seats - a.seats);
    return r;
  }, [kinds, seatsMin, priceMax, ports, skip, sortBy]);
  const selB = results.find(b => b.id === sel) ?? results[0] ?? null;
  const activeCount = (seatsMin > 1 ? 1 : 0) + (priceMax < BOAT_PRICE_MAX ? 1 : 0) + (skip !== 'all' ? 1 : 0) + (ports.length ? 1 : 0);
  const resetAll = () => { setSeatsMin(1); setPriceMax(BOAT_PRICE_MAX); setSkip('all'); setPorts([]); };
  const total = selB ? selB.price * days : 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15, color: 'var(--td)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Louez un bateau</span>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 800, color: results.length ? OK : '#D44B24' }}>{results.length} bateau{results.length > 1 ? 'x' : ''}</span>
      </div>
      <div className="hero-domabar" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        <Chip active={kinds.length === 0} onClick={() => setKinds([])} label="Tout" />
        {BOAT_KINDS.map(k => <Chip key={k.key} active={kinds.includes(k.key)} onClick={() => toggle(kinds, setKinds, k.key)} label={k.label} emoji={k.emoji} />)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <button onClick={() => setFiltersOpen(o => !o)} aria-expanded={filtersOpen}
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${activeCount || filtersOpen ? AZ : 'var(--bd2)'}`, background: activeCount || filtersOpen ? `${AZ}22` : 'rgba(255,255,255,0.04)', color: activeCount || filtersOpen ? AZ2 : 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700 }}>
          <span aria-hidden>⚙</span> Filtres{activeCount ? ` · ${activeCount}` : ''}<span aria-hidden style={{ display: 'inline-block', transform: filtersOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
        </button>
        <div className="hero-domabar" style={{ display: 'flex', gap: 5, overflowX: 'auto', flex: 1, justifyContent: 'flex-end' }}>
          {([['price', 'Prix ↑'], ['price-desc', 'Prix ↓'], ['seats', 'Places']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setSortBy(k)} aria-pressed={sortBy === k}
              style={{ flexShrink: 0, padding: '7px 10px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${sortBy === k ? AZ : 'var(--bd2)'}`, background: sortBy === k ? `${AZ}22` : 'transparent', color: sortBy === k ? AZ2 : 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 600 }}>{l}</button>
          ))}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {filtersOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: '11px 2px 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={sectionLbl}>Places min</span>
                  <button onClick={() => setSeatsMin(s => Math.max(1, s - 1))} aria-label="Moins" style={miniStep}>−</button>
                  <span style={{ fontFamily: 'var(--fn)', fontSize: 19, color: 'var(--td)', minWidth: 22, textAlign: 'center' }}>{seatsMin}</span>
                  <button onClick={() => setSeatsMin(s => Math.min(12, s + 1))} aria-label="Plus" style={miniStep}>+</button>
                </div>
                {activeCount > 0 && <button onClick={resetAll} style={{ background: 'none', border: 'none', color: 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 10.5, cursor: 'pointer', textDecoration: 'underline' }}>Réinitialiser</button>}
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={sectionLbl}>Budget / jour</span>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: priceMax < BOAT_PRICE_MAX ? AZ2 : 'var(--td)' }}>{priceMax < BOAT_PRICE_MAX ? `≤ ${priceMax} €` : 'illimité'}</span>
                </div>
                <input type="range" min={BOAT_PRICE_MIN} max={BOAT_PRICE_MAX} step={10} value={priceMax} onChange={e => setPriceMax(Number(e.target.value))} aria-label="Budget maximum par jour" className="azur-budget" style={{ width: '100%' }} />
              </div>
              <div>
                <div style={sectionLbl}>Skipper</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {([['all', 'Indifférent'], ['avec', 'Avec skipper'], ['sans', 'Je pilote']] as const).map(([k, l]) => (
                    <button key={k} onClick={() => setSkip(k)} aria-pressed={skip === k}
                      style={{ flex: 1, padding: '7px 4px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${skip === k ? OK : 'var(--bd2)'}`, background: skip === k ? `${OK}1c` : 'rgba(255,255,255,0.04)', color: skip === k ? OK : 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 10, fontWeight: skip === k ? 700 : 600 }}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={sectionLbl}>Port de départ</div>
                <div className="hero-domabar" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 6, paddingBottom: 2 }}>
                  {PORTS.map(p => <Chip key={p} small active={ports.includes(p)} onClick={() => toggle(ports, setPorts, p)} label={p} />)}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div key={results.map(b => b.id).join() + sortBy} variants={gridV} initial="hidden" animate="show" className="hero-domabar" style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: filtersOpen ? 180 : 290, overflowY: 'auto', padding: '10px 2px 4px', transition: 'max-height .25s' }}>
        {results.length === 0 && <div style={{ textAlign: 'center', padding: '18px 0', fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)' }}>Aucun bateau ne correspond.<br /><button onClick={resetAll} style={{ marginTop: 8, background: 'none', border: 'none', color: AZ2, cursor: 'pointer', fontFamily: 'var(--fo)', fontSize: 11, textDecoration: 'underline' }}>Réinitialiser</button></div>}
        {results.map(b => {
          const a = selB?.id === b.id;
          const km = boatKindMeta(b.kind);
          return (
            <motion.button variants={itemV} key={b.id} onClick={() => setSel(b.id)} aria-pressed={a}
              style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: 6, borderRadius: 12, cursor: 'pointer', border: `2px solid ${a ? OK : 'var(--bd2)'}`, boxShadow: a ? `0 0 16px ${OK}44` : 'none', background: a ? `${OK}14` : 'rgba(255,255,255,0.04)', textAlign: 'left', transition: 'all .18s' }}>
              <span style={{ position: 'relative', flexShrink: 0, width: 104, height: 62, borderRadius: 9, overflow: 'hidden' }}>
                <Thumb grad={GRAD[b.kind] || GRAD.sea} emoji={km.emoji} h={62} />
                <span style={{ position: 'absolute', top: 4, right: 4 }}><CheckMark on={a} size={16} /></span>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: a ? OK : 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</span>
                <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td2)', marginTop: 2 }}>{km.label} · {b.seats} pers · {b.port}</span>
                <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 9.5, color: b.skipper === 'sans' ? OK : AZ2, marginTop: 1 }}>{skipLabel(b.skipper)}</span>
              </span>
              <span style={{ flexShrink: 0, textAlign: 'right' }}><Price value={b.price} suffix="/j" size={17} /></span>
            </motion.button>
          );
        })}
      </motion.div>
      {selB ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '8px 2px 0', padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--bd2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={sectionLbl}>Jours</span>
              <button onClick={() => setDays(d => Math.max(1, d - 1))} aria-label="Moins un jour" style={miniStep}>−</button>
              <span style={{ fontFamily: 'var(--fn)', fontSize: 19, color: 'var(--td)', minWidth: 28, textAlign: 'center' }}>{days}</span>
              <button onClick={() => setDays(d => Math.min(14, d + 1))} aria-label="Plus un jour" style={miniStep}>+</button>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 8.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td2)' }}>Total</div>
              <Price value={total} suffix="€" size={22} />
            </div>
          </div>
          <Cta href={`/azur?boat=${selB.id}&days=${days}`} label={`Réserver · ${selB.name} · ${days} j`} />
        </>
      ) : <Cta href="/azur" label="Élargis tes filtres" mt={10} disabled />}
      <Trust text="Bateaux assurés · skipper diplômé en option · annulation gratuite" />
    </div>
  );
}

/* ─────────── SORTIES ─────────── */
function SortiesTab() {
  const [sel, setSel] = useState<string | null>(null);
  const [people, setPeople] = useState(2);
  const selE = EXCURSIONS.find(e => e.id === sel) ?? null;
  const total = selE ? selE.price * people : 0;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15, color: 'var(--td)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Sorties en mer</span>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 800, color: AZ2 }}>{EXCURSIONS.length} excursions</span>
      </div>
      <motion.div variants={gridV} initial="hidden" animate="show" className="hero-domabar" style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 320, overflowY: 'auto', padding: '4px 2px' }}>
        {EXCURSIONS.map(e => {
          const a = sel === e.id;
          return (
            <motion.button variants={itemV} key={e.id} onClick={() => setSel(e.id)} aria-pressed={a}
              style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: 6, borderRadius: 12, cursor: 'pointer', border: `2px solid ${a ? OK : 'var(--bd2)'}`, boxShadow: a ? `0 0 16px ${OK}44` : 'none', background: a ? `${OK}14` : 'rgba(255,255,255,0.04)', textAlign: 'left', transition: 'all .18s' }}>
              <span style={{ position: 'relative', flexShrink: 0, width: 84, height: 64, borderRadius: 9, overflow: 'hidden' }}>
                <Thumb grad={GRAD.sea} emoji={e.emoji} h={64} />
                <span style={{ position: 'absolute', top: 4, right: 4 }}><CheckMark on={a} size={16} /></span>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: a ? OK : 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</span>
                  {e.tag && <span style={{ flexShrink: 0, fontFamily: 'var(--fo)', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: AZ2, background: `${AZ}22`, border: `1px solid ${AZ}55`, borderRadius: 20, padding: '1px 6px' }}>{e.tag}</span>}
                </span>
                <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td2)', marginTop: 2 }}>⛵ {e.departure} · {e.duration}</span>
              </span>
              <span style={{ flexShrink: 0, textAlign: 'right' }}><Price value={e.price} suffix="/pers" size={17} /></span>
            </motion.button>
          );
        })}
      </motion.div>
      {selE ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '8px 2px 0', padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--bd2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={sectionLbl}>Personnes</span>
              <button onClick={() => setPeople(p => Math.max(1, p - 1))} aria-label="Moins" style={miniStep}>−</button>
              <span style={{ fontFamily: 'var(--fn)', fontSize: 19, color: 'var(--td)', minWidth: 24, textAlign: 'center' }}>{people}</span>
              <button onClick={() => setPeople(p => Math.min(20, p + 1))} aria-label="Plus" style={miniStep}>+</button>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 8.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td2)' }}>Total</div>
              <Price value={total} suffix="€" size={22} />
            </div>
          </div>
          <Cta href={`/azur?excursion=${selE.id}&pax=${people}`} label={`Réserver · ${selE.name}`} />
        </>
      ) : <Cta href="/azur" label="Choisis une sortie" mt={10} disabled />}
      <Trust text="Départs garantis · skipper local · gilets fournis" />
    </div>
  );
}

/* ─────────── SPORTS ─────────── */
function SportsTab() {
  const [sel, setSel] = useState<string | null>(null);
  const selS = SPORTS.find(s => s.id === sel) ?? null;
  return (
    <div>
      <div style={{ ...sectionLbl, margin: '0 2px 9px' }}>Choisis ton activité</div>
      <motion.div variants={gridV} initial="hidden" animate="show" className="g-2" style={{ gap: 9 }}>
        {SPORTS.map(s => {
          const a = sel === s.id;
          return (
            <motion.button variants={itemV} key={s.id} onClick={() => setSel(a ? null : s.id)} aria-pressed={a}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 11px', borderRadius: 13, cursor: 'pointer', border: `2px solid ${a ? OK : 'var(--bd2)'}`, boxShadow: a ? `0 0 16px ${OK}44` : 'none', background: a ? `${OK}14` : 'rgba(255,255,255,0.04)', textAlign: 'left', transition: 'all .18s' }}>
              <span style={{ fontSize: 24, flexShrink: 0 }} aria-hidden>{s.emoji}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: a ? OK : 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                <span style={{ display: 'block', marginTop: 1 }}><Price value={s.price} suffix={`€ /${s.unit}`} size={15} color={a ? OK : AZ2} /></span>
              </span>
              <span style={{ position: 'absolute', top: 5, right: 5 }}><CheckMark on={a} size={15} /></span>
            </motion.button>
          );
        })}
      </motion.div>
      <Cta href={selS ? `/azur?sport=${selS.id}` : '/azur'} label={selS ? `Réserver · ${selS.name} · ${selS.price} €` : 'Choisis une activité'} disabled={!selS} mt={11} />
      <Trust text="Moniteurs brevetés · matériel fourni · dès 8 ans" />
    </div>
  );
}

/* ─────────── Sous-composants ─────────── */
const miniStep: React.CSSProperties = { width: 28, height: 28, borderRadius: 8, border: `1px solid ${AZ}88`, background: `${AZ}24`, color: AZ2, fontSize: 16, cursor: 'pointer', lineHeight: 1 };
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
function Price({ value, suffix, color = AZ2, size = 30 }: { value: string | number; suffix?: string; color?: string; size?: number }) {
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
function Cta({ href, label, mt = 10, disabled = false }: { href: string; label: string; mt?: number; disabled?: boolean }) {
  const s: React.CSSProperties = {
    marginTop: mt, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', borderRadius: 12,
    background: disabled ? 'rgba(255,255,255,0.08)' : `linear-gradient(180deg, ${AZ2}, ${AZ})`, color: disabled ? 'var(--td2)' : '#fff',
    fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12.5, letterSpacing: '0.04em', textTransform: 'uppercase',
    boxShadow: disabled ? 'none' : `0 6px 22px ${AZ}66`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  };
  const inner = <><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>{!disabled && <span aria-hidden style={{ fontSize: 14 }}>→</span>}</>;
  if (disabled) return <span aria-disabled="true" style={{ ...s, cursor: 'not-allowed' }}>{inner}</span>;
  return <Link href={href} style={s}>{inner}</Link>;
}
function Trust({ text }: { text: string }) {
  return <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, color: 'var(--td2)', textAlign: 'center', margin: '9px 2px 1px', letterSpacing: '0.02em' }}>{text}</div>;
}
