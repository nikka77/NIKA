'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    if (!supabase) { setError('Service indisponible — ajoutez .env.local'); setLoading(false); return; }
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard`,
    });
    if (err) { setError(err.message); setLoading(false); return; }
    setSent(true);
    setLoading(false);
  }

  return (
    <main style={{ minHeight: 'calc(100vh - 108px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.4rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: '1.5rem' }}>📬</div>
            <h1 style={{ fontFamily: 'var(--fe)', fontSize: 40, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.8rem', lineHeight: 1 }}>
              Email envoyé
            </h1>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.7, marginBottom: '2rem' }}>
              Vérifie ta boîte mail et clique sur le lien pour réinitialiser ton mot de passe.
            </p>
            <Link href="/connexion" style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '12px 28px', borderRadius: 3, background: 'var(--az)', color: '#fff', display: 'inline-block', boxShadow: '0 0 28px rgba(0,148,212,0.3)' }}>
              Retour connexion →
            </Link>
          </div>
        ) : (
          <>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--az)', marginBottom: '0.6rem' }}>
              Récupération
            </p>
            <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px,5vw,48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.5rem', lineHeight: 0.95 }}>
              Mot de passe oublié
            </h1>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', marginBottom: '2rem' }}>
              Entre ton email — on t&apos;envoie un lien de réinitialisation.
            </p>
            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(212,75,36,0.1)', border: '1px solid rgba(212,75,36,0.3)', borderRadius: 6, fontFamily: 'var(--fo)', fontSize: 13, color: '#ff7755', marginBottom: '1rem' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.com" required style={inputStyle} />
              </div>
              <button type="submit" disabled={loading} style={{ padding: '13px', borderRadius: 3, background: 'var(--az)', color: '#fff', fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', boxShadow: '0 0 28px rgba(0,148,212,0.3)', opacity: loading ? 0.7 : 1, cursor: 'pointer' }}>
                {loading ? 'Envoi...' : 'Envoyer le lien →'}
              </button>
            </form>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginTop: '1.5rem', textAlign: 'center' }}>
              <Link href="/connexion" style={{ color: 'var(--td2)' }}>← Retour à la connexion</Link>
            </p>
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
