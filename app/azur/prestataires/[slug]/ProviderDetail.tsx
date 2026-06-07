'use client'
// app/azur/prestataires/[slug]/ProviderDetail.tsx

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Pack {
  key?: string
  name: string
  price: number
  original_price?: number
  hours?: string
  destination?: string
  inclus?: string[]
}

export interface Option {
  key: string
  label: string
  description?: string
  price: number | null
}

export interface Review {
  id?: string
  provider_slug?: string
  author_name: string
  rating: number
  comment?: string
  pack_name?: string
  date_review?: string
  initials_color?: string
}

interface Bateau {
  nom: string
  capacite: number
  tarifs: { coucher_soleil: number; demi_journee: number; journee: number }
}

interface FormuleRepas {
  key: string
  label: string
  prix: number
  unite: 'personne' | 'pièce' | 'prestation'
  minimum?: number
  description?: string
}

interface FeuxArtifice {
  description: string
  dates_juillet: string[]
  dates_aout: string[]
  prix: string
}

interface Conditions {
  acompte_bateau: number
  acompte_equipement: number
  repas_paiement: string
  annulation_libre: string
  annulation_tardive: string
}

export interface Provider {
  slug: string
  name: string
  category?: string
  tagline?: string
  description?: string
  location?: string
  rating?: number
  review_count?: number
  verified?: boolean
  accent_color?: string
  contact_whatsapp?: string
  contact_instagram?: string
  contact_snapchat?: string
  label_halal?: boolean
  photos?: string[]
  packs?: Pack[]
  options?: Option[]
  inclus_default?: string[]
  promo_social?: string
  boat_model?: string
  capacity_max?: number
  hero_image?: string
  bateaux?: Bateau[]
  formules_repas?: FormuleRepas[]
  feux_artifice?: FeuxArtifice
  conditions?: Conditions
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return 0.299 * r + 0.587 * g + 0.114 * b
}
function accentTextColor(hex: string): string { return luminance(hex) > 0.5 ? '#0a0800' : '#ffffff' }
function formatDate(d?: string): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}
function getInitials(name?: string): string {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function getPackKey(p: Pack): string {
  if (p.key) return p.key
  const n = p.name.toLowerCase()
    .replace(/[àâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[ïî]/g, 'i')
    .replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/\s+/g, '_').replace(/[^a-z_]/g, '')
  if (n.includes('journee') && !n.includes('demi')) return 'journee'
  if (n.includes('afterwork'))                       return 'afterwork'
  if (n.includes('feu') || n.includes('artifice'))   return 'feu_artifices'
  if (n.includes('coucher') || n.includes('soleil')) return 'coucher_soleil'
  if (n.includes('demi'))                            return 'demi_journee'
  return n
}

// ─── Image maps ───────────────────────────────────────────────────────────────

const HERO_IMAGES: Record<string, string> = {
  'rentboat-06': 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1600&q=80',
  'nayah-boat':  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80',
}

const PACK_IMAGES: Record<string, string> = {
  'journee':        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
  'afterwork':      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  'feu_artifices':  'https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?w=800&q=80',
  'coucher_soleil': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  'demi_journee':   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
  'journee_nayah':  'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
}

const PACK_OVERLAYS: Record<string, string> = {
  'journee':        'linear-gradient(135deg,rgba(14,165,233,0.7),rgba(3,105,161,0.8))',
  'afterwork':      'linear-gradient(135deg,rgba(245,158,11,0.65),rgba(124,58,237,0.72))',
  'feu_artifices':  'linear-gradient(135deg,rgba(28,10,0,0.72),rgba(124,45,18,0.78))',
  'coucher_soleil': 'linear-gradient(135deg,rgba(245,158,11,0.65),rgba(180,83,9,0.75))',
  'demi_journee':   'linear-gradient(135deg,rgba(14,165,233,0.6),rgba(3,105,161,0.7))',
}

const OPTION_IMAGES: Record<string, string> = {
  'bbq':        'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80',
  'seabob':     'https://images.unsplash.com/photo-1559825481-12a05cc00344?w=400&q=80',
  'jetski':     'https://images.unsplash.com/photo-1516815231560-8f41ec531527?w=400&q=80',
  'plateforme': 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80',
  'piscine':    'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&q=80',
  'fruits':     'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&q=80',
}

// ─── SVG Icônes inclus ────────────────────────────────────────────────────────

const INCLUS_ICONS: Record<string, string> = {
  'Skipper': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><path d="M8 4h8"/></svg>',
  'Essence': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22V8l6-6h6l2 2v2h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2v7"/><rect x="3" y="10" width="12" height="12" rx="1"/><path d="M9 10v4"/></svg>',
  'Carburant': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22V8l6-6h6l2 2v2h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2v7"/><rect x="3" y="10" width="12" height="12" rx="1"/></svg>',
  'Sono': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',
  'Musique embarquée': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
  'Frigo': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="9" y1="6" x2="9" y2="8"/><line x1="9" y1="14" x2="9" y2="18"/></svg>',
  'Masques': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4z"/><path d="M10 16v2"/><path d="M14 16v2"/></svg>',
  'Masques/Tubas/Palmes': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4z"/></svg>',
  'Paddle': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="22" x2="12" y2="2"/><path d="M8 6c0-2.2 1.8-4 4-4s4 1.8 4 4v6H8V6z"/></svg>',
  'Bouées & Paddle': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="3" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="21"/></svg>',
  'Vaisselle complète': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2l1.5 15h15L21 2"/><path d="M3 22h18"/></svg>',
  'Barbecue à bord': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2c0 2.5 4 2.5 4 5s-4 2.5-4 5"/><path d="M16 2c0 2.5-4 2.5-4 5s4 2.5 4 5"/><ellipse cx="12" cy="16" rx="8" ry="3"/><path d="M6 19l-2 3"/><path d="M18 19l2 3"/><line x1="12" y1="19" x2="12" y2="22"/></svg>',
  'Jeux de cartes': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="12" height="16" rx="2"/><rect x="10" y="4" width="12" height="16" rx="2"/></svg>',
  'Coques étanches': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"/><path d="M9 7h6"/><path d="M9 11h6"/></svg>',
  'Glacière': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>',
  'Serviettes': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16"/><path d="M4 15h16"/><path d="M10 9h4"/></svg>',
  'Chargeur à bord': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
  'Pistolets à eau': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 10H7a4 4 0 1 0 0 8h12"/><path d="M19 6v12"/><path d="M22 8l-3-2-3 2"/></svg>',
}

const DEFAULT_ICON = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l2 2"/></svg>'

const NIKA_MOCK_BALANCE = 1200

// ─── BookingModal ─────────────────────────────────────────────────────────────

function BookingModal({
  provider, pack, selectedOptions, options,
  paymentMethod, total, acompte, accent, onClose,
}: {
  provider: Provider
  pack: Pack | undefined
  selectedOptions: Set<string>
  options: Option[]
  paymentMethod: 'card' | 'cash' | 'nika_token'
  total: number
  acompte: number
  accent: string
  onClose: () => void
}) {
  const [bookingDate, setBookingDate] = useState('')
  const [persons, setPersons]         = useState(2)
  const [status, setStatus]           = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const nikaDiscount = paymentMethod === 'nika_token' ? Math.round(total / 0.95 * 0.05) : 0
  const today = new Date().toISOString().split('T')[0]
  const txtA = accentTextColor(accent)

  const handleConfirm = useCallback(async () => {
    if (!bookingDate) return
    setStatus('loading')
    const supabase = createClient()
    if (!supabase) { setStatus('error'); return }
    const { error } = await supabase.from('azur_bookings').insert({
      provider_slug:  provider.slug,
      pack_name:      pack?.name,
      options:        options.filter(o => selectedOptions.has(o.key)).map(o => ({ key: o.key, label: o.label, price: o.price })),
      total, acompte, payment_method: paymentMethod,
      date: bookingDate, persons, status: 'pending',
    })
    setStatus(error ? 'error' : 'success')
  }, [bookingDate, persons, provider.slug, pack, options, selectedOptions, total, acompte, paymentMethod])

  const btnActive = !!bookingDate && status !== 'loading'

  return (
    <div className="riv-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="riv-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 22, fontStyle: 'italic', color: 'var(--td)', margin: 0 }}>
            Réserver — {pack?.name}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--td3)', fontSize: 22, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>✕</button>
        </div>

        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: 56, marginBottom: '1rem' }}>✅</div>
            <h3 style={{ fontFamily: 'var(--fe)', fontSize: 20, fontStyle: 'italic', color: 'var(--teal)', marginBottom: '0.6rem' }}>Demande envoyée !</h3>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.65 }}>
              {provider.name} vous contactera sous 24h pour confirmer et procéder au règlement de l&apos;acompte de{' '}
              <strong style={{ color: accent }}>{acompte}€</strong>.
            </p>
            <button onClick={onClose} style={{ marginTop: '1.5rem', padding: '10px 28px', borderRadius: 8, background: accent, color: txtA, border: 'none', fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Fermer</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--td3)', display: 'block', marginBottom: 8 }}>Date de sortie *</label>
              <input type="date" min={today} value={bookingDate} onChange={e => setBookingDate(e.target.value)} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--bd2)', borderRadius: 8, padding: '10px 14px', color: 'var(--td)', fontFamily: 'var(--fo)', fontSize: 14, outline: 'none' }} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--td3)', display: 'block', marginBottom: 8 }}>
                Nombre de personnes : <strong style={{ color: 'var(--td)', fontWeight: 700 }}>{persons}</strong>
              </label>
              <input type="range" min={1} max={provider.capacity_max || 10} value={persons} onChange={e => setPersons(parseInt(e.target.value))} style={{ width: '100%', accentColor: accent }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: 4 }}>
                <span>1 personne</span><span>{provider.capacity_max || 10} max</span>
              </div>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '1rem 1.1rem', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--fo)', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--td2)' }}>{pack?.name}</span>
                <span style={{ color: 'var(--td)' }}>{pack?.price}€</span>
              </div>
              {options.filter(o => selectedOptions.has(o.key)).map(o => (
                <div key={o.key} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--fo)', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: 'var(--td2)' }}>{o.label}</span>
                  <span style={{ color: 'var(--td)' }}>{o.price !== null ? `+${o.price}€` : '—'}</span>
                </div>
              ))}
              {nikaDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--fo)', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: 'var(--amber)' }}>🪙 NIKA Token (−5%)</span>
                  <span style={{ color: 'var(--amber)' }}>−{nikaDiscount}€</span>
                </div>
              )}
              <div style={{ borderTop: '1px solid var(--bd)', paddingTop: 8, marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: 'var(--td)' }}>Total</span>
                  <span style={{ fontFamily: 'var(--fn)', fontSize: 24, color: accent }}>{total}€</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>Acompte à régler (30%)</span>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: accent }}>{acompte}€</span>
                </div>
              </div>
            </div>
            {status === 'error' && (
              <div style={{ background: 'rgba(212,75,36,0.1)', border: '1px solid rgba(212,75,36,0.25)', borderRadius: 8, padding: '0.8rem 1rem', marginBottom: '1rem', fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--coral)' }}>
                Une erreur est survenue. Contactez le prestataire directement via WhatsApp.
              </div>
            )}
            <button
              onClick={handleConfirm}
              disabled={!btnActive}
              style={{
                width: '100%', padding: '14px', borderRadius: 10,
                background: btnActive ? `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)` : 'var(--bg3)',
                color: btnActive ? txtA : 'var(--td3)',
                fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 900, fontStyle: 'italic',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                border: 'none', cursor: btnActive ? 'pointer' : 'default',
                opacity: status === 'loading' ? 0.7 : 1, transition: 'opacity 0.2s',
              }}
            >
              {status === 'loading' ? 'Envoi en cours...' : `Confirmer & payer l'acompte — ${acompte}€`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function ProviderDetail({
  provider,
  reviews = [],
}: {
  provider: Provider
  reviews?: Review[]
}) {
  const packs   = provider.packs   || []
  const options = provider.options || []
  const inclus  = provider.inclus_default || []
  const accent  = provider.accent_color || '#0ea5e9'
  const txtA    = accentTextColor(accent)
  const accentRgb = accent === '#c9a84c' ? '201,168,76' : '14,165,233'

  const heroUrl = provider.hero_image || HERO_IMAGES[provider.slug] || HERO_IMAGES['rentboat-06']

  const [selectedPack,    setSelectedPack]    = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set())
  const [paymentMethod,   setPaymentMethod]   = useState<'card' | 'cash' | 'nika_token'>('card')
  const [showModal,       setShowModal]       = useState(false)

  const pack = packs[selectedPack]

  const optionsTotal = options.filter(o => selectedOptions.has(o.key) && o.price !== null).reduce((sum, o) => sum + (o.price || 0), 0)
  const baseTotal    = (pack?.price || 0) + optionsTotal
  const nikaDiscount = paymentMethod === 'nika_token' ? Math.round(baseTotal * 0.05) : 0
  const total        = baseTotal - nikaDiscount
  const acompte      = Math.round(total * 0.3)

  const toggleOption = (key: string) => {
    setSelectedOptions(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const galleryPhotos = (provider.photos?.length ?? 0) > 1 ? provider.photos!.slice(1) : []

  const sectionTitle = (text: string) => (
    <h2 style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', fontWeight: 500, color: 'var(--td)', margin: '0 0 1rem' }}>
      {text}
    </h2>
  )

  const section = (children: React.ReactNode, style?: React.CSSProperties) => (
    <section style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 16, padding: '1.4rem 1.5rem', marginBottom: '1.4rem', ...style }}>
      {children}
    </section>
  )

  return (
    <main style={{ paddingBottom: '6rem' }}>
      <style>{`
        @keyframes az-shimmer { 0%,100%{opacity:1} 50%{opacity:0.85} }
        .btn-reserve-accent {
          background: linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%);
          color: ${txtA};
          width: 100%; padding: 15px 20px; border-radius: 10px;
          font-family: var(--fe); font-size: 16px; font-weight: 900;
          font-style: italic; text-transform: uppercase; letter-spacing: 0.06em;
          border: none; cursor: pointer;
          animation: az-shimmer 2.5s ease-in-out infinite;
          transition: filter 0.2s;
        }
        .btn-reserve-accent:hover { filter: brightness(1.08); }
        .btn-reserve-accent:disabled {
          background: var(--bg3); color: var(--td3);
          animation: none; cursor: default;
        }
        @media (min-width: 768px) { .riv-sticky-bar { display: none !important; } }
      `}</style>

      {/* ══ HERO FULL BLEED ══════════════════════════════════════════════════ */}
      <div style={{ position: 'relative', height: 420, overflow: 'hidden', marginBottom: '1rem' }}>
        {/* Photo */}
        <img
          src={heroUrl}
          alt={provider.name}
          referrerPolicy="no-referrer"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', position: 'absolute', inset: '0' }}
        />
        {/* Overlay gradient */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 30%, rgba(10,14,26,0.82) 70%, #0a0e1a 100%)' }} />

        {/* Top-left : retour + vérifié */}
        <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8 }}>
          <Link href="/azur" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '6px 14px', fontFamily: 'var(--fo)', fontSize: 11, color: '#fff', textDecoration: 'none' }}>
            ← Azur
          </Link>
          {provider.verified && (
            <span style={{ background: 'rgba(16,185,129,0.2)', backdropFilter: 'blur(6px)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 20, padding: '6px 12px', fontFamily: 'var(--fo)', fontSize: 11, color: '#34d399', fontWeight: 700 }}>
              ✓ Vérifié NIKA
            </span>
          )}
        </div>

        {/* Top-right : capacité + modèle + halal */}
        <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          {provider.capacity_max && (
            <span style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 12px', fontFamily: 'var(--fo)', fontSize: 12, color: '#fff', fontWeight: 600 }}>
              👥 {provider.capacity_max} pers. max
            </span>
          )}
          {provider.boat_model && (
            <span style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 12px', fontFamily: 'var(--fo)', fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>
              ⛵ {provider.boat_model}
            </span>
          )}
          {provider.label_halal && (
            <span style={{ background: 'rgba(34,197,94,0.25)', backdropFilter: 'blur(6px)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: 20, padding: '4px 12px', fontFamily: 'var(--fo)', fontSize: 11, color: '#4ade80', fontWeight: 700 }}>
              ✦ HALAL
            </span>
          )}
        </div>

        {/* Bottom : rating + location + titre + tagline */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'clamp(1.2rem,3vw,1.8rem) clamp(1.2rem,4vw,2rem)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            {provider.rating != null && (
              <span style={{ fontFamily: 'var(--fo)', fontSize: 13, color: '#facc15', fontWeight: 600 }}>
                ★ {provider.rating}
                <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}> ({provider.review_count} avis)</span>
              </span>
            )}
            {provider.location && (
              <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                📍 {provider.location}
              </span>
            )}
          </div>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px,7vw,56px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#fff', lineHeight: 0.9, marginBottom: '0.5rem', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
            {provider.name}
          </h1>
          {provider.tagline && (
            <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic', margin: 0 }}>
              {provider.tagline}
            </p>
          )}
        </div>
      </div>

      {/* ══ CONTENU CONTRAINT ════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 1.2rem' }}>

        {/* ══ À BORD, TOUT EST INCLUS ══════════════════════════════════════ */}
        {inclus.length > 0 && (
          <section style={{ background: 'var(--bg2)', border: `1px solid rgba(${accentRgb},0.2)`, borderRadius: 16, padding: '1.2rem 1.4rem', marginBottom: '1.4rem' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 16, fontStyle: 'italic', fontWeight: 700, color: 'var(--td)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              ⚓ À bord, tout est inclus
              <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 400, color: 'var(--td3)', fontStyle: 'normal' }}>Venez les mains dans les poches</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.8rem' }}>
              {inclus.map(item => (
                <div key={item} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 6px', borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1 }} dangerouslySetInnerHTML={{ __html: INCLUS_ICONS[item] || DEFAULT_ICON }} />
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', textAlign: 'center', lineHeight: 1.3 }}>{item}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ══ GALERIE ══════════════════════════════════════════════════════ */}
        {galleryPhotos.length > 0 && (
          <div className="riv-gallery" style={{ marginBottom: '1.4rem' }}>
            {galleryPhotos.map((url, i) => (
              <div key={i} style={{ flexShrink: 0, width: 280, height: 200, borderRadius: 12, overflow: 'hidden', scrollSnapAlign: 'start', position: 'relative', background: 'linear-gradient(135deg,#030C1A 0%,#0a2a4a 100%)' }}>
                <img src={url} alt={`${provider.name} ${i + 2}`} referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            ))}
          </div>
        )}

        {/* ══ FORMULES ═════════════════════════════════════════════════════ */}
        {packs.length > 0 && (
          <section style={{ marginBottom: '1.4rem' }}>
            {sectionTitle('Choisir une formule')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {packs.map((p, i) => {
                const pKey  = getPackKey(p)
                const isSel = selectedPack === i
                const imgSrc   = PACK_IMAGES[pKey] || PACK_IMAGES['journee']
                const overlay  = PACK_OVERLAYS[pKey] || 'linear-gradient(135deg,rgba(14,165,233,0.65),rgba(3,105,161,0.75))'
                return (
                  <button key={p.name} onClick={() => setSelectedPack(i)} style={{
                    position: 'relative', height: 190, borderRadius: 16, overflow: 'hidden',
                    border: isSel ? `2px solid ${accent}` : '2px solid transparent',
                    cursor: 'pointer', textAlign: 'left', padding: 0, background: '#0a0e1a',
                    transition: 'border-color 0.2s',
                    boxShadow: isSel ? `0 0 20px ${accent}44` : 'none',
                  }}>
                    {/* Image fond */}
                    <img src={imgSrc} alt={p.name} style={{ position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover' }} />
                    {/* Overlay coloré */}
                    <div style={{ position: 'absolute', inset: 0, background: overlay }} />
                    {/* Heure — haut gauche */}
                    {p.hours && (
                      <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '3px 10px', fontFamily: 'var(--fo)', fontSize: 11, color: '#fff' }}>
                        🕐 {p.hours}
                      </div>
                    )}
                    {/* Destination — haut droit */}
                    {p.destination && (
                      <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '3px 10px', fontFamily: 'var(--fo)', fontSize: 11, color: '#fff', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        📍 {p.destination}
                      </div>
                    )}
                    {/* Checkmark sélectionné — haut centre */}
                    {isSel && (
                      <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', width: 24, height: 24, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: txtA, fontWeight: 700 }}>✓</div>
                    )}
                    {/* Bas : titre + prix */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--fe)', fontSize: 20, fontStyle: 'italic', fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 1px 4px rgba(0,0,0,0.5)', marginBottom: 4 }}>
                          {p.name}
                        </div>
                        {pKey === 'journee'      && <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '2px 8px', fontFamily: 'var(--fo)', fontSize: 10, color: '#fff' }}>+ Paddle inclus</span>}
                        {pKey === 'afterwork'    && <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '2px 8px', fontFamily: 'var(--fo)', fontSize: 10, color: '#fff' }}>+ Hookah inclus</span>}
                        {pKey === 'feu_artifices'&& <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '2px 8px', fontFamily: 'var(--fo)', fontSize: 10, color: '#fff' }}>Coucher depuis la mer 🌊</span>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {p.original_price && (
                          <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'rgba(255,255,255,0.55)', textDecoration: 'line-through', lineHeight: 1 }}>{p.original_price}€</div>
                        )}
                        <div style={{ fontFamily: 'var(--fn)', fontSize: 32, fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>{p.price}€</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* ══ OPTIONS ══════════════════════════════════════════════════════ */}
        {options.length > 0 && section(
          <>
            {sectionTitle('Options à la carte')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              {options.map(opt => {
                const checked = selectedOptions.has(opt.key)
                const imgSrc  = OPTION_IMAGES[opt.key] || OPTION_IMAGES['bbq']
                return (
                  <div
                    key={opt.key}
                    onClick={() => toggleOption(opt.key)}
                    style={{
                      position: 'relative', borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                      border: checked ? `2px solid ${accent}` : '2px solid var(--bd)',
                      background: 'var(--bg2)', transition: 'border-color 0.15s',
                      boxShadow: checked ? `0 0 16px ${accent}33` : 'none',
                    }}
                  >
                    {/* Image */}
                    <div style={{ height: 130, overflow: 'hidden', position: 'relative' }}>
                      <img src={imgSrc} alt={opt.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {/* Toggle rond */}
                      <div style={{
                        position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%',
                        background: checked ? accent : 'rgba(0,0,0,0.5)',
                        border: checked ? `2px solid ${accent}` : '2px solid rgba(255,255,255,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 12, fontWeight: 700, backdropFilter: 'blur(4px)',
                      }}>
                        {checked ? '✓' : ''}
                      </div>
                    </div>
                    {/* Infos bas */}
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)', marginBottom: 3 }}>{opt.label}</div>
                      {opt.description && (
                        <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', lineHeight: 1.4, marginBottom: 6 }}>{opt.description}</div>
                      )}
                      <div style={{ fontFamily: 'var(--fn)', fontSize: 16, color: opt.price ? accent : 'var(--td3)', fontWeight: 700 }}>
                        {opt.price !== null ? `+${opt.price}€` : 'Inclus'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ══ PAIEMENT ═════════════════════════════════════════════════════ */}
        {section(
          <>
            {sectionTitle('Mode de paiement')}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {([
                { id: 'card'       as const, label: '💳 Carte' },
                { id: 'cash'       as const, label: '💵 Espèces' },
                { id: 'nika_token' as const, label: '🪙 NIKA Token' },
              ] as const).map(btn => (
                <button key={btn.id} className={`riv-pay-btn${paymentMethod === btn.id ? ' active' : ''}`} onClick={() => setPaymentMethod(btn.id)}>
                  {btn.label}
                </button>
              ))}
            </div>
            {paymentMethod === 'nika_token' && (
              <div style={{ marginTop: '1rem', background: 'rgba(224,112,56,0.07)', border: '1px solid rgba(224,112,56,0.22)', borderRadius: 10, padding: '0.75rem 1rem' }}>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--amber)', fontWeight: 600 }}>🪙 −5% appliqué avec vos NIKA Tokens</div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginTop: 4 }}>
                  Solde disponible : <strong style={{ color: 'var(--gold2)' }}>{NIKA_MOCK_BALANCE.toLocaleString('fr-FR')} NIKO</strong>
                </div>
              </div>
            )}
          </>
        )}

        {/* ══ RÉCAP + RÉSERVER ═════════════════════════════════════════════ */}
        {section(
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginBottom: 2 }}>
                  {pack?.name || '—'}{selectedOptions.size > 0 && ` + ${selectedOptions.size} option${selectedOptions.size > 1 ? 's' : ''}`}
                </div>
                {nikaDiscount > 0 && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--amber)' }}>−{nikaDiscount}€ NIKA Token</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--fn)', fontSize: 34, color: accent, lineHeight: 1 }}>{total}€</div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>
                  Acompte 30% : <strong style={{ color: accent }}>{acompte}€</strong>
                </div>
              </div>
            </div>
            <button className="btn-reserve-accent" onClick={() => setShowModal(true)} disabled={!pack}>
              {pack ? `Réserver — ${total}€ →` : 'Choisir une formule ci-dessus'}
            </button>
          </>,
          { border: '1px solid var(--bd2)' }
        )}

        {/* ══ PROMO SOCIAL ═════════════════════════════════════════════════ */}
        {provider.promo_social && (
          <div style={{ background: 'rgba(224,112,56,0.06)', border: '1px solid rgba(224,112,56,0.2)', borderRadius: 16, padding: '1.2rem 1.4rem', marginBottom: '1.4rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 28, flexShrink: 0 }}>📸</span>
            <div>
              <div style={{ fontFamily: 'var(--fe)', fontSize: 14, fontStyle: 'italic', color: 'var(--amber)', fontWeight: 700, marginBottom: '0.3rem' }}>Offre Instagram</div>
              <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.6, margin: 0 }}>{provider.promo_social}</p>
            </div>
          </div>
        )}

        {/* ══ AVIS CLIENTS ═════════════════════════════════════════════════ */}
        {reviews.length > 0 && (
          <section style={{ marginBottom: '1.4rem' }}>
            {sectionTitle('Avis clients')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {reviews.map((r, i) => {
                const ini   = getInitials(r.author_name)
                const color = r.initials_color || accent
                return (
                  <div key={r.id ?? i} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 12, padding: '1rem 1.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                          background: `linear-gradient(135deg, ${color}33, ${color}66)`,
                          border: `1px solid ${color}55`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color,
                        }}>
                          {ini}
                        </div>
                        <div>
                          <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td)' }}>{r.author_name}</div>
                          {r.pack_name && (
                            <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color, background: `${color}1a`, border: `1px solid ${color}40`, borderRadius: 10, padding: '2px 7px', display: 'inline-block', marginTop: 2 }}>
                              {r.pack_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: 13, letterSpacing: 2, flexShrink: 0 }}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <span key={`star-${j}`} style={{ color: j < r.rating ? '#f59e0b' : 'var(--td3)' }}>★</span>
                        ))}
                      </span>
                    </div>
                    {r.comment && <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.6, margin: '0 0 0.4rem' }}>{r.comment}</p>}
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{formatDate(r.date_review)}</div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ══ CONTACT ══════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '1.4rem' }}>
          {provider.contact_whatsapp && (
            <a href={`https://wa.me/${provider.contact_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', borderRadius: 10, background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)', color: '#25d366', fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              📱 WhatsApp
            </a>
          )}
          {provider.contact_instagram && (
            <a href={`https://instagram.com/${provider.contact_instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', borderRadius: 10, background: 'rgba(225,48,108,0.1)', border: '1px solid rgba(225,48,108,0.25)', color: '#e1306c', fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              📸 {provider.contact_instagram}
            </a>
          )}
        </div>

      </div>

      {/* ══ STICKY BAR MOBILE ════════════════════════════════════════════════ */}
      <div className="riv-sticky-bar" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(10,14,26,0.95)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--bd2)', padding: '12px 1.2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{pack?.name || 'Choisir une formule'}</div>
          <div style={{ fontFamily: 'var(--fn)', fontSize: 22, color: accent, lineHeight: 1 }}>{total}€</div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={!pack}
          style={{ padding: '12px 24px', borderRadius: 10, background: pack ? accent : 'var(--bg3)', color: pack ? txtA : 'var(--td3)', fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', border: 'none', cursor: pack ? 'pointer' : 'default' }}
        >
          {pack ? 'Réserver →' : 'Choisir…'}
        </button>
      </div>

      {/* ══ MODAL ════════════════════════════════════════════════════════════ */}
      {showModal && (
        <BookingModal
          provider={provider} pack={pack}
          selectedOptions={selectedOptions} options={options}
          paymentMethod={paymentMethod} total={total} acompte={acompte}
          accent={accent} onClose={() => setShowModal(false)}
        />
      )}
    </main>
  )
}
