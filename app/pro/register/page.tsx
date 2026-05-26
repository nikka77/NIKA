'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { DOMAINS } from '@/lib/constants';

function ProRegisterForm() {
  const searchParams = useSearchParams();
  const [domain, setDomain] = useState(searchParams.get('domain') || 'auto');
  const [form, setForm] = useState({ business_name: '', description: '', phone: '', address: '', google_place_id: '' });
  const [loading, setLoading] = useState(false);
  const [gmbLoading, setGmbLoading] = useState(false);
  const user = useAuthStore(s => s.user);
  const router = useRouter();

  async function importGMB() {
    const url = prompt('Colle ton lien Google Maps (ex: https://maps.google.com/?cid=...)');
    if (!url) return;
    setGmbLoading(true);
    const res = await fetch(`/api/gmb?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    if (data.name) {
      setForm(f => ({ ...f, business_name: data.name, address: data.formatted_address || f.address, google_place_id: data.place_id || f.google_place_id }));
    }
    setGmbLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { alert('Connecte-toi pour créer ton profil pro.'); return; }
    setLoading(true);
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }
    const { error } = await supabase.from('pros').insert({ ...form, user_id: user.id, domain });
    if (!error) {
      await supabase.from('users').update({ is_pro: true }).eq('id', user.id);
      router.push('/pro/dashboard');
    }
    setLoading(false);
  }

  const selectedDomain = DOMAINS.find(d => d.slug === domain);

  return (
    <main style={{ padding: '5rem 1.4rem', maxWidth: 720, margin: '0 auto' }}>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--az)', marginBottom: '0.6rem' }}>
        Partenaires NIKA
      </p>
      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(36px,6vw,64px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.7rem' }}>
        Rejoindre en tant que Pro
      </h1>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.7, marginBottom: '2rem' }}>
        Gère tout par SMS, reçois des demandes géolocalisées, développe ta clientèle sur la Côte d&apos;Azur.
      </p>

      {/* GMB Import */}
      <button onClick={importGMB} disabled={gmbLoading} style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--az)', border: '1px solid rgba(0,148,212,0.3)', background: 'rgba(0,148,212,0.06)', padding: '10px 16px', borderRadius: 6, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
        🗺️ {gmbLoading ? 'Import en cours...' : 'Importer depuis Google My Business (1 clic)'}
      </button>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        {/* Domain */}
        <div>
          <label style={labelStyle}>Domaine d&apos;activité</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {DOMAINS.map(d => (
              <button key={d.slug} type="button" onClick={() => setDomain(d.slug)} style={{
                padding: '10px 8px', borderRadius: 6, textAlign: 'center',
                border: `1px solid ${domain === d.slug ? d.color : 'var(--bd2)'}`,
                background: domain === d.slug ? `${d.color}15` : 'transparent',
                cursor: 'pointer', transition: 'all 0.2s',
              }}>
                <div style={{ fontSize: 20 }}>{d.icon}</div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: domain === d.slug ? d.color : 'var(--td3)', marginTop: 4 }}>{d.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Nom du commerce / activité *</label>
          <input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} placeholder="Ex: Dépannage Nice Auto" required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Décris tes services, ta zone d'intervention..." rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        <div>
          <label style={labelStyle}>Téléphone (pour gestion par SMS) *</label>
          <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+33612345678" required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Adresse</label>
          <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Adresse ou zone d'intervention" style={inputStyle} />
        </div>

        {/* SMS Info */}
        <div style={{ padding: '1rem', background: 'rgba(0,148,212,0.04)', border: '1px solid rgba(0,148,212,0.12)', borderRadius: 6, fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--td)', display: 'block', marginBottom: 4 }}>📱 Gestion par SMS incluse</strong>
          Envoie un SMS au numéro NIKA pour gérer ton profil. Exemples :<br />
          • &quot;fermé ce soir&quot; → profil mis en pause<br />
          • &quot;3 burgers restants&quot; → stock mis à jour<br />
          • &quot;promo pizza 8€ 2h&quot; → Flash Deal créé
        </div>

        <button type="submit" disabled={loading || !user} style={{
          fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          padding: '14px 30px', borderRadius: 3,
          background: selectedDomain?.color || 'var(--az)', color: '#fff',
          boxShadow: `0 0 28px ${selectedDomain?.color || 'var(--az)'}30`,
          opacity: loading || !user ? 0.6 : 1,
        }}>
          {loading ? 'Création...' : !user ? 'Connecte-toi pour continuer' : 'Créer mon profil Pro →'}
        </button>
      </form>
    </main>
  );
}

export default function ProRegisterPage() {
  return <Suspense fallback={null}><ProRegisterForm /></Suspense>;
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700,
  letterSpacing: '0.06em', textTransform: 'uppercase',
  color: 'var(--td3)', display: 'block', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--bd2)', borderRadius: 6, padding: '12px 16px',
  fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td)', outline: 'none',
};
