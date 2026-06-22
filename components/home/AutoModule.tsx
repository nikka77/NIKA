'use client';
// components/home/AutoModule.tsx — Module AUTO v3, intégré à la carte-héros.
// VTC : pré-commande « taxi maintenant » (forfait, sans destination, ETA approx) OU récap
//       course si une destination est saisie dans la barre. Location : « Louez maintenant »
//       avec un slider BUDGET (citadine → hypercar) + carte véhicule. Dépannage : « express »
//       (ETA dépanneuse) + choix du type de panne + lieu de livraison. « Mes véhicules »
//       (localStorage) déplacé dans une icône discrète (garage) en haut à droite.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { DRIVERS, TOWS, distKm, etaMin, type LngLat } from '@/lib/autoData';

const AZ = '#0094D4';
export type AutoMode = 'vtc' | 'location' | 'depannage';
const TAXI_FLAT = 10;

const MODES: { key: AutoMode; label: string; icon: string }[] = [
  { key: 'vtc', label: 'VTC', icon: '🚖' },
  { key: 'location', label: 'Location', icon: '🔑' },
  { key: 'depannage', label: 'Dépannage', icon: '🔧' },
];

// Catégories Location, du moins cher au plus cher (le slider budget les parcourt).
type Cat = { key: string; name: string; ex: string; price: number; specs: string; img: string; emoji: string };
const CATEGORIES: Cat[] = [
  { key: 'citadine', name: 'Citadine', ex: 'Renault Clio', price: 39, specs: '5 places · agile', img: '/images/auto/citadine.webp', emoji: '🚗' },
  { key: 'monospace', name: 'Monospace', ex: 'Citroën C4 SpaceTourer', price: 55, specs: '7 places · familial', img: '/images/auto/monospace.webp', emoji: '🚐' },
  { key: 'berline', name: 'Berline', ex: 'BMW Série 3', price: 79, specs: '5 places · confort', img: '/images/auto/berline.webp', emoji: '🚘' },
  { key: 'electrique', name: 'Électrique', ex: 'Tesla Model 3', price: 99, specs: '~500 km autonomie', img: '/images/auto/electrique.webp', emoji: '⚡' },
  { key: 'sportive', name: 'Sportive', ex: 'Porsche 718 Cayman', price: 189, specs: '0-100 en 4,2 s', img: '/images/auto/sportive.webp', emoji: '🏎️' },
  { key: 'supercar', name: 'Supercar', ex: 'Lamborghini Huracán', price: 490, specs: 'V10 · 640 ch', img: '/images/auto/supercar.webp', emoji: '🏎️' },
  { key: 'hypercar', name: 'Hypercar', ex: 'Bugatti Chiron', price: 1290, specs: 'série très limitée', img: '/images/auto/hypercar.webp', emoji: '🏁' },
];

// Types de panne (Dépannage sur place)
const BREAKDOWNS = [
  { key: 'batterie', icon: '🔋', label: 'Batterie' },
  { key: 'essence', icon: '⛽', label: 'Panne sèche' },
  { key: 'pneu', icon: '🛞', label: 'Pneu / roue' },
  { key: 'moteur', icon: '🔧', label: 'Moteur' },
  { key: 'cle', icon: '🔑', label: 'Clés' },
  { key: 'accident', icon: '🚨', label: 'Accident' },
];

// Mes véhicules (localStorage)
type Vehicle = { id: string; label: string; plate: string; type: string };
const VKEY = 'nika-vehicles';
const VTYPES = [
  { key: 'car', icon: '🚗', label: 'Voiture' },
  { key: 'moto', icon: '🏍️', label: 'Moto' },
  { key: 'scooter', icon: '🛵', label: 'Scooter' },
  { key: 'van', icon: '🚐', label: 'Utilitaire' },
];
const vicon = (t: string) => VTYPES.find(v => v.key === t)?.icon ?? '🚗';

const NICE_LL: LngLat = { lng: 7.262, lat: 43.7102 };

const card: React.CSSProperties = {
  position: 'relative', maxWidth: 388, margin: '0 auto', background: 'rgba(5,12,23,0.76)', border: `1px solid ${AZ}55`,
  borderRadius: 18, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: 12,
  textAlign: 'left', boxShadow: '0 14px 42px rgba(0,0,0,0.45)', maxHeight: '62vh', overflowY: 'auto',
};
const inp: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--bd2)', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td)', outline: 'none' };

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
  const [breakdown, setBreakdown] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    try { setVehicles(JSON.parse(localStorage.getItem(VKEY) || '[]')); } catch { /* vide */ }
    loaded.current = true;
  }, []);
  useEffect(() => { if (loaded.current) localStorage.setItem(VKEY, JSON.stringify(vehicles)); }, [vehicles]);

  const addVehicle = () => {
    if (!form.label.trim()) return;
    setVehicles(v => [...v, { id: `${Date.now()}`, label: form.label.trim(), plate: form.plate.trim().toUpperCase(), type: form.type }]);
    setForm({ label: '', plate: '', type: 'car' });
    setAdding(false);
  };

  const base = user ?? NICE_LL;
  const km0 = (dx: number, dy: number) => distKm(base.lng, base.lat, base.lng + dx, base.lat + dy);
  const taxiEta = etaMin(km0(DRIVERS[0].dx, DRIVERS[0].dy));
  const towEta = Math.min(...TOWS.map(t => etaMin(km0(t.dx, t.dy))));
  const cat = CATEGORIES[catIdx];

  return (
    <div className="hero-domabar" style={card}>
      {/* En-tête : libellé + icône discrète « Mes véhicules » (garage) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: AZ, boxShadow: `0 0 8px ${AZ}` }} />
          <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--td)' }}>Auto</span>
        </span>
        <button onClick={() => setGarage(g => !g)} aria-expanded={garage} aria-label="Mes véhicules"
          title="Mes véhicules"
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 9px', borderRadius: 20, cursor: 'pointer', border: `1px solid ${garage ? AZ : 'var(--bd2)'}`, background: garage ? `${AZ}1c` : 'rgba(255,255,255,0.04)', color: garage ? AZ : 'var(--td2)', transition: 'all .18s' }}>
          <span style={{ fontSize: 13 }}>🚗</span>
          <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700 }}>{vehicles.length}</span>
        </button>
      </div>

      {/* Panneau garage (replié par défaut, derrière l'icône) */}
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

      {/* Contenu par mode */}
      <AnimatePresence mode="wait">
        <motion.div key={mode + (dest ? '-d' : '')} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>

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
              </div>
              <Cta href={`/auto/vtc?to=${encodeURIComponent(dest.label)}`} label={`Commander · ${trip.price.toFixed(1)} €`} />
            </div>
          ) : (
            // Pré-commande « taxi maintenant » — vient sans destination, forfait, ETA approx.
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, borderRadius: 14, border: `1px solid ${AZ}66`, background: `linear-gradient(135deg, ${AZ}1f, ${AZ}0a)`, padding: '13px 14px' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: '50%', background: `${AZ}26`, border: `1px solid ${AZ}66`, fontSize: 22, flexShrink: 0 }}>🚖</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 16, color: 'var(--td)', letterSpacing: '0.02em' }}>Taxi maintenant</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>Arrive à toi · ~{taxiEta} min · sans destination</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 22, color: AZ, lineHeight: 1 }}>{TAXI_FLAT} €</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 9, color: 'var(--td3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>forfait</div>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', margin: '7px 2px 0' }}>Le compteur démarre à la prise en charge. Ou saisis ta destination dans la barre ↑ pour une estimation.</div>
              <Cta href="/auto/vtc" label={`Commander un taxi · ${TAXI_FLAT} €`} />
            </div>
          ))}

          {/* ─────────── LOCATION ─────────── */}
          {mode === 'location' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15, color: 'var(--td)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Louez maintenant</span>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)' }}>près de toi</span>
              </div>

              {/* Slider budget : du - cher au + cher */}
              <div style={{ margin: '8px 0 4px' }}>
                <input type="range" min={0} max={CATEGORIES.length - 1} step={1} value={catIdx}
                  onChange={e => setCatIdx(Number(e.target.value))} aria-label="Budget"
                  className="auto-budget" style={{ width: '100%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--fo)', fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)', marginTop: 2 }}>
                  <span>€ Citadine</span><span>Budget</span><span>Hypercar €€€</span>
                </div>
              </div>

              {/* Carte véhicule (image i2i cohérente quand dispo, sinon emoji premium) */}
              <AnimatePresence mode="wait">
                <motion.div key={cat.key} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }}
                  style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--bd2)', background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: `radial-gradient(120% 120% at 70% 20%, ${AZ}26, rgba(5,12,23,0.6))`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 56, filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.5))' }}>{cat.emoji}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cat.img} alt={cat.ex} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 16, color: 'var(--td)', textTransform: 'uppercase' }}>{cat.name}</span>
                      <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 17, color: AZ }}>{cat.price} €<span style={{ fontSize: 10, color: 'var(--td3)' }}>/j</span></span>
                    </div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: 1 }}>{cat.ex} · {cat.specs}</div>
                  </div>
                </motion.div>
              </AnimatePresence>
              <Cta href={`/auto/location?cat=${cat.key}`} label={`Louer une ${cat.name.toLowerCase()} →`} />
            </div>
          )}

          {/* ─────────── DÉPANNAGE ─────────── */}
          {mode === 'depannage' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, borderRadius: 14, border: '1px solid rgba(212,75,36,0.5)', background: 'linear-gradient(135deg, rgba(212,75,36,0.16), rgba(212,75,36,0.05))', padding: '11px 13px' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', background: 'rgba(212,75,36,0.22)', border: '1px solid rgba(212,75,36,0.5)', fontSize: 19, flexShrink: 0 }}>🚨</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15.5, color: 'var(--td)', textTransform: 'uppercase' }}>Dépannage express</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>Dépanneuse en route · dès {towEta} min</div>
                </div>
              </div>

              <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)', margin: '11px 2px 6px' }}>Quel est le problème ?</div>
              <div className="g-3" style={{ gap: 6 }}>
                {BREAKDOWNS.map(b => {
                  const a = breakdown === b.key;
                  return (
                    <button key={b.key} onClick={() => setBreakdown(a ? null : b.key)} aria-pressed={a}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '9px 4px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${a ? AZ : 'var(--bd2)'}`, background: a ? `${AZ}1c` : 'rgba(255,255,255,0.04)', transition: 'all .15s' }}>
                      <span style={{ fontSize: 17 }}>{b.icon}</span>
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 600, color: a ? AZ : 'var(--td2)', textAlign: 'center', lineHeight: 1.1 }}>{b.label}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '11px 2px 5px' }}>
                <span style={{ fontSize: 13 }}>📍</span>
                <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--fo)', fontSize: 11.5, color: dest ? 'var(--td)' : 'var(--td3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {dest ? `Livrer à : ${dest.label}` : 'Livrer le véhicule (saisis le lieu ↑)'}
                </span>
                {dest && <button onClick={onClearDest} style={{ background: 'none', border: 'none', color: 'var(--td3)', fontFamily: 'var(--fo)', fontSize: 10.5, cursor: 'pointer', textDecoration: 'underline' }}>changer</button>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['Atelier le plus proche', 'Stockage sécurisé', 'Chez moi'].map(d => <span key={d} style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td2)', padding: '3px 9px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--bd)' }}>{d}</span>)}
              </div>
              <Cta href="/auto/depannage" label={breakdown ? `Dépannage · ${BREAKDOWNS.find(b => b.key === breakdown)?.label}` : 'Demander un dépannage'} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 13.5, color: accent ? AZ : 'var(--td)', marginTop: 1 }}>{value}</div>
    </div>
  );
}
function Cta({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '11px 12px', borderRadius: 12, background: AZ, color: '#fff', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12.5, letterSpacing: '0.04em', textTransform: 'uppercase', boxShadow: `0 6px 22px ${AZ}55` }}>{label}</Link>
  );
}
