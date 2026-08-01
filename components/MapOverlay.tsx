'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useMapStore } from '@/lib/store';
import { MAP_STYLE, NICE, markerEl, escHtml } from '@/lib/map';
import 'maplibre-gl/dist/maplibre-gl.css';

/* eslint-disable @typescript-eslint/no-explicit-any */

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

export default function MapOverlay() {
  const { isOpen, closeMap } = useMapStore();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const markersRef = useRef<{ marker: any; cat: string }[]>([]);

  useEffect(() => {
    if (!isOpen || !mapRef.current) return;
    let cancelled = false;
    const container = mapRef.current;

    (async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled || !container) return;

      const map = new maplibregl.Map({
        container, style: MAP_STYLE, center: NICE, zoom: 13,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
      mapInstance.current = map;

      map.on('load', () => {
        if (cancelled) return;
        map.resize(); // le conteneur vient d'apparaître (slide-up)
        DEMO_POIS.forEach((poi) => {
          const popup = new maplibregl.Popup({ offset: 20 }).setHTML(
            `<strong>${escHtml(poi.name)}</strong><span style="color:var(--td2)">${escHtml(poi.desc)}</span>`
          );
          const marker = new maplibregl.Marker({ element: markerEl(poi.cat) })
            .setLngLat([poi.lng, poi.lat]).setPopup(popup).addTo(map);
          markersRef.current.push({ marker, cat: poi.cat });
        });
      });
    })();

    return () => {
      cancelled = true;
      markersRef.current = [];
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, [isOpen]);

  function handleFilter(key: string) {
    setActiveFilter(key);
    markersRef.current.forEach(({ marker, cat }) => {
      const el = marker.getElement() as HTMLElement;
      if (el) el.style.display = key === 'all' || cat === key ? '' : 'none';
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
  const pathname = usePathname() ?? '';
  // Sur /ops, ce bouton flottant recouvrait le coin des cartes de review — la carte du site
  // n'a aucun usage sur un poste de pilotage (01/08).
  if (pathname.startsWith('/ops')) return null;
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
