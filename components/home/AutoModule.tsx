'use client';
// components/home/AutoModule.tsx — Module AUTO (réplique perso du module FOOD).
// « Mes véhicules » repliable (CRUD localStorage) + sélecteur 3 modes
// VTC (défaut) / Location / Dépannage, avec contenu + ETA par mode (données démo v1).
// Le `mode` est contrôlé par le Hero (la barre de recherche du haut morphe avec lui).
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const AZ = '#0094D4';
export type AutoMode = 'vtc' | 'location' | 'depannage';

const MODES: { key: AutoMode; label: string; icon: string }[] = [
  { key: 'vtc', label: 'VTC', icon: '🚖' },
  { key: 'location', label: 'Location', icon: '🔑' },
  { key: 'depannage', label: 'Dépannage', icon: '🔧' },
];

// ── Données démo (v1 — brancher le vrai backend plus tard) ──
const DRIVERS = [
  { name: 'Karim', car: 'Tesla Model 3', eta: 4, rating: 4.9 },
  { name: 'Sofia', car: 'Mercedes Classe E', eta: 7, rating: 4.8 },
  { name: 'Yanis', car: 'Peugeot 508', eta: 9, rating: 4.7 },
];
const RENTALS = [
  { company: 'Nice Auto Loc', model: 'Renault Clio', price: '39 €/j', mode: 'Livraison' },
  { company: 'Riviera Rent', model: 'Fiat 500 cabrio', price: '59 €/j', mode: 'Retrait' },
  { company: 'AzurCars', model: 'Tesla Model 3', price: '95 €/j', mode: 'Livraison' },
];
const DEPANNAGE_ETA = 18;
const DEPANNAGE_DESTS = ['Livraison à un lieu', 'Réparation (atelier)', 'Stockage sécurisé'];

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

const card: React.CSSProperties = {
  maxWidth: 384, margin: '0 auto', background: 'rgba(5,12,23,0.72)', border: `1px solid ${AZ}55`,
  borderRadius: 18, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: 12,
  textAlign: 'left', boxShadow: '0 10px 30px rgba(0,0,0,0.35)', maxHeight: '58vh', overflowY: 'auto',
};
const chip: React.CSSProperties = { fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td2)', padding: '3px 9px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--bd)' };

export default function AutoModule({ mode, onMode }: { mode: AutoMode; onMode: (m: AutoMode) => void }) {
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
        <motion.div key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
          {mode === 'vtc' && (
            <div>
              <Row label={`Chauffeur le plus proche · ${DRIVERS[0].eta} min`} hint="Choisis ta destination dans la barre ↑" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {DRIVERS.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: '50%', background: `${AZ}22`, border: `1px solid ${AZ}55`, fontSize: 14 }}>🚖</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: 'var(--td)' }}>{d.name} <span style={{ color: 'var(--gold)', fontWeight: 600 }}>★ {d.rating}</span></div>
                      <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>{d.car}</div>
                    </div>
                    <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 13, color: AZ }}>{d.eta} min</span>
                  </div>
                ))}
              </div>
              <Cta href="/auto/vtc" label="Commander un VTC →" />
            </div>
          )}

          {mode === 'location' && (
            <div>
              <Row label={`${RENTALS.length} véhicules disponibles près de toi`} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {RENTALS.map(r => (
                  <div key={r.company + r.model} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: '50%', background: `${AZ}22`, border: `1px solid ${AZ}55`, fontSize: 14 }}>🔑</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.model}</div>
                      <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>{r.company} · {r.mode}</div>
                    </div>
                    <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12.5, color: AZ }}>{r.price}</span>
                  </div>
                ))}
              </div>
              <Cta href="/auto/location" label="Voir les locations →" />
            </div>
          )}

          {mode === 'depannage' && (
            <div>
              <Row label={`Dépanneur · ETA moyen ${DEPANNAGE_ETA} min`} hint="Où livrer ton véhicule ?" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {DEPANNAGE_DESTS.map(d => <span key={d} style={chip}>{d}</span>)}
              </div>
              <Cta href="/auto/depannage" label="Demander un dépannage →" />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
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
function Cta({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={{ marginTop: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px 12px', borderRadius: 11, background: AZ, color: '#fff', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 11.5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</Link>
  );
}

const inp: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--bd2)', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td)', outline: 'none' };
