'use client';
// app/tools/convertisseur/page.tsx — Convertisseur de devises (API frankfurter.app, gratuite, sans clé, CORS).
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

const CY = '#12B8CC';
const CY2 = '#3AD7E6';
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'AED', 'JPY', 'CNY', 'CAD'];

export default function ConvertisseurPage() {
  const [amount, setAmount] = useState('100');
  const [from, setFrom] = useState('EUR');
  const [to, setTo] = useState('USD');
  const [rate, setRate] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'err'>('idle');

  const load = useCallback(async () => {
    if (from === to) { setRate(1); setState('idle'); return; }
    setState('loading');
    try {
      const r = await fetch(`https://open.er-api.com/v6/latest/${from}`);
      const j = await r.json();
      const v = j?.rates?.[to];
      if (j?.result === 'success' && typeof v === 'number') { setRate(v); setDate((j.time_last_update_utc || '').slice(0, 16)); setState('idle'); }
      else setState('err');
    } catch { setState('err'); }
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  const n = parseFloat(amount.replace(',', '.')) || 0;
  const result = rate != null ? n * rate : null;
  const swap = () => { setFrom(to); setTo(from); };

  const field: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--bd2)', borderRadius: 10, padding: '12px 13px', fontFamily: 'var(--fo)', fontSize: 16, color: 'var(--td)', outline: 'none' };
  const sel: React.CSSProperties = { ...field, fontSize: 14, fontWeight: 700 };

  return (
    <main style={{ minHeight: '100svh', background: 'linear-gradient(180deg,#04181C,var(--bg) 40%)' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 'clamp(1.4rem,4vw,2.4rem) 1.1rem 4rem' }}>
        <Link href="/tools" style={{ fontFamily: 'var(--fo)', fontSize: 12, color: CY, textDecoration: 'none' }}>← Outils</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, margin: '0.8rem 0 1.4rem' }}>
          <span style={{ fontSize: 30 }} aria-hidden>💱</span>
          <h1 style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 28, textTransform: 'uppercase', color: 'var(--td)', margin: 0 }}>Convertisseur</h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '1.4rem', borderRadius: 16, border: `1px solid ${CY}40`, background: `${CY}0c` }}>
          <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="Montant" style={{ ...field, fontFamily: 'var(--fn)', fontSize: 26, letterSpacing: '0.01em' }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={from} onChange={e => setFrom(e.target.value)} style={{ ...sel, flex: 1, minWidth: 0 }}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <button onClick={swap} aria-label="Inverser" style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, border: `1px solid ${CY}66`, background: `${CY}1c`, color: CY2, fontSize: 17, cursor: 'pointer' }}>⇄</button>
            <select value={to} onChange={e => setTo(e.target.value)} style={{ ...sel, flex: 1, minWidth: 0 }}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            {state === 'err' ? (
              <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: '#D44B24' }}>Taux indisponible. <button onClick={load} style={{ background: 'none', border: 'none', color: CY2, textDecoration: 'underline', cursor: 'pointer' }}>Réessayer</button></div>
            ) : (
              <>
                <div style={{ fontFamily: 'var(--fn)', fontSize: 40, color: CY2, lineHeight: 1 }}>
                  {result != null ? result.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : '…'} <span style={{ fontFamily: 'var(--fo)', fontSize: 16, fontWeight: 700, color: 'var(--td2)' }}>{to}</span>
                </div>
                {rate != null && <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: 6 }}>1 {from} = {rate.toLocaleString('fr-FR', { maximumFractionDigits: 4 })} {to}{date ? ` · ${date}` : ''}</div>}
              </>
            )}
          </div>
        </div>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)', textAlign: 'center', marginTop: 14 }}>Taux de change du jour via open.er-api.com · indicatif</p>
      </div>
    </main>
  );
}
