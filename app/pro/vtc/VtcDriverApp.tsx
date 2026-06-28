'use client';
// app/pro/vtc/VtcDriverApp.tsx — App chauffeur VTC NIKA, MAP-FIRST (style Uber/Bolt).
// Carte MapLibre (position chauffeur + trajet de la course) en haut + panneau de contrôle dessous.
// En ligne → courses entrantes simulées (Côte d'Azur) → cycle de course → gains (localStorage).
// Démo : pas encore de table rides/temps réel ; tarifs via lib/autoData (priceVtc/etaMin).
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import 'maplibre-gl/dist/maplibre-gl.css';
import { priceVtc, etaMin } from '@/lib/autoData';
import { MAP_STYLE, NICE } from '@/lib/map';

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

type Req = { from: string; to: string; km: number; client: string; rating: number; fare: number; tripEta: number; pickupEta: number; pdx: number; pdy: number; ddx: number; ddy: number };
type Phase = 'enroute' | 'arrived' | 'onboard';
const EARN_KEY = 'nika-vtc-earnings', TRIPS_KEY = 'nika-vtc-trips';

function makeReq(): Req {
  const r = RIDES[rand(RIDES.length)];
  const dir = Math.random() * Math.PI * 2;
  const pd = 0.004 + Math.random() * 0.003;
  const dd = Math.min(0.07, 0.006 + r.km * 0.0016);
  return {
    ...r, client: CLIENTS[rand(CLIENTS.length)], rating: 4.5 + Math.round(Math.random() * 5) / 10,
    fare: priceVtc(r.km), tripEta: etaMin(r.km), pickupEta: 2 + rand(6),
    pdx: Math.cos(dir) * pd, pdy: Math.sin(dir) * pd, ddx: Math.cos(dir + 0.7) * dd, ddy: Math.sin(dir + 0.7) * dd,
  };
}
const pin = (color: string, glyph: string, size = 26): HTMLDivElement => {
  const el = document.createElement('div');
  el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:${size * 0.5}px;box-shadow:0 2px 10px rgba(0,0,0,.6)`;
  el.textContent = glyph;
  return el;
};

export default function VtcDriverApp({ driverName }: { driverName: string }) {
  const [online, setOnline] = useState(false);
  const [incoming, setIncoming] = useState<Req | null>(null);
  const [countdown, setCountdown] = useState(15);
  const [trip, setTrip] = useState<{ req: Req; phase: Phase } | null>(null);
  const [earnings, setEarnings] = useState(0);
  const [trips, setTrips] = useState(0);
  const [gps, setGps] = useState<'idle' | 'ok' | 'denied'>('idle');
  const [mapReady, setMapReady] = useState(false);
  const spawnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const glRef = useRef<typeof import('maplibre-gl') | null>(null);
  const driverRef = useRef<import('maplibre-gl').Marker | null>(null);
  const centerRef = useRef<[number, number]>(NICE);
  const trMarks = useRef<import('maplibre-gl').Marker[]>([]);

  useEffect(() => {
    try { setEarnings(Number(localStorage.getItem(EARN_KEY)) || 0); setTrips(Number(localStorage.getItem(TRIPS_KEY)) || 0); } catch { /* vide */ }
  }, []);

  // Init carte tout de suite (Nice), géoloc recentre après (non bloquant).
  useEffect(() => {
    let cancelled = false;
    const container = mapEl.current; if (!container) return;
    (async () => {
      const maplibregl = (await import('maplibre-gl')).default as typeof import('maplibre-gl');
      if (cancelled || !container) return;
      glRef.current = maplibregl;
      const map = new maplibregl.Map({ container, style: MAP_STYLE, center: NICE, zoom: 13.2, attributionControl: false });
      mapRef.current = map;
      const d = pin(AZ, '🚖', 30);
      d.animate?.([{ boxShadow: `0 0 0 0 ${AZ}99` }, { boxShadow: `0 0 0 16px ${AZ}00` }], { duration: 1800, iterations: Infinity });
      driverRef.current = new maplibregl.Marker({ element: d }).setLngLat(NICE).addTo(map);
      map.on('load', () => {
        if (cancelled) return;
        map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} } });
        map.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': AZ2, 'line-width': 4, 'line-dasharray': [1.4, 1], 'line-opacity': 0.9 } });
        setMapReady(true);
      });
      navigator.geolocation?.getCurrentPosition(
        p => { if (cancelled) return; setGps('ok'); const c: [number, number] = [p.coords.longitude, p.coords.latitude]; centerRef.current = c; driverRef.current?.setLngLat(c); map.easeTo({ center: c, zoom: 13.6, duration: 800 }); },
        () => setGps('denied'), { enableHighAccuracy: true, timeout: 4000 },
      );
    })();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  // Marqueurs + trajet de la course active
  useEffect(() => {
    const map = mapRef.current, gl = glRef.current; if (!map || !gl || !mapReady) return;
    trMarks.current.forEach(m => m.remove()); trMarks.current = [];
    const setRoute = (coords: number[][]) => { (map.getSource('route') as import('maplibre-gl').GeoJSONSource | undefined)?.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }); };
    const req = trip?.req || incoming;
    if (!req) { setRoute([]); map.easeTo({ center: centerRef.current, zoom: 13.6, duration: 600 }); return; }
    const c = centerRef.current;
    const pickup: [number, number] = [c[0] + req.pdx, c[1] + req.pdy];
    const drop: [number, number] = [c[0] + req.ddx, c[1] + req.ddy];
    trMarks.current.push(new gl.Marker({ element: pin(AZ2, '📍', 24) }).setLngLat(pickup).addTo(map));
    trMarks.current.push(new gl.Marker({ element: pin(OK, '🏁', 24) }).setLngLat(drop).addTo(map));
    setRoute([c, pickup, drop]);
    try { const b = new gl.LngLatBounds(); [c, pickup, drop].forEach(p => b.extend(p as [number, number])); map.fitBounds(b, { padding: 50, duration: 700, maxZoom: 14.5 }); } catch { /* style pas prêt */ }
  }, [incoming, trip, mapReady]);

  useEffect(() => {
    if (online && !incoming && !trip) spawnRef.current = setTimeout(() => { setIncoming(makeReq()); setCountdown(15); }, 3500);
    return () => { if (spawnRef.current) clearTimeout(spawnRef.current); };
  }, [online, incoming, trip]);
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
      const ne = Math.round((earnings + t.req.fare) * 10) / 10, nt = trips + 1;
      setEarnings(ne); setTrips(nt);
      try { localStorage.setItem(EARN_KEY, String(ne)); localStorage.setItem(TRIPS_KEY, String(nt)); } catch { /* vide */ }
      return null;
    });
  }, [earnings, trips]);

  return (
    <main style={{ maxWidth: 480, margin: '0 auto' }}>
      {/* CARTE (section haute) */}
      <div style={{ position: 'relative', height: '46svh', minHeight: 300, background: '#04101e' }}>
        <div ref={mapEl} aria-hidden style={{ position: 'absolute', inset: 0 }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(4,16,30,0.6) 0%, transparent 24%, transparent 70%, rgba(4,16,30,0.9) 100%)' }} />
        {/* Barre flottante */}
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, background: 'rgba(5,12,23,0.8)', backdropFilter: 'blur(10px)', border: '1px solid var(--bd2)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: online ? OK : '#7a8595', boxShadow: online ? `0 0 8px ${OK}` : 'none' }} />
            <span style={{ fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: 'var(--td)' }}>🚖 {driverName}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', padding: '6px 12px', borderRadius: 14, background: 'rgba(5,12,23,0.8)', backdropFilter: 'blur(10px)', border: '1px solid var(--bd2)' }}>
              <span style={{ fontFamily: 'var(--fn)', fontSize: 18, color: AZ2, lineHeight: 1 }}>{earnings.toFixed(0)} €</span>
              <span style={{ fontFamily: 'var(--fo)', fontSize: 8.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--td3)' }}>{trips} courses</span>
            </span>
            <Link href="/profil" aria-label="Profil" style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,12,23,0.8)', backdropFilter: 'blur(10px)', border: '1px solid var(--bd2)', color: 'var(--td2)', textDecoration: 'none', fontSize: 14 }}>↗</Link>
          </div>
        </div>
        {online && gps === 'ok' && <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}><span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: OK, background: 'rgba(5,12,23,0.7)', padding: '4px 12px', borderRadius: 999 }}>📡 Position partagée · visible des clients</span></div>}
      </div>

      {/* PANNEAU de contrôle */}
      <div style={{ padding: '1.1rem 1.1rem 1.4rem', marginTop: -14, position: 'relative', borderRadius: '20px 20px 0 0', background: 'var(--bg)', borderTop: '1px solid var(--bd2)' }}>
        <AnimatePresence mode="wait">
          {trip ? (
            <motion.div key="trip" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <TripCard trip={trip} onAdvance={advance} />
            </motion.div>
          ) : incoming ? (
            <motion.div key="in" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              style={{ borderRadius: 16, border: `2px solid ${AZ}`, background: `${AZ}12`, padding: 14, boxShadow: `0 10px 34px ${AZ}33` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 16, textTransform: 'uppercase', color: 'var(--td)' }}>Nouvelle course</span>
                <span style={{ fontFamily: 'var(--fn)', fontSize: 20, color: countdown <= 5 ? '#D44B24' : AZ2 }}>{countdown}s</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <span><span style={{ fontFamily: 'var(--fn)', fontSize: 34, color: AZ2 }}>{incoming.fare.toFixed(1)}</span><span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td2)' }}> €</span></span>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)' }}>{incoming.client} · ⭐ {incoming.rating.toFixed(1)}</span>
              </div>
              <Leg dot={AZ2} label={`Prise en charge · ~${incoming.pickupEta} min`} place={incoming.from} />
              <Leg dot={OK} label={`Destination · ${incoming.km} km · ~${incoming.tripEta} min`} place={incoming.to} last />
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button onClick={() => setIncoming(null)} style={{ flex: 1, padding: '13px', borderRadius: 11, border: '1px solid var(--bd2)', background: 'transparent', color: 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Refuser</button>
                <button onClick={accept} style={{ flex: 2, padding: '13px', borderRadius: 11, border: 'none', background: `linear-gradient(180deg,${AZ2},${AZ})`, color: '#fff', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 13.5, textTransform: 'uppercase', cursor: 'pointer', boxShadow: `0 6px 20px ${AZ}66` }}>Accepter</button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="toggle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <Stat label="Gains" value={`${earnings.toFixed(0)} €`} color={AZ2} />
                <Stat label="Courses" value={String(trips)} color={OK} />
                <Stat label="Note" value="4.9 ⭐" color={WARN} />
              </div>
              <div style={{ textAlign: 'center', marginBottom: 12, minHeight: 18 }}>
                {online ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)' }}>
                    <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.6 }} style={{ fontSize: 16 }} aria-hidden>📡</motion.span>
                    Recherche de courses près de toi…
                  </span>
                ) : <span style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td3)' }}>Passe en ligne pour recevoir des courses.</span>}
              </div>
              <button onClick={() => { setOnline(o => !o); setIncoming(null); }}
                style={{ width: '100%', padding: '15px', borderRadius: 13, cursor: 'pointer', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 14, letterSpacing: '0.04em', textTransform: 'uppercase', border: 'none', background: online ? 'rgba(212,75,36,0.15)' : `linear-gradient(180deg,${OK},#12b46f)`, color: online ? '#E8703A' : '#04130d', boxShadow: online ? 'none' : `0 8px 24px ${OK}44` }}>
                {online ? 'Passer hors ligne' : 'Passer en ligne'}
              </button>
              {gps === 'denied' && <p style={{ fontFamily: 'var(--fo)', fontSize: 10, color: WARN, marginTop: 8, textAlign: 'center' }}>⚠ GPS refusé — carte centrée sur Nice.</p>}
              <p style={{ fontFamily: 'var(--fo)', fontSize: 9.5, color: 'var(--td3)', textAlign: 'center', marginTop: 12 }}>Démo · demandes simulées. La mise en relation temps réel avec les clients arrive avec la marketplace.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

function TripCard({ trip, onAdvance }: { trip: { req: Req; phase: Phase }; onAdvance: () => void }) {
  const { req, phase } = trip;
  const target = phase === 'onboard' ? req.to : req.from;
  const steps = [
    { key: 'enroute', cta: 'Je suis arrivé' },
    { key: 'arrived', cta: 'Démarrer la course' },
    { key: 'onboard', cta: 'Terminer la course' },
  ] as const;
  const idx = steps.findIndex(s => s.key === phase);
  return (
    <div style={{ borderRadius: 16, border: `1px solid ${AZ}66`, background: 'rgba(5,12,23,0.5)', padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: 'var(--td)' }}>{req.client} · ⭐ {req.rating.toFixed(1)}</span>
        <span style={{ fontFamily: 'var(--fn)', fontSize: 20, color: AZ2 }}>{req.fare.toFixed(1)} €</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {steps.map((s, i) => <span key={s.key} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= idx ? AZ2 : 'var(--bd2)' }} />)}
      </div>
      <Leg dot={AZ2} label="Prise en charge" place={req.from} faded={phase === 'onboard'} />
      <Leg dot={OK} label={`Destination · ${req.km} km`} place={req.to} last />
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <a href={mapsLink(target)} target="_blank" rel="noopener noreferrer" aria-label="Itinéraire" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 16px', borderRadius: 11, border: `1px solid ${AZ}66`, background: `${AZ}14`, color: AZ2, fontSize: 16, textDecoration: 'none' }}>🧭</a>
        <button onClick={onAdvance} style={{ flex: 1, padding: '14px', borderRadius: 11, border: 'none', background: phase === 'onboard' ? `linear-gradient(180deg,${OK},#12b46f)` : `linear-gradient(180deg,${AZ2},${AZ})`, color: '#fff', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 14, textTransform: 'uppercase', cursor: 'pointer', boxShadow: `0 6px 20px ${(phase === 'onboard' ? OK : AZ)}55` }}>{steps[idx].cta} →</button>
      </div>
    </div>
  );
}
function Leg({ dot, label, place, last, faded }: { dot: string; label: string; place: string; last?: boolean; faded?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, opacity: faded ? 0.5 : 1 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: dot, flexShrink: 0 }} />
        {!last && <span style={{ width: 2, flex: 1, minHeight: 16, background: 'var(--bd2)' }} />}
      </div>
      <div style={{ paddingBottom: last ? 0 : 9 }}>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--td3)' }}>{label}</div>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 13.5, fontWeight: 700, color: 'var(--td)' }}>{place}</div>
      </div>
    </div>
  );
}
function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return <div style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 12, padding: '0.8rem 0.5rem', textAlign: 'center' }}><div style={{ fontFamily: 'var(--fn)', fontSize: 20, color, lineHeight: 1 }}>{value}</div><div style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--td3)', marginTop: 3 }}>{label}</div></div>;
}
