import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Commandes pro — NIKA' };

export default async function ProCommandesPage() {
  const supabase = await createClient();
  if (!supabase) redirect('/connexion');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion');

  const { data: pro } = await supabase.from('pros').select('id').eq('user_id', user.id).single();
  if (!pro) redirect('/pro/inscription');

  const { data: orders } = await supabase.from('orders').select('*, users(username, level_name), listings(title)').eq('pro_id', pro.id).order('created_at', { ascending: false }).limit(50);

  const statusColor: Record<string, string> = {
    pending: '#D4A017', confirmed: '#0094D4', delivered: '#0EA878', cancelled: '#D44B24',
  };
  const statusLabel: Record<string, string> = {
    pending: 'En attente', confirmed: 'Confirmé', delivered: 'Livré', cancelled: 'Annulé',
  };

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 900, margin: '0 auto' }}>
      <Link href="/pro/dashboard" style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '0.8rem' }}>← Espace pro</Link>
      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '2rem' }}>
        Commandes
      </h1>

      {orders && orders.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {orders.map((order: { id: string; status: string; amount: number; nika_credits_used: number; created_at: string; users: { username: string; level_name: string } | null; listings: { title: string } | null; notes?: string }) => (
            <div key={order.id} style={{ background: 'var(--bg2)', border: `1px solid ${statusColor[order.status] || 'var(--bd)'}22`, borderRadius: 10, padding: '1.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '0.7rem' }}>
                <div>
                  <div style={{ fontFamily: 'var(--fe)', fontSize: 17, fontStyle: 'italic', color: 'var(--td)', fontWeight: 700, marginBottom: '0.2rem' }}>
                    {order.listings?.title || 'Commande'}
                  </div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)' }}>
                    {order.users?.username || 'Client'} · <span style={{ color: 'var(--td3)' }}>{order.users?.level_name}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${statusColor[order.status]}15`, color: statusColor[order.status], border: `1px solid ${statusColor[order.status]}30`, display: 'inline-block', marginBottom: 4 }}>
                    {statusLabel[order.status] || order.status}
                  </div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>
                    {new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {order.amount > 0 && <span style={{ fontFamily: 'var(--fn)', fontSize: 20, color: 'var(--td)' }}>{order.amount}€</span>}
                {order.nika_credits_used > 0 && <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--gold)' }}>{order.nika_credits_used} crédits NIKA</span>}
                {order.notes && <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', fontStyle: 'italic' }}>&quot;{order.notes}&quot;</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '4rem', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: '1rem' }}>🛒</div>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td3)' }}>Aucune commande pour l&apos;instant.</p>
        </div>
      )}
    </main>
  );
}
