'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';

export default function ConnexionPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const setUser = useAuthStore(s => s.setUser);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    if (!supabase) { setError('Service indisponible — ajoutez .env.local'); setLoading(false); return; }
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }
    if (data.user) {
      const { data: profile } = await supabase.from('users').select('*').eq('id', data.user.id).single();
      if (profile) setUser(profile);
    }
    router.push('/dashboard');
  }

  async function handleGoogle() {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  }

  return (
    <main style={{ minHeight: 'calc(100vh - 108px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.4rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--az)', marginBottom: '0.6rem' }}>
          Côte d&apos;Azur
        </p>
        <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(36px,6vw,56px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.5rem', lineHeight: 0.95 }}>
          Connexion
        </h1>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', marginBottom: '2rem' }}>
          Pas encore de compte ?{' '}
          <Link href="/inscription" style={{ color: 'var(--az)' }}>S&apos;inscrire</Link>
        </p>

        {/* Google SSO */}
        <button
          onClick={handleGoogle}
          style={{ width: '100%', padding: '11px 16px', borderRadius: 6, border: '1px solid var(--bd2)', background: 'transparent', color: 'var(--td)', fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: '1.5rem', transition: 'border-color 0.2s', cursor: 'pointer' }}
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(212,75,36,0.1)', border: '1px solid rgba(212,75,36,0.3)', borderRadius: 6, fontFamily: 'var(--fo)', fontSize: 13, color: '#ff7755' }}>
              {error}
            </div>
          )}
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.com" required style={inputStyle} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={labelStyle}>Mot de passe</span>
              <Link href="/mot-de-passe-oublie" style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>Oublié ?</Link>
            </div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inputStyle} />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: '0.5rem', padding: '13px', borderRadius: 3, background: 'var(--az)', color: '#fff', fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', boxShadow: '0 0 28px rgba(0,148,212,0.3)', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s', cursor: 'pointer' }}
          >
            {loading ? 'Connexion...' : 'Se connecter →'}
          </button>
        </form>
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
