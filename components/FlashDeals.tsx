'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FlashDeal } from '@/lib/types';

const DEMO_DEALS: FlashDeal[] = [
  { id: '1', pro_id: '', title: 'Pizza 8€ · Chez Marco', discount_type: 'fixed', discount_value: 8, expires_at: new Date(Date.now() + 5400000).toISOString(), active: true, created_at: '' },
  { id: '2', pro_id: '', title: 'Lavage offert · AutoNice', discount_type: 'free_item', discount_value: 0, expires_at: new Date(Date.now() + 2700000).toISOString(), active: true, created_at: '' },
  { id: '3', pro_id: '', title: '-20% bateau · Azur Marine', discount_type: 'percent', discount_value: 20, expires_at: new Date(Date.now() + 10800000).toISOString(), active: true, created_at: '' },
  { id: '4', pro_id: '', title: 'Café offert · Blend Café', discount_type: 'free_item', discount_value: 0, expires_at: new Date(Date.now() + 1800000).toISOString(), active: true, created_at: '' },
];

const ICONS: Record<string, string> = {
  'Pizza': '🍕', 'Lavage': '🚗', 'bateau': '🛥️', 'Café': '☕',
};

function getIcon(title: string) {
  for (const [k, v] of Object.entries(ICONS)) {
    if (title.includes(k)) return v;
  }
  return '⚡';
}

function Timer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    function update() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setExpired(true); setRemaining('Expiré'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(h > 0 ? `${h}h ${String(m).padStart(2,'0')}m` : `${m}m ${String(s).padStart(2,'0')}s`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <span style={{
      fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 700,
      fontStyle: 'italic', color: expired ? 'var(--coral)' : 'var(--gold2)',
      whiteSpace: 'nowrap', letterSpacing: '0.04em',
    }}>
      {remaining}
    </span>
  );
}

export default function FlashDeals() {
  const [deals, setDeals] = useState<FlashDeal[]>(DEMO_DEALS);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase
      .from('flash_deals')
      .select('*, pro:pros(business_name)')
      .eq('active', true)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at')
      .then(({ data }) => { if (data?.length) setDeals(data); });
  }, []);

  return (
    <div style={{ background: 'var(--bg)', borderTop: '1px solid var(--bd)', padding: '1.2rem 0' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.4rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 900, fontStyle: 'italic',
          color: 'var(--gold2)', whiteSpace: 'nowrap', letterSpacing: '0.04em',
          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
        }}>
          ⚡ Flash
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', flex: 1, padding: '4px 0' }}>
          {deals.map((deal) => (
            <div key={deal.id} style={{
              flexShrink: 0, background: 'var(--bg3)',
              border: '1px solid var(--bd2)', borderRadius: 6,
              padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', transition: 'border-color 0.2s',
            }}>
              <span style={{ fontSize: 14 }}>{getIcon(deal.title)}</span>
              <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td)', whiteSpace: 'nowrap' }}>
                {deal.title}
              </span>
              <span style={{ width: 1, height: 16, background: 'var(--bd2)', flexShrink: 0 }} />
              <Timer expiresAt={deal.expires_at} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
