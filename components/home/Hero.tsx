'use client';
// components/home/Hero.tsx — Hero « NIKA Stories » (mobile-first).
// Globe satellite MapLibre → zoom Nice → puis carrousel de SCÈNES-domaines
// (rendus GTA-6 Seedream) navigable au SWIPE. Bulles-domaines (icône seule) en haut,
// bulle info par scène, recherche NIKO persistante. Transition propre = crossfade +
// léger drone-push (pas de coupure). Respecte prefers-reduced-motion.
import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { visual } from '@/lib/visuals';
import { DOMAINS } from '@/lib/constants';
import FoodModule, { type Pro as FoodPro } from '@/components/home/FoodModule';
import GpsBeacon from '@/components/home/GpsBeacon';
import type { NightEntry } from '@/lib/food';
import 'maplibre-gl/dist/maplibre-gl.css';

type Scene = {
  id: string;
  domain?: string;            // slug domaine (scène-domaine) — sinon scène d'accueil
  place: string;              // libellé lieu
  image: string;
  video?: string;             // fond animé (loop muet) — sinon image statique
  title: string;
  services?: string[];
  center: [number, number]; zoom: number; pitch: number; bearing: number; // flyTo globe (accueil)
  origin: string;             // transform-origin du drone-push (point d'intérêt de la scène)
  twinkle?: boolean;          // calque scintillement (guirlandes + étoiles) en CSS
};

// Scènes (placeholders pour les domaines non encore "mis en scène" — swap au fil de l'eau).
const SCENES: Scene[] = [
  { id: 'accueil', place: 'Promenade des Anglais', image: '/images/hero/nice-promenade.jpg', title: 'Bienvenue à Nice', center: [7.2620, 43.6952], zoom: 15.4, pitch: 62, bearing: -22, origin: '50% 55%' },
  { id: 'food', domain: 'food', place: 'Cours Saleya', image: '/images/hero/nice-food.jpg', title: 'Manger niçois', services: ['Restos', 'Livraison', 'Food trucks'], center: [7.2756, 43.6959], zoom: 16, pitch: 60, bearing: 0, origin: '42% 60%' },
  { id: 'auto', domain: 'auto', place: 'Promenade des Anglais', image: '/images/hero/nice-auto.jpg', title: 'Se déplacer', services: ['VTC', 'Dépannage', 'Location'], center: [7.2620, 43.6952], zoom: 15.4, pitch: 60, bearing: -22, origin: '50% 62%' },
  { id: 'stay', domain: 'stay', place: 'Le Negresco', image: '/images/hero/nice-negresco.jpg', title: 'Dormir autrement', services: ['Logements insolites', 'Conciergerie', 'Direct hôtels'], center: [7.2585, 43.6948], zoom: 16.2, pitch: 60, bearing: 28, origin: '50% 34%', twinkle: true },
  { id: 'azur', domain: 'azur', place: 'Baie de Nice', image: '/images/hero/nice-azur-boat.jpg', title: 'Prendre la mer', services: ['Location bateaux', 'Skipper', 'Jetski'], center: [7.2780, 43.6900], zoom: 13.5, pitch: 55, bearing: 0, origin: '50% 80%' },
];

// Transition « vol drone » directionnelle : on plonge dans la scène sortante (zoom vers
// son point d'intérêt) et on émerge sur l'entrante. Le transform-origin (par scène) donne
// la direction du vol ; x ajoute le sens du swipe.
// Scintillement déterministe (mêmes valeurs SSR/CSR → pas de mismatch d'hydratation).
const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// Étoiles : haut du cadre (ciel).
const STARS = Array.from({ length: 28 }, (_, i) => ({ x: rnd(i + 1) * 100, y: 2 + rnd(i + 50) * 36, s: 1 + rnd(i + 100) * 1.5, dur: 2.6 + rnd(i + 150) * 3.4, delay: rnd(i + 200) * 4 }));
// Guirlandes : 3 bandes verticales le long des palmiers éclairés (gauche, centre, droite).
const TWBANDS = [{ x0: 2, x1: 9, y0: 14, y1: 90 }, { x0: 28, x1: 47, y0: 52, y1: 96 }, { x0: 86, x1: 98, y0: 42, y1: 94 }];
const LIGHTS = TWBANDS.flatMap((b, bi) => Array.from({ length: 16 }, (_, i) => { const k = bi * 40 + i; return { x: b.x0 + rnd(k + 7) * (b.x1 - b.x0), y: b.y0 + rnd(k + 17) * (b.y1 - b.y0), s: 1.4 + rnd(k + 27) * 1.7, dur: 1.5 + rnd(k + 37) * 2.4, delay: rnd(k + 47) * 3, warm: rnd(k + 57) > 0.65 }; }));

const sceneVariants: Variants = {
  enter: (d: number) => ({ opacity: 0, scale: 1.12, x: d * 18 }),
  center: { opacity: 1, scale: 1, x: 0, transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1], opacity: { duration: 0.45 } } },
  exit: (d: number) => ({ opacity: 0, scale: 1.18, x: -d * 18, transition: { duration: 0.5, ease: 'easeIn' } }),
};

export default function Hero({ foodPros, nightPros }: { foodPros?: FoodPro[]; nightPros?: NightEntry[] }) {
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

    type MiniMap = { remove: () => void; on: (e: string, cb: () => void) => void; flyTo: (o: object) => void; easeTo: (o: object) => void };
    let map: MiniMap | null = null;
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
      }) as unknown as MiniMap;

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
            {scene.video ? (
              <motion.video src={scene.video} poster={scene.image} autoPlay muted loop playsInline preload="auto"
                animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <motion.img src={scene.image} alt="" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
            {scene.twinkle && (
              <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                {STARS.map((s, i) => (
                  <span key={`st${i}`} className="hero-twinkle" style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, borderRadius: '50%', background: 'rgba(255,255,255,0.95)', boxShadow: `0 0 ${s.s * 2.5}px rgba(255,255,255,0.7)`, animation: `heroTwinkle ${s.dur}s ease-in-out ${s.delay}s infinite` }} />
                ))}
                {/* Guirlandes en CSS uniquement si pas de vidéo (sinon double les lumières déjà allumées du clip). */}
                {!scene.video && LIGHTS.map((l, i) => { const c = l.warm ? 'rgba(255,224,160,0.95)' : 'rgba(186,224,255,0.95)'; return (
                  <span key={`lt${i}`} className="hero-twinkle" style={{ position: 'absolute', left: `${l.x}%`, top: `${l.y}%`, width: l.s, height: l.s, borderRadius: '50%', background: c, boxShadow: `0 0 ${l.s * 2.8}px ${c}`, animation: `heroTwinkle ${l.dur}s ease-in-out ${l.delay}s infinite` }} />
                ); })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Scrim */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(5,12,23,0.55) 0%, rgba(5,12,23,0.10) 26%, rgba(5,12,23,0.30) 58%, rgba(5,12,23,0.92) 100%)' }} />

      {/* Transition « through-the-light » : flash doré au changement de scène (rejoué via key=index) */}
      {stage === 'rest' && (
        <motion.div key={`bloom-${index}`} aria-hidden
          initial={{ opacity: 0 }} animate={{ opacity: [0, 0.94, 0] }} transition={{ duration: 0.78, times: [0, 0.42, 1], ease: 'easeInOut' }}
          style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', background: 'radial-gradient(circle at 50% 42%, rgba(255,248,231,0.98) 0%, rgba(255,216,150,0.9) 42%, rgba(255,188,110,0.6) 100%)' }} />
      )}

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

        {/* Scène : bulle info / module — centré verticalement (déplacé au centre) */}
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
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <div style={{ flex: 1 }} />

        {/* Bas : recherche NIKO + pagination — épinglé en bas (dégage la tab-bar fixe + le débord 100svh) */}
        <div style={{ padding: '0 1.3rem 8.5rem', textAlign: 'center', maxWidth: 600, width: '100%', margin: '0 auto', pointerEvents: 'auto' }}>
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
