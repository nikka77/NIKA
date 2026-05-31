import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DOMAINS } from '@/lib/constants';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Espace Pro — NIKA' };

export default async function ProDashboardPage() {
  const supabase = await createClient();
  if (!supabase) redirect('/connexion');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion');

  const { data: pro } = await supabase.from('pros').select('*').eq('user_id', user.id).eq('active', true).single();
  if (!pro) redirect('/pro/inscription');

  const [{ data: listings, count: listingCount }, { data: orders, count: orderCount }, { data: deals }] = await Promise.all([
    supabase.from('listings').select('*', { count: 'exact' }).eq('pro_id', pro.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('orders').select('*, users(username)', { count: 'exact' }).eq('pro_id', pro.id).order('created_at', { ascending: false }).limit(8),
    supabase.from('flash_deals').select('*').eq('pro_id', pro.id).eq('active', true).gt('expires_at', new Date().toISOString()),
  ]);

  const domain = DOMAINS.find(d => d.slug === pro.domain);
  const domainColor = domain?.color || '#0094D4';

  const statusColor: Record<string, string> = {
    pending: '#D4A017', confirmed: '#0094D4', delivered: '#0EA878', cancelled: '#D44B24',
  };

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: domainColor, marginBottom: '0.4rem' }}>
          {domain?.icon} {domain?.label || pro.domain.toUpperCase()} · Espace pro
        </p>
        <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '0.5rem' }}>
          {pro.business_name}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: pro.verified ? 'rgba(14,168,120,0.1)' : 'rgba(212,160,23,0.1)', color: pro.verified ? 'var(--teal)' : '#D4A017', border: `1px solid ${pro.verified ? 'rgba(14,168,120,0.2)' : 'rgba(212,160,23,0.2)'}` }}>
            {pro.verified ? '✓ Certifié NIKA' : '⏳ En attente de vérification'}
          </span>
          {pro.rating > 0 && (
            <span style={{ fontFamily: 'var(--fe)', fontSize: 15, fontStyle: 'italic', color: 'var(--gold2)' }}>⭐ {pro.rating.toFixed(1)}</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ gap: '1rem', marginBottom: '3rem' }} className="g-4 max-md:grid-cols-2">
        {[
          { label: 'Listings actifs', value: listingCount ?? 0, color: domainColor, icon: '📦' },
          { label: 'Commandes totales', value: orderCount ?? 0, color: 'var(--teal)', icon: '🛒' },
          { label: 'Flash Deals actifs', value: deals?.length ?? 0, color: 'var(--gold)', icon: '⚡' },
          { label: 'Note moyenne', value: pro.rating > 0 ? `${pro.rating.toFixed(1)}/5` : '—', color: 'var(--gold2)', icon: '⭐' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{ background: 'var(--bg2)', border: `1px solid ${color}22`, borderRadius: 10, padding: '1.4rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
            <div style={{ fontSize: 22, marginBottom: '0.3rem' }}>{icon}</div>
            <div style={{ fontFamily: 'var(--fn)', fontSize: 34, color, lineHeight: 1, marginBottom: '0.2rem' }}>{value}</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: '0.7rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
        {[
          { href: '/pro/listings', label: '📦 Mes listings', color: domainColor },
          { href: '/pro/commandes', label: '🛒 Commandes', color: 'var(--teal)' },
          { href: '/pro/flash-deals', label: '⚡ Flash Deals', color: 'var(--gold)' },
          { href: '/pro/stats', label: '📊 Statistiques', color: 'var(--purple)' },
          { href: `/pro/${pro.id}`, label: '👁️ Ma page publique', color: 'var(--td2)' },
        ].map(({ href, label, color }) => (
          <Link key={href} href={href} style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 20, border: `1px solid ${color}40`, background: `${color}08`, color, transition: 'all 0.2s' }}>
            {label}
          </Link>
        ))}
      </div>

      <div style={{ gap: '2rem' }} className="g-2 max-md:grid-cols-1">
        {/* Recent orders */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)' }}>Commandes récentes</h2>
            <Link href="/pro/commandes" style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--az)' }}>Tout voir →</Link>
          </div>
          {orders && orders.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {orders.slice(0, 5).map((order: { id: string; status: string; amount: number; created_at: string; users: { username: string } | null }) => (
                <div key={order.id} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td)', marginBottom: 2 }}>
                      {order.users?.username || 'Client'}
                    </div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: statusColor[order.status] || 'var(--td2)' }}>{order.status}</div>
                    {order.amount > 0 && <div style={{ fontFamily: 'var(--fn)', fontSize: 16, color: 'var(--td)' }}>{order.amount}€</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '2rem', textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>
              Aucune commande pour l&apos;instant.
            </div>
          )}
        </div>

        {/* Listings */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)' }}>Mes listings</h2>
            <Link href="/pro/listings" style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--az)' }}>Gérer →</Link>
          </div>
          {listings && listings.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {listings.map((l: { id: string; title: string; price?: number; stock?: number; available: boolean }) => (
                <div key={l.id} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td)' }}>{l.title}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {l.price && <span style={{ fontFamily: 'var(--fn)', fontSize: 16, color: domainColor }}>{l.price}€</span>}
                    {l.stock !== undefined && l.stock !== null && <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: l.stock < 5 ? 'var(--coral)' : 'var(--td3)' }}>×{l.stock}</span>}
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.available ? 'var(--teal)' : 'var(--td3)', flexShrink: 0 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '1rem' }}>Aucun listing pour l&apos;instant.</div>
              <Link href="/pro/listings" style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 600, color: domainColor }}>Ajouter un service →</Link>
            </div>
          )}
        </div>
      </div>

      {/* SMS tip */}
      <div style={{ marginTop: '3rem', padding: '1.2rem 1.5rem', background: 'rgba(0,148,212,0.04)', border: '1px solid rgba(0,148,212,0.12)', borderRadius: 10, fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--td)', display: 'block', marginBottom: 4 }}>📱 Rappel — Gestion par SMS</strong>
        Envoie un SMS au numéro NIKA pour gérer ton profil instantanément.<br />
        <span style={{ color: 'var(--td3)' }}>
          &quot;fermé ce soir&quot; · &quot;3 burgers restants&quot; · &quot;promo pizza 8€ 2h&quot;
        </span>
      </div>
    </main>
  );
}
