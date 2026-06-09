import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'News locales Nice & Côte d\'Azur — NIKA',
  description: 'Actualités locales indépendantes sur Nice et la Côte d\'Azur. Modérées par IA, publiées par la communauté NIKA.',
};

const CAT_STYLES: Record<string, { bg: string; color: string }> = {
  local:   { bg: 'rgba(14,168,120,0.08)',  color: '#085A38' },
  auto:    { bg: 'rgba(0,148,212,0.08)',   color: '#005A96' },
  food:    { bg: 'rgba(212,160,23,0.1)',   color: '#704800' },
  sea:     { bg: 'rgba(8,104,160,0.08)',   color: '#004878' },
  general: { bg: 'rgba(90,136,176,0.08)', color: '#2A5068' },
};

export default async function NewsPage() {
  const supabase = await createClient();
  const { data: news } = supabase
    ? await supabase.from('news').select('*, author:users(username)').eq('published', true).order('created_at', { ascending: false }).limit(20)
    : { data: null };

  return (
    <main>
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--bd)', padding: 'clamp(3rem,8vw,5rem) 1.4rem clamp(2rem,5vw,3rem)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--slate)', marginBottom: '0.6rem' }}>09 / Actualités</p>
            <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(44px,8vw,96px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9 }}>NEWS</h1>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', marginTop: '0.8rem' }}>
              Infos locales indépendantes. Modération IA avant publication. Vote communauté.
            </p>
          </div>
          <Link href="/news/new" style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '13px 30px', borderRadius: 3, background: 'var(--bg3)', color: 'var(--sand)', border: '1px solid var(--bd2)', display: 'inline-block' }}>
            + Publier une info
          </Link>
        </div>
      </div>

      <div style={{ padding: '3rem 1.4rem', maxWidth: 1100, margin: '0 auto' }}>
        {news && news.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {news.map((item) => {
              const catStyle = CAT_STYLES[item.category || 'general'] || CAT_STYLES.general;
              return (
                <article key={item.id} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1.5rem', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 9px', borderRadius: 2, display: 'inline-block', marginBottom: '0.6rem', ...catStyle }}>
                        {item.category || 'Général'}
                      </span>
                      <h2 style={{ fontFamily: 'var(--fe)', fontSize: 20, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', lineHeight: 1.2, marginBottom: '0.5rem' }}>
                        {item.ai_reformulation || item.title}
                      </h2>
                      <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.6 }}>
                        {(item.ai_reformulation || item.content).substring(0, 160)}…
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                      <button style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 700, fontStyle: 'italic', color: 'var(--az2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        ⬆ {item.upvotes}
                      </button>
                      {item.ai_moderated && (
                        <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20, background: 'rgba(0,148,212,0.08)', color: 'var(--az)', border: '1px solid rgba(0,148,212,0.15)' }}>
                          IA ✓
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: '1rem', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span>Par @{item.author?.username || 'anonyme'}</span>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--td3)', display: 'inline-block' }} />
                    <span>{new Date(item.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem', fontFamily: 'var(--fo)', color: 'var(--td3)', fontSize: 14 }}>
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>📡</div>
            <p>Pas encore de news publiées. Sois le premier à publier !</p>
          </div>
        )}
      </div>
    </main>
  );
}
