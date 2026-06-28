'use client';
// app/pro/vtc/VtcDriverApp.tsx — App chauffeur VTC NIKA (style Uber/Bolt côté conducteur).
// En ligne → courses entrantes simulées (Côte d'Azur) → cycle de course → gains (localStorage).
// Démo : pas encore de table rides/marketplace temps réel ; tarifs via lib/autoData (priceVtc/etaMin).
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { priceVtc, etaMin } from '@/lib/autoData';

const AZ = '#0094D4', AZ2 = '#1FB0EE', OK = '#22DD88', WARN = '#E0A020';
const RIDES = [
  { from: 'Aéroport Nice T2', to: 'Promenade des Anglais', km: 7 },
  { from: 'Place Masséna', to: 'Gare de Nice-Ville', km: 2.5 },
  { from: 'Vieux-Nice', to: 'Cap d’Antibes', km: 22 },
  { from: 'Cours Saleya', to: 'Monaco', km: 15 },
  { from: 'Port de Nice', to: 'Cannes — Croisette', km: 33 },
  { from: 'Cimiez', to: 'Aéroport Nice T1', km: 6 },
  { from: 'Gare Thiers', to: 'Villefranche-sur-Mer', km: 8 },
  { from: 'Antibes', to: 'Juan-les-Pins', km: 4 },
];
const CLIENTS = ['Camille', 'Marc', 'Inès', 'Thomas', 'Sofia', 'Hugo', 'Léa', 'Yanis', 'Nadia', 'Paul'];
const rand = (n: number) => Math.floor(Math.random() * n);
const mapsLink = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q + ', Côte d\'Azur')}`;

type Req = { from: string; to: string; km: number; client: string; rating: number; fare: number; tripEta: number; pickupEta: number };
type Phase = 'enroute' | 'arrived' | 'onboard';
const EARN_KEY = 'nika-vtc-earnings', TRIPS_KEY = 'nika-vtc-trips';

function makeReq(): Req {
  const r = RIDES[rand(RIDES.length)];
  return { ...r, client: CLIENTS[rand(CLIENTS.length)], rating: 4.5 + Math.round(Math.random() * 5) / 10, fare: priceVtc(r.km), tripEta: etaMin(r.km), pickupEta: 2 + rand(6) };
}

export default function VtcDriverApp({ driverName }: { driverName: string }) {
  const [online, setOnline] = useState(false);
  const [incoming, setIncoming] = useState<Req | null>(null);
  const [countdown, setCountdown] = useState(15);
  const [trip, setTrip] = useState<{ req: Req; phase: Phase } | null>(null);
  const [earnings, setEarnings] = useState(0);
  const [trips, setTrips] = useState(0);
  const [gps, setGps] = useState<'idle' | 'ok' | 'denied'>('idle');
  const spawnRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try { setEarnings(Number(localStorage.getItem(EARN_KEY)) || 0); setTrips(Number(localStorage.getItem(TRIPS_KEY)) || 0); } catch { /* vide */ }
  }, []);
  // GPS quand on passe en ligne (comme l'app livreur)
  useEffect(() => {
    if (!online) { setGps('idle'); return; }
    navigator.geolocation?.getCurrentPosition(() => setGps('ok'), () => setGps('denied'));
  }, [online]);

  // Recherche de course : spawn une demande après quelques secondes
  useEffect(() => {
    if (online && !incoming && !trip) {
      spawnRef.current = setTimeout(() => { setIncoming(makeReq()); setCountdown(15); }, 3500);
    }
    return () => { if (spawnRef.current) clearTimeout(spawnRef.current); };
  }, [online, incoming, trip]);

  // Décompte d'acceptation
  useEffect(() => {
    if (!incoming) return;
    if (countdown <= 0) { setIncoming(null); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [incoming, countdown]);

  const accept = () => { if (incoming) { setTrip({ req: incoming, phase: 'enroute' }); setIncoming(null); } };
  const advance = useCallback(() => {
    setTrip(t => {
      if (!t) return t;
      if (t.phase === 'enroute') return { ...t, phase: 'arrived' };
      if (t.phase === 'arrived') return { ...t, phase: 'onboard' };
      // onboard → terminer
      const newEarn = Math.round((earnings + t.req.fare) * 10) / 10, newTrips = trips + 1;
      setEarnings(newEarn); setTrips(newTrips);
      try { localStorage.setItem(EARN_KEY, String(newEarn)); localStorage.setItem(TRIPS_KEY, String(newTrips)); } catch { /* vide */ }
      return null;
    });
  }, [earnings, trips]);

  return (
    <main style={{ maxWidth: 460, margin: '0 auto', padding: '0 0 5rem' }}>
      {/* En-tête */}
      <div style={{ padding: '1.4rem 1.2rem 1.1rem', background: 'linear-gradient(180deg, rgba(0,148,212,0.16), transparent)', borderBottom: '1px solid var(--bd)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: 'var(--td)' }}>🚖 {driverName}</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)' }}>Espace chauffeur VTC</div>
          </div>
          <Link href="/profil" style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', textDecoration: 'none' }}>Profil ↗</Link>
        </div>
        {/* Toggle disponibilité */}
        <button onClick={() => { setOnline(o => !o); setIncoming(null); }}
          style={{ width: '100%', marginTop: 14, padding: '14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 13.5, letterSpacing: '0.04em', textTransform: 'uppercase', border: `1px solid ${online ? OK : 'var(--bd2)'}`, background: online ? `${OK}1c` : 'rgba(255,255,255,0.04)', color: online ? OK : 'var(--td2)', transition: 'all .2s' }}>
          {online ? '🟢 En ligne — touche pour passer hors ligne' : '⚫ Hors ligne — touche pour recevoir des courses'}
        </button>
        {online && gps === 'denied' && <p style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: WARN, marginTop: 6, textAlign: 'center' }}>⚠ GPS refusé — active la localisation pour être visible.</p>}
        {online && gps === 'ok' && <p style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: OK, marginTop: 6, textAlign: 'center' }}>📡 Position partagée · visible des clients</p>}
      </div>

      {/* Gains du jour */}
      <div style={{ display: 'flex', gap: 10, padding: '1.1rem 1.2rem 0' }}>
        <Stat label="Gains" value={`${earnings.toFixed(0)} €`} color={AZ2} />
        <Stat label="Courses" value={String(trips)} color={OK} />
        <Stat label="Note" value="4.9 ⭐" color={WARN} />
      </div>

      {/* Zone principale */}
      <div style={{ padding: '1.2rem' }}>
        <AnimatePresence mode="wait">
          {/* COURSE ACTIVE */}
          {trip ? (
            <motion.div key="trip" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <TripCard trip={trip} onAdvance={advance} />
            </motion.div>
          ) : incoming ? (
            /* DEMANDE ENTRANTE */
            <motion.div key="incoming" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
              <div style={{ borderRadius: 16, border: `2px solid ${AZ}`, background: `${AZ}12`, padding: 16, boxShadow: `0 10px 34px ${AZ}33` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 16, textTransform: 'uppercase', color: 'var(--td)' }}>Nouvelle course</span>
                  <span style={{ fontFamily: 'var(--fn)', fontSize: 22, color: countdown <= 5 ? '#D44B24' : AZ2, minWidth: 30, textAlign: 'right' }}>{countdown}s</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span><span style={{ fontFamily: 'var(--fn)', fontSize: 36, color: AZ2 }}>{incoming.fare.toFixed(1)}</span><span style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: 'var(--td2)' }}> €</span></span>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)' }}>{incoming.client} · ⭐ {incoming.rating.toFixed(1)}</span>
                </div>
                <Leg dot={AZ2} label={`Prise en charge · ~${incoming.pickupEta} min`} place={incoming.from} />
                <Leg dot={OK} label={`Destination · ${incoming.km} km · ~${incoming.tripEta} min`} place={incoming.to} last />
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button onClick={() => setIncoming(null)} style={{ flex: 1, padding: '13px', borderRadius: 11, border: '1px solid var(--bd2)', background: 'transparent', color: 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Refuser</button>
                  <button onClick={accept} style={{ flex: 2, padding: '13px', borderRadius: 11, border: 'none', background: `linear-gradient(180deg,${AZ2},${AZ})`, color: '#fff', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 13.5, textTransform: 'uppercase', cursor: 'pointer', boxShadow: `0 6px 20px ${AZ}55` }}>Accepter</button>
                </div>
              </div>
            </motion.div>
          ) : online ? (
            /* RECHERCHE */
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.6 }} style={{ fontSize: 40 }} aria-hidden>📡</motion.div>
              <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 16, textTransform: 'uppercase', color: 'var(--td)', marginTop: 12 }}>Recherche de courses…</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginTop: 4 }}>Reste en ligne, une demande arrive.</div>
            </motion.div>
          ) : (
            /* HORS LIGNE */
            <motion.div key="offline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div style={{ fontSize: 40, opacity: 0.5 }} aria-hidden>🚗</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginTop: 12, lineHeight: 1.5 }}>Tu es hors ligne.<br />Passe en ligne pour recevoir des courses près de toi.</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', textAlign: 'center', padding: '0 1.2rem' }}>
        Démo chauffeur · demandes simulées Côte d&apos;Azur. La mise en relation temps réel avec les clients arrive avec la marketplace.
      </p>
    </main>
  );
}

function TripCard({ trip, onAdvance }: { trip: { req: Req; phase: Phase }; onAdvance: () => void }) {
  const { req, phase } = trip;
  const target = phase === 'onboard' ? req.to : req.from;
  const steps = [
    { key: 'enroute', label: 'En route vers le client', cta: 'Je suis arrivé' },
    { key: 'arrived', label: `Arrivé · récupère ${req.client}`, cta: 'Démarrer la course' },
    { key: 'onboard', label: `En course vers ${req.to}`, cta: 'Terminer la course' },
  ] as const;
  const idx = steps.findIndex(s => s.key === phase);
  return (
    <div style={{ borderRadius: 16, border: `1px solid ${AZ}66`, background: 'rgba(5,12,23,0.5)', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: 'var(--td)' }}>{req.client} · ⭐ {req.rating.toFixed(1)}</span>
        <span style={{ fontFamily: 'var(--fn)', fontSize: 22, color: AZ2 }}>{req.fare.toFixed(1)} €</span>
      </div>
      {/* progression */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {steps.map((s, i) => <span key={s.key} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= idx ? AZ2 : 'var(--bd2)' }} />)}
      </div>
      <Leg dot={AZ2} label="Prise en charge" place={req.from} faded={phase === 'onboard'} />
      <Leg dot={OK} label={`Destination · ${req.km} km`} place={req.to} last />
      <a href={mapsLink(target)} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14, padding: '11px', borderRadius: 11, border: `1px solid ${AZ}66`, background: `${AZ}14`, color: AZ2, fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, textDecoration: 'none' }}>🧭 Itinéraire vers {phase === 'onboard' ? 'la destination' : 'le client'}</a>
      <button onClick={onAdvance} style={{ width: '100%', marginTop: 10, padding: '14px', borderRadius: 11, border: 'none', background: phase === 'onboard' ? `linear-gradient(180deg,${OK},#12b46f)` : `linear-gradient(180deg,${AZ2},${AZ})`, color: '#fff', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 14, textTransform: 'uppercase', cursor: 'pointer', boxShadow: `0 6px 20px ${(phase === 'onboard' ? OK : AZ)}55` }}>
        {steps[idx].cta} →
      </button>
    </div>
  );
}
function Leg({ dot, label, place, last, faded }: { dot: string; label: string; place: string; last?: boolean; faded?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, opacity: faded ? 0.5 : 1 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: dot, flexShrink: 0 }} />
        {!last && <span style={{ width: 2, flex: 1, minHeight: 18, background: 'var(--bd2)' }} />}
      </div>
      <div style={{ paddingBottom: last ? 0 : 10 }}>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--td3)' }}>{label}</div>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 13.5, fontWeight: 700, color: 'var(--td)' }}>{place}</div>
      </div>
    </div>
  );
}
function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return <div style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 12, padding: '0.9rem 0.6rem', textAlign: 'center' }}><div style={{ fontFamily: 'var(--fn)', fontSize: 22, color, lineHeight: 1 }}>{value}</div><div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)', marginTop: 4 }}>{label}</div></div>;
}
