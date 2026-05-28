import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';

type Props = { params: Promise<{ resto_id: string; user_id: string }> };

export const metadata: Metadata = { title: 'Carte de fidélité — NIKA' };

export default async function FidelitePage({ params }: Props) {
  const { resto_id, user_id } = await params;
  const supabase = await createClient();

  const [{ data: pro }, { data: profile }] = await Promise.all([
    supabase ? supabase.from('pros').select('business_name, description, phone, domain').eq('id', resto_id).single() : Promise.resolve({ data: null }),
    supabase ? supabase.from('users').select('username, xp, level_name, nika_credits').eq('id', user_id).single() : Promise.resolve({ data: null }),
  ]);

  // Fidélité : 10 tampons pour 1 récompense (simulé)
  const tampons = Math.floor((profile?.xp || 0) / 50) % 10;
  const isComplete = tampons >= 10;
  const reward = '1 café offert';

  return (
    <main style={{ minHeight: 'calc(100vh - 108px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.4rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, var(--bg2), var(--bg3))', border: '1px solid var(--gold)33', borderRadius: 16, padding: '2rem', marginBottom: '1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, var(--gold), var(--gold2))' }} />
          <div style={{ fontSize: 40, marginBottom: '0.7rem' }}>⭐</div>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,5vw,36px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 1, marginBottom: '0.3rem' }}>
            Carte de fidélité
          </h1>
          <div style={{ fontFamily: 'var(--fn)', fontSize: 20, color: 'var(--gold2)', marginBottom: '0.4rem' }}>
            {pro?.business_name || 'Commerce NIKA'}
          </div>
          {pro?.description && (
            <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', lineHeight: 1.5 }}>{pro.description}</div>
          )}
        </div>

        {/* User info */}
        {profile && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.2rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Client</div>
              <div style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', color: 'var(--td)' }}>{profile.username}</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td2)' }}>{profile.level_name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--fn)', fontSize: 28, color: 'var(--az)', lineHeight: 1 }}>{profile.nika_credits}</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>crédits NIKA</div>
            </div>
          </div>
        )}

        {/* Tampons */}
        <div style={{ background: 'var(--bg2)', border: `1px solid ${isComplete ? 'var(--gold)' : 'var(--bd)'}`, borderRadius: 16, padding: '1.8rem', marginBottom: '1.5rem' }}>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: '1rem', textAlign: 'center' }}>
            {tampons} / 10 tampons
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: '1.2rem' }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: '50%', background: i < tampons ? 'var(--gold)' : 'var(--bg3)', border: `2px solid ${i < tampons ? 'var(--gold2)' : 'var(--bd2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, transition: 'all 0.3s' }}>
                {i < tampons ? '⭐' : ''}
              </div>
            ))}
          </div>

          {isComplete ? (
            <div style={{ background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.3)', borderRadius: 10, padding: '1.2rem', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: '0.5rem' }}>🎉</div>
              <div style={{ fontFamily: 'var(--fe)', fontSize: 20, fontStyle: 'italic', color: 'var(--gold2)', marginBottom: '0.3rem' }}>Récompense débloquée !</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)' }}>{reward}</div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>
              Plus que {10 - tampons} tampons pour gagner : <strong style={{ color: 'var(--gold)' }}>{reward}</strong>
            </div>
          )}
        </div>

        {/* CTA */}
        {pro?.phone && (
          <a href={`tel:${pro.phone}`} style={{ display: 'block', width: '100%', padding: '13px', borderRadius: 6, background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.3)', fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gold)', textAlign: 'center' }}>
            📞 Appeler {pro.business_name}
          </a>
        )}
      </div>
    </main>
  );
}
