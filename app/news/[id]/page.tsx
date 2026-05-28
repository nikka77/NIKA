import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return { title: 'Article — NIKA NEWS' };
  const { data: article } = await supabase.from('news').select('title').eq('id', id).single();
  return { title: `${article?.title || 'Article'} — NIKA NEWS` };
}

export default async function NewsArticlePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: article }, { data: comments }] = await Promise.all([
    supabase ? supabase.from('news').select('*, users(username, level_name)').eq('id', id).single() : Promise.resolve({ data: null }),
    supabase ? supabase.from('news_comments').select('*, users(username, level_name)').eq('news_id', id).order('created_at', { ascending: true }).limit(30) : Promise.resolve({ data: [] }),
  ]);

  if (!article) notFound();

  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 760, margin: '0 auto' }}>
      <Link href="/carte" style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '1.5rem' }}>← Actualités</Link>

      {/* Article header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#5A88B0', background: 'rgba(90,136,176,0.1)', border: '1px solid rgba(90,136,176,0.2)', borderRadius: 10, padding: '3px 10px' }}>
            📡 NEWS
          </span>
          <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>
            {new Date(article.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,5vw,56px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '1rem' }}>
          {article.title}
        </h1>
        {article.users && (
          <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Par</span>
            <span style={{ color: 'var(--td2)', fontWeight: 600 }}>{article.users.username}</span>
            <span style={{ color: 'var(--td3)' }}>·</span>
            <span>{article.users.level_name}</span>
          </div>
        )}
      </div>

      {/* Votes */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '8px 16px' }}>
          <span style={{ fontSize: 16 }}>👍</span>
          <span style={{ fontFamily: 'var(--fn)', fontSize: 20, color: 'var(--teal)' }}>{article.upvotes || 0}</span>
          {user && (
            <form action={async () => {
              'use server';
              const srv = await createClient();
              if (srv) await srv.from('news').update({ upvotes: (article.upvotes || 0) + 1 }).eq('id', id);
            }}>
              <button type="submit" style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>+1</button>
            </form>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '8px 16px' }}>
          <span style={{ fontSize: 16 }}>💬</span>
          <span style={{ fontFamily: 'var(--fn)', fontSize: 20, color: 'var(--td2)' }}>{comments?.length || 0}</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td)', lineHeight: 1.8, marginBottom: '3rem', whiteSpace: 'pre-wrap' }}>
        {article.content}
      </div>

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
          {article.tags.map((tag: string) => (
            <span key={tag} style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 600, color: 'var(--td3)', background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '4px 12px' }}>#{tag}</span>
          ))}
        </div>
      )}

      {/* Comments */}
      <div>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>
          Commentaires {comments && comments.length > 0 && `(${comments.length})`}
        </h2>

        {user ? (
          <form action={async (formData: FormData) => {
            'use server';
            const text = formData.get('comment') as string;
            if (!text?.trim()) return;
            const srv = await createClient();
            if (!srv) return;
            const { data: { user: u } } = await srv.auth.getUser();
            if (!u) return;
            await srv.from('news_comments').insert({ news_id: id, user_id: u.id, content: text.trim() });
          }} style={{ marginBottom: '1.5rem' }}>
            <textarea name="comment" placeholder="Votre commentaire…" rows={3} required style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--bd2)', borderRadius: 8, padding: '12px 16px', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td)', resize: 'vertical', outline: 'none', marginBottom: '0.6rem', boxSizing: 'border-box' }} />
            <button type="submit" style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, padding: '9px 20px', borderRadius: 6, background: 'rgba(90,136,176,0.12)', border: '1px solid rgba(90,136,176,0.3)', color: '#5A88B0', cursor: 'pointer' }}>
              Publier
            </button>
          </form>
        ) : (
          <div style={{ marginBottom: '1.5rem', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>
            <Link href="/connexion" style={{ color: 'var(--az)', fontWeight: 600 }}>Connecte-toi</Link> pour commenter.
          </div>
        )}

        {comments && comments.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {comments.map((c: { id: string; content: string; created_at: string; users: { username: string; level_name: string } | null }) => (
              <div key={c.id} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)' }}>{c.users?.username || 'Anonyme'}</span>
                    {c.users?.level_name && <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>{c.users.level_name}</span>}
                  </div>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>
                    {new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
                <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', margin: 0, lineHeight: 1.6 }}>{c.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>
            Soyez le premier à commenter.
          </div>
        )}
      </div>
    </main>
  );
}
