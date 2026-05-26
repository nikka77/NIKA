'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import FadeIn from './FadeIn';

export default function AccessCTA() {
  const [form, setForm] = useState({ nom: '', email: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    if (supabase) await supabase.from('waitlist').insert({
      nom: form.nom, email: form.email, type: form.type,
    });
    setDone(true);
    setLoading(false);
  }

  return (
    <div id="access" className="sand-grain" style={{ background: 'var(--sand)', borderTop: '1px solid rgba(0,0,0,0.06)', padding: '5rem 1.4rem', textAlign: 'center', position: 'relative' }}>
      <FadeIn>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '1rem', padding: '5px 14px', borderRadius: 20, background: 'rgba(14,31,58,0.06)', border: '1px solid rgba(14,31,58,0.1)', fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--tl2)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22DD88', boxShadow: '0 0 6px #22DD88', display: 'inline-block' }} />
            Bêta fermée · Nice · Accès limité
          </div>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,7vw,56px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--tl)', lineHeight: 0.95, marginBottom: '0.8rem' }}>
            Rejoindre<br /><span style={{ color: 'var(--az)' }}>la liste d&apos;accès</span>
          </h2>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--tl2)', lineHeight: 1.7, marginBottom: '1.6rem' }}>
            NIKA est en phase bêta sur Nice. Premiers inscrits : accès prioritaire, XP de lancement x2 et statut Fondateur permanent.
          </p>

          {done ? (
            <div style={{ padding: '1.5rem', background: 'rgba(14,168,120,0.08)', border: '1px solid rgba(14,168,120,0.2)', borderRadius: 6, fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--tl)', lineHeight: 1.6 }}>
              ✅ Demande reçue ! Tu seras parmi les premiers à accéder à NIKA.
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400, margin: '0 auto 1rem' }}>
              <input
                value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                placeholder="Ton prénom" required
                style={inputStyle}
              />
              <input
                type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="Ton email" required
                style={inputStyle}
              />
              <select
                value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">Je suis...</option>
                <option value="user">Un utilisateur</option>
                <option value="pro">Un professionnel / commerce</option>
                <option value="host">Un hôte / loueur</option>
                <option value="vtc">Un chauffeur VTC</option>
              </select>
              <button type="submit" disabled={loading} style={{
                fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                padding: '14px 30px', borderRadius: 3,
                background: 'var(--bg3)', color: 'var(--sand)',
                opacity: loading ? 0.6 : 1, transition: 'all 0.2s',
              }}>
                {loading ? 'Envoi...' : 'Demander l\'accès →'}
              </button>
            </form>
          )}

          <p style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'rgba(58,88,112,0.6)', marginTop: '0.5rem' }}>
            En soumettant, tu acceptes les{' '}
            <a href="/cgu" style={{ color: 'var(--tl)' }}>CGU NIKA</a>{' '}
            incluant la clause de plateforme intermédiaire.
          </p>
        </div>
      </FadeIn>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.15)',
  borderRadius: 6, padding: '12px 16px',
  fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--tl)',
  outline: 'none',
};
