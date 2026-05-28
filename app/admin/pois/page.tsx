'use client';
import { useEffect, useState } from 'react';

type POI = {
  id: string;
  name: string;
  category: string;
  description?: string;
  lat: number;
  lng: number;
  upvotes: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export default function AdminPoisPage() {
  const [pois, setPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { fetchPois(); }, [filter]);

  async function fetchPois() {
    setLoading(true);
    const res = await fetch(`/api/admin/pois?status=${filter}`);
    if (res.ok) { const data = await res.json(); setPois(data.pois || []); }
    setLoading(false);
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    setActionLoading(id);
    await fetch(`/api/admin/pois/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setPois(p => p.filter(poi => poi.id !== id));
    setActionLoading(null);
  }

  const catColors: Record<string, string> = {
    food: '#D4A017', auto: '#0094D4', azur: '#0868A0', stay: '#E07038',
    nature: '#0EA878', culture: '#7B5CF0', sport: '#D44B24', general: '#5A88B0',
  };

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 1100, margin: '0 auto' }}>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D44B24', marginBottom: '0.5rem' }}>
        Admin
      </p>
      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '2rem' }}>
        Points d&apos;Intérêt
      </h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: '2rem' }}>
        {(['pending', 'approved', 'rejected'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 20, border: `1px solid ${filter === f ? 'var(--az)' : 'var(--bd2)'}`, background: filter === f ? 'rgba(0,148,212,0.1)' : 'transparent', color: filter === f ? 'var(--az)' : 'var(--td3)', cursor: 'pointer', transition: 'all 0.2s' }}>
            {f === 'pending' ? 'En attente' : f === 'approved' ? 'Approuvés' : 'Rejetés'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>Chargement...</div>
      ) : pois.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg2)', borderRadius: 10, fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td3)' }}>
          Aucun POI dans cette catégorie.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }} className="max-md:grid-cols-1">
          {pois.map(poi => {
            const color = catColors[poi.category] || '#5A88B0';
            const isLoading = actionLoading === poi.id;
            return (
              <div key={poi.id} style={{ background: 'var(--bg2)', border: `1px solid ${color}33`, borderRadius: 10, padding: '1.4rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.7rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.2rem' }}>
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20, background: `${color}15`, color, border: `1px solid ${color}30` }}>
                        {poi.category}
                      </span>
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--az)' }}>▲ {poi.upvotes}</span>
                    </div>
                    <h3 style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)' }}>{poi.name}</h3>
                  </div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', flexShrink: 0 }}>
                    {new Date(poi.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                {poi.description && (
                  <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', lineHeight: 1.5, marginBottom: '0.8rem' }}>{poi.description}</p>
                )}
                <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginBottom: '1rem' }}>
                  📍 {poi.lat.toFixed(5)}, {poi.lng.toFixed(5)}
                </div>
                {filter === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => updateStatus(poi.id, 'approved')} disabled={isLoading} style={{ flex: 1, padding: '8px 12px', borderRadius: 6, background: 'rgba(14,168,120,0.1)', border: '1px solid rgba(14,168,120,0.3)', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: 'var(--teal)', cursor: 'pointer', opacity: isLoading ? 0.5 : 1 }}>
                      {isLoading ? '...' : '✓ Approuver'}
                    </button>
                    <button onClick={() => updateStatus(poi.id, 'rejected')} disabled={isLoading} style={{ flex: 1, padding: '8px 12px', borderRadius: 6, background: 'rgba(212,75,36,0.1)', border: '1px solid rgba(212,75,36,0.3)', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: 'var(--coral)', cursor: 'pointer', opacity: isLoading ? 0.5 : 1 }}>
                      {isLoading ? '...' : '✗ Rejeter'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
