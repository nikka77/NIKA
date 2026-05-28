'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { DOMAINS } from '@/lib/constants';

type Step = 1 | 2 | 3 | 4;

function ProInscriptionForm() {
  const searchParams = useSearchParams();
  const initialDomain = searchParams.get('domain') || searchParams.get('type') || 'auto';
  const [step, setStep] = useState<Step>(1);
  const [domain, setDomain] = useState(initialDomain);
  const [form, setForm] = useState({ business_name: '', description: '', phone: '', address: '', google_place_id: '' });
  const [loading, setLoading] = useState(false);
  const [gmbLoading, setGmbLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const user = useAuthStore(s => s.user);
  const router = useRouter();

  const selectedDomain = DOMAINS.find(d => d.slug === domain) || DOMAINS[0];

  async function importGMB() {
    const url = prompt('Colle ton lien Google Maps (ex: https://maps.google.com/?cid=...)');
    if (!url) return;
    setGmbLoading(true);
    try {
      const res = await fetch(`/api/gmb?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.name) {
        setForm(f => ({ ...f, business_name: data.name, address: data.formatted_address || f.address, google_place_id: data.place_id || f.google_place_id }));
      }
    } catch {}
    setGmbLoading(false);
  }

  async function handleSubmit() {
    if (!user) { alert('Connecte-toi pour créer ton profil pro.'); return; }
    setLoading(true);
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }
    const { error } = await supabase.from('pros').insert({ ...form, user_id: user.id, domain });
    if (!error) {
      await supabase.from('users').update({ is_pro: true }).eq('id', user.id);
      setSubmitted(true);
    }
    setLoading(false);
  }

  if (submitted) return (
    <main style={{ minHeight: 'calc(100vh - 108px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.4rem' }}>
      <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: '1.5rem' }}>🎉</div>
        <h1 style={{ fontFamily: 'var(--fe)', fontSize: 42, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.8rem', lineHeight: 1 }}>
          Profil soumis !
        </h1>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Ton profil pro est en attente de validation. Tu seras notifié dès qu&apos;il sera approuvé (généralement sous 24h).
        </p>
        <button onClick={() => router.push('/pro/dashboard')} style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '12px 28px', borderRadius: 3, background: selectedDomain.color, color: '#fff', display: 'inline-block', cursor: 'pointer' }}>
          Mon espace pro →
        </button>
      </div>
    </main>
  );

  return (
    <main style={{ padding: '4rem 1.4rem 5rem', maxWidth: 720, margin: '0 auto' }}>
      {/* Progress */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '2rem' }}>
        {[1, 2, 3, 4].map(s => (
          <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= step ? selectedDomain.color : 'var(--bd2)', transition: 'background 0.3s' }} />
        ))}
      </div>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: selectedDomain.color, marginBottom: '0.6rem' }}>
        Étape {step} / 4
      </p>

      {/* Step 1 — Domain */}
      {step === 1 && (
        <>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.5rem', lineHeight: 0.95 }}>
            Mon domaine
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', marginBottom: '2rem' }}>Choisis le domaine qui correspond à ton activité principale.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '2rem' }}>
            {DOMAINS.map(d => (
              <button key={d.slug} type="button" onClick={() => setDomain(d.slug)} style={{ padding: '1rem 8px', borderRadius: 8, textAlign: 'center', border: `1px solid ${domain === d.slug ? d.color : 'var(--bd2)'}`, background: domain === d.slug ? `${d.color}15` : 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{d.icon}</div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: domain === d.slug ? d.color : 'var(--td3)' }}>{d.label}</div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', marginTop: 2 }}>{d.desc}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(2)} style={{ width: '100%', padding: '13px', borderRadius: 3, background: selectedDomain.color, color: '#fff', fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Continuer →
          </button>
        </>
      )}

      {/* Step 2 — Business info */}
      {step === 2 && (
        <>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.5rem', lineHeight: 0.95 }}>
            Mon activité
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', marginBottom: '2rem' }}>Informations visibles par les clients.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <label style={labelStyle}>Nom du commerce / activité *</label>
              <input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} placeholder="Ex: Dépannage Nice Auto" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Décris tes services, ta zone d'intervention, tes spécialités..." rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div>
              <label style={labelStyle}>Téléphone (pour gestion par SMS) *</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+33612345678" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Adresse / Zone d&apos;intervention</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Nice, Côte d'Azur" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setStep(1)} style={{ padding: '13px 18px', borderRadius: 3, border: '1px solid var(--bd2)', color: 'var(--td2)', fontFamily: 'var(--fe)', fontSize: 14, fontStyle: 'italic', cursor: 'pointer', flexShrink: 0 }}>←</button>
            <button type="button" onClick={() => form.business_name && form.phone && setStep(3)} disabled={!form.business_name || !form.phone} style={{ flex: 1, padding: '13px', borderRadius: 3, background: selectedDomain.color, color: '#fff', fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', opacity: !form.business_name || !form.phone ? 0.5 : 1 }}>
              Continuer →
            </button>
          </div>
        </>
      )}

      {/* Step 3 — Google Maps import */}
      {step === 3 && (
        <>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.5rem', lineHeight: 0.95 }}>
            Google Maps
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', marginBottom: '2rem' }}>Importe tes infos depuis Google My Business en 1 clic (optionnel).</p>
          <button onClick={importGMB} disabled={gmbLoading} style={{ width: '100%', padding: '14px 16px', borderRadius: 8, border: '1px solid rgba(0,148,212,0.3)', background: 'rgba(0,148,212,0.06)', fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 600, color: 'var(--az)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: '2rem', cursor: 'pointer' }}>
            🗺️ {gmbLoading ? 'Import en cours...' : 'Importer depuis Google My Business'}
          </button>
          {form.google_place_id && (
            <div style={{ padding: '1rem', background: 'rgba(14,168,120,0.06)', border: '1px solid rgba(14,168,120,0.2)', borderRadius: 8, fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--teal)', marginBottom: '2rem' }}>
              ✓ Google My Business importé — {form.business_name}
            </div>
          )}
          <div style={{ padding: '1rem', background: 'rgba(0,148,212,0.04)', border: '1px solid rgba(0,148,212,0.12)', borderRadius: 8, fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', lineHeight: 1.6, marginBottom: '2rem' }}>
            <strong style={{ color: 'var(--td)', display: 'block', marginBottom: 4 }}>📱 Gestion par SMS incluse</strong>
            Après validation, envoie un SMS au numéro NIKA pour gérer ton profil :<br />
            • &quot;fermé ce soir&quot; → profil mis en pause<br />
            • &quot;3 burgers restants&quot; → stock mis à jour<br />
            • &quot;promo pizza 8€ 2h&quot; → Flash Deal créé
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => setStep(2)} style={{ padding: '13px 18px', borderRadius: 3, border: '1px solid var(--bd2)', color: 'var(--td2)', fontFamily: 'var(--fe)', fontSize: 14, fontStyle: 'italic', cursor: 'pointer', flexShrink: 0 }}>←</button>
            <button type="button" onClick={() => setStep(4)} style={{ flex: 1, padding: '13px', borderRadius: 3, background: selectedDomain.color, color: '#fff', fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
              Continuer →
            </button>
          </div>
        </>
      )}

      {/* Step 4 — Review + submit */}
      {step === 4 && (
        <>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.5rem', lineHeight: 0.95 }}>
            Récapitulatif
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', marginBottom: '2rem' }}>Vérifie tes informations avant de soumettre.</p>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { label: 'Domaine', value: `${selectedDomain.icon} ${selectedDomain.label}` },
              { label: 'Commerce', value: form.business_name },
              { label: 'Téléphone', value: form.phone },
              { label: 'Adresse', value: form.address || '—' },
              { label: 'Google Maps', value: form.google_place_id ? '✓ Importé' : 'Non importé' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)', flexShrink: 0 }}>{label}</span>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td)', textAlign: 'right' }}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => setStep(3)} style={{ padding: '13px 18px', borderRadius: 3, border: '1px solid var(--bd2)', color: 'var(--td2)', fontFamily: 'var(--fe)', fontSize: 14, fontStyle: 'italic', cursor: 'pointer', flexShrink: 0 }}>←</button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !user}
              style={{ flex: 1, padding: '14px', borderRadius: 3, background: selectedDomain.color, color: '#fff', fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: loading || !user ? 'not-allowed' : 'pointer', opacity: loading || !user ? 0.6 : 1, boxShadow: `0 0 28px ${selectedDomain.color}30` }}
            >
              {loading ? 'Envoi...' : !user ? 'Connecte-toi pour continuer' : 'Soumettre mon profil pro →'}
            </button>
          </div>
        </>
      )}
    </main>
  );
}

export default function ProInscriptionPage() {
  return <Suspense fallback={null}><ProInscriptionForm /></Suspense>;
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700,
  letterSpacing: '0.06em', textTransform: 'uppercase',
  color: 'var(--td3)', display: 'block', marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--bd2)', borderRadius: 6,
  padding: '12px 16px', fontFamily: 'var(--fo)',
  fontSize: 14, color: 'var(--td)', outline: 'none',
};
