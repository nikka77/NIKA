import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { getLevelFromXP, LEVELS } from '@/lib/constants';
import type { Metadata } from 'next';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = supabase ? await supabase.from('users').select('username, full_name').eq('id', id).single() : { data: null };
  return { title: data ? `${data.full_name || data.username} — NIKA` : 'Profil NIKA' };
}

export default async function ProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();

  const { data: profile } = await supabase.from('users').select('*').eq('id', id).single();
  if (!profile) notFound();

  const [{ data: pois }, { data: xpTx }] = await Promise.all([
    supabase.from('pois').select('*').eq('creator_id', id).eq('status', 'approved').order('created_at', { ascending: false }).limit(6),
    supabase.from('xp_transactions').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(10),
  ]);

  const level = getLevelFromXP(profile.xp);
  const nextLevel = LEVELS[Math.min(level.n, LEVELS.length - 1)];
  const xpProgress = level.n < 10
    ? Math.round(((profile.xp - level.minXP) / (nextLevel.minXP - level.minXP)) * 100)
    : 100;

  const levelColors = ['#3A5068','#0094D4','#0EA878','#D4A017','#D44B24','#7B5CF0','#F0C040','#0868A0','#E07038','#D4A017'];
  const levelColor = levelColors[level.n - 1] || '#0094D4';

  return (
    <main style={{ padding: '4rem 1.4rem 5rem', maxWidth: 900, margin: '0 auto' }}>
      {/* Profile header */}
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', marginBottom: '3rem', flexWrap: 'wrap' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: `${levelColor}22`, border: `3px solid ${levelColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            profile.username?.charAt(0).toUpperCase() || '?'
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,5vw,48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '0.4rem' }}>
            {profile.full_name || profile.username}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: '1rem' }}>
            <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20, background: `${levelColor}15`, color: levelColor, border: `1px solid ${levelColor}40` }}>
              Niveau {level.n} — {level.name}
            </span>
            {profile.is_pro && (
              <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20, background: 'rgba(14,168,120,0.1)', color: 'var(--teal)', border: '1px solid rgba(14,168,120,0.2)' }}>
                ✓ Pro NIKA
              </span>
            )}
          </div>

          {/* XP bar */}
          <div style={{ maxWidth: 320 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{profile.xp.toLocaleString()} XP</span>
              {level.n < 10 && <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{nextLevel.minXP.toLocaleString()} XP</span>}
            </div>
            <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${xpProgress}%`, background: `linear-gradient(90deg, ${levelColor}, ${levelColor}cc)`, borderRadius: 2 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats row — profil PUBLIC : aucune donnée privée (pas de crédits/KYC/email) */}
      <div style={{ gap: '1rem', marginBottom: '3rem' }} className="g-3 max-sm:grid-cols-3">
        {[
          { label: 'XP total', value: profile.xp.toLocaleString(), color: 'var(--az)' },
          { label: 'Spots créés', value: pois?.length ?? 0, color: 'var(--teal)' },
          { label: 'Membre depuis', value: new Date(profile.created_at).getFullYear(), color: 'var(--td3)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1.2rem', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--fn)', fontSize: 28, color, marginBottom: '0.2rem' }}>{value}</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* POIs */}
      {pois && pois.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 26, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>
            POIs créés
          </h2>
          <div style={{ gap: '0.8rem' }} className="g-3 max-sm:grid-cols-1">
            {pois.map((poi: { id: string; name: string; category: string; description?: string; upvotes: number }) => (
              <div key={poi.id} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1rem' }}>
                <div style={{ fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 700, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.3rem' }}>{poi.name}</div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>{poi.category}</div>
                {poi.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', lineHeight: 1.5 }}>{poi.description}</div>}
                <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--az)', marginTop: '0.5rem' }}>▲ {poi.upvotes}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* XP history */}
      {xpTx && xpTx.length > 0 && (
        <div>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 26, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>
            Activité NIKA
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {xpTx.map((tx: { id: string; action: string; xp_amount: number; created_at: string }) => (
              <div key={tx.id} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 6, padding: '0.8rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)' }}>
                  {tx.action.replace(/_/g, ' ').toLowerCase()}
                </span>
                <span style={{ fontFamily: 'var(--fn)', fontSize: 16, color: tx.xp_amount > 0 ? 'var(--az)' : 'var(--coral)', flexShrink: 0 }}>
                  {tx.xp_amount > 0 ? '+' : ''}{tx.xp_amount} XP
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
