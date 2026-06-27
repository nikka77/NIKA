'use client';
// components/ReservationCta.tsx — « vrai flux » : quand un module hero renvoie vers /[domaine]?book=…/boat=…/item=…,
// on lit le param, on résout la sélection depuis les données du module, et on propose une vraie demande de
// réservation (nom + tél + créneau) persistée via /api/reservation. Rien si aucun param pertinent.
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RENTALS, SALES, SPOTS, fmtPrice } from '@/lib/stayData';
import { BOATS, EXCURSIONS, SPORTS } from '@/lib/azurData';
import { GEAR } from '@/lib/rentData';

type Domaine = 'stay' | 'azur' | 'rent';
type Sel = { kind: string; label: string; sub: string; ref: string };
const ACCENT: Record<Domaine, string> = { stay: '#E07038', azur: '#1391C8', rent: '#7BA8CC' };

function resolve(domaine: Domaine, sp: URLSearchParams): Sel | null {
  if (domaine === 'stay') {
    const b = sp.get('book'); if (b) { const r = RENTALS.find(x => x.id === b); if (r) return { kind: 'Réservation', label: r.name, sub: `${r.area} · ${r.price} €/nuit`, ref: b }; }
    const v = sp.get('visit'); if (v) { const s = SALES.find(x => x.id === v); if (s) return { kind: 'Visite', label: s.name, sub: `${s.area} · ${fmtPrice(s.price).value} ${fmtPrice(s.price).suffix}`, ref: v }; }
    const sp2 = sp.get('spot'); if (sp2) { const s = SPOTS.find(x => x.id === sp2); if (s) return { kind: 'Spot', label: s.name, sub: s.zone, ref: sp2 }; }
  }
  if (domaine === 'azur') {
    const b = sp.get('boat'); if (b) { const x = BOATS.find(y => y.id === b); if (x) return { kind: 'Bateau', label: x.name, sub: `${x.port} · ${x.price} €/j`, ref: b }; }
    const e = sp.get('excursion'); if (e) { const x = EXCURSIONS.find(y => y.id === e); if (x) return { kind: 'Sortie', label: x.name, sub: `${x.departure} · ${x.price} €/pers`, ref: e }; }
    const s = sp.get('sport'); if (s) { const x = SPORTS.find(y => y.id === s); if (x) return { kind: 'Activité', label: x.name, sub: `${x.price} € / ${x.unit}`, ref: s }; }
  }
  if (domaine === 'rent') {
    const i = sp.get('item'); if (i) { const x = GEAR.find(y => y.id === i); if (x) return { kind: 'Location', label: x.title, sub: `${x.price} €/j · ${x.owner}`, ref: i }; }
  }
  return null;
}

function Inner({ domaine }: { domaine: Domaine }) {
  const sp = useSearchParams();
  const sel = resolve(domaine, sp);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'err'>('idle');
  if (!sel) return null;
  const ac = ACCENT[domaine];
  const ready = name.trim().length > 1 && phone.trim().length >= 6;

  const submit = async () => {
    if (!ready) return;
    setState('sending');
    try {
      const r = await fetch('/api/reservation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domaine, ref: sel.ref, label: `${sel.kind} — ${sel.label}`, name, phone, date, note }),
      });
      setState(r.ok ? 'done' : 'err');
    } catch { setState('err'); }
  };

  const field: React.CSSProperties = { width: '100%', background: 'var(--bg2)', border: '1px solid var(--bd2)', borderRadius: 9, padding: '11px 12px', fontFamily: 'var(--fo)', fontSize: 13.5, color: 'var(--td)', outline: 'none' };

  return (
    <>
      {/* Barre sticky : la sélection venue du module */}
      <div style={{ position: 'sticky', top: 0, zIndex: 60, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 1.4rem', background: 'rgba(5,12,23,0.92)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${ac}55` }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ flexShrink: 0, fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: ac, background: `${ac}22`, border: `1px solid ${ac}66`, borderRadius: 20, padding: '3px 9px' }}>{sel.kind}</span>
          <span style={{ minWidth: 0, fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sel.label}</span>
          <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', whiteSpace: 'nowrap' }}>· {sel.sub}</span>
        </span>
        <button onClick={() => setOpen(true)} style={{ marginLeft: 'auto', flexShrink: 0, fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12.5, letterSpacing: '0.03em', textTransform: 'uppercase', padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: ac, color: '#fff' }}>
          Finaliser ma demande →
        </button>
      </div>

      {/* Modale de demande */}
      {open && (
        <div onClick={() => state !== 'sending' && setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.2rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: 'var(--bg)', border: `1px solid ${ac}66`, borderRadius: 18, padding: '1.5rem', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
            {state === 'done' ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ fontSize: 38 }}>✅</div>
                <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: 'var(--td)', marginTop: 8 }}>Demande envoyée</div>
                <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', marginTop: 6 }}>On te recontacte très vite pour <strong style={{ color: 'var(--td)' }}>{sel.label}</strong>.</p>
                <button onClick={() => setOpen(false)} style={{ marginTop: 14, padding: '10px 22px', borderRadius: 9, border: 'none', cursor: 'pointer', background: ac, color: '#fff', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12.5, textTransform: 'uppercase' }}>Fermer</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                  <h3 style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: 'var(--td)', margin: 0 }}>Ta demande</h3>
                  <button onClick={() => setOpen(false)} aria-label="Fermer" style={{ background: 'none', border: 'none', color: 'var(--td3)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>
                <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td2)', margin: '0 0 1rem' }}>{sel.kind} · <strong style={{ color: ac }}>{sel.label}</strong> · {sel.sub}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Ton nom" style={field} maxLength={120} />
                  <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="Téléphone" style={field} maxLength={40} />
                  <input value={date} onChange={e => setDate(e.target.value)} placeholder="Date / créneau souhaité (optionnel)" style={field} maxLength={60} />
                  <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Précisions (optionnel)" style={{ ...field, resize: 'vertical' }} maxLength={500} />
                  {state === 'err' && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: '#D44B24' }}>Une erreur est survenue. Réessaie.</div>}
                  <button onClick={submit} disabled={!ready || state === 'sending'} style={{ padding: '13px', borderRadius: 10, border: 'none', cursor: ready && state !== 'sending' ? 'pointer' : 'not-allowed', background: ready ? ac : 'rgba(255,255,255,0.1)', color: ready ? '#fff' : 'var(--td3)', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 13, textTransform: 'uppercase' }}>
                    {state === 'sending' ? 'Envoi…' : 'Envoyer ma demande'}
                  </button>
                  <p style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', textAlign: 'center', margin: 0 }}>Sans engagement · réponse rapide d&apos;un partenaire NIKA</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function ReservationCta({ domaine }: { domaine: Domaine }) {
  return <Suspense fallback={null}><Inner domaine={domaine} /></Suspense>;
}
