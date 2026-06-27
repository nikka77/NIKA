'use client';
// app/serv/DevisRequest.tsx — Demande de devis gratuite (client → artisan SERV).
// POST /api/devis. Si non connecté → invite à se connecter. Calqué visuellement sur la page SERV (accent #0EA878).
import { useState } from 'react';
import Link from 'next/link';

const ACCENT = '#0EA878';
const CATS = [
  { slug: 'plomberie', label: 'Plomberie' }, { slug: 'electricite', label: 'Électricité' },
  { slug: 'menage', label: 'Ménage' }, { slug: 'jardinage', label: 'Jardinage' },
  { slug: 'demenagement', label: 'Déménagement' }, { slug: 'informatique', label: 'Informatique' },
  { slug: 'serrurerie', label: 'Serrurerie' }, { slug: 'peinture', label: 'Peinture' },
];
type Pro = { id: string; business_name: string };
type State = 'idle' | 'sending' | 'done' | 'auth' | 'err';

export default function DevisRequest({ pros }: { pros: Pro[] }) {
  const [cat, setCat] = useState<string | null>(null);
  const [proId, setProId] = useState<string>(pros[0]?.id ?? '');
  const [desc, setDesc] = useState('');
  const [state, setState] = useState<State>('idle');
  const [ref, setRef] = useState('');
  const ready = !!proId && desc.trim().length >= 5;

  const submit = async () => {
    if (!ready) return;
    setState('sending');
    try {
      const r = await fetch('/api/devis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artisanId: proId, categorie: cat, description: desc.trim() }),
      });
      if (r.status === 401) { setState('auth'); return; }
      if (!r.ok) { setState('err'); return; }
      const j = await r.json();
      setRef(j.reference || ''); setState('done');
    } catch { setState('err'); }
  };

  const wrap: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(14,168,120,0.12), rgba(14,168,120,0.03))',
    border: '1px solid rgba(14,168,120,0.25)', borderRadius: 16, padding: 'clamp(1.4rem,3vw,2rem)', marginBottom: '3rem',
  };
  const label: React.CSSProperties = { fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td2)', marginBottom: 7 };

  if (state === 'done') return (
    <div style={{ ...wrap, textAlign: 'center', padding: '2.4rem 1.4rem' }}>
      <div style={{ fontSize: 40 }}>✅</div>
      <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: 'var(--td)', marginTop: 8 }}>Demande envoyée</div>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 13.5, color: 'var(--td2)', marginTop: 6 }}>Réf. <strong style={{ color: ACCENT }}>{ref}</strong> — l&apos;artisan te répond avec un devis détaillé. Tu le retrouveras dans ton espace.</p>
      <button onClick={() => { setState('idle'); setDesc(''); setCat(null); }} style={{ marginTop: 14, background: 'none', border: 'none', color: ACCENT, cursor: 'pointer', fontFamily: 'var(--fo)', fontSize: 12.5, textDecoration: 'underline' }}>Faire une autre demande</button>
    </div>
  );

  return (
    <div style={wrap}>
      <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(22px,3vw,34px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '0.3rem' }}>
        Demander un <span style={{ color: ACCENT }}>devis</span>
      </h2>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '1.4rem' }}>Gratuit, sans engagement — réponse sous 24-48 h.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', maxWidth: 560 }}>
        <div>
          <div style={label}>Type de besoin</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {CATS.map(c => {
              const a = cat === c.slug;
              return (
                <button key={c.slug} type="button" onClick={() => setCat(a ? null : c.slug)} aria-pressed={a}
                  style={{ padding: '6px 13px', borderRadius: 20, cursor: 'pointer', border: `1px solid ${a ? ACCENT : 'var(--bd2)'}`, background: a ? 'rgba(14,168,120,0.14)' : 'rgba(255,255,255,0.04)', color: a ? ACCENT : 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: a ? 700 : 500 }}>
                  {a && '✓ '}{c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div style={label}>Artisan</div>
          <select value={proId} onChange={e => setProId(e.target.value)}
            style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--bd2)', borderRadius: 9, padding: '11px 12px', fontFamily: 'var(--fo)', fontSize: 13.5, color: 'var(--td)', outline: 'none' }}>
            {pros.map(p => <option key={p.id} value={p.id}>{p.business_name}</option>)}
          </select>
        </div>

        <div>
          <div style={label}>Décris ton besoin</div>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} maxLength={1000}
            placeholder="Ex : fuite sous l'évier de la cuisine, intervention rapide souhaitée…"
            style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--bd2)', borderRadius: 9, padding: '11px 12px', fontFamily: 'var(--fo)', fontSize: 13.5, color: 'var(--td)', outline: 'none', resize: 'vertical' }} />
        </div>

        {state === 'auth' && (
          <div style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td2)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--bd2)', borderRadius: 9, padding: '10px 12px' }}>
            Connecte-toi pour envoyer ta demande — <Link href="/connexion" style={{ color: ACCENT, fontWeight: 700 }}>se connecter</Link> · <Link href="/inscription" style={{ color: ACCENT, fontWeight: 700 }}>créer un compte</Link>
          </div>
        )}
        {state === 'err' && <div style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: '#D44B24' }}>Une erreur est survenue. Réessaie.</div>}

        <button onClick={submit} disabled={!ready || state === 'sending'}
          style={{ alignSelf: 'flex-start', fontFamily: 'var(--fe)', fontSize: 14.5, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.04em', textTransform: 'uppercase', padding: '13px 30px', borderRadius: 4, border: 'none', cursor: ready && state !== 'sending' ? 'pointer' : 'not-allowed', background: ready ? ACCENT : 'rgba(255,255,255,0.1)', color: ready ? '#fff' : 'var(--td3)' }}>
          {state === 'sending' ? 'Envoi…' : 'Envoyer ma demande →'}
        </button>
      </div>
    </div>
  );
}
