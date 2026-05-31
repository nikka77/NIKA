'use client';
import { useState } from 'react';

const MARKER = process.env.NEXT_PUBLIC_TP_MARKER || '';

const SUGGESTIONS = [
  { label: 'Nice', icon: '🗺️' },
  { label: 'Cannes', icon: '🎬' },
  { label: 'Monaco', icon: '🎰' },
  { label: 'Antibes', icon: '⛵' },
  { label: 'Bali', icon: '🌺' },
  { label: 'Islande', icon: '🌋' },
  { label: 'Maldives', icon: '🏝️' },
];

export default function TravelpayoutsSearch() {
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');

  function search(dest?: string) {
    const d = (dest || destination).trim() || 'Nice';
    const p = new URLSearchParams({ destination: d, locale: 'fr', currency: 'EUR' });
    if (MARKER) p.set('marker', MARKER);
    if (checkIn) p.set('checkIn', checkIn);
    if (checkOut) p.set('checkOut', checkOut);
    if (guests && guests !== '2') p.set('adults', guests);
    window.open(`https://hotellook.com/search?${p}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid rgba(224,112,56,0.2)',
      borderRadius: 12, padding: '1.6rem 1.8rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#E07038', display: 'flex', alignItems: 'center', gap: 7 }}>
          🏨 Comparer les hôtels — Hotellook
        </div>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', display: 'flex', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)' }} />
            Booking.com
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E07038' }} />
            Expedia
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0094D4' }} />
            Hotels.com
          </span>
        </div>
      </div>

      {/* Search form */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={destination}
          onChange={e => setDestination(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Destination — ville, pays, région..."
          style={{
            flex: '2 1 200px', minWidth: 0,
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--bd2)',
            borderRadius: 6, padding: '11px 16px',
            fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td)', outline: 'none',
          }}
        />
        <input
          type="date"
          value={checkIn}
          onChange={e => setCheckIn(e.target.value)}
          style={{
            flex: '1 1 130px', minWidth: 0,
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--bd2)',
            borderRadius: 6, padding: '11px 14px',
            fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td)', outline: 'none',
          }}
        />
        <input
          type="date"
          value={checkOut}
          onChange={e => setCheckOut(e.target.value)}
          style={{
            flex: '1 1 130px', minWidth: 0,
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--bd2)',
            borderRadius: 6, padding: '11px 14px',
            fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td)', outline: 'none',
          }}
        />
        <select
          value={guests}
          onChange={e => setGuests(e.target.value)}
          style={{
            flex: '0 1 100px',
            background: 'var(--bg3)', border: '1px solid var(--bd2)',
            borderRadius: 6, padding: '11px 14px',
            fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td)', outline: 'none',
          }}
        >
          {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
            <option key={n} value={n}>{n} pers.</option>
          ))}
        </select>
        <button
          onClick={() => search()}
          style={{
            flex: '0 0 auto',
            fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800,
            fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase',
            padding: '11px 28px', borderRadius: 6,
            background: '#E07038', color: '#fff', cursor: 'pointer',
            boxShadow: '0 0 20px rgba(224,112,56,0.25)', whiteSpace: 'nowrap',
          }}
        >
          Comparer →
        </button>
      </div>

      {/* Suggestions */}
      <div style={{ marginTop: '1rem', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SUGGESTIONS.map(s => (
          <button
            key={s.label}
            onClick={() => search(s.label)}
            style={{
              fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 600,
              padding: '4px 11px', borderRadius: 20,
              border: '1px solid var(--bd2)', color: 'var(--td2)',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'border-color 0.15s',
            }}
          >
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', lineHeight: 1.5 }}>
          Propulsé par <strong style={{ color: 'var(--td2)' }}>Travelpayouts</strong> — prix en temps réel · 100+ plateformes comparées
        </p>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>
          +30 XP par réservation via NIKA
        </p>
      </div>
    </div>
  );
}
