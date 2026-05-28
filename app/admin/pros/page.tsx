'use client';
import { useEffect, useState } from 'react';
import { DOMAINS } from '@/lib/constants';

type Pro = {
  id: string;
  business_name: string;
  domain: string;
  phone?: string;
  address?: string;
  description?: string;
  verified: boolean;
  active: boolean;
  created_at: string;
};

export default function AdminProsPage() {
  const [pros, setPros] = useState<Pro[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPros();
  }, [filter]);

  async function fetchPros() {
    setLoading(true);
    const params = filter === 'pending' ? '?verified=false' : filter === 'verified' ? '?verified=true' : '';
    const res = await fetch(`/api/admin/pros${params}`);
    if (res.ok) { const data = await res.json(); setPros(data.pros || []); }
    setLoading(false);
  }

  async function verify(id: string) {
    setActionLoading(id);
    await fetch(`/api/admin/pros/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verified: true, active: true }) });
    setPros(p => p.map(pro => pro.id === id ? { ...pro, verified: true } : pro));
    setActionLoading(null);
  }

  async function suspend(id: string) {
    setActionLoading(id);
    await fetch(`/api/admin/pros/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: false }) });
    setPros(p => p.map(pro => pro.id === id ? { ...pro, active: false } : pro));
    setActionLoading(null);
  }

  async function reactivate(id: string) {
    setActionLoading(id);
    await fetch(`/api/admin/pros/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: true }) });
    setPros(p => p.map(pro => pro.id === id ? { ...pro, active: true } : pro));
    setActionLoading(null);
  }

  const domainOf = (slug: string) => DOMAINS.find(d => d.slug === slug);

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 1100, margin: '0 auto' }}>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D44B24', marginBottom: '0.5rem' }}>
        Admin
      </p>
      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '2rem' }}>
        Professionnels
      </h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '2rem', flexWrap: 'wrap' }}>
        {(['all', 'pending', 'verified'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 20, border: `1px solid ${filter === f ? 'var(--az)' : 'var(--bd2)'}`, background: filter === f ? 'rgba(0,148,212,0.1)' : 'transparent', color: filter === f ? 'var(--az)' : 'var(--td3)', cursor: 'pointer', transition: 'all 0.2s' }}>
            {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : 'Vérifiés'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>Chargement...</div>
      ) : pros.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg2)', borderRadius: 10, fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td3)' }}>
          Aucun professionnel dans cette catégorie.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {pros.map(pro => {
            const domain = domainOf(pro.domain);
            const isLoading = actionLoading === pro.id;
            return (
              <div key={pro.id} style={{ background: 'var(--bg2)', border: `1px solid ${!pro.verified ? 'rgba(212,160,23,0.3)' : !pro.active ? 'rgba(212,75,36,0.3)' : 'var(--bd)'}`, borderRadius: 10, padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.8rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: 18 }}>{domain?.icon || '🏢'}</span>
                      <h3 style={{ fontFamily: 'var(--fe)', fontSize: 20, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)' }}>{pro.business_name}</h3>
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20, background: `${domain?.color || '#0094D4'}15`, color: domain?.color || '#0094D4', border: `1px solid ${domain?.color || '#0094D4'}30` }}>
                        {pro.domain.toUpperCase()}
                      </span>
                    </div>
                    {pro.description && <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', lineHeight: 1.5, maxWidth: 500 }}>{pro.description}</p>}
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {pro.phone && <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>📞 {pro.phone}</span>}
                      {pro.address && <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>📍 {pro.address}</span>}
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>
                        Inscrit le {new Date(pro.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {!pro.verified && (
                      <button onClick={() => verify(pro.id)} disabled={isLoading} style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 6, background: 'rgba(14,168,120,0.1)', border: '1px solid rgba(14,168,120,0.3)', color: 'var(--teal)', cursor: 'pointer', opacity: isLoading ? 0.5 : 1 }}>
                        {isLoading ? '...' : '✓ Vérifier'}
                      </button>
                    )}
                    {pro.active ? (
                      <button onClick={() => suspend(pro.id)} disabled={isLoading} style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 6, background: 'rgba(212,75,36,0.1)', border: '1px solid rgba(212,75,36,0.3)', color: 'var(--coral)', cursor: 'pointer', opacity: isLoading ? 0.5 : 1 }}>
                        {isLoading ? '...' : 'Suspendre'}
                      </button>
                    ) : (
                      <button onClick={() => reactivate(pro.id)} disabled={isLoading} style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 6, background: 'rgba(0,148,212,0.1)', border: '1px solid rgba(0,148,212,0.3)', color: 'var(--az)', cursor: 'pointer', opacity: isLoading ? 0.5 : 1 }}>
                        {isLoading ? '...' : 'Réactiver'}
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: pro.verified ? 'rgba(14,168,120,0.1)' : 'rgba(212,160,23,0.1)', color: pro.verified ? 'var(--teal)' : '#D4A017', border: `1px solid ${pro.verified ? 'rgba(14,168,120,0.2)' : 'rgba(212,160,23,0.2)'}` }}>
                    {pro.verified ? '✓ Vérifié' : '⏳ En attente'}
                  </span>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: pro.active ? 'rgba(14,168,120,0.08)' : 'rgba(212,75,36,0.08)', color: pro.active ? 'var(--teal)' : 'var(--coral)', border: `1px solid ${pro.active ? 'rgba(14,168,120,0.15)' : 'rgba(212,75,36,0.15)'}` }}>
                    {pro.active ? 'Actif' : 'Suspendu'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
