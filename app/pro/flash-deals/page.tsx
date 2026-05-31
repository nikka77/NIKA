'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';

type Deal = {
  id: string;
  title: string;
  description?: string;
  discount_type: string;
  discount_value: number;
  expires_at: string;
  active: boolean;
};

export default function ProFlashDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [proId, setProId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', discount_type: 'percent', discount_value: '10', hours: '2' });
  const [saving, setSaving] = useState(false);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (user) loadDeals();
  }, [user]);

  async function loadDeals() {
    const supabase = createClient();
    if (!supabase || !user) return;
    const { data: pro } = await supabase.from('pros').select('id').eq('user_id', user.id).single();
    if (!pro) { setLoading(false); return; }
    setProId(pro.id);
    const { data } = await supabase.from('flash_deals').select('*').eq('pro_id', pro.id).order('created_at', { ascending: false });
    setDeals(data || []);
    setLoading(false);
  }

  async function addDeal(e: React.FormEvent) {
    e.preventDefault();
    if (!proId) return;
    setSaving(true);
    const supabase = createClient();
    if (!supabase) { setSaving(false); return; }
    const expiresAt = new Date(Date.now() + parseInt(form.hours) * 3600000).toISOString();
    const { data } = await supabase.from('flash_deals').insert({
      pro_id: proId,
      title: form.title,
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      expires_at: expiresAt,
      active: true,
    }).select().single();
    if (data) setDeals(d => [data, ...d]);
    setForm({ title: '', description: '', discount_type: 'percent', discount_value: '10', hours: '2' });
    setShowForm(false);
    setSaving(false);
  }

  async function toggleDeal(id: string, active: boolean) {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from('flash_deals').update({ active: !active }).eq('id', id);
    setDeals(d => d.map(deal => deal.id === id ? { ...deal, active: !active } : deal));
  }

  const discountLabel = (type: string, value: number) => {
    if (type === 'percent') return `-${value}%`;
    if (type === 'fixed') return `-${value}€`;
    return 'OFFERT';
  };

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link href="/pro/dashboard" style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '0.6rem' }}>← Espace pro</Link>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95 }}>
            Flash Deals
          </h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '11px 22px', borderRadius: 3, background: 'var(--gold)', color: '#050C17', cursor: 'pointer' }}>
          ⚡ Créer un deal
        </button>
      </div>

      {showForm && (
        <form onSubmit={addDeal} style={{ background: 'var(--bg2)', border: '1px solid rgba(212,160,23,0.3)', borderRadius: 10, padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', color: 'var(--gold)' }}>Nouveau Flash Deal</h3>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Pizza Margherita -30% *" required style={inputStyle} />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optionnel)" rows={2} style={{ ...inputStyle, resize: 'none' }} />
          <div style={{ gap: '0.8rem' }} className="g-3 max-sm:grid-cols-1">
            <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))} style={inputStyle}>
              <option value="percent">Pourcentage (%)</option>
              <option value="fixed">Montant fixe (€)</option>
              <option value="free_item">Article offert</option>
            </select>
            <input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} placeholder="Valeur" min="0" step="0.5" style={inputStyle} />
            <select value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} style={inputStyle}>
              <option value="1">1 heure</option>
              <option value="2">2 heures</option>
              <option value="4">4 heures</option>
              <option value="8">8 heures</option>
              <option value="24">24 heures</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 16px', borderRadius: 6, border: '1px solid var(--bd2)', color: 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 6, background: 'var(--gold)', color: '#050C17', fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Création...' : '⚡ Lancer le Flash Deal'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>Chargement...</div>
      ) : deals.length === 0 ? (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: '1rem' }}>⚡</div>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td3)' }}>Aucun Flash Deal. Crée une offre limitée pour attirer des clients !</p>
        </div>
      ) : (
        <div style={{ gap: '1rem' }} className="g-2 max-sm:grid-cols-1">
          {deals.map(deal => {
            const expired = new Date(deal.expires_at) < new Date();
            return (
              <div key={deal.id} style={{ background: 'var(--bg2)', border: `1px solid ${deal.active && !expired ? 'rgba(212,160,23,0.3)' : 'var(--bd)'}`, borderRadius: 10, padding: '1.4rem', position: 'relative', overflow: 'hidden' }}>
                {deal.active && !expired && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--gold)' }} />}
                <div style={{ fontFamily: 'var(--fe)', fontSize: 36, fontStyle: 'italic', color: deal.active && !expired ? 'var(--gold2)' : 'var(--td3)', marginBottom: '0.3rem' }}>
                  {discountLabel(deal.discount_type, deal.discount_value)}
                </div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 600, color: 'var(--td)', marginBottom: '0.2rem' }}>{deal.title}</div>
                {deal.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', marginBottom: '0.7rem' }}>{deal.description}</div>}
                <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: expired ? 'var(--coral)' : 'var(--td3)', marginBottom: '0.8rem' }}>
                  {expired ? '🔴 Expiré' : `Expire ${new Date(deal.expires_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                </div>
                {!expired && (
                  <button onClick={() => toggleDeal(deal.id, deal.active)} style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 6, background: deal.active ? 'rgba(212,75,36,0.08)' : 'rgba(14,168,120,0.08)', border: `1px solid ${deal.active ? 'rgba(212,75,36,0.2)' : 'rgba(14,168,120,0.2)'}`, color: deal.active ? 'var(--coral)' : 'var(--teal)', cursor: 'pointer' }}>
                    {deal.active ? 'Désactiver' : 'Réactiver'}
                  </button>
                )}
              </div>
            );
          })}
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
