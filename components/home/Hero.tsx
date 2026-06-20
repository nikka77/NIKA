'use client';
// components/home/Hero.tsx — Hero « NIKA Stories » (mobile-first).
// Globe satellite MapLibre → zoom Nice → puis carrousel de SCÈNES-domaines
// (rendus GTA-6 Seedream) navigable au SWIPE. Bulles-domaines (icône seule) en haut,
// bulle info par scène, recherche NIKO persistante. Transition propre = crossfade +
// léger drone-push (pas de coupure). Respecte prefers-reduced-motion.
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { visual } from '@/lib/visuals';
import { DOMAINS } from '@/lib/constants';
import 'maplibre-gl/dist/maplibre-gl.css';

type Scene = {
  id: string;
  domain?: string;            // slug domaine (scène-domaine) — sinon scène d'accueil
  place: string;              // libellé lieu
  image: string;
  title: string;
  services?: string[];
  center: [number, number]; zoom: number; pitch: number; bearing: number; // flyTo globe (accueil)
  origin: string;             // transform-origin du drone-push (point d'intérêt de la scène)
};

// Scènes (placeholders pour les domaines non encore "mis en scène" — swap au fil de l'eau).
const SCENES: Scene[] = [
  { id: 'accueil', place: 'Promenade des Anglais', image: '/images/hero/nice-promenade.jpg', title: 'Bienvenue à Nice', center: [7.2620, 43.6952], zoom: 15.4, pitch: 62, bearing: -22, origin: '50% 55%' },
  { id: 'azur', domain: 'azur', place: 'Baie de Nice', image: '/images/hero/nice-azur-boat.jpg', title: 'Prendre la mer', services: ['Location bateaux', 'Skipper', 'Jetski'], center: [7.2780, 43.6900], zoom: 13.5, pitch: 55, bearing: 0, origin: '50% 80%' },
  { id: 'stay', domain: 'stay', place: 'Vieux-Nice', image: '/images/hero/nice-vieux.jpg', title: 'Dormir autrement', services: ['Logements insolites', 'Conciergerie'], center: [7.2756, 43.6959], zoom: 16.4, pitch: 62, bearing: -40, origin: '62% 45%' },
];

// Transition « vol drone » directionnelle : on plonge dans la scène sortante (zoom vers
// son point d'intérêt) et on émerge sur l'entrante. Le transform-origin (par scène) donne
// la direction du vol ; x ajoute le sens du swipe.
const sceneVariants = {
  enter: (d: number) => ({ opacity: 0, scale: 1.22, x: d * 28 }),
  center: { opacity: 1, scale: 1, x: 0, transition: { duration: 1.0, ease: [0.4, 0, 0.2, 1], opacity: { duration: 0.6 } } },
  exit: (d: number) => ({ opacity: 0, scale: 1.5, x: -d * 28, transition: { duration: 0.85, ease: [0.5, 0, 0.75, 0] } }),
};

export default function Hero() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<'globe' | 'rest'>('globe');
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const mapContainer = useRef<HTMLDivElement>(null);

  const scene = SCENES[index];

  const doSearch = useCallback((q?: string) => {
    const t = (q ?? query).trim();
    if (!t) return;
    router.push(`/niko?q=${encodeURIComponent(t)}`);
  }, [query, router]);

  const goTo = useCallback((i: number) => {
    const ni = Math.max(0, Math.min(SCENES.length - 1, i));
    setDir(ni > index ? 1 : -1);
    setIndex(ni);
  }, [index]);

  // Globe MapLibre → vol jusqu'à Nice (scène d'accueil) → carrousel
  useEffect(() => {
    const container = mapContainer.current;
    if (!container) { setStage('rest'); return; }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const home = SCENES[0];

    let map: { remove: () => void; on: (e: string, cb: () => void) => void; flyTo: (o: object) => void; easeTo: (o: object) => void } | null = null;
    let cancelled = false;
    let tRest: ReturnType<typeof setTimeout>;
    let tFly: ReturnType<typeof setTimeout>;

    (async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled || !container) return;
      map = new maplibregl.Map({
        container,
        style: {
          version: 8,
          projection: { type: 'globe' },
          sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 6, 1, 9, 0] },
          sources: { sat: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19, attribution: '© Esri, Maxar' } },
          layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#060d1a' } }, { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-fade-duration': 300 } }],
        } as never,
        center: home.center, zoom: reduced ? home.zoom : 1.5, pitch: reduced ? home.pitch : 0, bearing: 0,
        interactive: false, attributionControl: { compact: true },
      }) as never;

      if (reduced) { setStage('rest'); return; }
      map!.on('load', () => {
        if (cancelled) return;
        map!.easeTo({ zoom: 2.4, duration: 1300, essential: true });
        tFly = setTimeout(() => { if (!cancelled) map!.flyTo({ center: home.center, zoom: home.zoom, pitch: home.pitch, bearing: home.bearing, duration: 3600, curve: 1.5, essential: true }); }, 1300);
      });
      tRest = setTimeout(() => { if (!cancelled) setStage('rest'); }, 4500);
    })();

    return () => { cancelled = true; clearTimeout(tRest); clearTimeout(tFly); if (map) map.remove(); };
  }, []);

  return (
    <header style={{ position: 'relative', minHeight: '100svh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Globe (intro) */}
      <div ref={mapContainer} aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* Scènes (carrousel crossfade + drone-push) */}
      {stage === 'rest' && (
        <AnimatePresence initial={false} custom={dir}>
          <motion.div key={scene.id} custom={dir} variants={sceneVariants} initial="enter" animate="center" exit="exit"
            style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', transformOrigin: scene.origin }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img src={scene.image} alt="" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </motion.div>
        </AnimatePresence>
      )}

      {/* Scrim */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(5,12,23,0.55) 0%, rgba(5,12,23,0.10) 26%, rgba(5,12,23,0.30) 58%, rgba(5,12,23,0.92) 100%)' }} />

      {/* Couche swipe (capte le geste, laisse passer les clics du contenu au-dessus) */}
      {stage === 'rest' && (
        <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.16}
          onDragEnd={(_, info) => { if (info.offset.x < -55) goTo(index + 1); else if (info.offset.x > 55) goTo(index - 1); }}
          style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
      )}

      {/* Label intro */}
      {stage === 'globe' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          style={{ position: 'absolute', top: '46%', left: 0, right: 0, zIndex: 3, textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>
          Cap sur Nice…
        </motion.div>
      )}

      {/* ===== Contenu (rest) ===== */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: stage === 'rest' ? 1 : 0 }} transition={{ duration: 0.7 }}
        style={{ position: 'relative', zIndex: 3, flex: 1, display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>

        {/* Bulles-domaines (haut) */}
        <div style={{ padding: '5.5rem 0.8rem 0', display: 'flex', justifyContent: 'center', pointerEvents: 'auto' }}>
          <div className="hero-domabar" style={{ display: 'flex', gap: 9, overflowX: 'auto', maxWidth: '100%', padding: '4px 2px' }}>
            {DOMAINS.map(d => {
              const si = SCENES.findIndex(s => s.domain === d.slug);
              const active = scene.domain === d.slug;
              const icon = visual('domains', d.slug).poster;
              const inner = (
                <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: active ? `${d.color}22` : 'rgba(5,12,23,0.55)', border: `1.5px solid ${active ? d.color : 'var(--bd2)'}`, boxShadow: active ? `0 0 16px ${d.color}88` : 'none', backdropFilter: 'blur(6px)', transition: 'all 0.25s' }}>
                  {icon ? <img src={icon} alt={d.label} width={30} height={30} style={{ width: 30, height: 30, objectFit: 'contain', opacity: active ? 1 : 0.7 }} /> : <span style={{ fontSize: 18 }}>{d.icon}</span>}
                </span>
              );
              return si >= 0
                ? <button key={d.slug} onClick={() => goTo(si)} aria-label={d.label} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>{inner}</button>
                : <Link key={d.slug} href={`/${d.slug}`} aria-label={d.label}>{inner}</Link>;
            })}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Bas : bulle info scène + recherche */}
        <div style={{ padding: '0 1.3rem 6rem', textAlign: 'center', maxWidth: 600, width: '100%', margin: '0 auto', pointerEvents: 'auto' }}>
          <AnimatePresence mode="wait">
            <motion.div key={scene.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45 }}
              style={{ marginBottom: '1.1rem' }}>
              {scene.domain ? (
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
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 13px', borderRadius: 30, background: 'rgba(5,12,23,0.6)', border: '1px solid var(--bd2)', backdropFilter: 'blur(6px)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22DD88', boxShadow: '0 0 8px #22DD88', animation: 'pdot 1.8s ease-in-out infinite' }} />
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--td)' }}>Nice · {scene.place}</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Recherche NIKO */}
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
