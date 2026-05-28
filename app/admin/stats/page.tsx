import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Stats Admin — NIKA' };

export default async function AdminStatsPage() {
  const supabase = await createClient();
  if (!supabase) redirect('/connexion');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== (process.env.ADMIN_EMAIL || 'dan@nika.fr')) redirect('/404');

  const admin = createAdminClient();
  if (!admin) redirect('/connexion');

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 3600000).toISOString();

  const [
    { count: totalUsers },
    { count: newUsersWeek },
    { count: totalPros },
    { count: activePros },
    { count: totalOrders },
    { count: ordersMonth },
    { count: totalListings },
    { count: totalDeals },
    { count: totalPois },
    { count: totalNews },
  ] = await Promise.all([
    admin.from('users').select('*', { count: 'exact', head: true }),
    admin.from('users').select('*', { count: 'exact', head: true }).gte('created_at', startOfWeek),
    admin.from('pros').select('*', { count: 'exact', head: true }),
    admin.from('pros').select('*', { count: 'exact', head: true }).eq('active', true),
    admin.from('orders').select('*', { count: 'exact', head: true }),
    admin.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
    admin.from('listings').select('*', { count: 'exact', head: true }),
    admin.from('flash_deals').select('*', { count: 'exact', head: true }).eq('active', true).gt('expires_at', now.toISOString()),
    admin.from('pois').select('*', { count: 'exact', head: true }),
    admin.from('news').select('*', { count: 'exact', head: true }),
  ]);

  const { data: revenueData } = await admin.from('orders').select('amount').eq('status', 'delivered');
  const totalRevenue = revenueData?.reduce((s, o) => s + (o.amount || 0), 0) || 0;
  const { data: revenueMonthData } = await admin.from('orders').select('amount').eq('status', 'delivered').gte('created_at', startOfMonth);
  const revenueMonth = revenueMonthData?.reduce((s, o) => s + (o.amount || 0), 0) || 0;

  const stats = [
    { label: 'Utilisateurs', value: totalUsers ?? 0, sub: `+${newUsersWeek ?? 0} cette semaine`, color: 'var(--az)', icon: '👥' },
    { label: 'Pros actifs', value: activePros ?? 0, sub: `${totalPros ?? 0} inscrits total`, color: 'var(--teal)', icon: '🏪' },
    { label: 'Commandes/mois', value: ordersMonth ?? 0, sub: `${totalOrders ?? 0} total`, color: 'var(--gold)', icon: '🛒' },
    { label: 'CA livré total', value: `${totalRevenue.toFixed(0)}€`, sub: `${revenueMonth.toFixed(0)}€ ce mois`, color: 'var(--gold2)', icon: '💰' },
    { label: 'Listings actifs', value: totalListings ?? 0, sub: 'produits & services', color: '#0094D4', icon: '📦' },
    { label: 'Flash Deals actifs', value: totalDeals ?? 0, sub: 'en cours', color: 'var(--gold)', icon: '⚡' },
    { label: 'POIs', value: totalPois ?? 0, sub: 'lieux référencés', color: 'var(--teal)', icon: '📍' },
    { label: 'Articles NEWS', value: totalNews ?? 0, sub: 'publiés', color: '#5A88B0', icon: '📡' },
  ];

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 1100, margin: '0 auto' }}>
      <Link href="/admin" style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '0.8rem' }}>← Admin</Link>
      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '2.5rem' }}>
        Statistiques globales
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }} className="max-md:grid-cols-2">
        {stats.map(({ label, value, sub, color, icon }) => (
          <div key={label} style={{ background: 'var(--bg2)', border: `1px solid ${color}22`, borderRadius: 10, padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
            <div style={{ fontSize: 20, marginBottom: '0.4rem' }}>{icon}</div>
            <div style={{ fontFamily: 'var(--fn)', fontSize: 34, color, lineHeight: 1, marginBottom: '0.2rem' }}>{value}</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{label}</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.5rem', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', textAlign: 'center' }}>
        Mis à jour le {now.toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </div>
    </main>
  );
}
