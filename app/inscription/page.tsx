'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type UserType = 'client' | 'pro' | 'vtc' | 'hote';

const USER_TYPES: { type: UserType; icon: string; label: string; desc: string }[] = [
  { type: 'client', icon: '🧭', label: 'Explorateur', desc: 'Découvrir, commander, vivre la Côte d\'Azur' },
  { type: 'pro', icon: '🔧', label: 'Pro / Commerce', desc: 'Restaurant, service, artisan, prestataire local' },
  { type: 'vtc', icon: '🚖', label: 'Chauffeur VTC', desc: 'Transporter des passagers, certifié NIKA' },
  { type: 'hote', icon: '🏡', label: 'Hôte / Logeur', desc: 'Proposer un hébergement insolite' },
];

export default function InscriptionPage() {
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<UserType>('client');
  const [form, setForm] = useState({ email: '', password: '', username: '', full_name: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    if (!supabase) { setError('Service indisponible — ajoutez .env.local'); setLoading(false); return; }
    const { data, error: authError } = await supabase.auth.signUp({ email: form.email, password: form.password });
    if (authError) { setError(authError.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id,
        username: form.username || form.email.split('@')[0],
        full_name: form.full_name || null,
        xp: 0, level: 1, level_name: 'Inconnu',
        nika_credits: 0,
        is_pro: userType !== 'client',
      });
      if (userType !== 'client') {
        router.push('/pro/inscription?type=' + userType);
        return;
      }
      setStep(3);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  }

  if (step === 3) return (
    <main style={{ minHeight: 'calc(100vh - 108px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.4rem' }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: '1.5rem' }}>📬</div>
        <h1 style={{ fontFamily: 'var(--fe)', fontSize: 40, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.8rem', lineHeight: 1 }}>
          Vérifie ton email
        </h1>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Un lien de confirmation a été envoyé à{' '}
          <strong style={{ color: 'var(--td)' }}>{form.email}</strong>.<br />
          Clique sur le lien pour activer ton compte NIKA.
        </p>
        <Link href="/connexion" style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '12px 28px', borderRadius: 3, background: 'var(--az)', color: '#fff', display: 'inline-block', boxShadow: '0 0 28px rgba(0,148,212,0.3)' }}>
          Aller à la connexion →
        </Link>
      </div>
    </main>
  );

  return (
    <main style={{ minHeight: 'calc(100vh - 108px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.4rem' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: '2rem' }}>
          {[1, 2].map(s => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= step ? 'var(--az)' : 'var(--bd2)', transition: 'background 0.3s' }} />
          ))}
        </div>

        <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--az)', marginBottom: '0.6rem' }}>
          Étape {step} / 2
        </p>
        <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px,5vw,48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.5rem', lineHeight: 0.95 }}>
          {step === 1 ? 'Je suis...' : 'Mon compte'}
        </h1>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', marginBottom: '2rem' }}>
          Déjà membre ?{' '}
          <Link href="/connexion" style={{ color: 'var(--az)' }}>Se connecter</Link>
        </p>

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {USER_TYPES.map(({ type, icon, label, desc }) => (
              <button
                key={type}
                onClick={() => setUserType(type)}
                style={{ padding: '1rem 1.2rem', borderRadius: 8, border: `1px solid ${userType === type ? 'var(--az)' : 'var(--bd2)'}`, background: userType === type ? 'rgba(0,148,212,0.08)' : 'transparent', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', transition: 'all 0.2s', cursor: 'pointer', width: '100%' }}
              >
                <span style={{ fontSize: 28, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontFamily: 'var(--fe)', fontSize: 17, fontWeight: 900, fontStyle: 'italic', color: userType === type ? 'var(--az)' : 'var(--td)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)' }}>{desc}</div>
                </div>
              </button>
            ))}
            <button
              onClick={() => setStep(2)}
              style={{ marginTop: '0.8rem', padding: '13px', borderRadius: 3, background: 'var(--az)', color: '#fff', fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', boxShadow: '0 0 28px rgba(0,148,212,0.3)', cursor: 'pointer' }}
            >
              Continuer →
            </button>
          </div>
        )}

        {step === 2 && (
          <>
            <button
              onClick={handleGoogle}
              style={{ width: '100%', padding: '11px 16px', borderRadius: 6, border: '1px solid var(--bd2)', background: 'transparent', color: 'var(--td)', fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: '1.5rem', cursor: 'pointer' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
                <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              Continuer avec Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--bd2)' }} />
              <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>ou</span>
              <div style={{ flex: 1, height: 1, background: 'var(--bd2)' }} />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(212,75,36,0.1)', border: '1px solid rgba(212,75,36,0.3)', borderRadius: 6, fontFamily: 'var(--fo)', fontSize: 13, color: '#ff7755', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Prénom & Nom</label>
                <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Jean Dupont" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nom d&apos;utilisateur *</label>
                <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="jeandupont" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ton@email.com" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Mot de passe *</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 caractères" minLength={8} required style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{ padding: '13px 18px', borderRadius: 3, border: '1px solid var(--bd2)', color: 'var(--td2)', fontFamily: 'var(--fe)', fontSize: 14, fontStyle: 'italic', cursor: 'pointer', flexShrink: 0 }}
                >
                  ←
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ flex: 1, padding: '13px', borderRadius: 3, background: 'var(--az)', color: '#fff', fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', boxShadow: '0 0 28px rgba(0,148,212,0.3)', opacity: loading ? 0.7 : 1, cursor: 'pointer' }}
                >
                  {loading ? 'Création...' : 'Créer mon compte →'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
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
