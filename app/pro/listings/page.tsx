'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';

type Listing = {
  id: string;
  title: string;
  description?: string;
  price?: number;
  currency: string;
  stock?: number;
  available: boolean;
};

export default function ProListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [proId, setProId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', price: '', stock: '' });
  const [saving, setSaving] = useState(false);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (user) loadListings();
  }, [user]);

  async function loadListings() {
    const supabase = createClient();
    if (!supabase || !user) return;
    const { data: pro } = await supabase.from('pros').select('id').eq('user_id', user.id).single();
    if (!pro) { setLoading(false); return; }
    setProId(pro.id);
    const { data } = await supabase.from('listings').select('*').eq('pro_id', pro.id).order('created_at', { ascending: false });
    setListings(data || []);
    setLoading(false);
  }

  async function addListing(e: React.FormEvent) {
    e.preventDefault();
    if (!proId) return;
    setSaving(true);
    const supabase = createClient();
    if (!supabase) { setSaving(false); return; }
    const { data } = await supabase.from('listings').insert({
      pro_id: proId,
      domain: 'auto',
      title: form.title,
      description: form.description || null,
      price: form.price ? parseFloat(form.price) : null,
      stock: form.stock ? parseInt(form.stock) : null,
      currency: 'EUR',
      available: true,
    }).select().single();
    if (data) setListings(l => [data, ...l]);
    setForm({ title: '', description: '', price: '', stock: '' });
    setShowForm(false);
    setSaving(false);
  }

  async function toggleAvailable(id: string, available: boolean) {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from('listings').update({ available: !available }).eq('id', id);
    setListings(l => l.map(li => li.id === id ? { ...li, available: !available } : li));
  }

  async function deleteListing(id: string) {
    if (!confirm('Supprimer ce listing ?')) return;
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from('listings').delete().eq('id', id);
    setListings(l => l.filter(li => li.id !== id));
  }

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link href="/pro/dashboard" style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '0.6rem' }}>← Espace pro</Link>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95 }}>
            Mes Listings
          </h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '11px 22px', borderRadius: 3, background: 'var(--teal)', color: '#fff', cursor: 'pointer' }}>
          + Ajouter
        </button>
      </div>

      {showForm && (
        <form onSubmit={addListing} style={{ background: 'var(--bg2)', border: '1px solid var(--teal)33', borderRadius: 10, padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', color: 'var(--teal)' }}>Nouveau listing</h3>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nom du service / produit *" required style={inputStyle} />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optionnel)" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="Prix (€)" min="0" step="0.01" style={inputStyle} />
            <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="Stock (optionnel)" min="0" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setShowForm(false)} style={{ flex: 0, padding: '10px 16px', borderRadius: 6, border: '1px solid var(--bd2)', color: 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 6, background: 'var(--teal)', color: '#fff', fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Enregistrement...' : 'Ajouter le listing'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>Chargement...</div>
      ) : listings.length === 0 ? (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: '1rem' }}>📦</div>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td3)' }}>Aucun listing. Ajoute tes services et produits.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {listings.map(l => (
            <div key={l.id} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--fe)', fontSize: 17, fontStyle: 'italic', color: 'var(--td)', fontWeight: 700, marginBottom: '0.2rem' }}>{l.title}</div>
                {l.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', marginBottom: '0.4rem' }}>{l.description}</div>}
                <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
                  {l.price && <span style={{ fontFamily: 'var(--fn)', fontSize: 18, color: 'var(--az)' }}>{l.price}€</span>}
                  {l.stock !== undefined && l.stock !== null && <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: l.stock < 5 ? 'var(--coral)' : 'var(--td3)' }}>Stock: {l.stock}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => toggleAvailable(l.id, l.available)} style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 6, background: l.available ? 'rgba(14,168,120,0.1)' : 'rgba(90,136,176,0.1)', border: `1px solid ${l.available ? 'rgba(14,168,120,0.3)' : 'rgba(90,136,176,0.3)'}`, color: l.available ? 'var(--teal)' : 'var(--slate)', cursor: 'pointer' }}>
                  {l.available ? 'Disponible' : 'Indispo'}
                </button>
                <button onClick={() => deleteListing(l.id)} style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 6, background: 'rgba(212,75,36,0.08)', border: '1px solid rgba(212,75,36,0.2)', color: 'var(--coral)', cursor: 'pointer' }}>
                  Sup.
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--bd2)', borderRadius: 6,
  padding: '10px 14px', fontFamily: 'var(--fo)',
  fontSize: 13, color: 'var(--td)', outline: 'none',
};
