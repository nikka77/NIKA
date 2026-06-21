'use client';
import { useEffect, useRef, useState } from 'react';
import { DOMAINS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { MAP_STYLE, NICE, markerEl, escHtml } from '@/lib/map';
import 'maplibre-gl/dist/maplibre-gl.css';

/* eslint-disable @typescript-eslint/no-explicit-any */

const DEMO_POIS = [
  { id: '1', name: 'Chez Marco', lat: 43.7102, lng: 7.2620, category: 'food', description: 'Flash Deal actif — Pasta -20%', upvotes: 12 },
  { id: '2', name: 'AutoNice', lat: 43.7045, lng: 7.2586, category: 'auto', description: 'Dépanneur 24h/24', upvotes: 8 },
  { id: '3', name: 'Azur Marine', lat: 43.6956, lng: 7.2753, category: 'azur', description: 'Bateaux & Skipper', upvotes: 23 },
  { id: '4', name: 'Blend Café', lat: 43.7182, lng: 7.2694, category: 'food', description: 'Brunch & spécialités', upvotes: 17 },
  { id: '5', name: 'Serrurier Nice', lat: 43.7089, lng: 7.2501, category: 'sec', description: 'Urgence · ETA 20min', upvotes: 5 },
  { id: '6', name: 'Skipper Côte d\'Azur', lat: 43.7015, lng: 7.2710, category: 'azur', description: 'Navigation, excursions', upvotes: 31 },
];

export default function CartePage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<{ marker: any; cat: string }[]>([]);
  const filterRef = useRef('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPoi, setNewPoi] = useState({ name: '', category: 'general', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    const container = mapRef.current;
    if (!container) return;

    (async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled || !container) return;

      const map = new maplibregl.Map({
        container, style: MAP_STYLE, center: NICE, zoom: 13.2,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
      mapInstance.current = map;

      map.on('load', () => {
        if (cancelled) return;
        DEMO_POIS.forEach(poi => {
          const popup = new maplibregl.Popup({ offset: 20 }).setHTML(
            `<strong>${escHtml(poi.name)}</strong>` +
            `<span style="color:var(--td2)">${escHtml(poi.description || '')}</span>` +
            `<div style="font-size:10px;color:var(--az2);margin-top:3px">▲ ${poi.upvotes}</div>`
          );
          const marker = new maplibregl.Marker({ element: markerEl(poi.category) })
            .setLngLat([poi.lng, poi.lat]).setPopup(popup).addTo(map);
          markersRef.current.push({ marker, cat: poi.category });
        });
        applyFilter(filterRef.current);
      });
    })();

    return () => {
      cancelled = true;
      markersRef.current = [];
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, []);

  function applyFilter(filter: string) {
    markersRef.current.forEach(({ marker, cat }) => {
      (marker.getElement() as HTMLElement).style.display =
        (filter === 'all' || cat === filter) ? '' : 'none';
    });
  }

  // Le filtre du bandeau masque/affiche réellement les POI (était inopérant avant).
  useEffect(() => { filterRef.current = activeFilter; applyFilter(activeFilter); }, [activeFilter]);

  async function handleAddPoi() {
    if (!newPoi.name.trim()) return;
    setSubmitting(true);
    setSubmitMsg('');
    try {
      const supabase = createClient();
      const center = mapInstance.current?.getCenter?.() || { lat: 43.7102, lng: 7.262 };
      if (supabase) {
        await supabase.from('pois').insert({
          name: newPoi.name.trim(),
          category: newPoi.category,
          description: newPoi.description.trim() || null,
          lat: center.lat,
          lng: center.lng,
          upvotes: 0,
          source: 'user',
        });
      }
      setSubmitMsg('POI soumis ! +80 XP en attente de validation.');
      setNewPoi({ name: '', category: 'general', description: '' });
      setTimeout(() => { setShowAddForm(false); setSubmitMsg(''); }, 2500);
    } catch {
      setSubmitMsg('Erreur — réessaie dans un instant.');
    }
    setSubmitting(false);
  }

  return (
    <div style={{ height: 'calc(100vh - 54px)', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Top bar */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--bd)', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.7rem', flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
        <button
          onClick={() => setActiveFilter('all')}
          style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 13px', borderRadius: 20, border: `1px solid ${activeFilter === 'all' ? 'var(--az)' : 'var(--bd2)'}`, background: activeFilter === 'all' ? 'rgba(0,148,212,0.1)' : 'transparent', color: activeFilter === 'all' ? 'var(--az)' : 'var(--td3)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          Tous
        </button>
        {DOMAINS.slice(0, 8).map(d => (
          <button
            key={d.slug}
            onClick={() => setActiveFilter(d.slug)}
            style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 13px', borderRadius: 20, border: `1px solid ${activeFilter === d.slug ? d.color : 'var(--bd2)'}`, background: activeFilter === d.slug ? `${d.color}15` : 'transparent', color: activeFilter === d.slug ? d.color : 'var(--td3)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {d.icon} {d.label}
          </button>
        ))}
        <button
          onClick={() => setShowAddForm(true)}
          style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 13px', borderRadius: 20, border: '1px solid rgba(14,168,120,0.4)', background: 'rgba(14,168,120,0.08)', color: 'var(--teal)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 'auto' }}
        >
          + Ajouter un POI
        </button>
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ flex: 1, width: '100%', position: 'relative' }} />

      {/* Add POI panel */}
      {showAddForm && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: '12px 12px 0 0', padding: '1.5rem', zIndex: 500, boxShadow: '0 -8px 32px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h3 style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)' }}>Ajouter un POI</h3>
            <button onClick={() => setShowAddForm(false)} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--bd2)', color: 'var(--td2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>×</button>
          </div>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginBottom: '0.9rem' }}>Le POI sera placé au centre de la carte. Recentre la carte sur le lieu voulu.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <input value={newPoi.name} onChange={e => setNewPoi(n => ({ ...n, name: e.target.value }))} placeholder="Nom du lieu" style={inputStyle} />
            <select value={newPoi.category} onChange={e => setNewPoi(n => ({ ...n, category: e.target.value }))} style={inputStyle}>
              <option value="general">Général</option>
              {DOMAINS.map(d => <option key={d.slug} value={d.slug}>{d.icon} {d.label}</option>)}
            </select>
            <textarea value={newPoi.description} onChange={e => setNewPoi(n => ({ ...n, description: e.target.value }))} placeholder="Description (optionnel)" rows={2} style={{ ...inputStyle, resize: 'none' }} />
            {submitMsg && <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: submitMsg.includes('Erreur') ? 'var(--coral)' : 'var(--teal)', textAlign: 'center' }}>{submitMsg}</p>}
            <button onClick={handleAddPoi} disabled={submitting || !newPoi.name.trim()} style={{ padding: '12px', borderRadius: 6, background: 'var(--teal)', color: '#fff', fontFamily: 'var(--fe)', fontSize: 14, fontStyle: 'italic', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: submitting ? 'default' : 'pointer', opacity: (submitting || !newPoi.name.trim()) ? 0.6 : 1 }}>
              {submitting ? 'Envoi...' : 'Soumettre (+80 XP)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--bd2)', borderRadius: 6,
  padding: '10px 14px', fontFamily: 'var(--fo)',
  fontSize: 13, color: 'var(--td)', outline: 'none',
};
