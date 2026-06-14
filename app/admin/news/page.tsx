'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import ConfirmDialog from '@/components/ConfirmDialog';
import Link from 'next/link';

type Article = { id: string; title: string; content: string; upvotes: number; created_at: string; status?: string; users: { username: string } | null };

export default function AdminNewsPage() {
  const user = useAuthStore(s => s.user);
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [delId, setDelId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) { router.push('/connexion'); return; }
    loadArticles();
  }, [user, filter]);

  async function loadArticles() {
    setLoading(true);
    const res = await fetch(`/api/admin/news?status=${filter}`);
    if (res.ok) setArticles(await res.json());
    setLoading(false);
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    await fetch(`/api/admin/news/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setArticles(a => a.filter(x => x.id !== id));
  }

  async function confirmDeleteArticle() {
    if (!delId) return;
    setDeleting(true);
    await fetch(`/api/admin/news/${delId}`, { method: 'DELETE' });
    setArticles(a => a.filter(x => x.id !== delId));
    setDeleting(false);
    setDelId(null);
  }

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 900, margin: '0 auto' }}>
      <Link href="/admin" style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '0.8rem' }}>← Admin</Link>
      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '2rem' }}>
        Modération NEWS
      </h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {(['all', 'pending', 'approved'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, padding: '7px 16px', borderRadius: 20, border: '1px solid var(--bd2)', background: filter === f ? 'var(--az)' : 'transparent', color: filter === f ? '#fff' : 'var(--td3)', cursor: 'pointer' }}>
            {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : 'Approuvés'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>Chargement...</div>
      ) : articles.length === 0 ? (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '3rem', textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>
          Aucun article.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {articles.map(a => (
            <div key={a.id} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--fe)', fontSize: 17, fontStyle: 'italic', color: 'var(--td)', fontWeight: 700, marginBottom: '0.2rem' }}>{a.title}</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>
                    {a.users?.username || 'Anonyme'} · {new Date(a.created_at).toLocaleDateString('fr-FR')} · 👍 {a.upvotes}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {(!a.status || a.status === 'pending') && (
                    <button onClick={() => updateStatus(a.id, 'approved')} style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 6, background: 'rgba(14,168,120,0.08)', border: '1px solid rgba(14,168,120,0.2)', color: 'var(--teal)', cursor: 'pointer' }}>
                      ✓ Approuver
                    </button>
                  )}
                  <button onClick={() => setDelId(a.id)} style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 6, background: 'rgba(212,75,36,0.08)', border: '1px solid rgba(212,75,36,0.2)', color: 'var(--coral)', cursor: 'pointer' }}>
                    Supprimer
                  </button>
                  <Link href={`/news/${a.id}`} target="_blank" style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 6, background: 'rgba(90,136,176,0.08)', border: '1px solid rgba(90,136,176,0.2)', color: '#5A88B0', textDecoration: 'none' }}>
                    Voir →
                  </Link>
                </div>
              </div>
              <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', margin: 0, lineHeight: 1.5 }}>
                {a.content.slice(0, 150)}{a.content.length > 150 ? '…' : ''}
              </p>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!delId}
        title="Supprimer cet article ?"
        message="L'article sera définitivement retiré du fil d'actualités."
        confirmLabel="Supprimer"
        danger
        busy={deleting}
        onConfirm={confirmDeleteArticle}
        onClose={() => setDelId(null)}
      />
    </main>
  );
}
