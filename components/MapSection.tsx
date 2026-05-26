'use client';
import { useEffect, useRef } from 'react';
import FadeIn from './FadeIn';
import { useMapStore } from '@/lib/store';

export default function MapSection() {
  const mapRef = useRef<HTMLDivElement>(null);
  const { openMap } = useMapStore();

  useEffect(() => {
    let mapInstance: unknown = null;
    const container = mapRef.current;
    if (!container) return;

    import('leaflet').then((mod) => {
      const L = mod.default || mod;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      const map = L.map(container, { zoomControl: true, scrollWheelZoom: false }).setView([43.7102, 7.262], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      const pois = [
        { lat: 43.7102, lng: 7.2620, cat: 'food', icon: '🍽️', name: 'Chez Marco', desc: 'Flash Deal actif' },
        { lat: 43.7045, lng: 7.2586, cat: 'auto', icon: '🚗', name: 'AutoNice', desc: 'Dépanneur 24h/24' },
        { lat: 43.6956, lng: 7.2753, cat: 'azur', icon: '🛥️', name: 'Azur Marine', desc: 'Bateaux & Skipper' },
        { lat: 43.7182, lng: 7.2694, cat: 'food', icon: '☕', name: 'Blend Café', desc: 'Spécialité · Brunch' },
        { lat: 43.7089, lng: 7.2501, cat: 'secu', icon: '🔒', name: 'Serrurier Nice', desc: 'Urgence · ETA 20min' },
      ];
      const colors: Record<string, string> = { food: '#D4A017', auto: '#0094D4', azur: '#0868A0', secu: '#D44B24' };

      pois.forEach(p => {
        const color = colors[p.cat] || '#0094D4';
        const icon = L.divIcon({
          className: '',
          html: `<div class="nmark" style="background:${color}20;border-color:${color}55">${p.icon}</div>`,
          iconSize: [30, 30], iconAnchor: [15, 15],
        });
        L.marker([p.lat, p.lng], { icon }).addTo(map).bindPopup(`<strong>${p.name}</strong><span>${p.desc}</span>`);
      });

      mapInstance = map;
    });

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (mapInstance) (mapInstance as any).remove();
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
