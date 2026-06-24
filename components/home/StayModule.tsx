'use client';
// components/home/StayModule.tsx — Module STAY (in-hero), calqué sur AutoModule, accent terracotta #E07038.
// 4 catégories : Location (hôtel/appart/propriété) · Achat-Vente (même filtre + segment Acheter|Vendre) ·
//   Spots (lieux secrets communautaires : gratuits sur place, déverrouillage payant à l'unité, plafond de personnes) ·
//   Explore (logements WOW insolites — vraies covers /images/wow, lien vers les pages /stay/[slug]).
// Transverse : prix en Bebas, entrée échelonnée + press/focus (CSS .stay-mod), repli dégradé+emoji (Thumb).
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AREAS, RENT_KINDS, RENTALS, RENT_PRICE_MIN, RENT_PRICE_MAX,
  SALE_KINDS, SALES, SALE_PRICE_MIN, SALE_PRICE_MAX,
  SPOT_TAGS, spotTag, SPOTS, EXPLORE, WOW_TYPE_EMOJI, fmtPrice,
  type Rental, type SaleProp, type Spot, type SaleKind, type SpotTagKey,
} from '@/lib/stayData';

const ST = '#E07038';   // accent STAY (terracotta)
const ST2 = '#F2945E';  // bord lumineux du CTA
const OK = '#22DD88';   // vert « sélectionné / validé »

type Tab = 'location' | 'achat' | 'spots' | 'explore';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'location', label: 'Location', icon: '🔑' },
  { key: 'achat', label: 'Achat', icon: '🏷️' },
  { key: 'spots', label: 'Spots', icon: '📍' },
  { key: 'explore', label: 'Explore', icon: '🧭' },
];

const card: React.CSSProperties = {
  position: 'relative', maxWidth: 392, margin: '0 auto', background: 'rgba(5,12,23,0.78)', border: `1px solid ${ST}55`,
  borderRadius: 18, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: 12,
  textAlign: 'left', boxShadow: '0 14px 42px rgba(0,0,0,0.45)', maxHeight: '64vh', overflowY: 'auto',
};
const inp: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--bd2)', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td)', outline: 'none', width: '100%' };
const sectionLbl: React.CSSProperties = { fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td2)' };
const gridV = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const itemV = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

// Dégradés de repli (tuiles sans photo) — chauds pour STAY, frais/eau pour les spots.
const GRAD: Record<string, string> = {
  hotel: 'linear-gradient(135deg,rgba(212,160,23,.34),rgba(224,112,56,.16))',
  appartement: 'linear-gradient(135deg,rgba(0,148,212,.34),rgba(8,104,160,.16))',
  villa: 'linear-gradient(135deg,rgba(224,112,56,.34),rgba(212,75,36,.16))',
  propriete: 'linear-gradient(135deg,rgba(224,112,56,.30),rgba(123,92,240,.14))',
  terrain: 'linear-gradient(135deg,rgba(14,168,120,.30),rgba(90,136,176,.16))',
};
const SPOT_GRAD: Record<SpotTagKey, string> = {
  vue: 'linear-gradient(135deg,rgba(224,112,56,.32),rgba(0,148,212,.16))',
  calme: 'linear-gradient(135deg,rgba(90,136,176,.30),rgba(14,168,120,.14))',
  baignade: 'linear-gradient(135deg,rgba(0,148,212,.36),rgba(14,168,120,.18))',
  ambiance: 'linear-gradient(135deg,rgba(123,92,240,.30),rgba(224,112,56,.16))',
  original: 'linear-gradient(135deg,rgba(123,92,240,.30),rgba(212,75,36,.16))',
  ombrage: 'linear-gradient(135deg,rgba(14,168,120,.32),rgba(90,136,176,.14))',
  coucher: 'linear-gradient(135deg,rgba(224,112,56,.42),rgba(212,75,36,.18))',
  sauvage: 'linear-gradient(135deg,rgba(14,168,120,.30),rgba(0,148,212,.16))',
};

export default function StayModule() {
  const [tab, setTab] = useState<Tab>('location');
  return (
    <div className="hero-domabar stay-mod" style={card}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: ST, boxShadow: `0 0 8px ${ST}` }} />
        <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--td)' }}>Stay</span>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)' }}>· Côte d’Azur</span>
      </div>

      {/* Onglets (4 catégories) */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        {TABS.map(t => {
          const a = t.key === tab;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} aria-pressed={a}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 2px', borderRadius: 11, cursor: 'pointer', border: `1px solid ${a ? ST : 'var(--bd2)'}`, background: a ? `${ST}1f` : 'transparent', boxShadow: a ? `0 0 14px ${ST}44` : 'none', transition: 'all .2s' }}>
              <span style={{ fontSize: 15, filter: a ? `drop-shadow(0 0 6px ${ST}aa)` : 'none' }}>{t.icon}</span>
              <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 10, letterSpacing: '0.02em', textTransform: 'uppercase', color: a ? ST : 'var(--td2)' }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
          {tab === 'location' && <PropertySearch mode="rent" />}
          {tab === 'achat' && <AchatTab />}
          {tab === 'spots' && <SpotsTab />}
          {tab === 'explore' && <ExploreTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════ LOCATION & ACHAT — recherche partagée ════════════════════════ */
function PropertySearch({ mode }: { mode: 'rent' | 'sale' }) {
  const isRent = mode === 'rent';
  const KINDS = isRent ? RENT_KINDS : SALE_KINDS;
  const DATA: (Rental | SaleProp)[] = isRent ? RENTALS : SALES;
  const PMIN = isRent ? RENT_PRICE_MIN : SALE_PRICE_MIN;
  const PMAX = isRent ? RENT_PRICE_MAX : SALE_PRICE_MAX;
  const cap = (x: Rental | SaleProp) => (isRent ? (x as Rental).guests : (x as SaleProp).bedrooms);
  const kindMeta = (k: string) => KINDS.find(z => z.key === k) ?? KINDS[0];

  const [kinds, setKinds] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [capMin, setCapMin] = useState(isRent ? 1 : 0);
  const [priceMax, setPriceMax] = useState(PMAX);
  const [seaview, setSeaview] = useState(false);
  const [pool, setPool] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'price-desc' | 'best'>('price');
  const [sel, setSel] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [nights, setNights] = useState(3);

  const toggle = (arr: string[], set: (v: string[]) => void, k: string) => set(arr.includes(k) ? arr.filter(x => x !== k) : [...arr, k]);
  const results = useMemo(() => {
    const r = DATA.filter(x =>
      (kinds.length === 0 || kinds.includes(x.kind)) &&
      (areas.length === 0 || areas.includes(x.area)) &&
      cap(x) >= capMin && x.price <= priceMax &&
      (!seaview || x.seaview) && (!pool || x.pool));
    r.sort((a, b) => {
      if (sortBy === 'price') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return isRent ? (b as Rental).rating - (a as Rental).rating
        : (a.price / (a as SaleProp).surface) - (b.price / (b as SaleProp).surface);
    });
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kinds, areas, capMin, priceMax, seaview, pool, sortBy]);
  const selP = results.find(x => x.id === sel) ?? results[0] ?? null;

  const activeCount = (capMin > (isRent ? 1 : 0) ? 1 : 0) + (areas.length ? 1 : 0) + (priceMax < PMAX ? 1 : 0) + (seaview ? 1 : 0) + (pool ? 1 : 0);
  const resetAll = () => { setKinds([]); setAreas([]); setCapMin(isRent ? 1 : 0); setPriceMax(PMAX); setSeaview(false); setPool(false); };
  const budgetLabel = priceMax >= PMAX ? 'illimité' : isRent ? `≤ ${priceMax} €` : `≤ ${fmtPrice(priceMax).value} ${fmtPrice(priceMax).suffix}`;
  const rentTotal = selP ? selP.price * nights : 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15, color: 'var(--td)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{isRent ? 'Louez votre séjour' : 'Trouvez votre bien'}</span>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 800, color: results.length ? OK : '#D44B24' }}>{results.length} bien{results.length > 1 ? 's' : ''}</span>
      </div>

      {/* TYPE — puces multi défilables */}
      <div className="hero-domabar" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        <Chip active={kinds.length === 0} onClick={() => setKinds([])} label="Tout" />
        {KINDS.map(k => <Chip key={k.key} active={kinds.includes(k.key)} onClick={() => toggle(kinds, setKinds, k.key)} label={k.label} emoji={k.emoji} />)}
      </div>

      {/* Filtres (déplie) + Tri */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <button onClick={() => setFiltersOpen(o => !o)} aria-expanded={filtersOpen}
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${activeCount || filtersOpen ? ST : 'var(--bd2)'}`, background: activeCount || filtersOpen ? `${ST}1c` : 'rgba(255,255,255,0.04)', color: activeCount || filtersOpen ? ST : 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700 }}>
          <span aria-hidden>⚙</span> Filtres{activeCount ? ` · ${activeCount}` : ''}<span aria-hidden style={{ display: 'inline-block', transform: filtersOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
        </button>
        <div className="hero-domabar" style={{ display: 'flex', gap: 5, overflowX: 'auto', flex: 1, justifyContent: 'flex-end' }}>
          {([['price', 'Prix ↑'], ['price-desc', 'Prix ↓'], ['best', isRent ? 'Top noté' : '€/m²']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setSortBy(k)} aria-pressed={sortBy === k}
              style={{ flexShrink: 0, padding: '7px 10px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${sortBy === k ? ST : 'var(--bd2)'}`, background: sortBy === k ? `${ST}1c` : 'transparent', color: sortBy === k ? ST : 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 600 }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Panneau de filtres */}
      <AnimatePresence initial={false}>
        {filtersOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: '11px 2px 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={sectionLbl}>{isRent ? 'Voyageurs' : 'Chambres'}</span>
                  <button onClick={() => setCapMin(s => Math.max(isRent ? 1 : 0, s - 1))} aria-label="Moins" style={miniStep}>−</button>
                  <span style={{ fontFamily: 'var(--fn)', fontSize: 19, color: 'var(--td)', minWidth: 26, textAlign: 'center' }}>{capMin === 0 ? 'Tout' : `${capMin}+`}</span>
                  <button onClick={() => setCapMin(s => Math.min(12, s + 1))} aria-label="Plus" style={miniStep}>+</button>
                </div>
                {(activeCount > 0 || kinds.length > 0) && <button onClick={resetAll} style={{ background: 'none', border: 'none', color: 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 10.5, cursor: 'pointer', textDecoration: 'underline' }}>Réinitialiser</button>}
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={sectionLbl}>{isRent ? 'Budget / nuit' : 'Budget max'}</span>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: priceMax < PMAX ? ST : 'var(--td)' }}>{budgetLabel}</span>
                </div>
                <input type="range" min={PMIN} max={PMAX} step={isRent ? 5 : 50_000} value={priceMax} onChange={e => setPriceMax(Number(e.target.value))} aria-label="Budget maximum" className="stay-budget" style={{ width: '100%' }} />
              </div>
              <div>
                <div style={sectionLbl}>Secteur</div>
                <div className="hero-domabar" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 6, paddingBottom: 2 }}>
                  {AREAS.map(a => <Chip key={a} small active={areas.includes(a)} onClick={() => toggle(areas, setAreas, a)} label={a} />)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Toggle active={seaview} onClick={() => setSeaview(v => !v)} label="Vue mer" />
                <Toggle active={pool} onClick={() => setPool(v => !v)} label="Piscine" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RÉSULTATS */}
      <motion.div key={results.map(x => x.id).join() + sortBy} variants={gridV} initial="hidden" animate="show" className="hero-domabar" style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: filtersOpen ? 180 : 300, overflowY: 'auto', padding: '10px 2px 4px', transition: 'max-height .25s' }}>
        {results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '18px 0', fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)' }}>Aucun bien ne correspond.<br /><button onClick={resetAll} style={{ marginTop: 8, background: 'none', border: 'none', color: ST, cursor: 'pointer', fontFamily: 'var(--fo)', fontSize: 11, textDecoration: 'underline' }}>Réinitialiser les filtres</button></div>
        )}
        {results.map(x => {
          const a = selP?.id === x.id;
          const km = kindMeta(x.kind);
          const sub = isRent
            ? `${x.area} · ${(x as Rental).guests} pers · ${x.bedrooms} ch · ⭐ ${(x as Rental).rating.toFixed(1)}`
            : `${x.area} · ${(x as SaleProp).surface} m²${x.bedrooms ? ` · ${x.bedrooms} ch` : ''}`;
          const pr = isRent ? { value: x.price, suffix: '/nuit' } : { value: fmtPrice(x.price).value, suffix: fmtPrice(x.price).suffix };
          return (
            <motion.button variants={itemV} key={x.id} onClick={() => setSel(x.id)} aria-pressed={a}
              style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: 6, borderRadius: 12, cursor: 'pointer', border: `2px solid ${a ? OK : 'var(--bd2)'}`, boxShadow: a ? `0 0 16px ${OK}44` : 'none', background: a ? `${OK}14` : 'rgba(255,255,255,0.04)', textAlign: 'left', transition: 'all .18s' }}>
              <span style={{ position: 'relative', flexShrink: 0, width: 104, height: 64, borderRadius: 9, overflow: 'hidden' }}>
                <Thumb grad={GRAD[x.kind] || GRAD.propriete} emoji={km.emoji} h={64} />
                {x.seaview && <span style={badgeTL}>🌊</span>}
                <span style={{ position: 'absolute', top: 4, right: 4 }}><CheckMark on={a} size={16} /></span>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: a ? OK : 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.name}</span>
                <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td2)', marginTop: 2 }}>{km.label} · {sub}</span>
              </span>
              <span style={{ flexShrink: 0, textAlign: 'right' }}><Price value={pr.value} suffix={pr.suffix} size={isRent ? 17 : 16} /></span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Récap + CTA */}
      {selP ? isRent ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '8px 2px 0', padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--bd2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={sectionLbl}>Nuits</span>
              <button onClick={() => setNights(d => Math.max(1, d - 1))} aria-label="Moins une nuit" style={miniStep}>−</button>
              <span style={{ fontFamily: 'var(--fn)', fontSize: 19, color: 'var(--td)', minWidth: 34, textAlign: 'center' }}>{nights}</span>
              <button onClick={() => setNights(d => Math.min(30, d + 1))} aria-label="Plus une nuit" style={miniStep}>+</button>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 8.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td2)' }}>Total</div>
              <Price value={rentTotal} suffix="€" size={22} />
            </div>
          </div>
          <Cta href={`/stay?book=${selP.id}&nights=${nights}`} label={`Réserver · ${selP.name} · ${nights} nuit${nights > 1 ? 's' : ''}`} />
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '8px 2px 0', padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--bd2)' }}>
            <div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: 'var(--td)' }}>{selP.name}</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td2)', marginTop: 1 }}>{Math.round(selP.price / (selP as SaleProp).surface).toLocaleString('fr-FR')} €/m² · {(selP as SaleProp).surface} m²</div>
            </div>
            <Price value={fmtPrice(selP.price).value} suffix={fmtPrice(selP.price).suffix} size={22} />
          </div>
          <Cta href={`/stay?visit=${selP.id}`} label={`Visiter · ${selP.name}`} />
        </>
      ) : (
        <Cta href="/stay" label="Élargis tes filtres" mt={10} disabled />
      )}
      <Trust text={isRent ? 'Annulation gratuite · paiement sécurisé · hôtes vérifiés' : 'Agents partenaires · biens vérifiés · accompagnement NIKA'} />
    </div>
  );
}

/* ════════════════════════ ACHAT / VENTE (segment Acheter | Vendre) ════════════════════════ */
function AchatTab() {
  const [seg, setSeg] = useState<'acheter' | 'vendre'>('acheter');
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {([['acheter', 'Acheter'], ['vendre', 'Vendre']] as const).map(([k, l]) => {
          const a = seg === k;
          return (
            <button key={k} onClick={() => setSeg(k)} aria-pressed={a}
              style={{ flex: 1, padding: '7px 4px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${a ? ST : 'var(--bd2)'}`, background: a ? `${ST}1c` : 'transparent', color: a ? ST : 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, transition: 'all .15s' }}>{l}</button>
          );
        })}
      </div>
      {seg === 'acheter' ? <PropertySearch mode="sale" /> : <SellForm />}
    </div>
  );
}

function SellForm() {
  const [kind, setKind] = useState<SaleKind | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [surface, setSurface] = useState(80);
  const [sent, setSent] = useState(false);
  const ready = !!kind && !!area;
  if (sent) return (
    <div style={{ textAlign: 'center', padding: '22px 10px' }}>
      <div style={{ fontSize: 30 }}>✅</div>
      <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 16, color: 'var(--td)', marginTop: 6 }}>Demande envoyée</div>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', marginTop: 4 }}>Un conseiller NIKA vous rappelle sous 24 h avec une estimation gratuite.</div>
      <button onClick={() => setSent(false)} style={{ marginTop: 12, background: 'none', border: 'none', color: ST, cursor: 'pointer', fontFamily: 'var(--fo)', fontSize: 11, textDecoration: 'underline' }}>Estimer un autre bien</button>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td2)', lineHeight: 1.5 }}>Vendez avec NIKA : <strong style={{ color: 'var(--td)' }}>estimation gratuite</strong>, mise en valeur premium, accompagnement de A à Z.</div>
      <div>
        <div style={sectionLbl}>Type de bien</div>
        <div className="hero-domabar" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 6, paddingBottom: 2 }}>
          {SALE_KINDS.map(k => <Chip key={k.key} active={kind === k.key} onClick={() => setKind(kind === k.key ? null : k.key)} label={k.label} emoji={k.emoji} />)}
        </div>
      </div>
      <div>
        <div style={sectionLbl}>Secteur</div>
        <div className="hero-domabar" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 6, paddingBottom: 2 }}>
          {AREAS.map(a => <Chip key={a} small active={area === a} onClick={() => setArea(area === a ? null : a)} label={a} />)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={sectionLbl}>Surface</span>
        <button onClick={() => setSurface(s => Math.max(10, s - 10))} aria-label="Moins" style={miniStep}>−</button>
        <span style={{ fontFamily: 'var(--fn)', fontSize: 19, color: 'var(--td)', minWidth: 64, textAlign: 'center' }}>{surface} m²</span>
        <button onClick={() => setSurface(s => Math.min(1000, s + 10))} aria-label="Plus" style={miniStep}>+</button>
      </div>
      <Cta href="#" onClick={() => ready && setSent(true)} label={ready ? 'Demander mon estimation' : 'Choisis type + secteur'} disabled={!ready} mt={2} />
      <Trust text="Estimation gratuite · sans engagement · réponse sous 24 h" />
    </div>
  );
}

/* ════════════════════════ SPOTS — outil communautaire ════════════════════════ */
function SpotsTab() {
  const [tags, setTags] = useState<SpotTagKey[]>([]);
  const [creating, setCreating] = useState(false);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [extra, setExtra] = useState<Spot[]>([]);

  const all = useMemo(() => [...extra, ...SPOTS], [extra]);
  const results = useMemo(() => all.filter(s => tags.length === 0 || tags.every(t => s.tags.includes(t))), [all, tags]);
  const toggleTag = (k: SpotTagKey) => setTags(a => a.includes(k) ? a.filter(x => x !== k) : [...a, k]);
  const unlock = (id: string) => setUnlocked(s => new Set(s).add(id));

  return (
    <div>
      {/* Manifeste du modèle */}
      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '9px 11px', borderRadius: 12, border: `1px solid ${ST}40`, background: `${ST}12`, marginBottom: 9 }}>
        <span style={{ fontSize: 17, lineHeight: 1.1 }}>🗺️</span>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 10.8, color: 'var(--td2)', lineHeight: 1.45 }}>
          <strong style={{ color: 'var(--td)' }}>Les spots secrets des locaux.</strong> Le lieu est <strong style={{ color: OK }}>gratuit & public</strong> — tu paies juste le bon plan. Chaque spot est <strong style={{ color: ST }}>plafonné</strong> pour rester préservé.
        </div>
      </div>

      {/* Filtre par ambiance + créer */}
      <div className="hero-domabar" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        <Chip active={tags.length === 0} onClick={() => setTags([])} label="Tout" />
        {SPOT_TAGS.map(t => <Chip key={t.key} active={tags.includes(t.key)} onClick={() => toggleTag(t.key)} label={t.label} emoji={t.emoji} />)}
      </div>

      <button onClick={() => setCreating(c => !c)} aria-expanded={creating}
        style={{ width: '100%', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px', borderRadius: 11, cursor: 'pointer', border: `1px dashed ${creating ? ST : ST + '88'}`, background: creating ? `${ST}1c` : `${ST}10`, color: ST, fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        <span aria-hidden style={{ fontSize: 14 }}>{creating ? '×' : '＋'}</span>{creating ? 'Fermer' : 'Partager un spot'}
      </button>

      <AnimatePresence initial={false}>
        {creating && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
            <SpotForm onPublish={s => { setExtra(e => [s, ...e]); setCreating(false); }} onClose={() => setCreating(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste des spots */}
      <motion.div key={results.map(s => s.id).join() + tags.join()} variants={gridV} initial="hidden" animate="show" className="hero-domabar" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto', padding: '10px 2px 4px' }}>
        {results.length === 0 && <div style={{ textAlign: 'center', padding: '18px 0', fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)' }}>Aucun spot avec ces ambiances.</div>}
        {results.map(s => {
          const left = Math.max(0, s.capacity - s.taken);
          const full = left === 0;
          const open = unlocked.has(s.id);
          const isNew = s.reviews === 0;
          return (
            <motion.div variants={itemV} key={s.id} style={{ display: 'flex', gap: 10, padding: 7, borderRadius: 12, border: `1px solid ${open ? OK + '88' : 'var(--bd2)'}`, background: open ? `${OK}10` : 'rgba(255,255,255,0.04)', transition: 'all .2s' }}>
              <span style={{ position: 'relative', flexShrink: 0, width: 78, height: 92, borderRadius: 10, overflow: 'hidden' }}>
                <Thumb grad={SPOT_GRAD[s.tags[0]]} emoji={spotTag(s.tags[0]).emoji} h={92} blur={!open} />
                {!open && <span style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', fontSize: 15 }} aria-hidden>🔒</span>}
              </span>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td2)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{open ? `📍 ${s.zone}` : `≈ ${s.zone}`}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '5px 0 6px' }}>
                  {s.tags.slice(0, 3).map(t => (
                    <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: 'var(--fo)', fontSize: 9, color: 'var(--td2)', padding: '2px 6px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--bd)' }}>
                      <span aria-hidden>{spotTag(t).emoji}</span>{spotTag(t).label}
                    </span>
                  ))}
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Avatar name={s.sharer} size={18} /><span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, color: 'var(--td3)' }}>{isNew ? 'Nouveau' : `⭐ ${s.rating.toFixed(1)}`}</span></span>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, color: full ? '#D44B24' : left <= 5 ? ST : 'var(--td2)' }}>{full ? 'Complet' : `${left} place${left > 1 ? 's' : ''}`}</span>
                </div>
              </div>
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: 'var(--fo)', fontSize: 8.5, fontWeight: 700, color: OK, letterSpacing: '0.03em' }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: OK }} />GRATUIT</span>
                {open ? (
                  <Link href={`/stay?spot=${s.id}`} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 10px', borderRadius: 9, background: `${OK}1f`, border: `1px solid ${OK}`, color: OK, fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>Itinéraire →</Link>
                ) : (
                  <button onClick={() => !full && unlock(s.id)} disabled={full}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '6px 9px', borderRadius: 9, cursor: full ? 'not-allowed' : 'pointer', background: full ? 'rgba(255,255,255,0.06)' : `linear-gradient(180deg, ${ST2}, ${ST})`, border: 'none', color: full ? 'var(--td3)' : '#fff', whiteSpace: 'nowrap', boxShadow: full ? 'none' : `0 4px 14px ${ST}55` }}>
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.85 }}>{full ? '' : 'Débloquer'}</span>
                    <span style={{ fontFamily: 'var(--fn)', fontSize: 16, lineHeight: 1 }}>{full ? '—' : `${s.price}€`}</span>
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
      <Trust text="Lieux gratuits & publics · plafonnés pour préserver · partagés par les locaux" />
    </div>
  );
}

function SpotForm({ onPublish, onClose }: { onPublish: (s: Spot) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [zone, setZone] = useState('');
  const [tags, setTags] = useState<SpotTagKey[]>([]);
  const [capacity, setCapacity] = useState(15);
  const [price, setPrice] = useState(2);
  const ready = name.trim().length > 1 && zone.trim().length > 1 && tags.length > 0;
  const toggleTag = (k: SpotTagKey) => setTags(a => a.includes(k) ? a.filter(x => x !== k) : [...a, k]);
  const publish = () => {
    if (!ready) return;
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `sp-${name}-${zone}`;
    onPublish({ id, name: name.trim(), zone: zone.trim(), tags, rating: 0, reviews: 0, capacity, taken: 0, price, sharer: 'Moi' });
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '11px 2px 4px' }}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du spot (ex : Crique secrète…)" style={inp} maxLength={42} />
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={zone} onChange={e => setZone(e.target.value)} placeholder="Zone (ex : Cap d’Antibes)" style={inp} maxLength={42} />
        <button onClick={() => setZone('Ma position GPS')} title="Utiliser ma position"
          style={{ flexShrink: 0, padding: '0 12px', borderRadius: 8, border: `1px solid ${ST}66`, background: `${ST}14`, color: ST, fontSize: 15, cursor: 'pointer' }}>📍</button>
      </div>
      <div>
        <div style={sectionLbl}>Ambiances du lieu</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {SPOT_TAGS.map(t => <Chip key={t.key} small active={tags.includes(t.key)} onClick={() => toggleTag(t.key)} label={t.label} emoji={t.emoji} />)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={sectionLbl}>Places</span>
          <button onClick={() => setCapacity(c => Math.max(1, c - 1))} aria-label="Moins de places" style={miniStep}>−</button>
          <span style={{ fontFamily: 'var(--fn)', fontSize: 18, color: 'var(--td)', minWidth: 24, textAlign: 'center' }}>{capacity}</span>
          <button onClick={() => setCapacity(c => Math.min(99, c + 1))} aria-label="Plus de places" style={miniStep}>+</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={sectionLbl}>Prix / pers</span>
          <button onClick={() => setPrice(p => Math.max(0, p - 1))} aria-label="Moins cher" style={miniStep}>−</button>
          <span style={{ fontFamily: 'var(--fn)', fontSize: 18, color: 'var(--td)', minWidth: 30, textAlign: 'center' }}>{price === 0 ? 'Don' : `${price}€`}</span>
          <button onClick={() => setPrice(p => Math.min(20, p + 1))} aria-label="Plus cher" style={miniStep}>+</button>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', textAlign: 'center', lineHeight: 1.45 }}>
        Le lieu reste gratuit & public. Tu peux gagner jusqu’à <strong style={{ color: OK }}>{price * capacity} €</strong> en partageant ce bon plan.
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <Cta href="#" onClick={publish} label={ready ? 'Publier le spot' : 'Nom + zone + ambiance'} disabled={!ready} mt={0} />
        <button onClick={onClose} style={{ flexShrink: 0, padding: '0 14px', borderRadius: 12, border: '1px solid var(--bd2)', color: 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 11, cursor: 'pointer', background: 'none' }}>Annuler</button>
      </div>
    </div>
  );
}

/* ════════════════════════ EXPLORE — WOW insolites ════════════════════════ */
function ExploreTab() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9 }}>
        <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15, color: 'var(--td)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Logements insolites</span>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, color: ST }}>41 vérifiés</span>
      </div>
      <motion.div variants={gridV} initial="hidden" animate="show" className="g-2 hero-domabar" style={{ gap: 9, maxHeight: 360, overflowY: 'auto', padding: '2px 2px 4px' }}>
        {EXPLORE.map(w => (
          <motion.div variants={itemV} key={w.slug}>
            <Link href={`/stay/${w.slug}`} style={{ display: 'block', borderRadius: 13, overflow: 'hidden', border: '1px solid var(--bd2)', background: 'rgba(255,255,255,0.04)', textDecoration: 'none' }}>
              <span style={{ position: 'relative', display: 'block', width: '100%', aspectRatio: '4 / 3', overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
                <Thumb grad="linear-gradient(135deg,rgba(224,112,56,.28),rgba(8,104,160,.18))" emoji={WOW_TYPE_EMOJI[w.type] || '🏠'} img={w.cover} h={120} />
                <span style={{ position: 'absolute', top: 6, left: 6, display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 20, background: 'rgba(5,12,23,0.7)', backdropFilter: 'blur(4px)', fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 800, color: ST }}>★ {w.score}/25</span>
              </span>
              <span style={{ display: 'block', padding: '7px 9px 9px' }}>
                <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, color: 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.name}</span>
                <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, marginTop: 3 }}>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, color: 'var(--td2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.place}</span>
                  <Price value={w.price} suffix="/nuit" size={14} />
                </span>
              </span>
            </Link>
          </motion.div>
        ))}
      </motion.div>
      <Cta href="/stay" label="Voir les 41 logements insolites" mt={10} />
      <Trust text="Sélection NIKA · logements insolites vérifiés · réservation directe" />
    </div>
  );
}

/* ════════════════════════ Sous-composants partagés ════════════════════════ */
const miniStep: React.CSSProperties = { width: 28, height: 28, borderRadius: 8, border: `1px solid ${ST}66`, background: `${ST}14`, color: ST, fontSize: 16, cursor: 'pointer', lineHeight: 1 };
const badgeTL: React.CSSProperties = { position: 'absolute', top: 4, left: 4, fontSize: 11, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' };

// Tuile : dégradé + emoji de repli, image optionnelle par-dessus (se masque si 404).
function Thumb({ grad, emoji, h, img, fit = 'cover', blur = false }: { grad: string; emoji: string; h: number; img?: string; fit?: 'cover' | 'contain'; blur?: boolean }) {
  return (
    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: h * 0.4, background: grad }}>
      <span aria-hidden style={blur ? { filter: 'blur(1px)', opacity: 0.9 } : undefined}>{emoji}</span>
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" loading="lazy" decoding="async" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: fit, filter: blur ? 'blur(7px)' : 'none', transform: blur ? 'scale(1.1)' : 'none' }} />
      )}
    </span>
  );
}
// Encoche ✓ vert (sélectionné) / anneau discret (non).
function CheckMark({ on, size = 20 }: { on: boolean; size?: number }) {
  if (on) return (
    <motion.svg initial={{ scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={OK} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 1px 2.5px rgba(0,0,0,0.9))' }}><path d="M20 6 9 17l-5-5" /></motion.svg>
  );
  const r = Math.round(size * 0.72);
  return <span aria-hidden style={{ display: 'block', width: r, height: r, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.55)', background: 'rgba(5,12,23,0.35)', boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }} />;
}
// Avatar à initiales (partageur de spot).
function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const ini = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return <span aria-hidden style={{ flexShrink: 0, width: size, height: size, borderRadius: '50%', background: `${ST}22`, border: `1px solid ${ST}66`, color: ST, fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: size * 0.42, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ini}</span>;
}
// Prix : chiffre en Bebas + suffixe Outfit discret.
function Price({ value, suffix, color = ST, size = 30 }: { value: string | number; suffix?: string; color?: string; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2 }}>
      <span style={{ fontFamily: 'var(--fn)', fontSize: size, lineHeight: 1, letterSpacing: '0.01em', color }}>{value}</span>
      {suffix && <span style={{ fontFamily: 'var(--fo)', fontSize: Math.round(size * 0.34), fontWeight: 700, color: 'var(--td2)' }}>{suffix}</span>}
    </span>
  );
}
// Puce de filtre (multi) — sélectionnée = vert + ✓.
function Chip({ active, onClick, label, emoji, small }: { active: boolean; onClick: () => void; label: string; emoji?: string; small?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: small ? '5px 10px' : '6px 11px', borderRadius: 20, cursor: 'pointer', border: `1px solid ${active ? OK : 'var(--bd2)'}`, background: active ? `${OK}1c` : 'rgba(255,255,255,0.04)', color: active ? OK : 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 11, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap', transition: 'all .15s' }}>
      {active ? <span aria-hidden>✓</span> : emoji ? <span aria-hidden style={{ fontSize: 12 }}>{emoji}</span> : null}{label}
    </button>
  );
}
// Bascule de filtre (vue mer / piscine).
function Toggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 6px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${active ? OK : 'var(--bd2)'}`, background: active ? `${OK}1c` : 'rgba(255,255,255,0.04)', color: active ? OK : 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: active ? 700 : 600, transition: 'all .15s' }}>
      {active && <span aria-hidden>✓</span>}{label}
    </button>
  );
}
// CTA terracotta (lien ou action). disabled → non cliquable.
function Cta({ href, label, mt = 10, disabled = false, onClick }: { href: string; label: string; mt?: number; disabled?: boolean; onClick?: () => void }) {
  const s: React.CSSProperties = {
    flex: 1, marginTop: mt, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', borderRadius: 12,
    background: disabled ? 'rgba(255,255,255,0.08)' : `linear-gradient(180deg, ${ST2}, ${ST})`, color: disabled ? 'var(--td2)' : '#fff',
    fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12.5, letterSpacing: '0.04em', textTransform: 'uppercase',
    boxShadow: disabled ? 'none' : `0 6px 22px ${ST}55`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  };
  const inner = <><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>{!disabled && <span aria-hidden style={{ fontSize: 14 }}>→</span>}</>;
  if (disabled) return <span aria-disabled="true" style={{ ...s, cursor: 'not-allowed' }}>{inner}</span>;
  if (onClick) return <button onClick={onClick} style={{ ...s, border: 'none', cursor: 'pointer' }}>{inner}</button>;
  return <Link href={href} style={s}>{inner}</Link>;
}
// Bandeau de confiance (texte discret sous le CTA).
function Trust({ text }: { text: string }) {
  return <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, color: 'var(--td2)', textAlign: 'center', margin: '9px 2px 1px', letterSpacing: '0.02em' }}>{text}</div>;
}
