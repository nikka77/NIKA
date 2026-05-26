'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';

interface Props {
  mode: 'login' | 'register';
  onClose: () => void;
}

export default function AuthModal({ mode, onClose }: Props) {
  const [tab, setTab] = useState<'login' | 'register'>(mode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const setUser = useAuthStore((s) => s.setUser);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    if (!supabase) { setError('Supabase non configuré — ajoutez .env.local'); setLoading(false); return; }

    if (tab === 'register') {
      const { data, error: err } = await supabase.auth.signUp({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      if (data.user) {
        await supabase.from('users').insert({
          id: data.user.id,
          username: username || email.split('@')[0],
          full_name: '',
          xp: 0, level: 1, level_name: 'Inconnu',
          nika_credits: 0, is_pro: false,
        });
        setSuccess('Compte créé ! Vérifie ton email pour confirmer.');
      }
    } else {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      if (data.user) {
        const { data: profile } = await supabase.from('users').select('*').eq('id', data.user.id).single();
        setUser(profile);
        onClose();
      }
    }
    setLoading(false);
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(2,8,16,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.4rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--bd2)',
        borderRadius: 8, width: '100%', maxWidth: 400,
        padding: '2rem',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: '1.6rem', background: 'var(--bg)', borderRadius: 4, padding: 3 }}>
          {(['login', 'register'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '8px', borderRadius: 3,
                fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700,
                letterSpacing: '0.04em', textTransform: 'uppercase',
                background: tab === t ? 'var(--az)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--td3)',
                transition: 'all 0.2s',
              }}
            >
              {t === 'login' ? 'Connexion' : 'Inscription'}
            </button>
          ))}
        </div>

        <h2 style={{
          fontFamily: 'var(--fe)', fontSize: 26, fontWeight: 900,
          fontStyle: 'italic', color: 'var(--td)', marginBottom: '1.4rem',
        }}>
          {tab === 'login' ? 'Bon retour 👋' : 'Rejoindre NIKA'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tab === 'register' && (
            <input
              value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="Pseudo NIKA"
              style={inputStyle}
            />
          )}
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" required style={inputStyle}
          />
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe" required minLength={6} style={inputStyle}
          />

          {error && (
            <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--coral)', padding: '8px 12px', background: 'rgba(212,75,36,0.08)', borderRadius: 4 }}>
              {error}
            </p>
          )}
          {success && (
            <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--teal)', padding: '8px 12px', background: 'rgba(14,168,120,0.08)', borderRadius: 4 }}>
              {success}
            </p>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              padding: '14px 30px', borderRadius: 3,
              background: 'var(--az)', color: '#fff',
              opacity: loading ? 0.6 : 1, marginTop: 4,
              boxShadow: '0 0 24px rgba(0,148,212,0.2)',
            }}
          >
            {loading ? 'Chargement...' : tab === 'login' ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>

        {tab === 'register' && (
          <p style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', marginTop: '1rem', lineHeight: 1.5 }}>
            En t&apos;inscrivant, tu acceptes les CGU NIKA incluant la clause de plateforme intermédiaire.
            Premiers inscrits : XP de lancement x2 + statut Fondateur.
          </p>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--bd2)',
  borderRadius: 6, padding: '12px 16px',
  fontFamily: 'var(--fo)', fontSize: 14,
  color: 'var(--td)', outline: 'none',
};
