'use client';
import { useEffect, useRef, useState } from 'react';
import { DOMAINS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';

export default function CartePage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPoi, setNewPoi] = useState({ name: '', category: 'general', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef2 = useRef<any>(null);

  useEffect(() => {
    let map: unknown = null;
    let mounted = true;
    const container = mapRef.current;
    if (!container) return;

    import('leaflet').then((mod) => {
      if (!mounted) return;
      const L = mod.default || mod;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = L.map(container, { zoomControl: true, scrollWheelZoom: true } as any) as any;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        subdomains: 'abc', maxZoom: 19, attribution: '© OpenStreetMap',
      }).addTo(m);
      m.setView([43.7102, 7.262], 14);

      const demoPois = [
        { id: '1', name: 'Chez Marco', lat: 43.7102, lng: 7.2620, category: 'food', description: 'Flash Deal actif — Pasta -20%', upvotes: 12 },
        { id: '2', name: 'AutoNice', lat: 43.7045, lng: 7.2586, category: 'auto', description: 'Dépanneur 24h/24', upvotes: 8 },
        { id: '3', name: 'Azur Marine', lat: 43.6956, lng: 7.2753, category: 'azur', description: 'Bateaux & Skipper', upvotes: 23 },
        { id: '4', name: 'Blend Café', lat: 43.7182, lng: 7.2694, category: 'food', description: 'Brunch & spécialités', upvotes: 17 },
        { id: '5', name: 'Serrurier Nice', lat: 43.7089, lng: 7.2501, category: 'sec', description: 'Urgence · ETA 20min', upvotes: 5 },
        { id: '6', name: 'Skipper Côte d\'Azur', lat: 43.7015, lng: 7.2710, category: 'azur', description: 'Navigation, excursions', upvotes: 31 },
      ];

      const colors: Record<string, string> = { food: '#D4A017', auto: '#0094D4', azur: '#0868A0', sec: '#D44B24', stay: '#E07038', serv: '#0EA878', learn: '#7B5CF0', rent: '#5A88B0', general: '#5A88B0' };
      const icons: Record<string, string> = { food: '🍽️', auto: '🚗', azur: '🛥️', sec: '🔒', stay: '🏡', serv: '🔧', learn: '📚', rent: '📦', general: '📍' };

      function esc(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

      demoPois.forEach(poi => {
        const color = colors[poi.category] || '#5A88B0';
        const icon = icons[poi.category] || '📍';
        const divIcon = L.divIcon({
          className: '',
          html: `<div style="width:30px;height:30px;border-radius:50%;background:${color}20;border:2px solid ${color}66;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4)">${icon}</div>`,
          iconSize: [30, 30], iconAnchor: [15, 15],
        });
        L.marker([poi.lat, poi.lng], { icon: divIcon }).addTo(m)
          .bindPopup(`<strong style="font-family:sans-serif;font-size:13px">${esc(poi.name)}</strong><br><span style="font-size:11px;color:#888">${esc(poi.description || '')}</span><br><span style="font-size:10px;color:#0094D4">▲ ${poi.upvotes}</span>`);
      });

      map = m;
      mapRef2.current = m;
    });

    return () => {
      mounted = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (map) (map as any).remove();
    };
  }, []);

  async function handleAddPoi() {
    if (!newPoi.name.trim()) return;
    setSubmitting(true);
    setSubmitMsg('');
    try {
      const supabase = createClient();
      const center = mapRef2.current?.getCenter?.() || { lat: 43.7102, lng: 7.262 };
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
