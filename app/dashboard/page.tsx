import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getLevelFromXP, LEVELS, DOMAINS } from '@/lib/constants';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard — NIKA' };

export default async function DashboardPage() {
  const supabase = await createClient();
  if (!supabase) redirect('/connexion');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion');

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
  if (!profile) redirect('/connexion');

  const [{ data: orders }, { data: xpTx }, { data: deals }] = await Promise.all([
    supabase.from('orders').select('*, pros(business_name, domain)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('xp_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
    supabase.from('flash_deals').select('*, pros(business_name)').eq('active', true).gt('expires_at', new Date().toISOString()).limit(4),
  ]);

  const level = getLevelFromXP(profile.xp);
  const nextLevel = LEVELS[Math.min(level.n, LEVELS.length - 1)];
  const xpProgress = level.n < 10
    ? Math.round(((profile.xp - level.minXP) / (nextLevel.minXP - level.minXP)) * 100)
    : 100;

  const statusColor: Record<string, string> = {
    pending: '#D4A017', confirmed: '#0094D4', delivered: '#0EA878', cancelled: '#D44B24',
  };
  const statusLabel: Record<string, string> = {
    pending: 'En attente', confirmed: 'Confirmé', delivered: 'Livré', cancelled: 'Annulé',
  };

  const domainIcon: Record<string, string> = Object.fromEntries(DOMAINS.map(d => [d.slug, d.icon]));

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '3rem' }}>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--az)', marginBottom: '0.5rem' }}>
          Mon espace
        </p>
        <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(36px,6vw,62px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '0.5rem' }}>
          Bonjour, {profile.full_name?.split(' ')[0] || profile.username}
        </h1>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)' }}>
          Niveau <strong style={{ color: 'var(--td)' }}>{level.name}</strong> · {profile.nika_credits} crédits NIKA
        </p>
      </div>

      {/* XP + stats row */}
      <div style={{ gap: '1rem', marginBottom: '3rem' }} className="g-3 max-md:grid-cols-1">
        {/* XP card */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--az)22', borderRadius: 10, padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--az)' }} />
          <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--az)', marginBottom: '0.4rem' }}>
            Niveau {level.n} — {level.name}
          </div>
          <div style={{ fontFamily: 'var(--fn)', fontSize: 40, color: 'var(--td)', lineHeight: 1, marginBottom: '0.5rem' }}>
            {profile.xp.toLocaleString()} XP
          </div>
          {level.n < 10 && (
            <>
              <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3, marginBottom: '0.4rem', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${xpProgress}%`, background: 'linear-gradient(90deg, var(--az), var(--az2))', borderRadius: 3, transition: 'width 1s ease' }} />
              </div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>
                {(nextLevel.minXP - profile.xp).toLocaleString()} XP pour {nextLevel.name}
              </div>
            </>
          )}
        </div>

        {/* Credits card */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--gold)22', borderRadius: 10, padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--gold)' }} />
          <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.4rem' }}>
            Crédits NIKA
          </div>
          <div style={{ fontFamily: 'var(--fn)', fontSize: 40, color: 'var(--td)', lineHeight: 1, marginBottom: '0.5rem' }}>
            {profile.nika_credits.toLocaleString()}
          </div>
          <Link href="/wallet/acheter" style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 600, color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Recharger →
          </Link>
        </div>

        {/* Orders count */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--teal)22', borderRadius: 10, padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--teal)' }} />
          <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '0.4rem' }}>
            Commandes
          </div>
          <div style={{ fontFamily: 'var(--fn)', fontSize: 40, color: 'var(--td)', lineHeight: 1, marginBottom: '0.5rem' }}>
            {orders?.length ?? 0}
          </div>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>
            depuis la bêta
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem' }}>
          Accès rapide
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.7rem' }}>
          {[
            { href: '/wallet', label: '💳 Wallet', color: 'var(--gold)' },
            { href: '/carte', label: '🗺️ Carte', color: 'var(--az)' },
            { href: '/profil/' + user.id, label: '👤 Mon profil', color: 'var(--td2)' },
            { href: '/auto/depannage', label: '🔧 Dépannage', color: '#0094D4' },
            { href: '/auto/vtc', label: '🚖 VTC', color: '#00C2FF' },
            ...(profile.is_pro ? [{ href: '/pro/dashboard', label: '📊 Espace pro', color: 'var(--teal)' }] : []),
            { href: '/news', label: '📡 News', color: 'var(--td3)' },
          ].map(({ href, label, color }) => (
            <Link key={href} href={href} style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 20, border: `1px solid ${color}40`, background: `${color}08`, color, transition: 'all 0.2s' }}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ gap: '2rem' }} className="g-2 max-md:grid-cols-1">
        {/* Recent orders */}
        <div>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem' }}>
            Commandes récentes
          </h2>
          {orders && orders.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {orders.map((order: { id: string; pros: { business_name: string; domain: string } | null; status: string; amount: number; created_at: string }) => (
                <div key={order.id} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 700, fontStyle: 'italic', color: 'var(--td)', marginBottom: 2 }}>
                      {order.pros ? `${domainIcon[order.pros.domain] || '📦'} ${order.pros.business_name}` : 'Commande'}
                    </div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: statusColor[order.status] || 'var(--td2)', marginBottom: 2 }}>
                      {statusLabel[order.status] || order.status}
                    </div>
                    {order.amount > 0 && (
                      <div style={{ fontFamily: 'var(--fn)', fontSize: 16, color: 'var(--td)' }}>{order.amount}€</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: '0.7rem' }}>🛒</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>Aucune commande pour l&apos;instant</div>
              <Link href="/auto" style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 600, color: 'var(--az)', display: 'inline-block', marginTop: '0.8rem' }}>
                Explorer les services →
              </Link>
            </div>
          )}
        </div>

        {/* XP history */}
        <div>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem' }}>
            Historique XP
          </h2>
          {xpTx && xpTx.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {xpTx.map((tx: { id: string; action: string; xp_amount: number; created_at: string }) => (
                <div key={tx.id} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '0.9rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)' }}>
                    {tx.action.replace(/_/g, ' ').toLowerCase()}
                  </div>
                  <div style={{ fontFamily: 'var(--fn)', fontSize: 18, color: tx.xp_amount > 0 ? 'var(--az)' : 'var(--coral)', flexShrink: 0 }}>
                    {tx.xp_amount > 0 ? '+' : ''}{tx.xp_amount} XP
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: '0.7rem' }}>⚡</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>Aucun XP gagné pour l&apos;instant</div>
            </div>
          )}
        </div>
      </div>

      {/* Flash deals */}
      {deals && deals.length > 0 && (
        <div style={{ marginTop: '3rem' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem' }}>
            Flash Deals actifs
          </h2>
          <div style={{ gap: '1rem' }} className="g-4 max-md:grid-cols-2 max-sm:grid-cols-1">
            {deals.map((deal: { id: string; title: string; pros: { business_name: string } | null; discount_type: string; discount_value: number; expires_at: string }) => (
              <div key={deal.id} style={{ background: 'var(--bg2)', border: '1px solid var(--gold)33', borderRadius: 8, padding: '1.2rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--gold)' }} />
                <div style={{ fontFamily: 'var(--fn)', fontSize: 28, color: 'var(--gold2)', marginBottom: '0.3rem' }}>
                  {deal.discount_type === 'percent' ? `-${deal.discount_value}%` : deal.discount_type === 'fixed' ? `-${deal.discount_value}€` : 'OFFERT'}
                </div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td)', marginBottom: '0.2rem' }}>{deal.title}</div>
                {deal.pros && <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{deal.pros.business_name}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
