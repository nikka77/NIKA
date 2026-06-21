'use client';
import { useEffect, useRef } from 'react';
import FadeIn from './FadeIn';
import { useMapStore } from '@/lib/store';
import { MAP_STYLE, NICE, markerEl, escHtml } from '@/lib/map';
import 'maplibre-gl/dist/maplibre-gl.css';

/* eslint-disable @typescript-eslint/no-explicit-any */

const POIS = [
  { lat: 43.7102, lng: 7.2620, cat: 'food', name: 'Chez Marco', desc: 'Flash Deal actif' },
  { lat: 43.7045, lng: 7.2586, cat: 'auto', name: 'AutoNice', desc: 'Dépanneur 24h/24' },
  { lat: 43.6956, lng: 7.2753, cat: 'azur', name: 'Azur Marine', desc: 'Bateaux & Skipper' },
  { lat: 43.7182, lng: 7.2694, cat: 'food', name: 'Blend Café', desc: 'Spécialité · Brunch' },
  { lat: 43.7089, lng: 7.2501, cat: 'secu', name: 'Serrurier Nice', desc: 'Urgence · ETA 20min' },
];

export default function MapSection() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const { openMap } = useMapStore();

  useEffect(() => {
    let cancelled = false;
    const container = mapRef.current;
    if (!container) return;

    (async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled || !container) return;

      const map = new maplibregl.Map({
        container, style: MAP_STYLE, center: NICE, zoom: 12.6,
        scrollZoom: false, attributionControl: { compact: true },
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      mapInstance.current = map;

      map.on('load', () => {
        if (cancelled) return;
        map.resize();
        POIS.forEach(p => {
          const popup = new maplibregl.Popup({ offset: 20 }).setHTML(
            `<strong>${escHtml(p.name)}</strong><span style="color:var(--td2)">${escHtml(p.desc)}</span>`
          );
          new maplibregl.Marker({ element: markerEl(p.cat) })
            .setLngLat([p.lng, p.lat]).setPopup(popup).addTo(map);
        });
      });
    })();

    return () => {
      cancelled = true;
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, []);

  return (
    <div id="carte" style={{ background: 'var(--bg)', borderTop: '1px solid var(--bd)', padding: '5rem 0 0' }}>
      <div style={{ padding: '0 1.4rem 2rem', maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <FadeIn>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ display: 'block', width: 14, height: 1, background: 'currentColor' }} />
            Géolocalisé
          </p>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px,6.5vw,62px)', fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.02em', lineHeight: 0.95, textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.7rem' }}>
            Explore la carte
          </h2>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.7, maxWidth: 480 }}>
            Tous les pros, hébergements et POIs sur Nice. Filtre par domaine, crée des points d&apos;intérêt.
          </p>
        </FadeIn>
        <FadeIn delay={0.2}>
          <button onClick={openMap} style={{ fontFamily: 'var(--fe)', fontSize: 12, fontWeight: 700, fontStyle: 'italic', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '9px 20px', borderRadius: 3, border: '1px solid var(--az)', color: 'var(--az)', transition: 'all 0.2s' }}>
            Plein écran ↗
          </button>
        </FadeIn>
      </div>
      <div ref={mapRef} style={{ width: '100%', height: 420, borderTop: '1px solid var(--bd)' }}
        className="max-sm:h-64" />
    </div>
  );
}
