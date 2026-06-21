'use client';
// components/home/GpsBeacon.tsx — petit témoin lumineux de géolocalisation (hero).
// Consomme le store partagé `useLocationStore` (GPS haute précision + reverse-geocoding
// rue + n°). La position est ainsi disponible pour tous les services de proximité.
// États : amber « Localisation… » → vert « {adresse} » → rouge « Activer ma position ».
import { useEffect } from 'react';
import { useLocationStore } from '@/lib/store';

export default function GpsBeacon() {
  const status = useLocationStore(s => s.status);
  const address = useLocationStore(s => s.address);
  const locate = useLocationStore(s => s.locate);

  useEffect(() => { if (status === 'idle') locate(); }, [status, locate]);

  const color = status === 'located' ? '#22DD88' : status === 'locating' ? '#F0C040' : '#D44B24';
  const label = status === 'located' ? (address?.label || 'Position détectée')
    : status === 'locating' ? 'Localisation…'
      : status === 'denied' ? 'Activer ma position'
        : 'GPS indisponible';
  const clickable = status !== 'locating';

  return (
    <button onClick={clickable ? locate : undefined} disabled={!clickable}
      aria-label={status === 'located' && address?.full ? `Position : ${address.full}` : label}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '72vw', padding: '3px 9px', borderRadius: 30, background: 'rgba(5,12,23,0.4)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', cursor: clickable ? 'pointer' : 'default', opacity: 0.92 }}>
      <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, width: 7, height: 7 }}>
        {status === 'locating' && <span aria-hidden className="gps-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color }} />}
        <span aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}`, animation: status === 'located' ? 'pdot 2s ease-in-out infinite' : undefined }} />
      </span>
      <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </button>
  );
}
