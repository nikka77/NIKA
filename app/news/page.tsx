import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';
import DomainHero from '@/components/DomainHero';

export const metadata: Metadata = {
  title: 'News locales Nice & Côte d\'Azur — NIKA',
  description: 'Actualités locales indépendantes sur Nice et la Côte d\'Azur. Modérées par IA, publiées par la communauté NIKA.',
};

const ACCENT = '#5A88B0';

const CAT_STYLES: Record<string, { bg: string; color: string }> = {
  local:   { bg: 'rgba(14,168,120,0.12)',  color: '#0EA878' },
  auto:    { bg: 'rgba(0,148,212,0.12)',   color: '#00C2FF' },
  food:    { bg: 'rgba(212,160,23,0.12)',  color: '#F0C040' },
  sea:     { bg: 'rgba(8,104,160,0.15)',   color: '#4AA8DC' },
  general: { bg: 'rgba(90,136,176,0.12)',  color: '#8AB0CC' },
};

export default async function NewsPage() {
  const supabase = await createClient();
  const { data: news } = supabase
    ? await supabase.from('news').select('*, author:users(username)').eq('published', true).order('created_at', { ascending: false }).limit(20)
    : { data: null };

  return (
    <main>
      {/* ── HERO ──────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(180deg, #0A1018 0%, #0E1825 60%, var(--bg) 100%)',
        borderBottom: '1px solid var(--bd)',
        padding: 'clamp(3rem,7vw,5.5rem) 1.4rem',
        position: 'relative', overflow: 'hidden',
      }}>
        <DomainHero slug="news" />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div style={{
            fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: ACCENT, marginBottom: '1rem',
          }}>
            📡 NIKA NEWS — Domaine 09
          </div>

          <h1 style={{
            fontFamily: 'var(--fe)',
            fontSize: 'clamp(44px,8vw,96px)',
            fontWeight: 900, fontStyle: 'italic',
            textTransform: 'uppercase', color: 'var(--td)',
            lineHeight: 0.88, marginBottom: '1.2rem',
          }}>
            L&apos;info locale,<br />
            <span style={{ color: ACCENT }}>par les locaux</span>
          </h1>

          <p style={{
            fontFamily: 'var(--fo)',
            fontSize: 'clamp(14px,1.5vw,16px)',
            color: 'var(--td2)', maxWidth: 480, lineHeight: 1.7,
            marginBottom: '1.8rem',
          }}>
            Ce qui se passe vraiment à Nice et sur la Côte —
            publié par la communauté, modéré par IA, voté par vous.
          </p>

          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            <Link href="/news/new" style={{
              fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 800, fontStyle: 'italic',
              letterSpacing: '0.04em', textTransform: 'uppercase',
              padding: '12px 26px', borderRadius: 3,
              background: ACCENT, color: '#06101A', textDecoration: 'none',
            }}>
              + Publier une info
            </Link>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ─────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--bd)', padding: '0.9rem 1.4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: '2.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { v: news?.length ? String(news.length) : '—', l: 'Articles publiés' },
            { v: 'IA', l: 'Modération avant publication' },
            { v: '⬆', l: 'Vote communauté' },
          ].map(stat => (
            <div key={stat.l}>
              <div style={{ fontFamily: 'var(--fn)', fontSize: 20, color: ACCENT, lineHeight: 1 }}>
                {stat.v}
              </div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 9, color: 'var(--td3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>
                {stat.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ARTICLES ──────────────────────────────────────────── */}
      <div style={{ padding: 'clamp(2rem,4vw,3rem) 1.4rem clamp(3rem,7vw,5rem)', maxWidth: 1100, margin: '0 auto' }}>
        {news && news.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {news.map((item) => {
              const catStyle = CAT_STYLES[item.category || 'general'] || CAT_STYLES.general;
              return (
                <Link key={item.id} href={`/news/${item.id}`} className="dom-card" style={{
                  display: 'block', background: 'var(--bg2)', border: '1px solid var(--bd)',
                  borderRadius: 10, padding: '1.5rem', textDecoration: 'none',
                  ['--dc' as string]: ACCENT,
                }}>
                  <article>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 240 }}>
                        <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 3, display: 'inline-block', marginBottom: '0.6rem', background: catStyle.bg, color: catStyle.color }}>
                          {item.category || 'Général'}
                        </span>
                        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 20, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', lineHeight: 1.2, marginBottom: '0.5rem' }}>
                          {item.ai_reformulation || item.title}
                        </h2>
                        <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.6, margin: 0 }}>
                          {(item.ai_reformulation || item.content).substring(0, 160)}…
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 700, fontStyle: 'italic', color: 'var(--az2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          ⬆ {item.upvotes}
                        </span>
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
                      <span style={{ marginLeft: 'auto', color: ACCENT, fontWeight: 700 }}>Lire →</span>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        ) : (
          <div style={{ background: 'var(--bg2)', border: '1px dashed rgba(90,136,176,0.3)', borderRadius: 12, padding: '3.5rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: '0.8rem' }}>📡</div>
            <p style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', fontWeight: 700, color: 'var(--td)', marginBottom: '0.4rem' }}>Pas encore de news</p>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '1.5rem' }}>Soyez le premier à publier une info locale.</p>
            <Link href="/news/new" style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.04em', textTransform: 'uppercase', padding: '12px 26px', borderRadius: 3, background: ACCENT, color: '#06101A', textDecoration: 'none', display: 'inline-block' }}>
              + Publier une info
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
