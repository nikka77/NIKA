'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import NikaBadge from '@/components/ui/NikaBadge';
import type { User, BadgeTier, KycLevel } from '@/lib/types';

const PRO_DOMAINS = [
  { slug: 'food', label: 'FOOD' }, { slug: 'stay', label: 'STAY' }, { slug: 'azur', label: 'AZUR' },
  { slug: 'auto', label: 'AUTO' }, { slug: 'serv', label: 'SERV' },
];
const KYC_STEPS = [
  { level: 1 as const, reward: 50, title: 'Profil renseigné', desc: 'Prénom + ville + photo' },
  { level: 2 as const, reward: 100, title: 'Email vérifié', desc: 'Confirmer votre adresse email' },
  { level: 3 as const, reward: 200, title: 'Identité confirmée', desc: 'Pièce d’identité (Sumsub / Persona — bientôt)' },
];
const TIER_LABEL: Record<BadgeTier, string> = { founder: 'Fondateur', pioneer: 'Pionnier', initie: 'Initié', member: 'Membre' };

export default function ProfilPage() {
  const router = useRouter();
  const setStoreUser = useAuthStore(s => s.setUser);
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ full_name: '', city: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [proDraft, setProDraft] = useState<string[]>([]);
  const [isProDraft, setIsProDraft] = useState(false);
  const [kycMsg, setKycMsg] = useState('');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      if (!supabase) { setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/connexion'); return; }
      const { data: row } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (row) {
        setMe(row as User);
        setStoreUser(row as User);
        setForm({ full_name: row.full_name ?? '', city: row.city ?? '', bio: row.bio ?? '' });
        setProDraft(row.pro_domains ?? []);
        setIsProDraft(!!row.is_pro);
      }
      setLoading(false);
    })();
  }, [router, setStoreUser]);

  async function saveIdentity() {
    setSaving(true); setMsg('');
    const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const j = await res.json().catch(() => ({}));
    if (res.ok) { setMe(m => (m ? { ...m, ...j.profile } : m)); setMsg('Enregistré ✓'); }
    else setMsg(j.error || 'Erreur');
    setSaving(false);
    setTimeout(() => setMsg(''), 2500);
  }

  async function completeKyc(level: number) {
    setKycMsg('');
    const res = await fetch('/api/kyc/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ level }) });
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      setMe(m => (m ? { ...m, kyc_level: j.kyc_level as KycLevel, nika_credits: j.nika_balance, is_verified: level >= 2 ? true : m.is_verified } : m));
      setKycMsg(`+${j.reward} $NIKKA 🎉`);
      setTimeout(() => setKycMsg(''), 2500);
    } else setKycMsg(j.error || 'Erreur');
  }

  async function savePro() {
    const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_pro: isProDraft, pro_domains: proDraft }) });
    const j = await res.json().catch(() => ({}));
    if (res.ok) setMe(m => (m ? { ...m, is_pro: j.profile.is_pro, pro_domains: j.profile.pro_domains } : m));
  }

  if (loading) return <main style={center}><p style={{ fontFamily: 'var(--fo)', color: 'var(--td3)' }}>Chargement…</p></main>;
  if (!me) return (
    <main style={center}><div style={{ textAlign: 'center' }}>
      <p style={{ fontFamily: 'var(--fo)', color: 'var(--td2)', marginBottom: 12 }}>Connecte-toi pour voir ton profil.</p>
      <Link href="/connexion" style={{ color: 'var(--az)', fontFamily: 'var(--fo)', fontWeight: 700 }}>Connexion →</Link>
    </div></main>
  );

  const kyc = (me.kyc_level ?? 0) as KycLevel;
  const tier = (me.badge_tier ?? 'member') as BadgeTier;
  const num = me.number ?? 0;

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(1.6rem,4vw,2.6rem) 1.4rem 5rem' }}>
      {/* Header */}
      <section style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: '2.4rem', flexWrap: 'wrap' }}>
        <NikaBadge number={num} tier={tier} kycLevel={kyc} size="xl" isPro={!!me.is_pro} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--fn)', fontSize: 48, color: 'var(--sand)', lineHeight: 0.9, letterSpacing: '0.02em' }}>#{num}</div>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginTop: 4 }}>{TIER_LABEL[tier]}</div>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginTop: 6 }}>
            {me.username}{me.full_name ? ` · ${me.full_name}` : ''} · KYC niveau {kyc}/3
          </div>
        </div>
      </section>

      {/* $NIKKA */}
      <section style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={sectionLabel}>Solde $NIKKA</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 34, color: 'var(--gold2)' }}>{me.nika_credits ?? 0}</span>
              <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>$NIKKA</span>
            </div>
          </div>
          <span style={{ fontSize: 34 }}>🪙</span>
        </div>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: 10 }}>Historique des transactions — bientôt.</div>
      </section>

      {/* Mon identité */}
      <section style={card}>
        <div style={sectionLabel}>Mon identité <span style={{ color: 'var(--td3)', fontWeight: 400 }}>(optionnel)</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Nom affiché</label>
            <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Pseudonyme public" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Ville</label>
            <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Nice, Antibes, Cannes…" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Bio <span style={{ color: 'var(--td3)' }}>({form.bio.length}/140)</span></label>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value.slice(0, 140) }))} placeholder="En une phrase…" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={saveIdentity} disabled={saving} style={{ ...ctaPrimary, opacity: saving ? 0.7 : 1 }}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            {msg && <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: msg.includes('✓') ? 'var(--az2)' : '#ff7755' }}>{msg}</span>}
          </div>
        </div>
      </section>

      {/* Vérification KYC */}
      <section style={card}>
        <div style={sectionLabel}>Vérification KYC</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {KYC_STEPS.map(step => {
            const done = kyc >= step.level;
            const isNext = kyc === step.level - 1;
            const locked = step.level === 3; // Sumsub/Persona — placeholder
            return (
              <div key={step.level} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: `1px solid ${done ? 'rgba(0,194,255,0.4)' : 'var(--bd)'}`, background: done ? 'rgba(0,148,212,0.08)' : 'var(--bg2)' }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fo)', fontWeight: 800, fontSize: 12, background: done ? 'var(--az)' : 'transparent', border: done ? 'none' : '1px solid var(--bd2)', color: done ? '#fff' : 'var(--td3)' }}>{done ? '✓' : step.level}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)' }}>Niveau {step.level} — {step.title} <span style={{ color: 'var(--gold2)' }}>+{step.reward} $NIKKA</span></div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{step.desc}</div>
                </div>
                {!done && isNext && !locked && (
                  <button onClick={() => completeKyc(step.level)} style={{ ...ctaSmall }}>Valider</button>
                )}
                {!done && locked && <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', fontStyle: 'italic' }}>Bientôt</span>}
              </div>
            );
          })}
          {kycMsg && <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: kycMsg.includes('NIKKA') ? 'var(--az2)' : '#ff7755' }}>{kycMsg}</span>}
        </div>
      </section>

      {/* Devenir Pro */}
      <section style={card}>
        <div style={sectionLabel}>{me.is_pro ? 'Mes domaines pro' : 'Devenir Pro'}</div>
        {!me.is_pro && <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td2)', marginBottom: 12 }}>Proposez vos services sur NIKA.</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {PRO_DOMAINS.map(d => {
            const on = proDraft.includes(d.slug);
            return (
              <button key={d.slug} onClick={() => setProDraft(p => on ? p.filter(x => x !== d.slug) : [...p, d.slug])}
                style={{ padding: '7px 13px', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', border: `1px solid ${on ? 'var(--az)' : 'var(--bd2)'}`, background: on ? 'rgba(0,148,212,0.14)' : 'transparent', color: on ? 'var(--az2)' : 'var(--td2)' }}>
                {d.label}
              </button>
            );
          })}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={isProDraft} onChange={e => setIsProDraft(e.target.checked)} />
          <span style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td)' }}>Activer mon compte pro</span>
        </label>
        <button onClick={savePro} style={ctaPrimary}>{me.is_pro ? 'Mettre à jour' : 'Proposer mes services sur NIKA'}</button>
      </section>
    </main>
  );
}

const center: React.CSSProperties = { minHeight: 'calc(100vh - 108px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.4rem' };
const card: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 14, padding: '1.2rem 1.3rem', marginBottom: '1.2rem' };
const sectionLabel: React.CSSProperties = { fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 12 };
const labelStyle: React.CSSProperties = { fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)', display: 'block', marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: '100%', background: '#09152A', border: '1px solid var(--bd2)', borderRadius: 6, padding: '11px 14px', fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td)', outline: 'none' };
const ctaPrimary: React.CSSProperties = { padding: '11px 22px', borderRadius: 3, background: 'linear-gradient(90deg, var(--az), var(--az2))', color: '#fff', fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.05em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', alignSelf: 'flex-start' };
const ctaSmall: React.CSSProperties = { padding: '7px 14px', borderRadius: 3, background: 'var(--az)', color: '#fff', fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', flexShrink: 0 };
