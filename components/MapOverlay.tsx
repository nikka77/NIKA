'use client';
import { useEffect, useRef, useState } from 'react';
import { useMapStore } from '@/lib/store';

const FILTER_BTNS = [
  { key: 'all',  label: 'Tout' },
  { key: 'food', label: '🍽️ Food' },
  { key: 'auto', label: '🚗 Auto' },
  { key: 'stay', label: '🏡 Stay' },
  { key: 'azur', label: '🛥️ Azur' },
  { key: 'serv', label: '🔧 Services' },
  { key: 'secu', label: '🔒 Sécu' },
];

const DEMO_POIS = [
  { lat: 43.7102, lng: 7.2620, cat: 'food', name: 'Chez Marco', desc: 'Pizza · Flash Deal actif' },
  { lat: 43.7045, lng: 7.2586, cat: 'auto', name: 'AutoNice Dépannage', desc: 'Dépanneur · 24h/24' },
  { lat: 43.6956, lng: 7.2753, cat: 'azur', name: 'Azur Marine', desc: 'Location bateau · Skipper dispo' },
  { lat: 43.7182, lng: 7.2694, cat: 'food', name: 'Blend Café', desc: 'Café spécialité · Brunch' },
  { lat: 43.7001, lng: 7.2649, cat: 'serv', name: 'Artisan Pro', desc: 'Plombier · Disponible' },
  { lat: 43.7089, lng: 7.2501, cat: 'secu', name: 'Serrurier Nice', desc: 'Urgence · ETA 20min' },
  { lat: 43.7234, lng: 7.2788, cat: 'stay', name: 'Villa Insolite', desc: 'Maison flottante · 4 nuits min' },
];

const CAT_COLORS: Record<string, string> = {
  food: '#D4A017', auto: '#0094D4', azur: '#0868A0',
  stay: '#E07038', serv: '#0EA878', secu: '#D44B24', news: '#5A88B0',
};

export default function MapOverlay() {
  const { isOpen, closeMap } = useMapStore();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<unknown>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const markersRef = useRef<unknown[]>([]);

  useEffect(() => {
    if (!isOpen || !mapRef.current) return;
    let L: typeof import('leaflet') | null = null;
    let mapInstance: ReturnType<typeof import('leaflet').map> | null = null;

    import('leaflet').then((mod) => {
      L = mod.default || mod;
      if (!mapRef.current) return;

      // Fix default icon
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      mapInstance = L.map(mapRef.current!).setView([43.7102, 7.262], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(mapInstance);

      leafletRef.current = mapInstance;

      DEMO_POIS.forEach((poi) => {
        const color = CAT_COLORS[poi.cat] || '#0094D4';
        const icon = L!.divIcon({
          className: '',
          html: `<div class="nmark" style="background:${color}20;border-color:${color}40;font-size:13px">
            ${poi.cat === 'food' ? '🍽️' : poi.cat === 'auto' ? '🚗' : poi.cat === 'azur' ? '🛥️' : poi.cat === 'stay' ? '🏡' : poi.cat === 'serv' ? '🔧' : '🔒'}
          </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        const marker = L!.marker([poi.lat, poi.lng], { icon })
          .addTo(mapInstance!)
          .bindPopup(`<strong>${poi.name}</strong><span>${poi.desc}</span>`);
        markersRef.current.push({ marker, cat: poi.cat });
      });
    });

    return () => {
      if (mapInstance) mapInstance.remove();
      markersRef.current = [];
    };
  }, [isOpen]);

  function handleFilter(key: string) {
    setActiveFilter(key);
    // Filter markers visibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    markersRef.current.forEach((item: any) => {
      const el = item.marker.getElement();
      if (el) el.style.display = key === 'all' || item.cat === key ? '' : 'none';
    });
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'var(--bg)',
      transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
      transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0.9rem 1.4rem',
        borderBottom: '1px solid var(--bd)', background: 'var(--bg2)', flexShrink: 0,
      }}>
        <div style={{ fontFamily: 'var(--fn)', fontSize: 22, letterSpacing: '0.08em' }}>
          NIKA · CARTE MONDIALE
        </div>
        <button
          onClick={closeMap}
          style={{
            width: 34, height: 34, borderRadius: '50%',
            border: '1px solid var(--bd2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, color: 'var(--td2)', transition: 'all 0.2s',
          }}
        >
          ✕
        </button>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 6, padding: '0.65rem 1.4rem',
        borderBottom: '1px solid var(--bd)', background: 'var(--bg2)',
        overflowX: 'auto', flexShrink: 0,
      }}>
        {FILTER_BTNS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleFilter(key)}
            style={{
              fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '5px 13px', borderRadius: 20,
              border: `1px solid ${activeFilter === key ? 'var(--az)' : 'var(--bd2)'}`,
              background: activeFilter === key ? 'rgba(0,148,212,0.1)' : 'transparent',
              color: activeFilter === key ? 'var(--az)' : 'var(--td2)',
              whiteSpace: 'nowrap', transition: 'all 0.2s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ flex: 1, minHeight: 0 }} />
    </div>
  );
}

// Float button (fixed, always visible)
export function FloatMapBtn() {
  const { openMap } = useMapStore();
  return (
    <button
      onClick={openMap}
      className="float-map-btn"
      style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 400,
        width: 50, height: 50, borderRadius: '50%',
        background: 'var(--az)',
        boxShadow: '0 0 0 3px rgba(0,148,212,0.2), 0 4px 16px rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      title="Carte live"
    >
      🗺️
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: '2px solid var(--az)',
        animation: 'fping 2.5s ease-out infinite',
      }} />
    </button>
  );
}
