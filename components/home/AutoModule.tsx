'use client';
// components/home/AutoModule.tsx — Module AUTO v4, intégré à la carte-héros.
// VTC : Maintenant (taxi forfait) / Programmer (date-heure) / Réserver (x heures) + visuel taxi.
//       Récap course si destination saisie dans la barre. Location : slider BUDGET → 4 véhicules
//       de la catégorie (image en fond, sélectionnables). Dépannage : « express » animé + 6
//       types de panne en boutons-visuels sélectionnables + lieu de livraison.
//       « Mes véhicules » (localStorage) dans une icône discrète (garage).
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { DRIVERS, TOWS, distKm, etaMin, type LngLat } from '@/lib/autoData';

const AZ = '#0094D4';
const OK = '#22DD88'; // vert « validé » — encoche de sélection dépannage
export type AutoMode = 'vtc' | 'location' | 'depannage';
const TAXI_FLAT = 10;
const HOUR_RATE = 35;

const MODES: { key: AutoMode; label: string; icon: string }[] = [
  { key: 'vtc', label: 'VTC', icon: '🚖' },
  { key: 'location', label: 'Location', icon: '🔑' },
  { key: 'depannage', label: 'Dépannage', icon: '🔧' },
];

// Location : catégories du - cher au + cher, chacune avec 4 véhicules (même tarif).
type Car = { model: string; img: string };
type Cat = { key: string; name: string; price: number; specs: string; emoji: string; cars: Car[] };
const im = (slug: string, n: number) => `/images/auto/${slug}${n === 1 ? '' : '-' + n}.webp`;
const mk = (slug: string, models: string[]): Car[] => models.map((model, i) => ({ model, img: im(slug, i + 1) }));
const CATEGORIES: Cat[] = [
  { key: 'citadine', name: 'Citadine', price: 39, specs: 'agile · ville', emoji: '🚗', cars: mk('citadine', ['Renault Clio', 'Peugeot 208', 'VW Polo', 'Toyota Yaris']) },
  { key: 'monospace', name: 'Monospace', price: 55, specs: '7 places', emoji: '🚐', cars: mk('monospace', ['Citroën SpaceTourer', 'Renault Espace', 'VW Touran', 'Ford Galaxy']) },
  { key: 'berline', name: 'Berline', price: 79, specs: 'confort', emoji: '🚘', cars: mk('berline', ['BMW Série 3', 'Audi A4', 'Mercedes C', 'Peugeot 508']) },
  { key: 'electrique', name: 'Électrique', price: 99, specs: '~500 km', emoji: '⚡', cars: mk('electrique', ['Tesla Model 3', 'Hyundai Ioniq', 'Kia EV6', 'Renault Mégane E']) },
  { key: 'sportive', name: 'Sportive', price: 189, specs: '0-100 < 5 s', emoji: '🏎️', cars: mk('sportive', ['Porsche 718', 'Audi TT RS', 'BMW M2', 'Alpine A110']) },
  { key: 'supercar', name: 'Supercar', price: 490, specs: 'V8/V10', emoji: '🏎️', cars: mk('supercar', ['Lamborghini Huracán', 'Ferrari F8', 'McLaren GT', 'Audi R8']) },
  { key: 'hypercar', name: 'Hypercar', price: 1290, specs: 'série limitée', emoji: '🏁', cars: mk('hypercar', ['Bugatti Chiron', 'Koenigsegg', 'Pagani Huayra', 'Rimac Nevera']) },
];

// Dépannage : types de panne (visuel généré + repli emoji)
const BREAKDOWNS = [
  { key: 'batterie', img: '/images/auto/break-batterie.webp', emoji: '🔋', label: 'Batterie' },
  { key: 'essence', img: '/images/auto/break-essence.webp', emoji: '⛽', label: 'Panne sèche' },
  { key: 'pneu', img: '/images/auto/break-pneu.webp', emoji: '🛞', label: 'Pneu / roue' },
  { key: 'moteur', img: '/images/auto/break-moteur.webp', emoji: '🔧', label: 'Moteur' },
  { key: 'cle', img: '/images/auto/break-cle.webp', emoji: '🔑', label: 'Clés' },
  { key: 'accident', img: '/images/auto/break-accident.webp', emoji: '🚨', label: 'Accident' },
];

// Dépannage : où livrer le véhicule (visuel généré + repli emoji) — choix UNIQUE
const DESTS = [
  { key: 'atelier', img: '/images/auto/dest-atelier.webp', emoji: '🛠️', label: 'Atelier le plus proche' },
  { key: 'stockage', img: '/images/auto/dest-stockage.webp', emoji: '🔒', label: 'Stockage sécurisé' },
  { key: 'maison', img: '/images/auto/dest-maison.webp', emoji: '🏠', label: 'Chez moi' },
];

// Mes véhicules (localStorage)
type Vehicle = { id: string; label: string; plate: string; type: string };
const VKEY = 'nika-vehicles';
const VTYPES = [
  { key: 'car', icon: '🚗', label: 'Voiture' }, { key: 'moto', icon: '🏍️', label: 'Moto' },
  { key: 'scooter', icon: '🛵', label: 'Scooter' }, { key: 'van', icon: '🚐', label: 'Utilitaire' },
];
const vicon = (t: string) => VTYPES.find(v => v.key === t)?.icon ?? '🚗';

const NICE_LL: LngLat = { lng: 7.262, lat: 43.7102 };
const card: React.CSSProperties = {
  position: 'relative', maxWidth: 392, margin: '0 auto', background: 'rgba(5,12,23,0.78)', border: `1px solid ${AZ}55`,
  borderRadius: 18, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: 12,
  textAlign: 'left', boxShadow: '0 14px 42px rgba(0,0,0,0.45)', maxHeight: '64vh', overflowY: 'auto',
};
const inp: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--bd2)', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td)', outline: 'none' };
// <img> de fond avec repli emoji (l'emoji est dessous, l'image le couvre si elle charge)
function CarBg({ img, emoji, h, fit = 'cover' }: { img: string; emoji: string; h: number; fit?: 'cover' | 'contain' }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: h * 0.42 }}>
      <span aria-hidden>{emoji}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt="" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: fit }} />
    </div>
  );
}
// Fond VIDÉO en boucle (taxi en mouvement). Empilement de replis : emoji ← image (poster) ← vidéo.
function VideoBg({ src, poster, emoji, h }: { src: string; poster: string; emoji: string; h: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: h * 0.42 }}>
      <span aria-hidden>{emoji}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={poster} alt="" aria-hidden onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <video autoPlay loop muted playsInline preload="auto" poster={poster} aria-hidden
        onError={e => { (e.currentTarget as HTMLVideoElement).style.display = 'none'; }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}>
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}
// Encoche de sélection : ✓ vert sur fond transparent (sélectionné) / anneau discret (non)
function CheckMark({ on, size = 20 }: { on: boolean; size?: number }) {
  if (on) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={OK} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 1px 2.5px rgba(0,0,0,0.9))' }}><path d="M20 6 9 17l-5-5" /></svg>
  );
  const r = Math.round(size * 0.72);
  return <span aria-hidden style={{ display: 'block', width: r, height: r, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.55)', background: 'rgba(5,12,23,0.35)', boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }} />;
}

export type AutoModuleProps = {
  mode: AutoMode; onMode: (m: AutoMode) => void;
  user: LngLat | null;
  dest: { label: string } | null;
  trip: { km: number; eta: number; price: number } | null;
  onClearDest: () => void;
};

export default function AutoModule({ mode, onMode, user, dest, trip, onClearDest }: AutoModuleProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [garage, setGarage] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: '', plate: '', type: 'car' });
  const [catIdx, setCatIdx] = useState(0);
  const [carIdx, setCarIdx] = useState(0);
  const [breakdowns, setBreakdowns] = useState<string[]>([]);
  const [depDest, setDepDest] = useState<string | null>(null);
  const [vtcWhen, setVtcWhen] = useState<'now' | 'schedule' | 'hours'>('now');
  const [schedAt, setSchedAt] = useState('');
  const [hours, setHours] = useState(3);
  const loaded = useRef(false);

  useEffect(() => {
    try { setVehicles(JSON.parse(localStorage.getItem(VKEY) || '[]')); } catch { /* vide */ }
    loaded.current = true;
  }, []);
  useEffect(() => { if (loaded.current) localStorage.setItem(VKEY, JSON.stringify(vehicles)); }, [vehicles]);

  const addVehicle = () => {
    if (!form.label.trim()) return;
    setVehicles(v => [...v, { id: `${Date.now()}`, label: form.label.trim(), plate: form.plate.trim().toUpperCase(), type: form.type }]);
    setForm({ label: '', plate: '', type: 'car' }); setAdding(false);
  };

  const base = user ?? NICE_LL;
  const km0 = (dx: number, dy: number) => distKm(base.lng, base.lat, base.lng + dx, base.lat + dy);
  const taxiEta = etaMin(km0(DRIVERS[0].dx, DRIVERS[0].dy));
  const towEta = Math.min(...TOWS.map(t => etaMin(km0(t.dx, t.dy))));
  const cat = CATEGORIES[catIdx];
  const selCar = cat.cars[Math.min(carIdx, cat.cars.length - 1)];

  return (
    <div className="hero-domabar" style={card}>
      {/* En-tête + icône discrète « Mes véhicules » */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: AZ, boxShadow: `0 0 8px ${AZ}` }} />
          <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--td)' }}>Auto</span>
        </span>
        <button onClick={() => setGarage(g => !g)} aria-expanded={garage} aria-label="Mes véhicules" title="Mes véhicules"
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 9px', borderRadius: 20, cursor: 'pointer', border: `1px solid ${garage ? AZ : 'var(--bd2)'}`, background: garage ? `${AZ}1c` : 'rgba(255,255,255,0.04)', color: garage ? AZ : 'var(--td2)', transition: 'all .18s' }}>
          <span style={{ fontSize: 13 }}>🚗</span><span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700 }}>{vehicles.length}</span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {garage && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '2px 2px 10px' }}>
              {vehicles.map(v => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', borderRadius: 9, background: 'rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 16 }}>{vicon(v.type)}</span>
                  <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.label}</span>
                  {v.plate && <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, color: 'var(--td3)', letterSpacing: '0.05em', border: '1px solid var(--bd)', borderRadius: 4, padding: '1px 5px' }}>{v.plate}</span>}
                  <button onClick={() => setVehicles(vs => vs.filter(x => x.id !== v.id))} aria-label={`Supprimer ${v.label}`} style={{ background: 'none', border: 'none', color: 'var(--td3)', cursor: 'pointer', fontSize: 14 }}>×</button>
                </div>
              ))}
              {adding ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Nom (ex : Clio grise)" style={inp} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={form.plate} onChange={e => setForm(f => ({ ...f, plate: e.target.value }))} placeholder="Plaque" style={{ ...inp, flex: 1 }} />
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ ...inp, flex: 1 }}>
                      {VTYPES.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={addVehicle} disabled={!form.label.trim()} style={{ flex: 1, padding: '8px', borderRadius: 8, background: AZ, color: '#fff', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', opacity: form.label.trim() ? 1 : 0.5 }}>Enregistrer</button>
                    <button onClick={() => setAdding(false)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bd2)', color: 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 11 }}>Annuler</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAdding(true)} style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed var(--bd2)', borderRadius: 8, padding: '6px 11px', cursor: 'pointer', fontFamily: 'var(--fo)', fontSize: 11, color: AZ }}>+ Ajouter un véhicule</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sélecteur de mode */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {MODES.map(m => {
          const a = m.key === mode;
          return (
            <button key={m.key} onClick={() => onMode(m.key)} aria-pressed={a}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 4px', borderRadius: 11, cursor: 'pointer', border: `1px solid ${a ? AZ : 'var(--bd2)'}`, background: a ? `${AZ}1f` : 'transparent', boxShadow: a ? `0 0 14px ${AZ}44` : 'none', transition: 'all .2s' }}>
              <span style={{ fontSize: 16 }}>{m.icon}</span>
              <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 10.5, letterSpacing: '0.03em', textTransform: 'uppercase', color: a ? AZ : 'var(--td2)' }}>{m.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={mode + (mode === 'vtc' && dest ? '-d' : mode === 'vtc' ? '-' + vtcWhen : '')} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>

        {/* ─────────── VTC ─────────── */}
        {mode === 'vtc' && (dest && trip ? (
          <div>
            <div style={{ borderRadius: 12, border: `1px solid ${AZ}66`, background: `${AZ}14`, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>📍</span>
                <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dest.label}</span>
                <button onClick={onClearDest} style={{ background: 'none', border: 'none', color: 'var(--td3)', fontFamily: 'var(--fo)', fontSize: 10.5, cursor: 'pointer', textDecoration: 'underline' }}>changer</button>
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                <Metric label="Prise en charge" value={`${taxiEta} min`} />
                <Metric label="Trajet" value={`${trip.km.toFixed(1)} km · ${trip.eta} min`} />
                <Metric label="Estimation" value={`${trip.price.toFixed(1)} €`} accent />
              </div>
              <Cta href={`/auto/vtc?to=${encodeURIComponent(dest.label)}`} label={`Commander un taxi · ${trip.price.toFixed(1)} €`} mt={11} />
            </div>
          </div>
        ) : (
          <div>
            {/* Quand ? */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 9 }}>
              {([['now', 'Maintenant'], ['schedule', 'Programmer'], ['hours', 'Réserver']] as const).map(([k, lbl]) => {
                const a = vtcWhen === k;
                return (
                  <button key={k} onClick={() => setVtcWhen(k)} aria-pressed={a}
                    style={{ flex: 1, padding: '7px 4px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${a ? AZ : 'var(--bd2)'}`, background: a ? `${AZ}1c` : 'transparent', color: a ? AZ : 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, transition: 'all .15s' }}>{lbl}</button>
                );
              })}
            </div>

            {/* Carte taxi : vidéo taxi en boucle + action « Commander » intégrée */}
            <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${AZ}66` }}>
              {/* Zone visuelle — vidéo du taxi en mouvement (repli image puis emoji) */}
              <div style={{ position: 'relative', minHeight: 96 }}>
                <VideoBg src="/videos/auto/taxi.mp4" poster="/images/auto/taxi.webp" emoji="🚖" h={96} />
                <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(5,12,23,0.92) 28%, rgba(5,12,23,0.25) 100%)' }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 16, color: 'var(--td)' }}>
                      {vtcWhen === 'now' ? 'Taxi maintenant' : vtcWhen === 'schedule' ? 'Programmer' : 'Réserver au temps'}
                    </div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td2)' }}>
                      {vtcWhen === 'now' ? `Arrive à toi · ~${taxiEta} min` : vtcWhen === 'schedule' ? (schedAt.slice(11, 16) ? `Programmé · ${schedAt.slice(8, 10)}/${schedAt.slice(5, 7)} à ${schedAt.slice(11, 16)}` : 'Choisis la date et l’heure') : `${hours} h à disposition`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 21, color: AZ, lineHeight: 1 }}>
                      {vtcWhen === 'hours' ? `${hours * HOUR_RATE} €` : `${TAXI_FLAT} €`}
                    </div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 9, color: 'var(--td3)', textTransform: 'uppercase' }}>{vtcWhen === 'hours' ? `${HOUR_RATE} €/h` : 'forfait'}</div>
                  </div>
                </div>
              </div>
              {/* Zone action intégrée — option éventuelle + bouton Commander (Maintenant / Programmer / Réserver) */}
              <div style={{ background: 'rgba(5,12,23,0.8)', borderTop: `1px solid ${AZ}33`, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {vtcWhen === 'schedule' && (
                  <SchedulePicker value={schedAt} onChange={setSchedAt} />
                )}
                {vtcWhen === 'hours' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                    <button onClick={() => setHours(h => Math.max(1, h - 1))} style={stepBtn}>−</button>
                    <span style={{ fontFamily: 'var(--fn)', fontSize: 24, color: 'var(--td)', minWidth: 54, textAlign: 'center' }}>{hours} h</span>
                    <button onClick={() => setHours(h => Math.min(12, h + 1))} style={stepBtn}>+</button>
                  </div>
                )}
                <Cta href="/auto/vtc" label={vtcWhen === 'now' ? `Commander un taxi · ${TAXI_FLAT} €` : vtcWhen === 'schedule' ? `Commander un taxi · programmer · ${TAXI_FLAT} €` : `Commander un taxi · ${hours} h · ${hours * HOUR_RATE} €`} mt={0} />
              </div>
            </div>
          </div>
        ))}

        {/* ─────────── LOCATION ─────────── */}
        {mode === 'location' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15, color: 'var(--td)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Louez maintenant</span>
              <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 16, color: AZ }}>{cat.price} €<span style={{ fontSize: 10, color: 'var(--td3)' }}>/j</span></span>
            </div>
            <div style={{ margin: '6px 0 2px' }}>
              <input type="range" min={0} max={CATEGORIES.length - 1} step={1} value={catIdx}
                onChange={e => { setCatIdx(Number(e.target.value)); setCarIdx(0); }} aria-label="Budget" className="auto-budget" style={{ width: '100%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--fo)', fontSize: 9, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--td3)', marginTop: 2 }}>
                <span>€ Citadine</span><span style={{ color: AZ, fontWeight: 700 }}>{cat.name}</span><span>Hypercar €€€</span>
              </div>
            </div>

            {/* 4 véhicules de la catégorie — liste VERTICALE défilante (vignette + infos, sélectionnables) */}
            <div className="hero-domabar" style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 236, overflowY: 'auto', padding: '8px 2px 4px' }}>
              {cat.cars.map((c, i) => {
                const a = i === carIdx;
                return (
                  <button key={c.model} onClick={() => setCarIdx(i)} aria-pressed={a}
                    style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: 6, borderRadius: 12, cursor: 'pointer', border: `2px solid ${a ? AZ : 'var(--bd2)'}`, boxShadow: a ? `0 0 16px ${AZ}44` : 'none', background: a ? `${AZ}14` : 'rgba(255,255,255,0.04)', textAlign: 'left', transition: 'all .18s' }}>
                    <span style={{ position: 'relative', flexShrink: 0, width: 116, height: 66, borderRadius: 9, overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
                      <CarBg img={c.img} emoji={cat.emoji} h={66} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: a ? AZ : 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.model}</span>
                      <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)', marginTop: 2 }}>{cat.specs} · {cat.price} €/j</span>
                    </span>
                    {a
                      ? <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: AZ, color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                      : <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--bd2)' }} />}
                  </button>
                );
              })}
            </div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)', margin: '4px 2px 0' }}>{selCar.model} · {cat.specs} · livraison ou retrait</div>
            <Cta href={`/auto/location?cat=${cat.key}`} label={`Louer · ${selCar.model}`} />
          </div>
        )}

        {/* ─────────── DÉPANNAGE ─────────── */}
        {mode === 'depannage' && (
          <div>
            <div className="dep-express" style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 11, borderRadius: 14, border: '1px solid rgba(212,75,36,0.5)', background: 'linear-gradient(135deg, rgba(212,75,36,0.18), rgba(212,75,36,0.05))', padding: '11px 13px' }}>
              <span className="dep-beacon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', background: 'rgba(212,75,36,0.24)', border: '1px solid rgba(212,75,36,0.55)', fontSize: 19, flexShrink: 0 }}>🚨</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15.5, color: 'var(--td)', textTransform: 'uppercase' }}>Dépannage express</div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td2)' }}>Dépanneuse en route · dès {towEta} min</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '12px 2px 8px' }}>
              <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)' }}>Quel est le problème ?</span>
              {breakdowns.length > 0 && <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 800, color: OK }}>{breakdowns.length} sélectionné{breakdowns.length > 1 ? 's' : ''}</span>}
            </div>
            <div className="g-3" style={{ gap: 9 }}>
              {BREAKDOWNS.map(b => {
                const a = breakdowns.includes(b.key);
                return (
                  <button key={b.key} onClick={() => setBreakdowns(s => s.includes(b.key) ? s.filter(k => k !== b.key) : [...s, b.key])} aria-pressed={a}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: 0, cursor: 'pointer', border: 'none', background: 'none', transition: 'all .15s' }}>
                    <span style={{ position: 'relative', width: 72, height: 72, borderRadius: 16, overflow: 'hidden', display: 'block', boxShadow: a ? `0 0 0 2px ${OK}, 0 4px 16px ${OK}55` : 'none', opacity: a ? 1 : 0.86, transition: 'all .15s' }}>
                      <CarBg img={b.img} emoji={b.emoji} h={72} fit="cover" />
                      <span style={{ position: 'absolute', top: 5, right: 5 }}><CheckMark on={a} size={22} /></span>
                    </span>
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: a ? 800 : 600, color: a ? OK : 'var(--td2)', textAlign: 'center', lineHeight: 1.1 }}>{b.label}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)', margin: '13px 2px 8px' }}>Où livrer le véhicule ?</div>
            <div className="g-3" style={{ gap: 9 }}>
              {DESTS.map(d => {
                const a = depDest === d.key;
                return (
                  <button key={d.key} onClick={() => setDepDest(a ? null : d.key)} aria-pressed={a}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 0, cursor: 'pointer', border: 'none', background: 'none', transition: 'all .15s' }}>
                    <span style={{ position: 'relative', width: 54, height: 54, borderRadius: 14, overflow: 'hidden', display: 'block', boxShadow: a ? `0 0 0 2px ${OK}, 0 3px 12px ${OK}55` : 'none', opacity: a ? 1 : 0.86, transition: 'all .15s' }}>
                      <CarBg img={d.img} emoji={d.emoji} h={54} fit="cover" />
                      <span style={{ position: 'absolute', top: 3, right: 3 }}><CheckMark on={a} size={17} /></span>
                    </span>
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: a ? 800 : 600, color: a ? OK : 'var(--td2)', textAlign: 'center', lineHeight: 1.05 }}>{d.label}</span>
                  </button>
                );
              })}
            </div>
            {dest && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '8px 2px 0' }}>
                <span style={{ fontSize: 12 }}>📍</span>
                <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Adresse : {dest.label}</span>
                <button onClick={onClearDest} style={{ background: 'none', border: 'none', color: 'var(--td3)', fontFamily: 'var(--fo)', fontSize: 10.5, cursor: 'pointer', textDecoration: 'underline' }}>changer</button>
              </div>
            )}
            <Cta href="/auto/depannage" label={breakdowns.length === 0 ? 'Demander un dépannage' : breakdowns.length === 1 ? `Dépannage · ${BREAKDOWNS.find(b => b.key === breakdowns[0])?.label}` : `Dépannage · ${breakdowns.length} problèmes`} />
          </div>
        )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const stepBtn: React.CSSProperties = { width: 40, height: 40, borderRadius: 10, border: `1px solid ${AZ}66`, background: `${AZ}14`, color: AZ, fontSize: 22, cursor: 'pointer', lineHeight: 1 };
function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 13.5, color: accent ? AZ : 'var(--td)', marginTop: 1 }}>{value}</div>
    </div>
  );
}
function Cta({ href, label, mt = 10 }: { href: string; label: string; mt?: number }) {
  return (
    <Link href={href} style={{ marginTop: mt, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '11px 12px', borderRadius: 12, background: AZ, color: '#fff', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12.5, letterSpacing: '0.04em', textTransform: 'uppercase', boxShadow: `0 6px 22px ${AZ}55` }}>{label}</Link>
  );
}

// Sélecteur date+heure premium (inspiré 21st.dev) — remplace l'<input datetime-local> natif.
// value = 'YYYY-MM-DDTHH:mm' (heure optionnelle). Puces jour + créneaux horaires, style NIKA.
const schedLbl: React.CSSProperties = { fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)', margin: '0 2px 5px' };
function SchedulePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [days, setDays] = useState<{ key: string; label: string; sub: string }[]>([]);
  useEffect(() => {
    const now = new Date();
    setDays(Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = i === 0 ? 'Auj.' : i === 1 ? 'Demain' : d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
      const sub = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '');
      return { key, label, sub };
    }));
  }, []);
  const times = useMemo(() => {
    const t: string[] = [];
    for (let h = 6; h <= 23; h++) for (const m of [0, 30]) t.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    return t;
  }, []);
  const day = value.slice(0, 10);
  const time = value.slice(11, 16);
  const set = (d: string, t: string) => onChange(d ? `${d}T${t}` : '');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div>
        <div style={schedLbl}>Jour</div>
        <div className="hero-domabar" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {days.map(d => {
            const a = day === d.key;
            return (
              <button key={d.key} type="button" onClick={() => set(d.key, time)} aria-pressed={a}
                style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, minWidth: 50, padding: '6px 9px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${a ? AZ : 'var(--bd2)'}`, background: a ? `${AZ}1f` : 'rgba(255,255,255,0.04)', transition: 'all .15s' }}>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: a ? AZ : 'var(--td)', textTransform: 'capitalize' }}>{d.label}</span>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 8.5, color: a ? AZ : 'var(--td3)', textTransform: 'capitalize' }}>{d.sub}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div style={schedLbl}>Heure</div>
        <div className="hero-domabar" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {times.map(t => {
            const a = time === t;
            return (
              <button key={t} type="button" onClick={() => set(day || days[0]?.key || '', t)} aria-pressed={a}
                style={{ flexShrink: 0, padding: '7px 12px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${a ? AZ : 'var(--bd2)'}`, background: a ? `${AZ}1f` : 'rgba(255,255,255,0.04)', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: a ? 700 : 500, color: a ? AZ : 'var(--td2)', transition: 'all .15s' }}>{t}</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
