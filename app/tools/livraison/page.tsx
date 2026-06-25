'use client';
// app/tools/livraison/page.tsx — Outil LIVRAISON (NIKA Tools). Pour livreurs (pro) & clients.
// 4 sections : Kit livreur (plaque NFT + badge Vigik + carte borne de charge, support NFC NIKA) ·
//   Équipe (notes partagées avec photo + assignation à un n° de livreur) ·
//   Colis (annonces : on publie des colis, les livreurs proposent un prix → enchère) ·
//   Avis (avis client express : étoiles + photo, calqué sur le système reviews NIKA).
// Accent cyan TOOLS (#12B8CC). Photos en local (capture + aperçu) — pas d'upload backend en v1.
import { useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const CY = '#12B8CC';   // accent TOOLS / Livraison
const CY2 = '#3AD7E6';  // bord lumineux CTA
const OK = '#22DD88';   // vert validé / fait
const WARN = '#E0A020'; // ambre « à faire »

type Tab = 'kit' | 'equipe' | 'colis' | 'avis';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'kit', label: 'Kit', icon: '🪪' },
  { key: 'equipe', label: 'Équipe', icon: '📋' },
  { key: 'colis', label: 'Colis', icon: '📦' },
  { key: 'avis', label: 'Avis', icon: '⭐' },
];

const DRIVERS = [54, 12, 31, 7, 23];

const fe = (s: number): React.CSSProperties => ({ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: s, letterSpacing: '0.02em', textTransform: 'uppercase' });
const sectionLbl: React.CSSProperties = { fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td2)' };
const inp: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--bd2)', borderRadius: 9, padding: '9px 11px', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td)', outline: 'none', width: '100%' };
const itemV = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };
const gridV = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

export default function LivraisonPage() {
  const [tab, setTab] = useState<Tab>('kit');
  return (
    <main style={{ minHeight: '100svh', background: 'linear-gradient(180deg,#04181C 0%,#07252B 40%,var(--bg) 100%)' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(1.4rem,4vw,2.4rem) 1.1rem 5rem' }}>
        {/* En-tête */}
        <Link href="/tools" style={{ fontFamily: 'var(--fo)', fontSize: 12, color: CY, display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>← Outils</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, margin: '0.8rem 0 0.3rem' }}>
          <span style={{ fontSize: 30 }} aria-hidden>🚚</span>
          <h1 style={{ ...fe(28), color: 'var(--td)', margin: 0 }}>Livraison</h1>
        </div>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 13.5, color: 'var(--td2)', margin: '0 0 1.2rem', lineHeight: 1.5 }}>
          Le couteau suisse du livreur et du client : ton kit d&rsquo;accès, l&rsquo;organisation d&rsquo;équipe, les colis à prendre et les avis express.
        </p>

        {/* Onglets */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {TABS.map(t => {
            const a = t.key === tab;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} aria-pressed={a}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 4px', borderRadius: 12, cursor: 'pointer', border: `1px solid ${a ? CY : 'var(--bd2)'}`, background: a ? `${CY}22` : 'rgba(255,255,255,0.03)', boxShadow: a ? `0 0 16px ${CY}44` : 'none', transition: 'all .2s' }}>
                <span style={{ fontSize: 18, filter: a ? `drop-shadow(0 0 6px ${CY}cc)` : 'none' }}>{t.icon}</span>
                <span style={{ ...fe(11), color: a ? CY2 : 'var(--td2)' }}>{t.label}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24 }}>
            {tab === 'kit' && <KitSection />}
            {tab === 'equipe' && <EquipeSection />}
            {tab === 'colis' && <ColisSection />}
            {tab === 'avis' && <AvisSection />}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

/* ════════════════ KIT LIVREUR (wallet NFC) ════════════════ */
const CREDENTIALS = [
  { key: 'plaque', icon: '🪪', title: 'Plaque NFT livreur', sub: 'Ta signalétique d’identité — n° 54', action: 'Activer la plaque', grad: 'linear-gradient(135deg,#12B8CC,#0868A0)' },
  { key: 'vigik', icon: '🔑', title: 'Badge Vigik', sub: 'Accès halls & boîtes aux lettres', action: 'Copier sur mon support', grad: 'linear-gradient(135deg,#0EA878,#0868A0)' },
  { key: 'borne', icon: '🔌', title: 'Carte borne de charge', sub: 'Recharge au dépôt', action: 'Copier sur mon support', grad: 'linear-gradient(135deg,#7B5CF0,#12B8CC)' },
];
function KitSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Banner icon="📲" text="Tout ton kit d’accès regroupé sur un seul support NIKA. Approche-le du lecteur pour programmer chaque accès." />
      {CREDENTIALS.map(c => <CredentialCard key={c.key} cred={c} />)}
      <p style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)', textAlign: 'center', lineHeight: 1.5, marginTop: 2 }}>
        La copie de badge nécessite un support NIKA et un lecteur NFC compatible. La plaque NFT est partageable partout.
      </p>
    </div>
  );
}
function CredentialCard({ cred }: { cred: typeof CREDENTIALS[number] }) {
  const [state, setState] = useState<'idle' | 'scan' | 'done'>('idle');
  const run = () => {
    if (state !== 'idle') { setState('idle'); return; }
    setState('scan');
    setTimeout(() => setState('done'), 1700);
  };
  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--bd2)' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: cred.grad, opacity: 0.22 }} />
      <div style={{ position: 'relative', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, background: cred.grad, boxShadow: `0 4px 16px ${CY}33` }} aria-hidden>{cred.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...fe(15), color: 'var(--td)' }}>{cred.title}</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td2)', marginTop: 1 }}>{cred.sub}</div>
          </div>
          <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, color: OK }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: OK, boxShadow: `0 0 6px ${OK}` }} />ACTIF
          </span>
        </div>
        <AnimatePresence mode="wait">
          {state === 'scan' ? (
            <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '11px', borderRadius: 11, border: `1px dashed ${CY}`, background: `${CY}14` }}>
              <motion.span animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 1.1 }} style={{ fontSize: 18 }} aria-hidden>📡</motion.span>
              <span style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: CY2 }}>Approche ton support NIKA…</span>
            </motion.div>
          ) : state === 'done' ? (
            <motion.button key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} onClick={run}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', borderRadius: 11, border: `1px solid ${OK}`, background: `${OK}1c`, color: OK, fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12.5, textTransform: 'uppercase', cursor: 'pointer' }}>
              ✓ Programmé sur ton support
            </motion.button>
          ) : (
            <motion.button key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={run}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', borderRadius: 11, border: 'none', background: `linear-gradient(180deg,${CY2},${CY})`, color: '#042', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12.5, textTransform: 'uppercase', cursor: 'pointer', boxShadow: `0 6px 20px ${CY}44` }}>
              {cred.action} →
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ════════════════ ÉQUIPE (notes partagées) ════════════════ */
type Note = { id: string; photo?: string; emoji: string; text: string; to: number; author: string; time: string; done: boolean };
const SEED_NOTES: Note[] = [
  { id: 'n1', emoji: '🛒', text: 'Charriot zone B à scanner avant 14h', to: 54, author: 'Chef d’équipe', time: 'il y a 12 min', done: false },
  { id: 'n2', emoji: '📦', text: 'Colis fragiles — dépôt étage 2, à part', to: 12, author: 'Marie', time: 'il y a 40 min', done: false },
  { id: 'n3', emoji: '✅', text: 'Tournée Cimiez bouclée, charriot rendu', to: 31, author: 'n°31', time: 'il y a 1 h', done: true },
];
function EquipeSection() {
  const [notes, setNotes] = useState<Note[]>(SEED_NOTES);
  const [open, setOpen] = useState(false);
  const toggleDone = (id: string) => setNotes(ns => ns.map(n => n.id === id ? { ...n, done: !n.done } : n));
  const add = (n: Note) => { setNotes(ns => [n, ...ns]); setOpen(false); };
  return (
    <div>
      <Banner icon="👥" text="Une photo, une note, un n° de livreur — visible par toute l’équipe en temps réel." />
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ width: '100%', margin: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 11, borderRadius: 12, cursor: 'pointer', border: `1px dashed ${open ? CY : CY + '88'}`, background: open ? `${CY}1c` : `${CY}10`, color: CY2, ...fe(12.5) }}>
        {open ? '× Fermer' : '＋ Nouvelle note'}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <NoteForm onAdd={add} />
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div variants={gridV} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12 }}>
        {notes.map(n => (
          <motion.div variants={itemV} key={n.id} style={{ display: 'flex', gap: 11, padding: 9, borderRadius: 13, border: `1px solid ${n.done ? OK + '55' : 'var(--bd2)'}`, background: n.done ? `${OK}10` : 'rgba(255,255,255,0.03)' }}>
            <span style={{ flexShrink: 0, width: 58, height: 58, borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, background: 'rgba(255,255,255,0.05)' }}>
              {n.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={n.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : <span aria-hidden>{n.emoji}</span>}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td)', lineHeight: 1.3, textDecoration: n.done ? 'line-through' : 'none', opacity: n.done ? 0.7 : 1 }}>{n.text}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 800, color: CY2, background: `${CY}1c`, border: `1px solid ${CY}55`, borderRadius: 20, padding: '2px 8px' }}>→ n°{n.to}</span>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>{n.author} · {n.time}</span>
              </div>
            </div>
            <button onClick={() => toggleDone(n.id)} aria-pressed={n.done} title={n.done ? 'Marquer à faire' : 'Marquer fait'}
              style={{ flexShrink: 0, alignSelf: 'center', width: 34, height: 34, borderRadius: 9, cursor: 'pointer', border: `1px solid ${n.done ? OK : 'var(--bd2)'}`, background: n.done ? `${OK}1c` : 'rgba(255,255,255,0.04)', color: n.done ? OK : 'var(--td3)', fontSize: 16 }}>✓</button>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
function NoteForm({ onAdd }: { onAdd: (n: Note) => void }) {
  const [text, setText] = useState('');
  const [to, setTo] = useState<number | null>(null);
  const [photo, setPhoto] = useState<string | undefined>();
  const ready = text.trim().length > 1 && to !== null;
  const submit = () => {
    if (!ready) return;
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${text}${to}`;
    onAdd({ id, photo, emoji: '📦', text: text.trim(), to: to!, author: 'Moi', time: 'à l’instant', done: false });
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 2px 6px' }}>
      <PhotoPicker photo={photo} onPhoto={setPhoto} label="Photo du charriot / colis" />
      <input value={text} onChange={e => setText(e.target.value)} placeholder="Note (ex : charriot zone B avant 14h)" style={inp} maxLength={90} />
      <div>
        <div style={sectionLbl}>Assigner à</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {DRIVERS.map(d => <Chip key={d} active={to === d} onClick={() => setTo(to === d ? null : d)} label={`n°${d}`} />)}
        </div>
      </div>
      <Cta onClick={submit} disabled={!ready} label={ready ? 'Publier la note' : 'Note + livreur'} />
    </div>
  );
}

/* ════════════════ COLIS (annonces & enchères) ════════════════ */
type Bid = { n: number; price: number };
type Annonce = { id: string; count: number; zone: string; deadline: string; start: number; bids: Bid[]; author: string };
const ZONES = ['Nice Est', 'Nice Ouest', 'Cagnes', 'Antibes', 'Vieux-Nice', 'Cimiez'];
const SEED_ANNONCES: Annonce[] = [
  { id: 'a1', count: 18, zone: 'Nice Est', deadline: 'Aujourd’hui 17h', start: 45, bids: [{ n: 12, price: 40 }, { n: 7, price: 38 }], author: 'Dépôt Nice' },
  { id: 'a2', count: 32, zone: 'Cagnes', deadline: 'Demain 12h', start: 70, bids: [{ n: 23, price: 65 }], author: 'Dépôt Cagnes' },
  { id: 'a3', count: 9, zone: 'Vieux-Nice', deadline: 'Aujourd’hui 19h', start: 25, bids: [], author: 'Marie' },
];
function ColisSection() {
  const [list, setList] = useState<Annonce[]>(SEED_ANNONCES);
  const [open, setOpen] = useState(false);
  const addBid = (id: string, price: number) => setList(l => l.map(a => a.id === id ? { ...a, bids: [...a.bids, { n: 54, price }].sort((x, y) => x.price - y.price) } : a));
  const add = (a: Annonce) => { setList(l => [a, ...l]); setOpen(false); };
  return (
    <div>
      <Banner icon="📦" text="Publie un lot de colis : les livreurs proposent leur prix, tu choisis le meilleur." />
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ width: '100%', margin: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 11, borderRadius: 12, cursor: 'pointer', border: `1px dashed ${open ? CY : CY + '88'}`, background: open ? `${CY}1c` : `${CY}10`, color: CY2, ...fe(12.5) }}>
        {open ? '× Fermer' : '＋ Publier des colis'}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <AnnonceForm onAdd={add} />
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div variants={gridV} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {list.map(a => <AnnonceCard key={a.id} a={a} onBid={addBid} />)}
      </motion.div>
    </div>
  );
}
function AnnonceCard({ a, onBid }: { a: Annonce; onBid: (id: string, price: number) => void }) {
  const best = a.bids[0]?.price;
  const [bidOpen, setBidOpen] = useState(false);
  const [price, setPrice] = useState(best ?? a.start);
  return (
    <div style={{ padding: 12, borderRadius: 14, border: '1px solid var(--bd2)', background: 'rgba(255,255,255,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ flexShrink: 0, width: 46, height: 46, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, background: `${CY}1c`, border: `1px solid ${CY}44` }} aria-hidden>📦</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...fe(15), color: 'var(--td)' }}>{a.count} colis · {a.zone}</div>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td2)', marginTop: 1 }}>⏱ {a.deadline} · par {a.author}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--td3)' }}>{best ? 'Meilleure offre' : 'Prix de départ'}</div>
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{ fontFamily: 'var(--fn)', fontSize: 24, color: best ? OK : CY2, lineHeight: 1 }}>{best ?? a.start}</span>
            <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: 'var(--td2)' }}>€</span>
          </span>
        </div>
      </div>
      {a.bids.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
          {a.bids.map((b, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--fo)', fontSize: 10.5, color: i === 0 ? OK : 'var(--td2)', background: i === 0 ? `${OK}14` : 'rgba(255,255,255,0.05)', border: `1px solid ${i === 0 ? OK + '55' : 'var(--bd)'}`, borderRadius: 20, padding: '3px 9px' }}>
              n°{b.n} · {b.price}€{i === 0 ? ' ✓' : ''}
            </span>
          ))}
        </div>
      )}
      {bidOpen ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <Stepper value={price} onChange={setPrice} min={5} max={a.start + 50} step={1} suffix="€" />
          <button onClick={() => { onBid(a.id, price); setBidOpen(false); }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: `linear-gradient(180deg,${CY2},${CY})`, color: '#042', ...fe(12), cursor: 'pointer' }}>Envoyer mon offre</button>
        </div>
      ) : (
        <button onClick={() => setBidOpen(true)} style={{ width: '100%', marginTop: 10, padding: '10px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${CY}66`, background: `${CY}14`, color: CY2, fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700 }}>Proposer un prix (n°54)</button>
      )}
    </div>
  );
}
function AnnonceForm({ onAdd }: { onAdd: (a: Annonce) => void }) {
  const [count, setCount] = useState(10);
  const [zone, setZone] = useState<string | null>(null);
  const [deadline, setDeadline] = useState('Aujourd’hui');
  const [start, setStart] = useState(30);
  const ready = !!zone;
  const submit = () => {
    if (!ready) return;
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${zone}${count}`;
    onAdd({ id, count, zone: zone!, deadline, start, bids: [], author: 'Moi' });
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: '4px 2px 6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={sectionLbl}>Nombre de colis</span>
        <Stepper value={count} onChange={setCount} min={1} max={200} step={1} />
      </div>
      <div>
        <div style={sectionLbl}>Zone</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {ZONES.map(z => <Chip key={z} active={zone === z} onClick={() => setZone(zone === z ? null : z)} label={z} />)}
        </div>
      </div>
      <div>
        <div style={sectionLbl}>Échéance</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          {['Aujourd’hui', 'Demain', 'Cette semaine'].map(d => <Chip key={d} active={deadline === d} onClick={() => setDeadline(d)} label={d} />)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={sectionLbl}>Prix de départ</span>
        <Stepper value={start} onChange={setStart} min={5} max={500} step={5} suffix="€" />
      </div>
      <Cta onClick={submit} disabled={!ready} label={ready ? 'Publier l’annonce' : 'Choisis une zone'} />
    </div>
  );
}

/* ════════════════ AVIS (client express) ════════════════ */
type Review = { id: string; author: string; stars: number; text: string; photo?: string; emoji: string; time: string };
const SEED_REVIEWS: Review[] = [
  { id: 'r1', author: 'Julie', stars: 5, text: 'Livreur super rapide et souriant, colis nickel !', emoji: '📦', time: 'il y a 5 min' },
  { id: 'r2', author: 'Marc', stars: 4, text: 'Déposé au bon endroit, photo reçue. Parfait.', emoji: '🏠', time: 'il y a 1 h' },
  { id: 'r3', author: 'Sofia', stars: 5, text: 'Top, prévenue à l’arrivée.', emoji: '📸', time: 'hier' },
];
function AvisSection() {
  const [reviews, setReviews] = useState<Review[]>(SEED_REVIEWS);
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const ready = stars > 0;
  const submit = () => {
    if (!ready) return;
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${stars}${text}`;
    setReviews(r => [{ id, author: 'Moi', stars, text: text.trim() || 'Merci !', photo, emoji: '📦', time: 'à l’instant' }, ...r]);
    setSent(true); setStars(0); setText(''); setPhoto(undefined);
    setTimeout(() => setSent(false), 2200);
  };
  return (
    <div>
      <Banner icon="⚡" text="L’avis en 5 secondes : une note, une photo, c’est envoyé. Pensé pour le client, à la livraison." />
      <div style={{ marginTop: 12, padding: 14, borderRadius: 15, border: `1px solid ${CY}44`, background: `${CY}10`, display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={{ ...fe(15), color: 'var(--td)' }}>Noter ma livraison</div>
        <Stars value={stars} onChange={setStars} />
        <PhotoPicker photo={photo} onPhoto={setPhoto} label="Photo du colis reçu (optionnel)" />
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Un mot (optionnel)…" style={inp} maxLength={120} />
        <Cta onClick={submit} disabled={!ready} label={sent ? '✓ Merci pour ton avis !' : ready ? 'Envoyer mon avis' : 'Mets une note'} />
      </div>
      <div style={{ ...sectionLbl, margin: '18px 2px 9px' }}>Derniers avis</div>
      <motion.div variants={gridV} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {reviews.map(r => (
          <motion.div variants={itemV} key={r.id} style={{ display: 'flex', gap: 11, padding: 9, borderRadius: 13, border: '1px solid var(--bd2)', background: 'rgba(255,255,255,0.03)' }}>
            <span style={{ flexShrink: 0, width: 50, height: 50, borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, background: 'rgba(255,255,255,0.05)' }}>
              {r.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : <span aria-hidden>{r.emoji}</span>}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: 'var(--td)' }}>{r.author}</span>
                <span style={{ fontSize: 11, color: WARN, letterSpacing: 1 }} aria-label={`${r.stars} sur 5`}>{'★'.repeat(r.stars)}<span style={{ color: 'var(--bd2)' }}>{'★'.repeat(5 - r.stars)}</span></span>
              </div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', marginTop: 3, lineHeight: 1.35 }}>{r.text}</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, color: 'var(--td3)', marginTop: 3 }}>{r.time}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

/* ════════════════ Sous-composants ════════════════ */
function Banner({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 12, border: `1px solid ${CY}33`, background: `${CY}10` }}>
      <span style={{ fontSize: 17, lineHeight: 1.1 }} aria-hidden>{icon}</span>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td2)', lineHeight: 1.45 }}>{text}</div>
    </div>
  );
}
function PhotoPicker({ photo, onPhoto, label }: { photo?: string; onPhoto: (url: string) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input ref={ref} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onPhoto(URL.createObjectURL(f)); }} />
      <button onClick={() => ref.current?.click()} type="button"
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: photo ? 8 : '16px 12px', borderRadius: 12, cursor: 'pointer', border: `1px dashed ${photo ? CY : 'var(--bd2)'}`, background: photo ? `${CY}10` : 'rgba(255,255,255,0.03)', color: 'var(--td2)' }}>
        {photo ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" style={{ width: 56, height: 56, borderRadius: 9, objectFit: 'cover', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: CY2, fontWeight: 600 }}>Photo ajoutée · changer</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 20 }} aria-hidden>📷</span>
            <span style={{ fontFamily: 'var(--fo)', fontSize: 12.5 }}>{label}</span>
          </>
        )}
      </button>
    </div>
  );
}
function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} onClick={() => onChange(i)} aria-label={`${i} étoile${i > 1 ? 's' : ''}`}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, fontSize: 30, lineHeight: 1, color: i <= value ? WARN : 'var(--bd2)', filter: i <= value ? `drop-shadow(0 2px 6px ${WARN}66)` : 'none', transition: 'all .12s' }}>★</button>
      ))}
    </div>
  );
}
function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20, cursor: 'pointer', border: `1px solid ${active ? CY : 'var(--bd2)'}`, background: active ? `${CY}1f` : 'rgba(255,255,255,0.04)', color: active ? CY2 : 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap', transition: 'all .15s' }}>
      {active && <span aria-hidden>✓</span>}{label}
    </button>
  );
}
function Stepper({ value, onChange, min, max, step, suffix }: { value: number; onChange: (v: number) => void; min: number; max: number; step: number; suffix?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button onClick={() => onChange(Math.max(min, value - step))} aria-label="Moins" style={miniStep}>−</button>
      <span style={{ fontFamily: 'var(--fn)', fontSize: 19, color: 'var(--td)', minWidth: 48, textAlign: 'center' }}>{value}{suffix ? ` ${suffix}` : ''}</span>
      <button onClick={() => onChange(Math.min(max, value + step))} aria-label="Plus" style={miniStep}>+</button>
    </div>
  );
}
const miniStep: React.CSSProperties = { width: 30, height: 30, borderRadius: 8, border: `1px solid ${CY}77`, background: `${CY}1c`, color: CY2, fontSize: 17, cursor: 'pointer', lineHeight: 1 };
function Cta({ label, onClick, disabled = false }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px', borderRadius: 12, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', background: disabled ? 'rgba(255,255,255,0.08)' : `linear-gradient(180deg,${CY2},${CY})`, color: disabled ? 'var(--td2)' : '#042', ...fe(12.5), boxShadow: disabled ? 'none' : `0 6px 22px ${CY}44` }}>
      {label}
    </button>
  );
}
