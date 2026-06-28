'use client';
// app/profil/ProfilHub.tsx — Hub privé à onglets (Aperçu / Activité / Wallet / Récompenses / Pro / Réglages).
// Reçoit les données réelles du server. Mutations via /api/profile + /api/kyc. Déconnexion incluse.
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import NikaBadge from '@/components/ui/NikaBadge';
import CountUp from '@/components/ui/CountUp';
import { getLevelFromXP, LEVELS, DOMAINS } from '@/lib/constants';
import type { User, BadgeTier, KycLevel } from '@/lib/types';

type Pro1 = { business_name: string; domain: string };
type Order = { id: string; status: string; amount: number; created_at: string; pros: Pro1 | Pro1[] | null };
type Xp = { id: string; action: string; xp_amount: number; created_at: string };
type Credit = { id: string; amount: number; type: string; created_at: string };
type Poi = { id: string; name: string; category: string; status: string; upvotes: number; created_at: string };
type Props = { profile: User; orders: Order[]; xpTx: Xp[]; creditTx: Credit[]; pois: Poi[] };

const TABS = [
  { key: 'apercu', label: 'Aperçu', icon: '🏠' },
  { key: 'activite', label: 'Activité', icon: '🧾' },
  { key: 'wallet', label: 'Wallet', icon: '🪙' },
  { key: 'recompenses', label: 'Récompenses', icon: '🏆' },
  { key: 'pro', label: 'Pro', icon: '💼' },
  { key: 'reglages', label: 'Réglages', icon: '⚙️' },
] as const;
type Tab = typeof TABS[number]['key'];

const PRO_DOMAINS = DOMAINS.filter(d => ['food', 'stay', 'azur', 'auto', 'serv', 'rent', 'learn', 'sec'].includes(d.slug));
const KYC_STEPS = [
  { level: 1 as const, reward: 50, title: 'Profil renseigné', desc: 'Nom + ville + photo' },
  { level: 2 as const, reward: 100, title: 'Email vérifié', desc: 'Confirmer ton adresse email' },
  { level: 3 as const, reward: 200, title: 'Identité confirmée', desc: 'Pièce d’identité (bientôt)' },
];
const TIER_LABEL: Record<BadgeTier, string> = { founder: 'Fondateur', pioneer: 'Pionnier', initie: 'Initié', member: 'Membre' };
const statusColor: Record<string, string> = { pending: '#D4A017', confirmed: '#0094D4', delivered: '#0EA878', cancelled: '#D44B24' };
const statusLabel: Record<string, string> = { pending: 'En attente', confirmed: 'Confirmé', delivered: 'Livré', cancelled: 'Annulé' };
const domainIcon: Record<string, string> = Object.fromEntries(DOMAINS.map(d => [d.slug, d.icon]));
const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const proName = (o: Order) => { const p = Array.isArray(o.pros) ? o.pros[0] : o.pros; return p ? `${domainIcon[p.domain] || '📦'} ${p.business_name}` : 'Commande'; };

export default function ProfilHub({ profile, orders, xpTx, creditTx, pois }: Props) {
  const router = useRouter();
  const setStoreUser = useAuthStore(s => s.setUser);
  const [tab, setTab] = useState<Tab>('apercu');
  const [me, setMe] = useState<User>(profile);
  const [form, setForm] = useState({ full_name: me.full_name ?? '', city: me.city ?? '', bio: me.bio ?? '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [proDraft, setProDraft] = useState<string[]>(me.pro_domains ?? []);
  const [isProDraft, setIsProDraft] = useState(!!me.is_pro);
  const [kycMsg, setKycMsg] = useState('');

  const level = getLevelFromXP(me.xp);
  const nextLevel = LEVELS[Math.min(level.n, LEVELS.length - 1)];
  const xpProgress = level.n < 10 ? Math.round(((me.xp - level.minXP) / (nextLevel.minXP - level.minXP)) * 100) : 100;
  const kyc = (me.kyc_level ?? 0) as KycLevel;
  const tier = (me.badge_tier ?? 'member') as BadgeTier;
  const num = me.number ?? 0;

  async function saveIdentity() {
    setSaving(true); setMsg('');
    const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const j = await res.json().catch(() => ({}));
    if (res.ok) { setMe(m => ({ ...m, ...j.profile })); setStoreUser({ ...me, ...j.profile }); setMsg('Enregistré ✓'); } else setMsg(j.error || 'Erreur');
    setSaving(false); setTimeout(() => setMsg(''), 2500);
  }
  async function completeKyc(lvl: number) {
    setKycMsg('');
    const res = await fetch('/api/kyc/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ level: lvl }) });
    const j = await res.json().catch(() => ({}));
    if (res.ok) { setMe(m => ({ ...m, kyc_level: j.kyc_level as KycLevel, nika_credits: j.nika_credits, is_verified: lvl >= 2 ? true : m.is_verified })); setKycMsg(`+${j.reward} $NIKKA 🎉`); setTimeout(() => setKycMsg(''), 2500); } else setKycMsg(j.error || 'Erreur');
  }
  async function savePro() {
    const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_pro: isProDraft, pro_domains: proDraft }) });
    const j = await res.json().catch(() => ({}));
    if (res.ok) { setMe(m => ({ ...m, is_pro: j.profile.is_pro, pro_domains: j.profile.pro_domains })); setMsg('Profil pro mis à jour ✓'); setTimeout(() => setMsg(''), 2500); }
  }
  async function logout() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    setStoreUser(null);
    router.push('/'); router.refresh();
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(1.4rem,4vw,2.4rem) 1.2rem 6rem' }}>
      {/* En-tête identité */}
      <section style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <NikaBadge number={num} tier={tier} kycLevel={kyc} size="xl" isPro={!!me.is_pro} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: 'var(--fn)', fontSize: 44, color: 'var(--sand)', lineHeight: 0.9 }}>#{num}</div>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginTop: 4 }}>{TIER_LABEL[tier]} · Niv. {level.n} {level.name}</div>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginTop: 4 }}>{me.full_name || me.username} · KYC {kyc}/3</div>
        </div>
        <Link href={`/profil/${me.id}`} style={{ flexShrink: 0, fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: 'var(--az2)', border: '1px solid var(--bd2)', borderRadius: 20, padding: '7px 13px', textDecoration: 'none' }}>Profil public ↗</Link>
      </section>

      {/* Onglets */}
      <div className="hero-domabar" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 18, paddingBottom: 2 }}>
        {TABS.map(t => {
          const a = t.key === tab;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} aria-pressed={a}
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${a ? 'var(--az)' : 'var(--bd2)'}`, background: a ? 'rgba(0,148,212,0.16)' : 'transparent', color: a ? 'var(--az2)' : 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: a ? 700 : 500, whiteSpace: 'nowrap' }}>
              <span aria-hidden>{t.icon}</span>{t.label}
            </button>
          );
        })}
      </div>

      {/* ───── APERÇU ───── */}
      {tab === 'apercu' && (
        <>
          <section style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div><div style={lbl}>Solde $NIKKA</div><div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 34, color: 'var(--gold2)' }}><CountUp value={me.nika_credits ?? 0} /></div></div>
              <Link href="/wallet/acheter" style={miniCta}>Recharger →</Link>
            </div>
            {level.n < 10 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}><span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{me.xp.toLocaleString()} XP</span><span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{(nextLevel.minXP - me.xp).toLocaleString()} → {nextLevel.name}</span></div>
                <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}><div style={{ height: '100%', width: `${xpProgress}%`, background: 'linear-gradient(90deg, var(--az), var(--az2))', borderRadius: 3 }} /></div>
              </div>
            )}
          </section>
          <div className="g-3 max-sm:grid-cols-3" style={{ gap: 10, marginBottom: '1.2rem' }}>
            <Stat label="XP" value={me.xp} color="var(--az)" />
            <Stat label="Commandes" value={orders.length} color="var(--teal)" />
            <Stat label="Spots" value={pois.length} color="var(--gold)" />
          </div>
          <section style={card}>
            <div style={lbl}>Dernière activité</div>
            {orders.length || xpTx.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {orders.slice(0, 3).map(o => <Row key={o.id} left={proName(o)} sub={fmtDate(o.created_at)} right={statusLabel[o.status] || o.status} rightColor={statusColor[o.status]} />)}
                {!orders.length && xpTx.slice(0, 3).map(x => <Row key={x.id} left={x.action.replace(/_/g, ' ').toLowerCase()} sub={fmtDate(x.created_at)} right={`+${x.xp_amount} XP`} rightColor="var(--az2)" />)}
              </div>
            ) : <Empty emoji="✨" text="Ton activité apparaîtra ici." />}
          </section>
        </>
      )}

      {/* ───── ACTIVITÉ ───── */}
      {tab === 'activite' && (
        <>
          <section style={card}>
            <div style={lbl}>Mes commandes</div>
            {orders.length ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{orders.map(o => <Row key={o.id} left={proName(o)} sub={fmtDate(o.created_at)} right={o.amount > 0 ? `${o.amount}€` : (statusLabel[o.status] || o.status)} rightColor={statusColor[o.status]} />)}</div> : <Empty emoji="🛒" text="Aucune commande pour l'instant." />}
          </section>
          <section style={card}>
            <div style={lbl}>Mes spots & POIs</div>
            {pois.length ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{pois.map(p => <Row key={p.id} left={`📍 ${p.name}`} sub={`${p.category} · ${p.status === 'approved' ? 'publié' : 'en revue'}`} right={`▲ ${p.upvotes}`} rightColor="var(--az2)" />)}</div> : <Empty emoji="🗺️" text="Partage un spot depuis le module STAY." />}
          </section>
          <section style={{ ...card, borderStyle: 'dashed' }}>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>🔜 Réservations, devis et avis s&apos;afficheront ici une fois activés.</div>
          </section>
        </>
      )}

      {/* ───── WALLET ───── */}
      {tab === 'wallet' && (
        <>
          <section style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={lbl}>Solde $NIKKA</div><div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 38, color: 'var(--gold2)' }}><CountUp value={me.nika_credits ?? 0} /></span><span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>≈ {((me.nika_credits ?? 0) / 10).toFixed(2)} €</span></div></div>
              <span style={{ fontSize: 34 }}>🪙</span>
            </div>
            <Link href="/wallet/acheter" style={{ ...miniCta, display: 'inline-block', marginTop: 12 }}>Acheter des crédits →</Link>
          </section>
          <section style={card}>
            <div style={lbl}>Historique</div>
            {creditTx.length ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{creditTx.map(c => <Row key={c.id} left={c.type === 'purchase' ? 'Achat de crédits' : c.type === 'spend' ? 'Dépense' : c.type.replace(/_/g, ' ')} sub={fmtDate(c.created_at)} right={`${c.amount > 0 ? '+' : ''}${c.amount}`} rightColor={c.amount > 0 ? 'var(--gold2)' : 'var(--coral)'} />)}</div> : <Empty emoji="🪙" text="Aucune transaction. Recharge pour payer en 1 tap." />}
          </section>
        </>
      )}

      {/* ───── RÉCOMPENSES ───── */}
      {tab === 'recompenses' && (
        <>
          <section style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}><span style={lbl}>Niveaux</span><Link href="/leaderboard" style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--az2)' }}>Classement →</Link></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {LEVELS.map(l => { const reached = me.xp >= l.minXP; const current = l.n === level.n; return (
                <div key={l.n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, border: `1px solid ${current ? 'var(--az)' : 'var(--bd)'}`, background: current ? 'rgba(0,148,212,0.1)' : reached ? 'var(--bg2)' : 'transparent', opacity: reached ? 1 : 0.55 }}>
                  <span style={{ width: 22, textAlign: 'center', fontFamily: 'var(--fn)', fontSize: 15, color: reached ? 'var(--az2)' : 'var(--td3)' }}>{reached ? '✓' : l.n}</span>
                  <span style={{ flex: 1, fontFamily: 'var(--fo)', fontSize: 13, fontWeight: current ? 700 : 500, color: 'var(--td)' }}>{l.name}</span>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{l.minXP.toLocaleString()} XP</span>
                </div>
              ); })}
            </div>
          </section>
          <section style={card}>
            <div style={lbl}>Historique XP</div>
            {xpTx.length ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{xpTx.map(x => <Row key={x.id} left={x.action.replace(/_/g, ' ').toLowerCase()} sub={fmtDate(x.created_at)} right={`${x.xp_amount > 0 ? '+' : ''}${x.xp_amount} XP`} rightColor={x.xp_amount > 0 ? 'var(--az2)' : 'var(--coral)'} />)}</div> : <Empty emoji="⚡" text="Gagne de l'XP en utilisant NIKA." />}
          </section>
        </>
      )}

      {/* ───── PRO ───── */}
      {tab === 'pro' && (
        <section style={card}>
          <div style={lbl}>{me.is_pro ? 'Mes domaines pro' : 'Devenir Pro'}</div>
          {!me.is_pro && <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td2)', marginBottom: 12 }}>Propose tes services sur NIKA et reçois des demandes près de chez toi.</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {PRO_DOMAINS.map(d => { const on = proDraft.includes(d.slug); return (
              <button key={d.slug} onClick={() => setProDraft(p => on ? p.filter(x => x !== d.slug) : [...p, d.slug])}
                style={{ padding: '7px 13px', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, border: `1px solid ${on ? 'var(--az)' : 'var(--bd2)'}`, background: on ? 'rgba(0,148,212,0.14)' : 'transparent', color: on ? 'var(--az2)' : 'var(--td2)' }}>{d.label}</button>
            ); })}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={isProDraft} onChange={e => setIsProDraft(e.target.checked)} />
            <span style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td)' }}>Activer mon compte pro</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={savePro} style={cta}>{me.is_pro ? 'Mettre à jour' : 'Proposer mes services'}</button>
            {me.is_pro && <Link href="/pro/dashboard" style={{ ...miniCta }}>Espace pro →</Link>}
            {msg && <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--az2)' }}>{msg}</span>}
          </div>
        </section>
      )}

      {/* ───── RÉGLAGES ───── */}
      {tab === 'reglages' && (
        <>
          <section style={card}>
            <div style={lbl}>Mon identité</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Nom affiché" value={form.full_name} onChange={v => setForm(f => ({ ...f, full_name: v }))} placeholder="Pseudonyme public" />
              <Field label="Ville" value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} placeholder="Nice, Antibes, Cannes…" />
              <div>
                <label style={fieldLbl}>Bio <span style={{ color: 'var(--td3)' }}>({form.bio.length}/140)</span></label>
                <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value.slice(0, 140) }))} rows={2} placeholder="En une phrase…" style={{ ...inputS, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><button onClick={saveIdentity} disabled={saving} style={{ ...cta, opacity: saving ? 0.7 : 1 }}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>{msg && <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: msg.includes('✓') ? 'var(--az2)' : '#ff7755' }}>{msg}</span>}</div>
            </div>
          </section>
          <section style={card}>
            <div style={lbl}>Vérification KYC</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {KYC_STEPS.map(step => { const done = kyc >= step.level; const isNext = kyc === step.level - 1; const locked = step.level === 3; return (
                <div key={step.level} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: `1px solid ${done ? 'rgba(0,194,255,0.4)' : 'var(--bd)'}`, background: done ? 'rgba(0,148,212,0.08)' : 'var(--bg2)' }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fo)', fontWeight: 800, fontSize: 12, background: done ? 'var(--az)' : 'transparent', border: done ? 'none' : '1px solid var(--bd2)', color: done ? '#fff' : 'var(--td3)' }}>{done ? '✓' : step.level}</span>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)' }}>{step.title} <span style={{ color: 'var(--gold2)' }}>+{step.reward}</span></div><div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{step.desc}</div></div>
                  {!done && isNext && !locked && <button onClick={() => completeKyc(step.level)} style={ctaSm}>Valider</button>}
                  {!done && locked && <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', fontStyle: 'italic' }}>Bientôt</span>}
                </div>
              ); })}
              {kycMsg && <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--az2)' }}>{kycMsg}</span>}
            </div>
          </section>
          <section style={card}>
            <div style={lbl}>Compte</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Link href="/nfc/fidelite" style={miniCta}>🪪 Mes cartes NFC</Link>
              <button onClick={logout} style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12.5, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '9px 18px', borderRadius: 8, border: '1px solid rgba(212,75,36,0.5)', background: 'rgba(212,75,36,0.1)', color: '#E8703A', cursor: 'pointer' }}>Se déconnecter</button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

/* ─── sous-composants & styles ─── */
function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1rem 0.6rem', textAlign: 'center' }}><div style={{ fontFamily: 'var(--fn)', fontSize: 26, color, lineHeight: 1 }}><CountUp value={value} /></div><div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)', marginTop: 4 }}>{label}</div></div>;
}
function Row({ left, sub, right, rightColor }: { left: string; sub: string; right: string; rightColor?: string }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 11px', borderRadius: 9, background: 'var(--bg2)', border: '1px solid var(--bd)' }}><span style={{ minWidth: 0 }}><span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'capitalize' }}>{left}</span><span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)' }}>{sub}</span></span><span style={{ flexShrink: 0, fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: rightColor || 'var(--td2)' }}>{right}</span></div>;
}
function Empty({ emoji, text }: { emoji: string; text: string }) {
  return <div style={{ textAlign: 'center', padding: '1.6rem 0', fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td3)' }}><div style={{ fontSize: 28, marginBottom: 6 }}>{emoji}</div>{text}</div>;
}
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return <div><label style={fieldLbl}>{label}</label><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputS} /></div>;
}
const card: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 14, padding: '1.1rem 1.2rem', marginBottom: '1.1rem' };
const lbl: React.CSSProperties = { fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: 12 };
const fieldLbl: React.CSSProperties = { fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--td3)', display: 'block', marginBottom: 6 };
const inputS: React.CSSProperties = { width: '100%', background: '#09152A', border: '1px solid var(--bd2)', borderRadius: 8, padding: '11px 13px', fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td)', outline: 'none' };
const cta: React.CSSProperties = { padding: '11px 22px', borderRadius: 8, background: 'linear-gradient(90deg, var(--az), var(--az2))', color: '#fff', fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.04em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' };
const ctaSm: React.CSSProperties = { padding: '7px 14px', borderRadius: 8, background: 'var(--az)', color: '#fff', fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', flexShrink: 0 };
const miniCta: React.CSSProperties = { fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: 'var(--gold)', textDecoration: 'none', border: '1px solid var(--bd2)', borderRadius: 8, padding: '8px 13px' };
