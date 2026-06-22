'use client';
// components/home/AutoModule.tsx — Module AUTO v2, intégré à la carte-héros.
// « Mes véhicules » repliable (localStorage) + 3 modes VTC / Location / Dépannage.
// Les entités (chauffeurs, locations, dépanneurs) sont AUSSI des pins sur la carte
// (gérés par le Hero) : taper une carte la sélectionne → son pin se surligne + recadrage.
// VTC : quand une destination est saisie dans la barre, on affiche l'itinéraire estimé.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { DRIVERS, RENTALS, TOWS, distKm, etaMin, type LngLat } from '@/lib/autoData';

const AZ = '#0094D4';
export type AutoMode = 'vtc' | 'location' | 'depannage';

const MODES: { key: AutoMode; label: string; icon: string }[] = [
  { key: 'vtc', label: 'VTC', icon: '🚖' },
  { key: 'location', label: 'Location', icon: '🔑' },
  { key: 'depannage', label: 'Dépannage', icon: '🔧' },
];

// ── Mes véhicules (localStorage) ──
type Vehicle = { id: string; label: string; plate: string; type: string };
const VKEY = 'nika-vehicles';
const VTYPES: { key: string; icon: string; label: string }[] = [
  { key: 'car', icon: '🚗', label: 'Voiture' },
  { key: 'moto', icon: '🏍️', label: 'Moto' },
  { key: 'scooter', icon: '🛵', label: 'Scooter' },
  { key: 'van', icon: '🚐', label: 'Utilitaire' },
];
const vicon = (t: string) => VTYPES.find(v => v.key === t)?.icon ?? '🚗';

const NICE_LL: LngLat = { lng: 7.262, lat: 43.7102 };

const card: React.CSSProperties = {
  maxWidth: 384, margin: '0 auto', background: 'rgba(5,12,23,0.74)', border: `1px solid ${AZ}55`,
  borderRadius: 18, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: 12,
  textAlign: 'left', boxShadow: '0 14px 40px rgba(0,0,0,0.42)', maxHeight: '60vh', overflowY: 'auto',
};
const chip: React.CSSProperties = { fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td2)', padding: '3px 9px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--bd)' };
const inp: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--bd2)', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td)', outline: 'none' };

export type AutoModuleProps = {
  mode: AutoMode; onMode: (m: AutoMode) => void;
  user: LngLat | null;
  sel: string | null; onSelect: (id: string) => void;
  dest: { label: string } | null;
  trip: { km: number; eta: number; price: number } | null;
  onClearDest: () => void;
};

export default function AutoModule({ mode, onMode, user, sel, onSelect, dest, trip, onClearDest }: AutoModuleProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vopen, setVopen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: '', plate: '', type: 'car' });
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
  const removeVehicle = (id: string) => setVehicles(v => v.filter(x => x.id !== id));

  const base = user ?? NICE_LL;
  const km = (dx: number, dy: number) => distKm(base.lng, base.lat, base.lng + dx, base.lat + dy);
  const drivers = [...DRIVERS].map(d => ({ ...d, eta: etaMin(km(d.dx, d.dy)) })).sort((a, b) => a.eta - b.eta);
  const tows = [...TOWS].map(t => ({ ...t, eta: etaMin(km(t.dx, t.dy)) })).sort((a, b) => a.eta - b.eta);

  return (
    <div className="hero-domabar" style={card}>
      {/* ── Mes véhicules (repliable) ── */}
      <button onClick={() => setVopen(o => !o)} aria-expanded={vopen}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--bd)', borderRadius: 12, padding: '9px 12px', cursor: 'pointer' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>🚗</span>
          <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12.5, letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--td)' }}>Mes véhicules</span>
          <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>{vehicles.length}</span>
        </span>
        <span aria-hidden style={{ color: 'var(--td3)', fontSize: 11, transform: vopen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
      </button>

      <AnimatePresence initial={false}>
        {vopen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 2px 2px' }}>
              {vehicles.map(v => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', borderRadius: 9, background: 'rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 16 }}>{vicon(v.type)}</span>
                  <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.label}</span>
                  {v.plate && <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, color: 'var(--td3)', letterSpacing: '0.05em', border: '1px solid var(--bd)', borderRadius: 4, padding: '1px 5px' }}>{v.plate}</span>}
                  <button onClick={() => removeVehicle(v.id)} aria-label={`Supprimer ${v.label}`} style={{ background: 'none', border: 'none', color: 'var(--td3)', cursor: 'pointer', fontSize: 14, padding: '0 2px' }}>×</button>
                </div>
              ))}
              {adding ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 0' }}>
                  <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Nom (ex : Clio grise)" style={inp} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={form.plate} onChange={e => setForm(f => ({ ...f, plate: e.target.value }))} placeholder="Plaque" style={{ ...inp, flex: 1 }} />
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ ...inp, flex: 1 }}>
                      {VTYPES.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={addVehicle} disabled={!form.label.trim()} style={{ flex: 1, padding: '8px', borderRadius: 8, background: AZ, color: '#fff', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: form.label.trim() ? 1 : 0.5 }}>Enregistrer</button>
                    <button onClick={() => setAdding(false)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bd2)', color: 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 11 }}>Annuler</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAdding(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start', background: 'none', border: '1px dashed var(--bd2)', borderRadius: 8, padding: '6px 11px', cursor: 'pointer', fontFamily: 'var(--fo)', fontSize: 11, color: AZ }}>+ Ajouter un véhicule</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sélecteur de mode ── */}
      <div style={{ display: 'flex', gap: 6, margin: '10px 0' }}>
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

      {/* ── Contenu par mode ── */}
      <AnimatePresence mode="wait">
        <motion.div key={mode + (dest ? '-trip' : '')} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
          {mode === 'vtc' && (dest && trip ? (
            <div>
              {/* Récap course estimée */}
              <div style={{ borderRadius: 12, border: `1px solid ${AZ}66`, background: `${AZ}14`, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>📍</span>
                  <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dest.label}</span>
                  <button onClick={onClearDest} style={{ background: 'none', border: 'none', color: 'var(--td3)', fontFamily: 'var(--fo)', fontSize: 10.5, cursor: 'pointer', textDecoration: 'underline' }}>changer</button>
                </div>
                <div style={{ display: 'flex', gap: 14 }}>
                  <Metric label="Prise en charge" value={`${drivers[0].eta} min`} />
                  <Metric label="Trajet" value={`${trip.km.toFixed(1)} km · ${trip.eta} min`} />
                  <Metric label="Estimation" value={`${trip.price.toFixed(1)} €`} accent />
                </div>
              </div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', margin: '7px 2px 0' }}>{drivers[0].name} · {drivers[0].car} · ★ {drivers[0].rating}</div>
              <Cta href={`/auto/vtc?to=${encodeURIComponent(dest.label)}`} label={`Commander · ${trip.price.toFixed(1)} €`} />
            </div>
          ) : (
            <div>
              <Row label={`${drivers.length} chauffeurs autour de toi`} hint="Choisis ta destination dans la barre ↑" />
              <List>
                {drivers.map(d => (
                  <Item key={d.id} active={sel === d.id} onClick={() => onSelect(d.id)} icon="🚖"
                    title={<>{d.name} <span style={{ color: 'var(--gold)', fontWeight: 600 }}>★ {d.rating}</span></>}
                    sub={d.car} right={`${d.eta} min`} />
                ))}
              </List>
            </div>
          ))}

          {mode === 'location' && (
            <div>
              <Row label={`${RENTALS.length} véhicules dispo près de toi`} />
              <List>
                {RENTALS.map(r => {
                  const d = km(r.dx, r.dy);
                  return (
                    <Item key={r.id} active={sel === r.id} onClick={() => onSelect(r.id)} icon="🔑"
                      title={r.model} sub={`${r.company} · ${r.mode}`} right={r.price} rightSub={`${d.toFixed(1)} km`} />
                  );
                })}
              </List>
              <Cta href="/auto/location" label="Voir toutes les locations →" />
            </div>
          )}

          {mode === 'depannage' && (
            <div>
              <Row label={`Dépanneur · dès ${tows[0].eta} min`} hint="Où livrer ton véhicule ?" />
              <List>
                {tows.map(t => (
                  <Item key={t.id} active={sel === t.id} onClick={() => onSelect(t.id)} icon="🔧"
                    title={<>{t.name} <span style={{ color: 'var(--gold)', fontWeight: 600 }}>★ {t.rating}</span></>}
                    sub="Disponible 24/7" right={`${t.eta} min`} />
                ))}
              </List>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {['Livraison à un lieu', 'Réparation (atelier)', 'Stockage sécurisé'].map(d => <span key={d} style={chip}>{d}</span>)}
              </div>
              <Cta href="/auto/depannage" label="Demander un dépannage →" />
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
function Row({ label, hint }: { label: string; hint?: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, color: 'var(--td)' }}>{label}</div>
      {hint && <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', marginTop: 2 }}>{hint}</div>}
    </div>
  );
}
function List({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>{children}</div>;
}
function Item({ active, onClick, icon, title, sub, right, rightSub }: { active: boolean; onClick: () => void; icon: string; title: React.ReactNode; sub: string; right: string; rightSub?: string }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', width: '100%', border: `1px solid ${active ? AZ : 'transparent'}`, background: active ? `${AZ}1c` : 'rgba(255,255,255,0.04)', boxShadow: active ? `0 0 14px ${AZ}3a` : 'none', transition: 'all .18s' }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: '50%', background: `${AZ}22`, border: `1px solid ${AZ}55`, fontSize: 14, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>{sub}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 13, color: AZ }}>{right}</div>
        {rightSub && <div style={{ fontFamily: 'var(--fo)', fontSize: 9, color: 'var(--td3)' }}>{rightSub}</div>}
      </div>
    </button>
  );
}
function Cta({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={{ marginTop: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '10px 12px', borderRadius: 11, background: AZ, color: '#fff', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase', boxShadow: `0 6px 20px ${AZ}55` }}>{label}</Link>
  );
}
