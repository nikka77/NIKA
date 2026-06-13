import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Classement NIKA — Top joueurs',
  description: 'Classement NIKA : les meilleurs contributeurs de la communauté. XP, avis, POIs, news. Rejoignez la compétition.',
};

const RANK_STYLE: Record<number, { color: string; bg: string }> = {
  1: { color: 'var(--gold2)', bg: 'rgba(212,160,23,0.12)' },
  2: { color: '#A0B8C8', bg: 'rgba(160,184,200,0.08)' },
  3: { color: '#C08050', bg: 'rgba(192,128,80,0.08)' },
};

const PLACEHOLDER_ROWS = [
  { n: 1, title: 'Sois le premier', sub: 'Inscris-toi · Rejoins la compétition' },
  { n: 2, title: 'Gagne de l\'XP', sub: 'Avis · POIs · News · Commandes' },
  { n: 3, title: 'Classement actif bientôt', sub: 'Défis hebdomadaires en cours' },
];

const XP_ACTIONS = [
  { xp: '+50', label: 'Avis' }, { xp: '+80', label: 'POI créé' },
  { xp: '+30', label: 'Commande' }, { xp: '+100', label: 'News validée' },
  { xp: '+20', label: 'Daily' }, { xp: '+150', label: 'Invitation' },
];

interface TopUser {
  username: string;
  level_name: string;
  xp: number;
  avatar_url?: string | null;
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: topUsers } = supabase
    ? await supabase.from('users').select('username, level_name, xp, avatar_url').order('xp', { ascending: false }).limit(10)
    : { data: null };

  const hasData = !!topUsers?.length;

  return (
    <main style={{ padding: 'clamp(3rem,7vw,5rem) 1.4rem clamp(3rem,7vw,5rem)', maxWidth: 760, margin: '0 auto' }}>
      {/* Header */}
      <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ display: 'block', width: 14, height: 1, background: 'currentColor' }} />
        Communauté
      </p>
      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(36px,7vw,80px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, marginBottom: '0.8rem' }}>
        Classement
      </h1>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.6, maxWidth: 480, marginBottom: '2.5rem' }}>
        Les meilleurs contributeurs de la communauté NIKA. Avis, POIs, news, commandes — chaque action rapporte de l&apos;XP.
      </p>

      {/* Top joueurs */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'var(--fe)', fontSize: 16, fontWeight: 800, fontStyle: 'italic', color: 'var(--td)', marginBottom: '1rem' }}>
          ⚔️ Top joueurs — {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </div>

        {hasData ? (
          (topUsers as TopUser[]).map((u, i) => {
            const rank = i + 1;
            const style = RANK_STYLE[rank] ?? { color: 'var(--td2)', bg: 'var(--bg3)' };
            return (
              <div key={u.username} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.8rem 0', borderBottom: '1px solid var(--bd)' }}>
                <div style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: style.color, width: 24, textAlign: 'center', flexShrink: 0 }}>{rank}</div>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fn)', fontSize: 16, color: style.color, flexShrink: 0, overflow: 'hidden' }}>
                  {u.username.slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    @{u.username}
                  </div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--td3)', marginTop: 2 }}>
                    {u.level_name}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 700, fontStyle: 'italic', color: 'var(--gold)', flexShrink: 0 }}>
                  {u.xp.toLocaleString('fr-FR')} xp
                </div>
              </div>
            );
          })
        ) : (
          PLACEHOLDER_ROWS.map(({ n, title, sub }) => {
            const style = RANK_STYLE[n]!;
            return (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.8rem 0', borderBottom: '1px solid var(--bd)' }}>
                <div style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: style.color, width: 24, textAlign: 'center', flexShrink: 0 }}>{n}</div>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fn)', fontSize: 16, color: style.color, flexShrink: 0 }}>?</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td)' }}>{title}</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--td3)', marginTop: 2 }}>{sub}</div>
                </div>
                <div style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 700, fontStyle: 'italic', color: 'var(--gold)', flexShrink: 0 }}>— xp</div>
              </div>
            );
          })
        )}

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 8, marginTop: '1.2rem', flexWrap: 'wrap' }}>
          {[{ n: 14, l: 'POIs / semaine' }, { n: 89, l: 'News publiées' }, { n: 231, l: 'Avis laissés' }].map(({ n, l }) => (
            <div key={l} style={{ flex: 1, minWidth: 90, background: 'var(--bg3)', border: '1px solid var(--bd)', borderRadius: 6, padding: '0.8rem', textAlign: 'center' }}>
              <span style={{ fontFamily: 'var(--fe)', fontSize: 24, fontWeight: 900, fontStyle: 'italic', color: 'var(--az2)', display: 'block' }}>{n}</span>
              <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--td3)' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* XP actions */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--fe)', fontSize: 16, fontWeight: 800, fontStyle: 'italic', color: 'var(--td)', marginBottom: '1rem' }}>Comment gagner de l&apos;XP</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {XP_ACTIONS.map(a => (
            <div key={a.label} style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: 'rgba(212,160,23,0.04)', border: '1px solid rgba(212,160,23,0.11)', color: 'var(--td3)' }}>
              <span style={{ color: 'var(--gold)', marginRight: 3 }}>{a.xp}</span>{a.label}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center' }}>
        {!hasData && (
          <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '1rem' }}>
            Le classement public sera activé avec la beta ouverte.
          </p>
        )}
        <Link href="/inscription" style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 900, fontStyle: 'italic', padding: '0.7rem 2rem', borderRadius: 6, background: 'var(--az)', color: '#fff', textDecoration: 'none', display: 'inline-block' }}>
          Rejoindre NIKA →
        </Link>
      </div>
    </main>
  );
}
