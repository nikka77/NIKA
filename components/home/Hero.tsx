'use client';
// components/home/Hero.tsx — Hero « NIKA Stories » (mobile-first).
// FOND = carte MapLibre (minimap GTA, CARTO dark-nolabels) centrée sur la position GPS,
// avec un repère « tu es ici ». Intro : globe sombre → plonge sur ta position (repli Nice
// si GPS refusé). Le swipe entre domaines fait VOLER la carte vers le lieu du domaine
// (Cours Saleya, baie…) ; le repère GPS reste visible. Bulles-domaines + recherche NIKO
// en superposition. Respecte prefers-reduced-motion.
import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { visual } from '@/lib/visuals';
import { DOMAINS } from '@/lib/constants';
import { MAP_STYLE, NICE } from '@/lib/map';
import { useLocationStore } from '@/lib/store';
import FoodModule, { type Pro as FoodPro } from '@/components/home/FoodModule';
import GpsBeacon from '@/components/home/GpsBeacon';
import type { NightEntry } from '@/lib/food';
import 'maplibre-gl/dist/maplibre-gl.css';

/* eslint-disable @typescript-eslint/no-explicit-any */

type Scene = {
  id: string;
  domain?: string;
  place: string;
  services?: string[];
  center: [number, number]; zoom: number; // cible flyTo de la carte
};

// Scène 0 = TA position (center = coords GPS, repli Nice). Domaines = lieux fixes à Nice.
const SCENES: Scene[] = [
  { id: 'accueil', place: 'Autour de toi', center: NICE, zoom: 15 },
  { id: 'food', domain: 'food', place: 'Cours Saleya', services: ['Restos', 'Livraison', 'Food trucks'], center: [7.2756, 43.6959], zoom: 15.5 },
  { id: 'auto', domain: 'auto', place: 'Promenade des Anglais', services: ['VTC', 'Dépannage', 'Location'], center: [7.2620, 43.6952], zoom: 15 },
  { id: 'stay', domain: 'stay', place: 'Le Negresco', services: ['Logements insolites', 'Conciergerie', 'Direct hôtels'], center: [7.2585, 43.6948], zoom: 15.6 },
  { id: 'azur', domain: 'azur', place: 'Baie de Nice', services: ['Location bateaux', 'Skipper', 'Jetski'], center: [7.2780, 43.6900], zoom: 13.6 },
];

// Repère « tu es ici » (élément DOM du marqueur MapLibre)
function youHereEl(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = 'position:relative;width:20px;height:20px;pointer-events:none';
  el.innerHTML =
    '<span class="gps-ping" style="position:absolute;inset:0;border-radius:50%;background:rgba(0,194,255,0.35)"></span>' +
    '<span style="position:absolute;inset:5px;border-radius:50%;background:#00C2FF;border:2px solid #fff;box-shadow:0 0 12px rgba(0,194,255,0.9)"></span>';
  return el;
}

export default function Hero({ foodPros, nightPros }: { foodPros?: FoodPro[]; nightPros?: NightEntry[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<'globe' | 'rest'>('globe');
  const [index, setIndex] = useState(0);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ map: any; maplibregl: any } | null>(null);
  const markerRef = useRef<any>(null);
  const arrivedRef = useRef(false);

  const coords = useLocationStore(s => s.coords);
  const scene = SCENES[index];

  const doSearch = useCallback((q?: string) => {
    const t = (q ?? query).trim();
    if (!t) return;
    router.push(`/niko?q=${encodeURIComponent(t)}`);
  }, [query, router]);

  const goTo = useCallback((i: number) => {
    setIndex(Math.max(0, Math.min(SCENES.length - 1, i)));
  }, []);

  // Première descente (globe → scène 0 = ta position). Lit les coords FRAÎCHES du store
  // (pas de closure périmée). Déclenchée par l'arrivée des coords OU le repli Nice.
  const arrive = useCallback(() => {
    const h = mapRef.current;
    if (arrivedRef.current || !h) return;
    arrivedRef.current = true;
    const c = useLocationStore.getState().coords;
    const center: [number, number] = c ? [c.lng, c.lat] : NICE;
    const fly = () => h.map.flyTo({ center, zoom: 15, pitch: 0, bearing: 0, duration: 3400, curve: 1.5, essential: true });
    if (h.map.isStyleLoaded?.()) fly(); else h.map.once('load', fly);
    setStage('rest');
  }, []);

  // ── Init carte persistante : globe sombre en attente, puis plongée ──
  useEffect(() => {
    const container = mapContainer.current;
    if (!container) { setStage('rest'); arrivedRef.current = true; return; }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cancelled = false;
    let fallbackT: ReturnType<typeof setTimeout>;

    // déclenche la géoloc tout de suite (store partagé avec GpsBeacon)
    if (useLocationStore.getState().status === 'idle') useLocationStore.getState().locate();

    (async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled || !container) return;
      const map = new maplibregl.Map({
        container, style: MAP_STYLE,
        center: NICE, zoom: reduced ? 14.5 : 1.6,
        interactive: false, attributionControl: { compact: true },
      });
      mapRef.current = { map, maplibregl };
      map.on('style.load', () => { try { map.setProjection({ type: 'globe' }); } catch { /* projection non supportée */ } });

      if (reduced) { arrive(); return; }
      map.on('load', () => { if (!cancelled) map.easeTo({ zoom: 2.6, duration: 1500, essential: true }); });
      // repli : si pas de position après 4.8s, on se pose sur Nice
      fallbackT = setTimeout(() => { if (!cancelled) arrive(); }, 4800);
    })();

    return () => {
      cancelled = true;
      clearTimeout(fallbackT);
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
      if (mapRef.current?.map) { mapRef.current.map.remove(); mapRef.current = null; }
    };
  }, [arrive]);

  // coords arrivées → repère « tu es ici » ; plongée dessus (ou recentrage si on est sur la scène 0)
  useEffect(() => {
    const h = mapRef.current;
    if (!h || !coords) return;
    const ll: [number, number] = [coords.lng, coords.lat];
    if (!markerRef.current) {
      markerRef.current = new h.maplibregl.Marker({ element: youHereEl() }).setLngLat(ll).addTo(h.map);
    } else {
      markerRef.current.setLngLat(ll);
    }
    if (!arrivedRef.current) arrive();
    else if (index === 0) h.map.flyTo({ center: ll, zoom: 15, duration: 1600, essential: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords, arrive]);

  // swipe / bulle → vol de la carte vers la scène (scène 0 = ta position)
  useEffect(() => {
    if (!arrivedRef.current || !mapRef.current) return;
    const c = useLocationStore.getState().coords;
    const center: [number, number] = index === 0 && c ? [c.lng, c.lat] : SCENES[index].center;
    const zoom = index === 0 ? 15 : SCENES[index].zoom;
    mapRef.current.map.flyTo({ center, zoom, pitch: 0, bearing: 0, duration: 1900, curve: 1.4, essential: true });
  }, [index]);

  return (
    <header style={{ position: 'relative', minHeight: '100svh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Carte (fond persistant) */}
      <div ref={mapContainer} aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* Scrim — lisibilité du contenu par-dessus la carte */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(5,12,23,0.55) 0%, rgba(5,12,23,0.06) 30%, rgba(5,12,23,0.30) 62%, rgba(5,12,23,0.92) 100%)' }} />

      {/* Couche swipe (capte le geste → change de domaine → vol de la carte) */}
      {stage === 'rest' && (
        <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.16}
          onDragEnd={(_, info) => { if (info.offset.x < -55) goTo(index + 1); else if (info.offset.x > 55) goTo(index - 1); }}
          style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
      )}

      {/* Label intro (globe) */}
      {stage === 'globe' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          style={{ position: 'absolute', top: '46%', left: 0, right: 0, zIndex: 3, textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>
          Localisation…
        </motion.div>
      )}

      {/* ===== Contenu (rest) ===== */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: stage === 'rest' ? 1 : 0 }} transition={{ duration: 0.7 }}
        style={{ position: 'relative', zIndex: 3, flex: 1, display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>

        {/* Témoin GPS — juste sous le nav, au-dessus des bulles */}
        <div style={{ padding: '1.4rem 0.8rem 0', display: 'flex', justifyContent: 'center', pointerEvents: 'auto' }}>
          <GpsBeacon />
        </div>

        {/* Bulles-domaines (haut) */}
        <div style={{ padding: '0.6rem 0.8rem 0', display: 'flex', justifyContent: 'center', pointerEvents: 'auto' }}>
          <div className="hero-domabar" style={{ display: 'flex', gap: 9, overflowX: 'auto', maxWidth: '100%', padding: '4px 2px' }}>
            {DOMAINS.map(d => {
              const si = SCENES.findIndex(s => s.domain === d.slug);
              const active = scene.domain === d.slug;
              const icon = visual('domains', d.slug).poster;
              const inner = (
                <span className={`hero-bubble${active ? ' is-active' : ''}`} style={{ '--bub': d.color, width: 46, height: 46, borderRadius: '50%' } as CSSProperties}>
                  {icon ? <img src={icon} alt={d.label} width={30} height={30} style={{ width: 30, height: 30, objectFit: 'contain', opacity: active ? 1 : 0.9, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))' }} /> : <span style={{ fontSize: 18 }}>{d.icon}</span>}
                </span>
              );
              return si >= 0
                ? <button key={d.slug} onClick={() => goTo(si)} aria-label={d.label} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>{inner}</button>
                : <Link key={d.slug} href={`/${d.slug}`} aria-label={d.label}>{inner}</Link>;
            })}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Scène : bulle info / module — centré verticalement */}
        <div style={{ padding: '0 1.3rem', textAlign: 'center', maxWidth: 600, width: '100%', margin: '0 auto', pointerEvents: 'auto' }}>
          <AnimatePresence mode="wait">
            <motion.div key={scene.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45 }}>
              {scene.domain === 'food' ? (
                <FoodModule pros={foodPros} nightPros={nightPros} place="Cours Saleya" />
              ) : scene.domain ? (
                <div style={{ display: 'inline-block', textAlign: 'left', padding: '12px 15px', borderRadius: 16, background: 'rgba(5,12,23,0.66)', border: `1px solid ${(DOMAINS.find(d => d.slug === scene.domain)?.color) || 'var(--bd2)'}`, backdropFilter: 'blur(8px)', maxWidth: 340 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: DOMAINS.find(d => d.slug === scene.domain)?.color, boxShadow: `0 0 8px ${DOMAINS.find(d => d.slug === scene.domain)?.color}` }} />
                    <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 17, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--td)' }}>{DOMAINS.find(d => d.slug === scene.domain)?.label}</span>
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>· {scene.place}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 9 }}>
                    {scene.services?.map(s => (
                      <span key={s} style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td2)', padding: '3px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--bd)' }}>{s}</span>
                    ))}
                  </div>
                  <Link href={`/${scene.domain}`} style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', color: DOMAINS.find(d => d.slug === scene.domain)?.color, display: 'inline-flex', alignItems: 'center', gap: 5 }}>Explorer →</Link>
                </div>
              ) : (
                <div style={{ display: 'inline-block', padding: '10px 16px', borderRadius: 16, background: 'rgba(5,12,23,0.6)', border: '1px solid var(--bd2)', backdropFilter: 'blur(8px)' }}>
                  <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 16, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--td)' }}>Tu es ici</span>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginLeft: 8 }}>· swipe pour explorer</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div style={{ flex: 1 }} />

        {/* Bas : recherche NIKO + pagination */}
        <div style={{ padding: '0 1.3rem 8.5rem', textAlign: 'center', maxWidth: 600, width: '100%', margin: '0 auto', pointerEvents: 'auto' }}>
          <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto 0.7rem' }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()}
              placeholder="Demande à NIKO : pizza, bateau, dépannage…"
              style={{ width: '100%', background: 'rgba(5,12,23,0.7)', border: '1px solid var(--bd2)', borderRadius: 40, padding: '15px 54px 15px 20px', fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td)', outline: 'none', backdropFilter: 'blur(8px)' }} />
            <button onClick={() => doSearch()} aria-label="Rechercher" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 42, height: 42, borderRadius: '50%', background: 'var(--az)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 18px rgba(0,148,212,0.45)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            </button>
          </div>

          {/* Indices pagination */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
            {SCENES.map((s, i) => (
              <button key={s.id} onClick={() => goTo(i)} aria-label={s.place} style={{ width: i === index ? 22 : 7, height: 7, borderRadius: 4, background: i === index ? 'var(--az)' : 'var(--bd2)', border: 'none', padding: 0, cursor: 'pointer', transition: 'all 0.3s' }} />
            ))}
            <span style={{ marginLeft: 8, fontFamily: 'var(--fo)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--td3)' }}>‹ swipe ›</span>
          </div>
        </div>
      </motion.div>
    </header>
  );
}
