'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';

const PACKS = [
  { id: 100, label: 'Starter', credits: 100, price: 9.99, color: 'var(--az)', bonus: null },
  { id: 500, label: 'Explorer', credits: 500, price: 39.99, color: 'var(--gold)', bonus: 50, popular: true },
  { id: 1000, label: 'Insider', credits: 1000, price: 69.99, color: '#7B5CF0', bonus: 150 },
];

function AcheterForm() {
  const searchParams = useSearchParams();
  const initialPack = parseInt(searchParams.get('pack') || '500');
  const [selected, setSelected] = useState(initialPack);
  const [loading, setLoading] = useState(false);
  const user = useAuthStore(s => s.user);

  const pack = PACKS.find(p => p.id === selected) || PACKS[1];

  async function handleBuy() {
    if (!user) { alert('Connecte-toi pour acheter des crédits.'); return; }
    setLoading(true);
    const res = await fetch('/api/stripe/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credits: pack.credits + (pack.bonus || 0), amount: Math.round(pack.price * 100) }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { alert('Erreur lors de la création du paiement.'); setLoading(false); }
  }

  return (
    <main style={{ minHeight: 'calc(100vh - 108px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.4rem' }}>
      <div style={{ width: '100%', maxWidth: 580 }}>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.5rem' }}>
          Wallet NIKA
        </p>
        <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '0.5rem' }}>
          Acheter des crédits
        </h1>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', marginBottom: '2.5rem' }}>
          Les crédits NIKA s&apos;utilisent pour les services, commandes et fonctionnalités premium.
        </p>

        {/* Pack selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
          {PACKS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              style={{ padding: '1.2rem 1.5rem', borderRadius: 10, border: `1px solid ${selected === p.id ? p.color : 'var(--bd2)'}`, background: selected === p.id ? `rgba(0,0,0,0.3)` : 'var(--bg2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
            >
              {selected === p.id && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: p.color }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${p.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {selected === p.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', color: selected === p.id ? 'var(--td)' : 'var(--td2)' }}>{p.label}</div>
                  <div style={{ fontFamily: 'var(--fn)', fontSize: 28, color: p.color, lineHeight: 1.1 }}>
                    {p.credits}{p.bonus ? ` +${p.bonus} bonus` : ''}
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', fontWeight: 400 }}> crédits</span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--fn)', fontSize: 28, color: selected === p.id ? p.color : 'var(--td2)' }}>{p.price}€</div>
                {p.bonus && <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--teal)' }}>+{p.bonus} offerts</div>}
              </div>
            </button>
          ))}
        </div>

        {/* Stripe button */}
        <button
          onClick={handleBuy}
          disabled={loading || !user}
          style={{ width: '100%', padding: '16px', borderRadius: 6, background: pack.color, color: '#fff', fontFamily: 'var(--fe)', fontSize: 16, fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', boxShadow: `0 0 30px ${pack.color}40`, opacity: loading || !user ? 0.7 : 1, cursor: loading || !user ? 'not-allowed' : 'pointer', marginBottom: '1rem' }}
        >
          {loading ? 'Redirection...' : !user ? 'Connecte-toi pour acheter' : `Payer ${pack.price}€ via Stripe →`}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--td3)" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>Paiement sécurisé via Stripe · Pas d&apos;abonnement</span>
        </div>

        <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', textAlign: 'center', marginTop: '1.5rem' }}>
          <Link href="/wallet" style={{ color: 'var(--td2)' }}>← Retour au Wallet</Link>
        </p>
      </div>
    </main>
  );
}

export default function AcheterPage() {
  return <Suspense fallback={null}><AcheterForm /></Suspense>;
}
