'use client'
// app/azur/prestataires/nayah-boat/NayahBoatDetail.tsx

import { useState } from 'react'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Review {
  id?: string
  author_name?: string
  reviewer_name?: string
  rating: number
  comment?: string
  pack_name?: string
  pack_used?: string
  date_review?: string
  initials_color?: string
}

interface BateauData {
  id?: string
  nom: string
  capacite: number
  tarifs: { coucher_soleil: number; demi_journee: number; journee: number }
}

interface RepasData {
  key: string; label: string; prix: number; unite: string; emoji: string
  gradient: string; minimum?: number; hasCounter?: boolean
}

interface FeuxArtificeData {
  date: string
  lieu: string
  heure: string
}

interface ConditionData {
  icon: string
  title: string
  desc: string
}

export interface NayahProvider {
  name: string
  tagline?: string
  location?: string
  rating?: number
  review_count?: number
  verified?: boolean
  accent_color?: string
  contact_instagram?: string
  contact_snapchat?: string
  bateaux?: BateauData[]
  formules_repas?: RepasData[]
  feux_artifice?: FeuxArtificeData[]
  conditions?: ConditionData[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type PackKey = 'coucher_soleil' | 'demi_journee' | 'journee'

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return 0.299 * r + 0.587 * g + 0.114 * b
}
function textOn(hex: string): string { return luminance(hex) > 0.5 ? '#0a0800' : '#ffffff' }
function formatDate(d?: string): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}
function initials(name?: string): string {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function fmt(n: number): string { return n % 1 === 0 ? `${n}` : n.toFixed(1) }

// ─── Données statiques ────────────────────────────────────────────────────────

const PACK_META: { key: PackKey; name: string; hours: string; icon: string; gradient: string }[] = [
  { key: 'coucher_soleil', name: 'Coucher de soleil', hours: '19h–23h', icon: '🌅', gradient: 'linear-gradient(135deg,#2d1500 0%,#7c4a00 100%)' },
  { key: 'demi_journee',   name: 'Demi-journée',      hours: '14h–18h', icon: '☀️', gradient: 'linear-gradient(135deg,#0a1628 0%,#1a3a5c 100%)' },
  { key: 'journee',        name: 'Journée complète',  hours: '10h–18h', icon: '🌊', gradient: 'linear-gradient(135deg,#0a2818 0%,#0f5132 100%)' },
]

const BATEAUX_DEFAULT: BateauData[] = [
  { id: 'pacific_craft', nom: 'Pacific Craft 5.70', capacite: 6,  tarifs: { coucher_soleil: 200, demi_journee: 400, journee: 550 } },
  { id: 'flyer_6',       nom: 'Flyer 6.5',          capacite: 8,  tarifs: { coucher_soleil: 200, demi_journee: 400, journee: 550 } },
  { id: 'tempest_700',   nom: 'Tempest 700',         capacite: 10, tarifs: { coucher_soleil: 250, demi_journee: 450, journee: 700 } },
  { id: 'qs_675',        nom: 'Quicksilver 675',     capacite: 8,  tarifs: { coucher_soleil: 250, demi_journee: 450, journee: 700 } },
  { id: 'cc_715',        nom: 'Cap Camarat 715',     capacite: 8,  tarifs: { coucher_soleil: 250, demi_journee: 450, journee: 700 } },
  { id: 'leader_805',    nom: 'Leader 805',          capacite: 9,  tarifs: { coucher_soleil: 350, demi_journee: 600, journee: 850 } },
]

const REPAS_DEFAULT: RepasData[] = [
  { key: 'bbq',         label: 'Formule BBQ',           prix: 30,  unite: 'pers.',   emoji: '🔥', gradient: 'linear-gradient(135deg,#3d1500,#7c2d00)' },
  { key: 'burger',      label: 'Formule Burger',         prix: 25,  unite: 'pers.',   emoji: '🍔', gradient: 'linear-gradient(135deg,#2d0a0a,#5c1a1a)' },
  { key: 'charcuterie', label: 'Charcuterie & Fromages', prix: 20,  unite: 'pers.',   emoji: '🧀', gradient: 'linear-gradient(135deg,#2d1f0a,#5c3d0f)' },
  { key: 'mini_sales',  label: 'Mini Salés',             prix: 1.5, unite: 'pièce',  emoji: '🥗', gradient: 'linear-gradient(135deg,#0a1f2d,#0f3d5c)', minimum: 20 },
  { key: 'bento_cake',  label: 'Bento Cake',             prix: 35,  unite: 'prest.', emoji: '🎂', gradient: 'linear-gradient(135deg,#1a0a2d,#3d0f5c)', hasCounter: false },
]

const BATEAU_IMAGES: Record<string, string> = {
  'pacific_craft':      '/images/azur/boats/pacific_craft.webp',
  'Pacific Craft 5.70': '/images/azur/boats/pacific_craft.webp',
  'flyer_6':            '/images/azur/boats/flyer_6.webp',
  'Flyer 6.5':          '/images/azur/boats/flyer_6.webp',
  'tempest_700':        '/images/azur/boats/tempest_700.webp',
  'Tempest 700':        '/images/azur/boats/tempest_700.webp',
  'qs_675':             '/images/azur/boats/qs_675.webp',
  'Quicksilver 675':    '/images/azur/boats/qs_675.webp',
  'cc_715':             '/images/azur/boats/cc_715.webp',
  'Cap Camarat 715':    '/images/azur/boats/cc_715.webp',
  'leader_805':         '/images/azur/boats/leader_805.webp',
  'Leader 805':         '/images/azur/boats/leader_805.webp',
}

const REPAS_IMAGES: Record<string, string> = {
  bbq:         '/images/azur/repas/bbq.webp',
  burger:      '/images/azur/repas/burger.webp',
  charcuterie: '/images/azur/repas/charcuterie.webp',
  mini_sales:  '/images/azur/repas/mini_sales.webp',
  bento_cake:  '/images/azur/repas/bento_cake.webp',
}

const REPAS_DETAIL: Record<string, string> = {
  bbq:         'Apéritif (chips, olives, tomates, saucisson, fromage, noix) · 2 merguez · 2 cuisses de poulet marinées · Pain · Sauce · Plateau fruits frais · 4 canettes',
  burger:      'Apéritif · Burger (tomates, cornichons, oignons frits, cheddar, salade mozza) · Plateau fruits · 4 canettes',
  charcuterie: 'Plateau charcuterie & fromages · Crackers · Fruits secs · Dessert · Boissons',
  mini_sales:  'Mini quiche · Mini saumon · Croque monsieur · Hot dog · Club poulet · Mini pizza · Wrap poulet — min. 20 pièces',
  bento_cake:  'Gâteau personnalisé · Anniversaire · Surprise · Événement spécial',
}

const INCLUS_ITEMS = [
  { emoji: '🎣', label: 'Skipper pro' },
  { emoji: '⛽', label: 'Carburant' },
  { emoji: '🏄', label: 'Bouées & Paddle' },
  { emoji: '🔫', label: 'Pistolets à eau' },
  { emoji: '🤿', label: 'Masques / Tubas' },
  { emoji: '🍽️', label: 'Vaisselle complète' },
  { emoji: '🔥', label: 'Barbecue à bord' },
  { emoji: '🎵', label: 'Musique embarquée' },
  { emoji: '🃏', label: 'Jeux de cartes' },
  { emoji: '📱', label: 'Coques étanches' },
  { emoji: '🧊', label: 'Glacière' },
  { emoji: '🏖️', label: 'Serviettes' },
  { emoji: '🔋', label: 'Chargeur à bord' },
]

const STEPS = [
  {
    title: 'Pour réserver',
    icon: '📋',
    content: [
      'Choisissez votre bateau',
      'Sélectionnez vos prestations (options, activités, repas, équipements)',
      'Précisez si vous souhaitez un skipper',
      'Contactez-nous sur Instagram ou Snapchat',
    ],
  },
  {
    title: 'Acompte & validation',
    icon: '💳',
    content: [
      "Aucune réservation n'est validée sans le versement d'un acompte de 100€ par équipement",
      '100€ pour le bateau + 100€ par équipement supplémentaire (Jet Ski, Seabob, etc.)',
      'Le repas est à payer en avance pour garantir la meilleure organisation',
    ],
  },
  {
    title: "Conditions d'annulation",
    icon: '📅',
    content: [
      "✅ Annulation jusqu'à 4 jours avant la sortie → Acompte remboursé intégralement ou date décalée sans frais",
      "❌ Annulation moins de 4 jours avant la sortie → L'acompte n'est pas remboursable",
    ],
  },
]

const FEUX_JUILLET = ['4 juillet', '14 juillet', '22 juillet']
const FEUX_AOUT    = ['4 août', '15 août', '24 août']

// ─── Composant ───────────────────────────────────────────────────────────────

export default function NayahBoatDetail({
  provider,
  reviews = [],
}: {
  provider: NayahProvider
  reviews?: Review[]
}) {
  const GOLD      = provider.accent_color ?? '#c9a84c'
  const NAVY      = '#0a1628'
  const GOLD_TEXT = textOn(GOLD)
  const IG_HANDLE = (provider.contact_instagram ?? 'nayah-boat06').replace('@', '')
  const IG_URL    = `https://www.instagram.com/${IG_HANDLE}`

  const BATEAUX        = Array.isArray(provider.bateaux)        ? provider.bateaux as BateauData[] : BATEAUX_DEFAULT
  const FORMULES_REPAS = Array.isArray(provider.formules_repas) ? provider.formules_repas as RepasData[] : REPAS_DEFAULT

  // ── État ──
  const [selectedBateau, setSelectedBateau] = useState<string>(BATEAUX[0]?.id ?? BATEAUX[0]?.nom ?? '')
  const [selectedPack,   setSelectedPack]   = useState<PackKey>('coucher_soleil')
  const [repasQty,       setRepasQty]       = useState<Record<string, number>>({})
  const [repasOn,        setRepasOn]        = useState<Record<string, boolean>>({})
  const [seabobOn,       setSeabobOn]       = useState(false)
  const [jetskiOn,       setJetskiOn]       = useState(false)
  const [jetskiHours,    setJetskiHours]    = useState(1)
  const [showModal,      setShowModal]      = useState(false)
  const [expandedRepas,  setExpandedRepas]  = useState<string | null>(null)

  // ── Calculs ──
  const bateau      = BATEAUX.find(b => (b.id ?? b.nom) === selectedBateau) ?? BATEAUX[0]
  const pack        = PACK_META.find(p => p.key === selectedPack)!
  const prixBateau  = bateau?.tarifs[selectedPack] ?? 0
  const prixSeabob  = seabobOn ? 200 : 0
  const prixJetski  = jetskiOn ? jetskiHours * 150 : 0
  const prixOptions = prixSeabob + prixJetski

  const getQty = (f: RepasData) => repasOn[f.key] ? (repasQty[f.key] ?? f.minimum ?? 1) : 0
  const prixRepas = FORMULES_REPAS.reduce((sum, f) => sum + getQty(f) * f.prix, 0)

  const prixTotal     = prixBateau + prixOptions + prixRepas
  const cautionEquips = (seabobOn ? 100 : 0) + (jetskiOn ? 100 : 0)
  const acompte       = 100 + cautionEquips + prixRepas
  const soldeJourJ    = prixBateau + prixOptions - 100 - cautionEquips

  const addRepas = (f: RepasData) => {
    const min = f.minimum ?? 1
    if (!repasOn[f.key]) {
      setRepasOn(p  => ({ ...p, [f.key]: true }))
      setRepasQty(p => ({ ...p, [f.key]: min }))
    } else {
      setRepasQty(p => ({ ...p, [f.key]: (p[f.key] ?? min) + 1 }))
    }
  }
  const subRepas = (f: RepasData) => {
    const min = f.minimum ?? 1
    const cur = repasQty[f.key] ?? min
    if (cur <= min) setRepasOn(p => ({ ...p, [f.key]: false }))
    else            setRepasQty(p => ({ ...p, [f.key]: cur - 1 }))
  }

  return (
    <main style={{ paddingBottom: '6rem' }}>
      <style>{`
        @keyframes nb-shimmer { 0% { background-position:-200% center } 100% { background-position:200% center } }
        .btn-nayah {
          background: linear-gradient(90deg,${GOLD}99,${GOLD},#ffffff28,${GOLD},${GOLD}99);
          background-size: 300% auto; animation: nb-shimmer 3s linear infinite;
          color:${GOLD_TEXT}; font-family:var(--fe); font-size:18px; font-weight:900;
          font-style:italic; letter-spacing:0.04em; border:none; border-radius:12px;
          padding:1rem 2rem; width:100%; cursor:pointer;
        }
        .btn-nayah:hover { filter:brightness(1.08); }
        .nb-scroll { scrollbar-width:none; }
        .nb-scroll::-webkit-scrollbar { display:none; }
        .nb-inclus { display:grid; grid-template-columns:repeat(4,1fr); gap:0.55rem; }
        @media(max-width:580px){ .nb-inclus { grid-template-columns:repeat(2,1fr); } }
      `}</style>

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <div style={{ position:'relative', height:480, overflow:'hidden' }}>
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80"
          alt="Mer Côte d'Azur"
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:'center 40%' }}
        />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(10,22,40,.35) 0%,rgba(10,22,40,.65) 50%,rgba(10,22,40,.97) 100%)' }} />
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background:`linear-gradient(90deg,transparent,${GOLD},transparent)` }} />

        <Link href="/azur" style={{
          position:'absolute', top:'1.2rem', left:'1.2rem', zIndex:10,
          fontFamily:'var(--fo)', fontSize:12, fontWeight:600, textDecoration:'none',
          padding:'5px 14px', borderRadius:20, letterSpacing:'0.06em',
          background:`rgba(201,168,76,0.12)`, border:`1px solid rgba(201,168,76,0.3)`,
          color:GOLD, backdropFilter:'blur(8px)',
        }}>← Azur</Link>

        <div style={{
          position:'absolute', top:'1.2rem', right:'1.2rem', zIndex:10,
          background:'rgba(0,160,0,0.12)', border:'1px solid rgba(0,200,0,0.35)',
          borderRadius:20, padding:'5px 14px', fontFamily:'var(--fo)', fontSize:11, fontWeight:700,
          color:'#4cde4c', backdropFilter:'blur(8px)', letterSpacing:'0.08em', textTransform:'uppercase',
        }}>☪ Halal</div>

        <div style={{ position:'absolute', bottom:'2.5rem', left:0, right:0, padding:'0 1.4rem' }}>
          <div style={{ display:'flex', gap:'0.6rem', marginBottom:'0.8rem', flexWrap:'wrap' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:`rgba(201,168,76,0.1)`, border:`1px solid rgba(201,168,76,0.25)`, borderRadius:20, padding:'4px 12px', fontFamily:'var(--fo)', fontSize:11, fontWeight:700, color:GOLD, letterSpacing:'0.08em' }}>✦ Vérifié NIKA</div>
            {provider.rating && (
              <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:20, padding:'4px 12px', fontFamily:'var(--fo)', fontSize:11, fontWeight:700, color:'white' }}>
                ⭐ {provider.rating} · {provider.review_count} avis
              </div>
            )}
          </div>
          {provider.location && <div style={{ fontFamily:'var(--fo)', fontSize:12, color:'rgba(255,255,255,0.55)', marginBottom:'0.3rem' }}>📍 {provider.location}</div>}
          <h1 style={{ fontFamily:'var(--fe)', fontSize:'clamp(44px,11vw,80px)', fontWeight:900, fontStyle:'italic', textTransform:'uppercase', color:'white', lineHeight:0.88, margin:'0 0 0.5rem' }}>
            {provider.name}
          </h1>
          <p style={{ fontFamily:'var(--fo)', fontSize:14, color:'rgba(255,255,255,0.75)', margin:'0 0 0.3rem' }}>
            Montez à bord, on s'occupe de tout.
          </p>
          <p style={{ fontFamily:'var(--fo)', fontSize:11, color:`${GOLD}cc`, margin:0, letterSpacing:'0.03em' }}>
            Zéro stress, 100% plaisir · Soleil · Musique · Baignade · Apéro · Souvenirs
          </p>
        </div>
      </div>

      {/* ══ À BORD TOUT EST INCLUS ════════════════════════════════════════ */}
      <section style={{ background:NAVY, padding:'2rem 1.4rem', borderBottom:`1px solid ${GOLD}22` }}>
        <div style={{ maxWidth:720, margin:'0 auto' }}>
          <h2 style={{ fontFamily:'var(--fe)', fontSize:20, fontWeight:700, color:GOLD, margin:'0 0 0.2rem' }}>⚓ À bord, tout est inclus</h2>
          <p style={{ fontFamily:'var(--fo)', fontSize:12, color:'rgba(255,255,255,0.45)', marginBottom:'1.2rem' }}>Venez les mains dans les poches</p>
          <div className="nb-inclus">
            {INCLUS_ITEMS.map(item => (
              <div key={item.label} style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'0.35rem', padding:'0.75rem 0.5rem', textAlign:'center', background:`rgba(201,168,76,0.05)`, border:`1px solid ${GOLD}25`, borderRadius:10 }}>
                <span style={{ fontSize:22 }}>{item.emoji}</span>
                <span style={{ fontFamily:'var(--fo)', fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.7)', lineHeight:1.3 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CONTENU PRINCIPAL ════════════════════════════════════════════ */}
      <div style={{ maxWidth:720, margin:'0 auto', padding:'0 1.2rem' }}>

        {/* ── BATEAUX ── */}
        <section style={{ marginTop:'2.5rem' }}>
          <h2 style={{ fontFamily:'var(--fe)', fontSize:18, fontWeight:500, color:'var(--td)', marginBottom:'1rem' }}>Choisissez votre bateau</h2>
          <div className="g-3">
            {BATEAUX.map(b => {
              const bKey = b.id ?? b.nom
              const sel  = selectedBateau === bKey
              const img  = BATEAU_IMAGES[b.id ?? ''] ?? BATEAU_IMAGES[b.nom] ?? 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=400&q=80'
              const pMin = Math.min(...Object.values(b.tarifs))
              return (
                <button key={bKey} onClick={() => setSelectedBateau(bKey)} style={{
                  position:'relative', height:180, overflow:'hidden', borderRadius:12,
                  cursor:'pointer', padding:0, display:'block', width:'100%',
                  border:`2px solid ${sel ? GOLD : 'transparent'}`,
                  boxShadow: sel ? `0 0 0 3px ${GOLD}40,0 4px 20px rgba(0,0,0,0.4)` : '0 2px 8px rgba(0,0,0,0.3)',
                  transition:'all 0.15s',
                }}>
                  <img src={img} alt={b.nom} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.1) 55%,rgba(0,0,0,0.25) 100%)' }} />
                  {sel && <div style={{ position:'absolute', inset:0, background:`${GOLD}18` }} />}
                  <div style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', borderRadius:20, padding:'3px 9px', fontFamily:'var(--fo)', fontSize:10, fontWeight:700, color:'white' }}>
                    👥 {b.capacite} pers.
                  </div>
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'8px 10px', display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:6 }}>
                    <span style={{ fontFamily:'var(--fo)', fontSize:12, fontWeight:700, color:'white', lineHeight:1.2, textShadow:'0 1px 4px rgba(0,0,0,0.8)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, minWidth:0 }}>{b.nom}</span>
                    <span style={{ fontFamily:'var(--fn)', fontSize:13, color:GOLD, fontWeight:700, textShadow:'0 1px 4px rgba(0,0,0,0.8)', flexShrink:0 }}>dès {pMin}€</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── FORMULES ── */}
        <section style={{ marginTop:'2.5rem' }}>
          <h2 style={{ fontFamily:'var(--fe)', fontSize:18, fontWeight:500, color:'var(--td)', marginBottom:'1rem' }}>Choisissez votre formule</h2>
          <div className="g-3">
            {PACK_META.map(p => {
              const prixP = bateau?.tarifs[p.key] ?? 0
              const sel   = selectedPack === p.key
              return (
                <button key={p.key} onClick={() => setSelectedPack(p.key)} style={{
                  background:p.gradient, border:`2px solid ${sel ? 'rgba(255,255,255,0.9)' : 'transparent'}`,
                  boxShadow: sel ? '0 0 0 4px rgba(255,255,255,0.12)' : 'none',
                  borderRadius:14, padding:'1.1rem 0.8rem', textAlign:'center', cursor:'pointer',
                  minHeight:140, display:'flex', flexDirection:'column', alignItems:'center',
                  justifyContent:'center', gap:5, transition:'all 0.15s', width:'100%',
                }}>
                  <span style={{ fontSize:28 }}>{p.icon}</span>
                  <div style={{ fontFamily:'var(--fe)', fontSize:14, fontWeight:700, color:'white', lineHeight:1.2 }}>{p.name}</div>
                  <div style={{ fontFamily:'var(--fo)', fontSize:11, color:'rgba(255,255,255,0.6)' }}>{p.hours}</div>
                  <div style={{ fontFamily:'var(--fn)', fontSize:22, color:GOLD, fontWeight:700, marginTop:4 }}>{prixP}€</div>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── REPAS ── */}
        <section style={{ marginTop:'2.5rem' }}>
          <h2 style={{ fontFamily:'var(--fe)', fontSize:18, fontWeight:500, color:'var(--td)', marginBottom:'0.3rem' }}>Formules repas</h2>
          <p style={{ fontFamily:'var(--fo)', fontSize:12, color:'var(--td3)', marginBottom:'1rem' }}>Optionnel · Payé séparément en avance</p>
          <div className="nb-scroll" style={{ display:'flex', gap:'0.8rem', overflowX:'auto', paddingBottom:'0.5rem' }}>
            {FORMULES_REPAS.map(f => {
              const qty      = getQty(f)
              const on       = repasOn[f.key] ?? false
              const showCtr  = f.hasCounter !== false
              const img      = REPAS_IMAGES[f.key]
              const detail   = REPAS_DETAIL[f.key]
              const expanded = expandedRepas === f.key
              const isBento  = f.key === 'bento_cake'
              return (
                <div key={f.key} style={{
                  minWidth:165, maxWidth:185, flexShrink:0, borderRadius:14, overflow:'hidden',
                  border:`2px solid ${on ? GOLD : 'transparent'}`,
                  background:f.gradient, display:'flex', flexDirection:'column',
                  transition:'border-color 0.15s',
                  boxShadow: on ? `0 0 0 2px ${GOLD}40` : 'none',
                }}>
                  {img && (
                    <div style={{ height:95, overflow:'hidden', position:'relative', flexShrink:0 }}>
                      <img src={img} alt={f.label} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,transparent 50%,rgba(0,0,0,0.5) 100%)' }} />
                      {isBento && (
                        <div style={{ position:'absolute', top:7, left:7, background:GOLD, color:GOLD_TEXT, fontFamily:'var(--fo)', fontSize:9, fontWeight:700, borderRadius:10, padding:'2px 7px' }}>
                          🎁 Sur commande
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ padding:'0.75rem', display:'flex', flexDirection:'column', gap:5, flex:1 }}>
                    <div style={{ fontFamily:'var(--fo)', fontSize:11, fontWeight:700, color:'white', lineHeight:1.3 }}>{f.emoji} {f.label}</div>
                    <div style={{ fontFamily:'var(--fn)', fontSize:14, color:GOLD }}>
                      {f.prix}€ <span style={{ fontFamily:'var(--fo)', fontSize:9, color:'rgba(255,255,255,0.55)' }}>/{f.unite}</span>
                    </div>
                    {f.minimum && <div style={{ fontFamily:'var(--fo)', fontSize:9, color:'rgba(255,255,255,0.45)' }}>min. {f.minimum} pièces</div>}
                    {detail && (
                      <div>
                        <button onClick={() => setExpandedRepas(expanded ? null : f.key)} style={{ background:'none', border:'none', fontFamily:'var(--fo)', fontSize:9, color:`${GOLD}bb`, cursor:'pointer', padding:0, textAlign:'left' }}>
                          {expanded ? '▲ Masquer' : '▼ Voir le contenu'}
                        </button>
                        {expanded && <p style={{ fontFamily:'var(--fo)', fontSize:9, color:'rgba(255,255,255,0.6)', lineHeight:1.5, margin:'0.3rem 0 0' }}>{detail}</p>}
                      </div>
                    )}
                    <div style={{ marginTop:'auto', paddingTop:'0.4rem', display:'flex', alignItems:'center', justifyContent: showCtr ? 'space-between' : 'center' }}>
                      {showCtr ? (
                        <>
                          <button onClick={() => subRepas(f)} style={{ width:26, height:26, borderRadius:'50%', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', color:'white', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>−</button>
                          <span style={{ fontFamily:'var(--fn)', fontSize:15, color:'white', minWidth:22, textAlign:'center' }}>{qty}</span>
                          <button onClick={() => addRepas(f)} style={{ width:26, height:26, borderRadius:'50%', background:GOLD, border:'none', color:GOLD_TEXT, fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>+</button>
                        </>
                      ) : (
                        <button onClick={() => setRepasOn(p => ({ ...p, bento_cake: !p.bento_cake }))} style={{ padding:'5px 16px', borderRadius:20, background: on ? GOLD : 'rgba(255,255,255,0.1)', border: on ? 'none' : '1px solid rgba(255,255,255,0.3)', color: on ? GOLD_TEXT : 'white', fontFamily:'var(--fo)', fontSize:10, fontWeight:700, cursor:'pointer' }}>
                          {on ? '✓ Ajouté' : 'Ajouter'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── SEABOB + JETSKI ── */}
        <section style={{ marginTop:'2.5rem' }}>
          <h2 style={{ fontFamily:'var(--fe)', fontSize:18, fontWeight:500, color:'var(--td)', marginBottom:'0.3rem' }}>🌊 Sensations fortes — En option</h2>
          <p style={{ fontFamily:'var(--fo)', fontSize:12, color:'var(--td3)', marginBottom:'1rem' }}>Réservez en même temps que votre sortie</p>
          <div className="g-2">
            {/* Seabob */}
            <div style={{ borderRadius:14, overflow:'hidden', background:'var(--bg2)', border:`2px solid ${seabobOn ? GOLD : 'var(--bd)'}`, transition:'border-color 0.15s' }}>
              <div style={{ height:150, overflow:'hidden', position:'relative' }}>
                <img src="/images/azur/options/seabob.webp" alt="Seabob" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,0.55) 0%,transparent 60%)' }} />
                <div style={{ position:'absolute', top:8, right:8, background:GOLD, color:GOLD_TEXT, fontFamily:'var(--fo)', fontSize:9, fontWeight:700, borderRadius:10, padding:'2px 8px' }}>✨ Nouveau</div>
              </div>
              <div style={{ padding:'0.9rem' }}>
                <div style={{ fontFamily:'var(--fo)', fontSize:13, fontWeight:700, color:'var(--td)', marginBottom:3 }}>SEABOB F5S</div>
                <div style={{ fontFamily:'var(--fn)', fontSize:18, color:GOLD, marginBottom:5 }}>200€ <span style={{ fontFamily:'var(--fo)', fontSize:10, color:'var(--td3)' }}>/ journée</span></div>
                <p style={{ fontFamily:'var(--fo)', fontSize:11, color:'var(--td3)', lineHeight:1.55, margin:'0 0 0.6rem' }}>Scooter sous-marin électrique premium. Glissez sous l'eau comme un dauphin.</p>
                {seabobOn && <p style={{ fontFamily:'var(--fo)', fontSize:10, color:GOLD, margin:'0 0 0.6rem' }}>+ 100€ caution équipement</p>}
                <button onClick={() => setSeabobOn(s => !s)} style={{ width:'100%', padding:'8px', borderRadius:8, border: seabobOn ? 'none' : '1px solid var(--bd2)', background: seabobOn ? GOLD : `rgba(201,168,76,0.1)`, color: seabobOn ? GOLD_TEXT : GOLD, fontFamily:'var(--fo)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  {seabobOn ? '✓ Ajouté' : '+ Ajouter'}
                </button>
              </div>
            </div>

            {/* Jet Ski */}
            <div style={{ borderRadius:14, overflow:'hidden', background:'var(--bg2)', border:`2px solid ${jetskiOn ? GOLD : 'var(--bd)'}`, transition:'border-color 0.15s' }}>
              <div style={{ height:150, overflow:'hidden', position:'relative' }}>
                <img src="/images/azur/options/jetski.webp" alt="Jet Ski" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,0.55) 0%,transparent 60%)' }} />
              </div>
              <div style={{ padding:'0.9rem' }}>
                <div style={{ fontFamily:'var(--fo)', fontSize:13, fontWeight:700, color:'var(--td)', marginBottom:3 }}>JET SKI</div>
                <div style={{ fontFamily:'var(--fn)', fontSize:18, color:GOLD, marginBottom:5 }}>150€ <span style={{ fontFamily:'var(--fo)', fontSize:10, color:'var(--td3)' }}>/ heure</span></div>
                <p style={{ fontFamily:'var(--fo)', fontSize:11, color:'var(--td3)', lineHeight:1.55, margin:'0 0 0.6rem' }}>Sensations garanties sur la Méditerranée. Permis non requis jusqu'à certaines puissances.</p>
                {jetskiOn && (
                  <div style={{ marginBottom:'0.6rem' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.35rem' }}>
                      <button onClick={() => setJetskiHours(h => Math.max(1, h - 1))} style={{ width:28, height:28, borderRadius:'50%', background:'var(--bg3)', border:'1px solid var(--bd2)', color:'var(--td)', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>−</button>
                      <span style={{ fontFamily:'var(--fn)', fontSize:16, color:'var(--td)', minWidth:30, textAlign:'center' }}>{jetskiHours}h</span>
                      <button onClick={() => setJetskiHours(h => Math.min(4, h + 1))} style={{ width:28, height:28, borderRadius:'50%', background:GOLD, border:'none', color:GOLD_TEXT, fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>+</button>
                      <span style={{ fontFamily:'var(--fn)', fontSize:13, color:GOLD }}>{jetskiHours * 150}€</span>
                    </div>
                    <p style={{ fontFamily:'var(--fo)', fontSize:10, color:GOLD, margin:0 }}>+ 100€ caution équipement</p>
                  </div>
                )}
                <button onClick={() => setJetskiOn(s => !s)} style={{ width:'100%', padding:'8px', borderRadius:8, border: jetskiOn ? 'none' : '1px solid var(--bd2)', background: jetskiOn ? GOLD : `rgba(201,168,76,0.1)`, color: jetskiOn ? GOLD_TEXT : GOLD, fontFamily:'var(--fo)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  {jetskiOn ? '✓ Ajouté' : '+ Ajouter'}
                </button>
              </div>
            </div>
          </div>
          <p style={{ fontFamily:'var(--fo)', fontSize:11, color:'var(--td3)', marginTop:'0.9rem', lineHeight:1.6, background:'var(--bg2)', border:'1px solid var(--bd)', borderRadius:8, padding:'0.7rem 0.9rem' }}>
            ⚠️ Caution équipement : 100€ par équipement supplémentaire (Seabob ou Jet Ski) — inclus dans l'acompte
          </p>
        </section>

        {/* ── FEUX D'ARTIFICE 2026 ── */}
        <section style={{ marginTop:'2.5rem', borderRadius:16, overflow:'hidden', position:'relative' }}>
          <img src="https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?w=800&q=80" alt="Feux d'artifice" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:0.3 }} />
          <div style={{ position:'absolute', inset:0, background:`linear-gradient(135deg,${NAVY}ee,#1a0a00ee)` }} />
          <div style={{ position:'relative', padding:'1.6rem 1.4rem' }}>
            <h2 style={{ fontFamily:'var(--fe)', fontSize:20, fontWeight:700, color:GOLD, margin:'0 0 0.4rem' }}>🎆 Feux d'artifice 2026</h2>
            <p style={{ fontFamily:'var(--fo)', fontSize:12, color:'rgba(255,255,255,0.5)', margin:'0 0 0.25rem' }}>📍 Cannes — Baie de Cannes · ⏰ Départ 20h00 depuis Cannes Marina</p>
            <p style={{ fontFamily:'var(--fo)', fontSize:11, color:`${GOLD}99`, margin:'0 0 1.4rem' }}>Skipper + Carburant inclus · Places limitées</p>
            <div className="g-2">
              {[{ title:'Juillet 2026', dates:FEUX_JUILLET }, { title:'Août 2026', dates:FEUX_AOUT }].map(col => (
                <div key={col.title}>
                  <div style={{ fontFamily:'var(--fe)', fontSize:13, fontWeight:700, color:GOLD, letterSpacing:'0.08em', marginBottom:'0.7rem', textTransform:'uppercase' }}>{col.title}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                    {col.dates.map(date => (
                      <a key={date} href={IG_URL} target="_blank" rel="noopener noreferrer" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.05)', border:`1px solid ${GOLD}30`, borderRadius:10, padding:'0.6rem 0.8rem', textDecoration:'none' }}>
                        <span style={{ fontFamily:'var(--fo)', fontSize:12, fontWeight:700, color:'white' }}>{date}</span>
                        <span style={{ fontFamily:'var(--fo)', fontSize:9, color:GOLD, fontWeight:600 }}>Je suis intéressé(e) →</span>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontFamily:'var(--fo)', fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:'1rem', textAlign:'center' }}>🔒 Prix sur demande · Contactez-nous sur Instagram</p>
          </div>
        </section>

        {/* ── CONDITIONS 3 ÉTAPES ── */}
        <section style={{ marginTop:'2.5rem' }}>
          <h2 style={{ fontFamily:'var(--fe)', fontSize:18, fontWeight:500, color:'var(--td)', marginBottom:'1.5rem' }}>Comment réserver</h2>
          <div style={{ position:'relative' }}>
            <div style={{ position:'absolute', left:17, top:36, bottom:36, width:2, background:`linear-gradient(${GOLD}88,transparent)`, zIndex:0 }} />
            {STEPS.map((step, i) => (
              <div key={step.title} style={{ display:'flex', gap:'1rem', marginBottom: i < STEPS.length - 1 ? '1.2rem' : 0, position:'relative', zIndex:1 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:GOLD, color:GOLD_TEXT, fontFamily:'var(--fe)', fontSize:16, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i + 1}</div>
                <div style={{ background:'var(--bg2)', border:'1px solid var(--bd)', borderRadius:12, padding:'0.9rem 1rem', flex:1 }}>
                  <div style={{ fontFamily:'var(--fo)', fontSize:12, fontWeight:700, color:'var(--td)', marginBottom:'0.5rem' }}>{step.icon} {step.title}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.35rem' }}>
                    {step.content.map((line, j) => (
                      <p key={`step-${i}-${j}`} style={{ fontFamily:'var(--fo)', fontSize:11, color:'var(--td3)', lineHeight:1.6, margin:0 }}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── RÉCAP DYNAMIQUE ── */}
        <section style={{ marginTop:'2.5rem', background:'var(--bg2)', border:`1px solid ${GOLD}33`, borderRadius:16, padding:'1.5rem' }}>
          <h2 style={{ fontFamily:'var(--fe)', fontSize:18, fontWeight:500, color:'var(--td)', marginBottom:'1rem' }}>Récapitulatif</h2>
          <div style={{ display:'flex', flexDirection:'column' }}>
            {[
              { label:'Prix bateau', sub:`${bateau?.nom} — ${pack?.name} (${pack?.hours})`, value:`${prixBateau}€` },
              ...(prixOptions > 0 ? [{ label:'Options', sub:[seabobOn ? 'Seabob 200€' : '', jetskiOn ? `Jet Ski ${jetskiHours}h × 150€` : ''].filter(Boolean).join(' · '), value:`${prixOptions}€` }] : []),
              ...(prixRepas > 0 ? [{ label:'Repas', sub:'Payé séparément en avance', value:`${fmt(prixRepas)}€` }] : []),
            ].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'0.55rem 0', borderBottom:'1px solid var(--bd)' }}>
                <div>
                  <div style={{ fontFamily:'var(--fo)', fontSize:13, color:'var(--td3)' }}>{r.label}</div>
                  <div style={{ fontFamily:'var(--fo)', fontSize:10, color:'var(--td3)', opacity:0.6, marginTop:1 }}>{r.sub}</div>
                </div>
                <span style={{ fontFamily:'var(--fn)', fontSize:14, color:'var(--td)', fontWeight:500, flexShrink:0, marginLeft:'0.5rem' }}>{r.value}</span>
              </div>
            ))}

            <div style={{ borderTop:`1px solid ${GOLD}44`, margin:'0.7rem 0 0.3rem' }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.3rem 0' }}>
              <span style={{ fontFamily:'var(--fo)', fontSize:13, color:'var(--td)' }}>Total</span>
              <span style={{ fontFamily:'var(--fn)', fontSize:20, color:'var(--td)', fontWeight:700 }}>{fmt(prixTotal)}€</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:`${GOLD}0d`, borderRadius:8, padding:'0.55rem 0.7rem', margin:'0.3rem 0' }}>
              <div>
                <div style={{ fontFamily:'var(--fo)', fontSize:12, color:'var(--td)', fontWeight:700 }}>Acompte dû aujourd'hui</div>
                <div style={{ fontFamily:'var(--fo)', fontSize:10, color:'var(--td3)', marginTop:1 }}>
                  100€ réservation{cautionEquips > 0 ? ` + ${cautionEquips}€ caution(s)` : ''}{prixRepas > 0 ? ` + ${fmt(prixRepas)}€ repas` : ''}
                </div>
              </div>
              <span style={{ fontFamily:'var(--fn)', fontSize:22, color:GOLD, fontWeight:700, flexShrink:0, marginLeft:'0.5rem' }}>{fmt(acompte)}€</span>
            </div>
            {soldeJourJ > 0 && (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.3rem 0' }}>
                <span style={{ fontFamily:'var(--fo)', fontSize:12, color:'var(--td3)' }}>Solde le jour J <span style={{ fontSize:10 }}>(hors repas)</span></span>
                <span style={{ fontFamily:'var(--fn)', fontSize:16, color:'var(--td)' }}>{soldeJourJ}€</span>
              </div>
            )}
          </div>
          <p style={{ fontFamily:'var(--fo)', fontSize:11, color:'var(--td3)', marginTop:'0.9rem', lineHeight:1.65 }}>
            💡 Le solde bateau est réglé le jour J. Les repas sont payés séparément en avance.
          </p>
          <button className="btn-nayah" onClick={() => setShowModal(true)} style={{ marginTop:'1.2rem' }}>
            RÉSERVER — Acompte {fmt(acompte)}€
          </button>
        </section>

        {/* ── AVIS ── */}
        {reviews.length > 0 && (
          <section style={{ marginTop:'2rem' }}>
            <h2 style={{ fontFamily:'var(--fe)', fontSize:18, fontWeight:500, color:'var(--td)', marginBottom:'1rem' }}>Avis clients</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.8rem' }}>
              {reviews.map((r, i) => {
                const name  = r.author_name ?? r.reviewer_name ?? ''
                const pack  = r.pack_name ?? r.pack_used ?? ''
                const ini   = initials(name)
                const color = r.initials_color || GOLD
                return (
                  <div key={r.id ?? i} style={{ background:'var(--bg2)', border:'1px solid var(--bd)', borderRadius:12, padding:'1rem 1.2rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.6rem' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                        <div style={{ width:38, height:38, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--fo)', fontSize:13, fontWeight:700, color:textOn(color), flexShrink:0 }}>
                          {ini || '?'}
                        </div>
                        <div>
                          <div style={{ fontFamily:'var(--fo)', fontSize:13, fontWeight:600, color:'var(--td)' }}>{name || 'Anonyme'}</div>
                          {pack && <span style={{ fontFamily:'var(--fo)', fontSize:10, color:GOLD, background:`${GOLD}1a`, border:`1px solid ${GOLD}40`, borderRadius:10, padding:'2px 7px', display:'inline-block', marginTop:2 }}>{pack}</span>}
                        </div>
                      </div>
                      <span style={{ fontSize:13, letterSpacing:2, flexShrink:0 }}>
                        {Array.from({ length:5 }).map((_,j) => (
                          <span key={`star-${j}`} style={{ color: j < r.rating ? '#f59e0b' : 'var(--td3)' }}>★</span>
                        ))}
                      </span>
                    </div>
                    {r.comment && <p style={{ fontFamily:'var(--fo)', fontSize:13, color:'var(--td2)', lineHeight:1.6, margin:'0 0 0.4rem' }}>{r.comment}</p>}
                    <div style={{ fontFamily:'var(--fo)', fontSize:11, color:'var(--td3)' }}>{formatDate(r.date_review)}</div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── CONTACT ── */}
        <section style={{ marginTop:'1.5rem', display:'flex', gap:'0.9rem' }}>
          {provider.contact_instagram && (
            <a href={IG_URL} target="_blank" rel="noopener noreferrer" style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', background:'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)', borderRadius:12, padding:'0.9rem 0.5rem', fontFamily:'var(--fo)', fontSize:13, fontWeight:700, color:'white', textDecoration:'none' }}>
              📸 {provider.contact_instagram}
            </a>
          )}
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', background:'linear-gradient(135deg,#f7f700,#f5a623)', borderRadius:12, padding:'0.9rem 0.5rem', fontFamily:'var(--fo)', fontSize:13, fontWeight:700, color:'#1a1600' }}>
            👻 {provider.contact_snapchat ?? 'NAYAH-BOAT06'}
          </div>
        </section>
      </div>

      {/* ══ MODAL ════════════════════════════════════════════════════════ */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'flex-end', justifyContent:'center', padding:'1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg2)', border:`1px solid ${GOLD}44`, borderRadius:'20px 20px 16px 16px', padding:'2rem 1.5rem', width:'100%', maxWidth:480 }}>
            <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
              <div style={{ fontSize:40, marginBottom:'0.4rem' }}>⚓</div>
              <h3 style={{ fontFamily:'var(--fe)', fontSize:22, fontWeight:700, color:'var(--td)', margin:0 }}>Demande de réservation</h3>
            </div>
            {[
              { label:'Bateau',           value: bateau?.nom ?? '—' },
              { label:'Formule',          value:`${pack?.name} · ${pack?.hours}` },
              { label:'Capacité max',     value:`${bateau?.capacite ?? '—'} personnes` },
              { label:'Prix bateau',      value:`${prixBateau}€` },
              ...(prixOptions > 0 ? [{ label:'Options', value:`${prixOptions}€` }] : []),
              ...(prixRepas > 0 ? [{ label:'Repas (en avance)', value:`${fmt(prixRepas)}€` }] : []),
              { label:'Total',            value:`${fmt(prixTotal)}€` },
              { label:'Acompte à verser', value:`${fmt(acompte)}€`, hi:true },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'0.5rem 0', borderBottom:'1px solid var(--bd)' }}>
                <span style={{ fontFamily:'var(--fo)', fontSize:13, color:'var(--td3)' }}>{r.label}</span>
                <span style={{ fontFamily:'var(--fn)', fontSize:r.hi ? 19 : 14, color:r.hi ? GOLD : 'var(--td)', fontWeight:r.hi ? 700 : 400 }}>{r.value}</span>
              </div>
            ))}
            <p style={{ fontFamily:'var(--fo)', fontSize:12, color:'var(--td3)', margin:'1rem 0', lineHeight:1.65, textAlign:'center' }}>
              Contactez-nous sur Instagram pour finaliser et procéder au paiement de l'acompte.
            </p>
            <a href={IG_URL} target="_blank" rel="noopener noreferrer" style={{ display:'block', textAlign:'center', background:'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)', borderRadius:12, padding:'0.9rem', fontFamily:'var(--fo)', fontSize:14, fontWeight:700, color:'white', textDecoration:'none', marginBottom:'0.8rem' }}>
              📸 Réserver sur Instagram — {provider.contact_instagram ?? '@nayah-boat06'}
            </a>
            <button onClick={() => setShowModal(false)} style={{ width:'100%', background:'none', border:'1px solid var(--bd)', borderRadius:12, padding:'0.8rem', fontFamily:'var(--fo)', fontSize:14, color:'var(--td3)', cursor:'pointer' }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
