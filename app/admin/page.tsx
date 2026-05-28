import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Admin — NIKA' };

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'dan@nika.fr';

export default async function AdminPage() {
  const supabase = await createClient();
  if (!supabase) redirect('/connexion');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) notFound();

  const admin = createAdminClient();

  const [
    { count: userCount },
    { count: proCount },
    { count: pendingPros },
    { count: pendingPois },
    { count: pendingNews },
    { count: orderCount },
    { data: recentPros },
  ] = await Promise.all([
    admin ? admin.from('users').select('*', { count: 'exact', head: true }) : Promise.resolve({ count: 0 }),
    admin ? admin.from('pros').select('*', { count: 'exact', head: true }) : Promise.resolve({ count: 0 }),
    admin ? admin.from('pros').select('*', { count: 'exact', head: true }).eq('verified', false) : Promise.resolve({ count: 0 }),
    admin ? admin.from('pois').select('*', { count: 'exact', head: true }).eq('status', 'pending') : Promise.resolve({ count: 0 }),
    admin ? admin.from('news').select('*', { count: 'exact', head: true }).eq('published', false).eq('ai_moderated', true) : Promise.resolve({ count: 0 }),
    admin ? admin.from('orders').select('*', { count: 'exact', head: true }) : Promise.resolve({ count: 0 }),
    admin ? admin.from('pros').select('*, users(username)').order('created_at', { ascending: false }).limit(5) : Promise.resolve({ data: [] }),
  ]);

  const alerts = [
    { label: 'Pros en attente', count: pendingPros ?? 0, href: '/admin/pros', color: '#D4A017', urgent: (pendingPros ?? 0) > 0 },
    { label: 'POIs à valider', count: pendingPois ?? 0, href: '/admin/pois', color: '#0094D4', urgent: (pendingPois ?? 0) > 0 },
    { label: 'News à approuver', count: pendingNews ?? 0, href: '/admin/news', color: '#D44B24', urgent: (pendingNews ?? 0) > 0 },
  ].filter(a => a.urgent);

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 1200, margin: '0 auto' }}>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D44B24', marginBottom: '0.5rem' }}>
        Administration
      </p>
      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(36px,5vw,58px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '2rem' }}>
        Dashboard Admin
      </h1>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '2.5rem' }}>
          {alerts.map(({ label, count, href, color }) => (
            <Link key={href} href={href} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.4rem', background: `${color}10`, border: `1px solid ${color}33`, borderRadius: 8 }}>
              <span style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 600, color: 'var(--td)' }}>
                ⚠️ {label}
              </span>
              <span style={{ fontFamily: 'var(--fn)', fontSize: 22, color }}>
                {count} en attente →
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '3rem' }} className="max-md:grid-cols-2">
        {[
          { label: 'Utilisateurs', value: userCount ?? 0, color: 'var(--az)', icon: '👤' },
          { label: 'Professionnels', value: proCount ?? 0, color: 'var(--teal)', icon: '🔧' },
          { label: 'Commandes', value: orderCount ?? 0, color: 'var(--gold)', icon: '📦' },
          { label: 'Pros en attente', value: pendingPros ?? 0, color: 'var(--coral)', icon: '⏳' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{ background: 'var(--bg2)', border: `1px solid ${color}22`, borderRadius: 10, padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
            <div style={{ fontSize: 24, marginBottom: '0.4rem' }}>{icon}</div>
            <div style={{ fontFamily: 'var(--fn)', fontSize: 38, color, lineHeight: 1, marginBottom: '0.2rem' }}>{value}</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Nav links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '3rem' }} className="max-sm:grid-cols-1">
        {[
          { href: '/admin/pros', label: 'Pros', desc: 'Validation & suspension', icon: '🔧', color: 'var(--teal)' },
          { href: '/admin/pois', label: 'POIs', desc: 'Approuver les points d\'intérêt', icon: '📍', color: 'var(--az)' },
          { href: '/admin/news', label: 'News', desc: 'File de modération IA', icon: '📡', color: '#D4A017' },
          { href: '/admin/stats', label: 'Stats', desc: 'Analytics globales', icon: '📊', color: 'var(--purple)' },
          { href: '/admin/sms', label: 'SMS', desc: 'Logs Twilio + réponses', icon: '📱', color: '#0094D4' },
          { href: '/admin/challenges', label: 'Challenges', desc: 'Créer / gérer les quêtes', icon: '🏆', color: 'var(--gold)' },
        ].map(({ href, label, desc, icon, color }) => (
          <Link key={href} href={href} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.5rem', transition: 'border-color 0.2s' }}>
            <div style={{ fontSize: 28, marginBottom: '0.6rem' }}>{icon}</div>
            <div style={{ fontFamily: 'var(--fe)', fontSize: 20, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.3rem' }}>{label}</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)' }}>{desc}</div>
            <div style={{ fontFamily: 'var(--fe)', fontSize: 12, fontStyle: 'italic', color, marginTop: '0.8rem' }}>Gérer →</div>
          </Link>
        ))}
      </div>

      {/* Recent pros */}
      {recentPros && recentPros.length > 0 && (
        <div>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 26, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>
            Derniers pros inscrits
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {recentPros.map((pro: { id: string; business_name: string; domain: string; verified: boolean; created_at: string }) => (
              <Link key={pro.id} href={`/admin/pros`} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1rem 1.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: 'var(--fe)', fontSize: 16, fontWeight: 700, fontStyle: 'italic', color: 'var(--td)' }}>{pro.business_name}</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{pro.domain}</div>
                </div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: pro.verified ? 'var(--teal)' : '#D4A017', padding: '3px 10px', borderRadius: 20, background: pro.verified ? 'rgba(14,168,120,0.1)' : 'rgba(212,160,23,0.1)', border: `1px solid ${pro.verified ? 'rgba(14,168,120,0.2)' : 'rgba(212,160,23,0.2)'}` }}>
                  {pro.verified ? '✓ Vérifié' : '⏳ En attente'}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
