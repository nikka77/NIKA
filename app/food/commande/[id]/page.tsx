'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';

type Item = { id: string; title: string; description?: string; price?: number; pro_id: string };
type ProInfo = { id: string; business_name: string; phone?: string };

function CommandeInner() {
  const params = useSearchParams();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const listingId = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : '';
  const proId = params.get('pro') || '';

  const [item, setItem] = useState<Item | null>(null);
  const [pro, setPro] = useState<ProInfo | null>(null);
  const [profile, setProfile] = useState<{ nika_credits: number } | null>(null);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [payMode, setPayMode] = useState<'credits' | 'cash'>('credits');
  const [placing, setPlacing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user) { router.push('/connexion'); return; }
    loadData();
  }, [user]);

  async function loadData() {
    const supabase = createClient();
    if (!supabase || !user) return;
    const [{ data: itemData }, { data: proData }, { data: prof }] = await Promise.all([
      supabase.from('listings').select('*').eq('id', listingId).single(),
      supabase.from('pros').select('id, business_name, phone').eq('id', proId).single(),
      supabase.from('users').select('nika_credits').eq('id', user.id).single(),
    ]);
    setItem(itemData);
    setPro(proData);
    setProfile(prof);
  }

  const [error, setError] = useState<string | null>(null);

  async function placeOrder() {
    if (!item || !pro || !user) return;
    setPlacing(true);
    setError(null);
    // Total + débit de crédits recalculés et appliqués côté serveur (jamais ici).
    const res = await fetch('/api/food/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: item.id, proId: pro.id, qty, payMode, notes }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Échec de la commande');
      setPlacing(false);
      return;
    }
    setDone(true);
    setPlacing(false);
  }

  if (done) return (
    <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 56, marginBottom: '1rem' }}>✅</div>
        <h1 style={{ fontFamily: 'var(--fe)', fontSize: 32, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '0.5rem' }}>Commande passée !</h1>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', marginBottom: '2rem' }}>
          {pro?.business_name} va confirmer votre commande sous peu.
        </p>
        <Link href="/dashboard" style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--az)', border: '1px solid rgba(0,148,212,0.3)', padding: '10px 20px', borderRadius: 6 }}>
          Voir mes commandes
        </Link>
      </div>
    </main>
  );

  if (!item) return (
    <main style={{ padding: '4rem', textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>Chargement...</main>
  );

  const total = (item.price || 0) * qty;
  const canUseCredits = (profile?.nika_credits || 0) >= 10;

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 560, margin: '0 auto' }}>
      <Link href={`/food/${proId}`} style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '1.2rem' }}>← {pro?.business_name || 'Menu'}</Link>

      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,4vw,36px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '2rem' }}>
        Commander
      </h1>

      {/* Item summary */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.4rem', marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 16, fontWeight: 700, color: 'var(--td)', marginBottom: '0.3rem' }}>{item.title}</div>
        {item.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', marginBottom: '0.6rem' }}>{item.description}</div>}
        {item.price && <div style={{ fontFamily: 'var(--fn)', fontSize: 26, color: '#D4A017' }}>{item.price}€</div>}
      </div>

      {/* Quantity */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: 'var(--td3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Quantité</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 38, height: 38, borderRadius: 6, border: '1px solid var(--bd2)', background: 'var(--bg2)', color: 'var(--td)', fontSize: 20, cursor: 'pointer' }}>−</button>
          <span style={{ fontFamily: 'var(--fn)', fontSize: 28, color: 'var(--td)', minWidth: 30, textAlign: 'center' }}>{qty}</span>
          <button onClick={() => setQty(q => q + 1)} style={{ width: 38, height: 38, borderRadius: 6, border: '1px solid var(--bd2)', background: 'var(--bg2)', color: 'var(--td)', fontSize: 20, cursor: 'pointer' }}>+</button>
        </div>
      </div>

      {/* Notes */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: 'var(--td3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Instructions (optionnel)</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Sans gluten, sans oignons…" rows={2} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--bd2)', borderRadius: 6, padding: '10px 14px', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td)', resize: 'none', outline: 'none' }} />
      </div>

      {/* Payment */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: 'var(--td3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.8rem' }}>Paiement</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {canUseCredits && (
            <button onClick={() => setPayMode('credits')} style={{ textAlign: 'left', padding: '0.9rem 1.2rem', borderRadius: 8, border: `1px solid ${payMode === 'credits' ? 'rgba(212,160,23,0.5)' : 'var(--bd)'}`, background: payMode === 'credits' ? 'rgba(212,160,23,0.06)' : 'var(--bg2)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: payMode === 'credits' ? '#D4A017' : 'var(--td)' }}>Crédits NIKA</div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{profile?.nika_credits || 0} crédits disponibles</div>
              </div>
              {payMode === 'credits' && <span style={{ color: '#D4A017', fontSize: 16 }}>✓</span>}
            </button>
          )}
          <button onClick={() => setPayMode('cash')} style={{ textAlign: 'left', padding: '0.9rem 1.2rem', borderRadius: 8, border: `1px solid ${payMode === 'cash' ? 'rgba(0,148,212,0.5)' : 'var(--bd)'}`, background: payMode === 'cash' ? 'rgba(0,148,212,0.04)' : 'var(--bg2)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: payMode === 'cash' ? 'var(--az)' : 'var(--td)' }}>Paiement sur place</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>CB ou espèces à la commande</div>
            </div>
            {payMode === 'cash' && <span style={{ color: 'var(--az)', fontSize: 16 }}>✓</span>}
          </button>
        </div>
      </div>

      {/* Total + CTA */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.4rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', marginBottom: '0.3rem' }}>
          <span>{qty} × {item.price}€</span>
          <span>{total.toFixed(2)}€</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--fn)', fontSize: 24, color: 'var(--td)' }}>
          <span>Total</span>
          <span style={{ color: '#D4A017' }}>{total.toFixed(2)}€</span>
        </div>
      </div>

      {error && (
        <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: '#ff6b6b', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 6, padding: '10px 14px', marginBottom: '0.8rem' }}>
          {error}
        </div>
      )}

      <button onClick={placeOrder} disabled={placing} style={{ width: '100%', padding: '14px', borderRadius: 6, background: '#D4A017', color: '#050C17', fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', opacity: placing ? 0.7 : 1 }}>
        {placing ? 'Envoi en cours...' : `Commander — ${total.toFixed(2)}€`}
      </button>
    </main>
  );
}

export default function FoodCommandePage() {
  return (
    <Suspense fallback={<main style={{ padding: '4rem', textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>Chargement...</main>}>
      <CommandeInner />
    </Suspense>
  );
}
