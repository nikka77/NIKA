import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Statistiques pro — NIKA' };

export default async function ProStatsPage() {
  const supabase = await createClient();
  if (!supabase) redirect('/connexion');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion');

  const { data: pro } = await supabase.from('pros').select('id, business_name, rating, rating_count').eq('user_id', user.id).single();
  if (!pro) redirect('/pro/inscription');

  const [{ data: orders }, { data: listings }, { data: reviews }] = await Promise.all([
    supabase.from('orders').select('amount, status, created_at').eq('pro_id', pro.id).order('created_at', { ascending: false }),
    supabase.from('listings').select('id, title, available').eq('pro_id', pro.id),
    supabase.from('reviews').select('rating, comment, created_at, users(username, level_name)').eq('pro_id', pro.id).order('created_at', { ascending: false }).limit(10),
  ]);

  const delivered = orders?.filter(o => o.status === 'delivered') || [];
  const revenue = delivered.reduce((sum, o) => sum + (o.amount || 0), 0);
  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
  const revenueMonth = delivered.filter(o => new Date(o.created_at) >= thisMonth).reduce((sum, o) => sum + (o.amount || 0), 0);

  const ordersByStatus = {
    pending: orders?.filter(o => o.status === 'pending').length || 0,
    confirmed: orders?.filter(o => o.status === 'confirmed').length || 0,
    delivered: delivered.length,
    cancelled: orders?.filter(o => o.status === 'cancelled').length || 0,
  };

  const statusColor: Record<string, string> = {
    pending: '#D4A017', confirmed: '#0094D4', delivered: '#0EA878', cancelled: '#D44B24',
  };
  const statusLabel: Record<string, string> = {
    pending: 'En attente', confirmed: 'Confirmé', delivered: 'Livré', cancelled: 'Annulé',
  };

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 900, margin: '0 auto' }}>
      <Link href="/pro/dashboard" style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '0.8rem' }}>← Espace pro</Link>
      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '2.5rem' }}>
        Statistiques
      </h1>

      {/* Revenue */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }} className="max-sm:grid-cols-1">
        {[
          { label: 'CA total', value: `${revenue.toFixed(0)}€`, color: 'var(--teal)', icon: '💰' },
          { label: 'CA ce mois', value: `${revenueMonth.toFixed(0)}€`, color: 'var(--az)', icon: '📅' },
          { label: 'Note moyenne', value: pro.rating > 0 ? `${pro.rating.toFixed(1)}/5` : '—', color: 'var(--gold)', icon: '⭐' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{ background: 'var(--bg2)', border: `1px solid ${color}22`, borderRadius: 10, padding: '1.6rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
            <div style={{ fontSize: 22, marginBottom: '0.4rem' }}>{icon}</div>
            <div style={{ fontFamily: 'var(--fn)', fontSize: 38, color, lineHeight: 1, marginBottom: '0.3rem' }}>{value}</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Orders breakdown */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 20, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>Commandes par statut</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem' }} className="max-sm:grid-cols-2">
          {(Object.entries(ordersByStatus) as [string, number][]).map(([status, count]) => (
            <div key={status} style={{ textAlign: 'center', padding: '1rem', borderRadius: 8, background: `${statusColor[status]}08`, border: `1px solid ${statusColor[status]}20` }}>
              <div style={{ fontFamily: 'var(--fn)', fontSize: 32, color: statusColor[status], lineHeight: 1, marginBottom: '0.3rem' }}>{count}</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{statusLabel[status]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Listings summary */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 20, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)' }}>Listings</h2>
          <Link href="/pro/listings" style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--az)' }}>Gérer →</Link>
        </div>
        {listings && listings.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {listings.map(l => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', borderBottom: '1px solid var(--bd)' }}>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td)' }}>{l.title}</span>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: l.available ? 'var(--teal)' : 'var(--td3)' }}>{l.available ? 'Disponible' : 'Indisponible'}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', textAlign: 'center', padding: '1rem' }}>Aucun listing.</div>
        )}
      </div>

      {/* Reviews */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 20, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem' }}>
          Avis reçus {pro.rating_count > 0 && <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 400, fontStyle: 'normal', color: 'var(--td3)', textTransform: 'none', letterSpacing: 0 }}>({pro.rating_count})</span>}
        </h2>
        {reviews && reviews.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {(reviews as unknown as { rating: number; comment?: string; created_at: string; users: { username: string; level_name: string } | null }[]).map((r, i: number) => (
              <div key={i} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bd)', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td)' }}>{r.users?.username || 'Anonyme'}</span>
                    {r.users?.level_name && <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>{r.users.level_name}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1,2,3,4,5].map(star => (
                      <span key={star} style={{ fontSize: 12, color: star <= r.rating ? 'var(--gold)' : 'var(--bd2)' }}>★</span>
                    ))}
                  </div>
                </div>
                {r.comment && <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', lineHeight: 1.5, margin: 0 }}>&quot;{r.comment}&quot;</p>}
                <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', marginTop: '0.4rem' }}>
                  {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td3)' }}>
            Aucun avis pour l&apos;instant.
          </div>
        )}
      </div>
    </main>
  );
}
