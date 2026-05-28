import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getLevelFromXP } from '@/lib/constants';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Wallet NIKA — Mes crédits' };

export default async function WalletPage() {
  const supabase = await createClient();
  if (!supabase) redirect('/connexion');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion');

  const [{ data: profile }, { data: transactions }] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('credit_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
  ]);

  if (!profile) redirect('/connexion');

  const level = getLevelFromXP(profile.xp);

  const txTypeLabel: Record<string, string> = {
    purchase: 'Achat', spend: 'Dépense', stake: 'Staking', reward: 'Récompense',
  };
  const txTypeColor: Record<string, string> = {
    purchase: 'var(--teal)', spend: 'var(--coral)', stake: 'var(--gold)', reward: 'var(--az)',
  };

  const packs = [
    { credits: 100, price: 9.99, bonus: '', popular: false },
    { credits: 500, price: 39.99, bonus: '+50 bonus', popular: true },
    { credits: 1000, price: 69.99, bonus: '+150 bonus', popular: false },
  ];

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 900, margin: '0 auto' }}>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.5rem' }}>
        Mon portefeuille
      </p>
      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(36px,5vw,58px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '2rem' }}>
        Wallet NIKA
      </h1>

      {/* Balance hero */}
      <div style={{ background: 'linear-gradient(135deg, var(--bg2), var(--bg3))', border: '1px solid var(--gold)33', borderRadius: 16, padding: '2.5rem', marginBottom: '2.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, var(--gold), var(--gold2))' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.4rem' }}>
              Solde disponible
            </div>
            <div style={{ fontFamily: 'var(--fn)', fontSize: 64, color: 'var(--td)', lineHeight: 1, marginBottom: '0.4rem' }}>
              {profile.nika_credits.toLocaleString()}
            </div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)' }}>
              Crédits NIKA · {level.name}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link href="/wallet/acheter" style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '12px 24px', borderRadius: 3, background: 'var(--gold)', color: '#050C17', boxShadow: '0 0 28px rgba(212,160,23,0.3)', display: 'block', textAlign: 'center' }}>
              + Recharger →
            </Link>
          </div>
        </div>
      </div>

      {/* Packs rapides */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 24, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem' }}>
          Recharge rapide
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }} className="max-sm:grid-cols-1">
          {packs.map(({ credits, price, bonus, popular }) => (
            <Link key={credits} href={`/wallet/acheter?pack=${credits}`} style={{ background: popular ? 'rgba(212,160,23,0.08)' : 'var(--bg2)', border: `1px solid ${popular ? 'var(--gold)' : 'var(--bd)'}`, borderRadius: 10, padding: '1.5rem', position: 'relative', overflow: 'hidden', textAlign: 'center', transition: 'border-color 0.2s' }}>
              {popular && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--gold)' }} />}
              {popular && <div style={{ position: 'absolute', top: 10, right: 10, fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20, background: 'var(--gold)', color: '#050C17' }}>Populaire</div>}
              <div style={{ fontFamily: 'var(--fn)', fontSize: 42, color: popular ? 'var(--gold2)' : 'var(--td)', marginBottom: '0.2rem' }}>{credits}</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginBottom: '0.5rem' }}>crédits NIKA</div>
              {bonus && <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: 'var(--teal)', marginBottom: '0.5rem' }}>{bonus}</div>}
              <div style={{ fontFamily: 'var(--fn)', fontSize: 24, color: popular ? 'var(--gold)' : 'var(--az)' }}>{price}€</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 24, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem' }}>
          Historique
        </h2>
        {transactions && transactions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {transactions.map((tx: { id: string; type: string; amount: number; created_at: string }) => (
              <div key={tx.id} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1rem 1.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td)', marginBottom: '0.2rem' }}>
                    {txTypeLabel[tx.type] || tx.type}
                  </div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>
                    {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--fn)', fontSize: 22, color: txTypeColor[tx.type] || 'var(--td)' }}>
                  {tx.type === 'spend' ? '-' : '+'}{Math.abs(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: '1rem' }}>💳</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>Aucune transaction pour l&apos;instant</div>
          </div>
        )}
      </div>
    </main>
  );
}
