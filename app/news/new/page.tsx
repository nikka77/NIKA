'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';

export default function NewNewsPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ approved: boolean; reason?: string; reformulation?: string; category?: string } | null>(null);
  const user = useAuthStore(s => s.user);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { setResult({ approved: false, reason: 'Connecte-toi pour publier une news.' }); return; }
    setLoading(true);
    try {
      const modRes = await fetch('/api/news/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      if (!modRes.ok) throw new Error('Modération indisponible');
      const modData = await modRes.json();
      setResult(modData);

      if (modData.approved) {
        const supabase = createClient();
        if (!supabase) { setLoading(false); return; }
        await supabase.from('news').insert({
          author_id: user.id,
          title,
          content,
          category: modData.category || 'general',
          ai_moderated: true,
          ai_reformulation: modData.reformulation,
          published: true,
          source_url: sourceUrl || null,
        });
        await fetch('/api/xp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, action: 'NEWS_PUBLISHED' }),
        }).catch(() => null);
        setTimeout(() => router.push('/news'), 2000);
      }
    } catch {
      setResult({ approved: false, reason: 'Erreur de connexion — réessaie dans un instant.' });
    }
    setLoading(false);
  }

  return (
    <main style={{ padding: '5rem 1.4rem', maxWidth: 720, margin: '0 auto' }}>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--slate)', marginBottom: '0.6rem' }}>
        Domaine 09 · News
      </p>
      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px,5vw,56px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.7rem' }}>
        Publier une info
      </h1>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.7, marginBottom: '2rem' }}>
        Ta publication sera analysée par notre IA avant publication. Seules les informations locales pertinentes sont acceptées.
      </p>

      {/* IA badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(0,148,212,0.06)', border: '1px solid rgba(0,148,212,0.15)', borderRadius: 6, marginBottom: '2rem' }}>
        <span>🤖</span>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', lineHeight: 1.4 }}>
          Modération automatique par Claude AI · Reformulation si nécessaire · +100 XP si approuvé
        </span>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        <div>
          <label style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)', display: 'block', marginBottom: 6 }}>
            Titre
          </label>
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Titre de ton info locale" required
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)', display: 'block', marginBottom: 6 }}>
            Contenu
          </label>
          <textarea
            value={content} onChange={e => setContent(e.target.value)}
            placeholder="Décris l'info en détail. Ce qui se passe, où, quand, pourquoi c'est important pour Nice." required
            rows={6}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
        <div>
          <label style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)', display: 'block', marginBottom: 6 }}>
            Source (optionnel)
          </label>
          <input
            type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}
            placeholder="https://..."
            style={inputStyle}
          />
        </div>

        {result && (
          <div style={{
            padding: '1.2rem', borderRadius: 6,
            background: result.approved ? 'rgba(14,168,120,0.08)' : 'rgba(212,75,36,0.08)',
            border: `1px solid ${result.approved ? 'rgba(14,168,120,0.2)' : 'rgba(212,75,36,0.2)'}`,
          }}>
            <div style={{ fontFamily: 'var(--fe)', fontSize: 16, fontWeight: 900, fontStyle: 'italic', color: result.approved ? 'var(--teal)' : 'var(--coral)', marginBottom: '0.5rem' }}>
              {result.approved ? '✅ Approuvé — Redirection...' : '❌ Non approuvé'}
            </div>
            {result.reason && <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.5 }}>{result.reason}</p>}
            {result.reformulation && (
              <div style={{ marginTop: '0.8rem', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: 4, fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--td)', display: 'block', marginBottom: 4 }}>Version reformulée :</strong>
                {result.reformulation}
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={loading || !user} style={{
          fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          padding: '14px 30px', borderRadius: 3,
          background: 'var(--bg3)', color: 'var(--sand)',
          opacity: (loading || !user) ? 0.6 : 1,
          border: '1px solid var(--bd2)',
        }}>
          {loading ? 'Analyse en cours...' : !user ? 'Connecte-toi pour publier' : 'Soumettre à la modération IA →'}
        </button>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--bd2)',
  borderRadius: 6, padding: '12px 16px',
  fontFamily: 'var(--fo)', fontSize: 14,
  color: 'var(--td)', outline: 'none',
};
