'use client'
// app/riviera/prestataires/[slug]/ProviderDetail.tsx
// Toute l'UI interactive de la page prestataire

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Pack {
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
  contact_whatsapp?: string
  contact_instagram?: string
  photos?: string[]
  packs?: Pack[]
  options?: Option[]
  inclus_default?: string[]
  promo_social?: string
  boat_model?: string
  capacity_max?: number
}

// ─── Données hardcodées ────────────────────────────────────────────────────────

const SAMPLE_REVIEWS = [
  { author: 'Sophie M.',  stars: 5, date: 'Mai 2026',   text: 'Super expérience, skipper au top ! Les îles de Lérins sont magnifiques sous ce soleil.' },
  { author: 'Marc D.',    stars: 5, date: 'Avril 2026', text: 'Sortie afterwork parfaite. Coucher de soleil sur Théoule-sur-Mer, inoubliable.' },
  { author: 'Julien R.',  stars: 4, date: 'Avril 2026', text: 'Bateau nickel, packs clairs, tout inclus comme promis. On reviendra cet été !' },
]

const NIKA_MOCK_BALANCE = 1200 // NIKO tokens (mock)

// ─── Sous-composant Modal ────────────────────────────────────────────────────

function BookingModal({
  provider, pack, selectedOptions, options,
  paymentMethod, total, acompte,
  onClose,
}: {
  provider: Provider
  pack: Pack | undefined
  selectedOptions: Set<string>
  options: Option[]
  paymentMethod: 'card' | 'cash' | 'nika_token'
  total: number
  acompte: number
  onClose: () => void
}) {
  const [bookingDate, setBookingDate]     = useState('')
  const [persons, setPersons]             = useState(2)
  const [status, setStatus]               = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const nikaDiscount = paymentMethod === 'nika_token' ? Math.round(total / 0.95 * 0.05) : 0

  const today = new Date().toISOString().split('T')[0]

  const handleConfirm = useCallback(async () => {
    if (!bookingDate) return
    setStatus('loading')
    const supabase = createClient()
    if (!supabase) { setStatus('error'); return }

    const { error } = await supabase.from('riviera_bookings').insert({
      provider_slug:  provider.slug,
      pack_name:      pack?.name,
      options:        options
        .filter(o => selectedOptions.has(o.key))
        .map(o => ({ key: o.key, label: o.label, price: o.price })),
      total,
      acompte,
      payment_method: paymentMethod,
      date:           bookingDate,
      persons,
      status:         'pending',
    })

    setStatus(error ? 'error' : 'success')
  }, [bookingDate, persons, provider.slug, pack, options, selectedOptions, total, acompte, paymentMethod])

  return (
    <div
      className="riv-modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="riv-modal">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 22, fontStyle: 'italic', color: 'var(--td)', margin: 0 }}>
            Réserver — {pack?.name}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--td3)', fontSize: 22, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: 56, marginBottom: '1rem' }}>✅</div>
            <h3 style={{ fontFamily: 'var(--fe)', fontSize: 20, fontStyle: 'italic', color: 'var(--teal)', marginBottom: '0.6rem' }}>
              Demande envoyée !
            </h3>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.65 }}>
              {provider.name} vous contactera sous 24h pour confirmer et procéder au règlement de l'acompte de <strong style={{ color: 'var(--gold2)' }}>{acompte}€</strong>.
            </p>
            <button
              onClick={onClose}
              style={{ marginTop: '1.5rem', padding: '10px 28px', borderRadius: 8, background: 'var(--teal)', color: '#fff', border: 'none', fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              Fermer
            </button>
          </div>
        ) : (
          <>
            {/* Date */}
            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--td3)', display: 'block', marginBottom: 8 }}>
                Date de sortie *
              </label>
              <input
                type="date"
                min={today}
                value={bookingDate}
                onChange={e => setBookingDate(e.target.value)}
                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--bd2)', borderRadius: 8, padding: '10px 14px', color: 'var(--td)', fontFamily: 'var(--fo)', fontSize: 14, outline: 'none' }}
              />
            </div>

            {/* Personnes */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--td3)', display: 'block', marginBottom: 8 }}>
                Nombre de personnes : <strong style={{ color: 'var(--td)', fontWeight: 700 }}>{persons}</strong>
              </label>
              <input
                type="range"
                min={1}
                max={provider.capacity_max || 10}
                value={persons}
                onChange={e => setPersons(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#0ea5e9' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: 4 }}>
                <span>1 personne</span>
                <span>{provider.capacity_max || 10} max</span>
              </div>
            </div>

            {/* Récap */}
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
                  <span style={{ color: 'var(--amber)' }}>🪙 NIKKA Token (−5%)</span>
                  <span style={{ color: 'var(--amber)' }}>−{nikaDiscount}€</span>
                </div>
              )}
              <div style={{ borderTop: '1px solid var(--bd)', paddingTop: 8, marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: 'var(--td)' }}>Total</span>
                  <span style={{ fontFamily: 'var(--fn)', fontSize: 24, color: 'var(--az2)' }}>{total}€</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>Acompte à régler (30%)</span>
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--gold2)' }}>{acompte}€</span>
                </div>
              </div>
            </div>

            {/* Erreur */}
            {status === 'error' && (
              <div style={{ background: 'rgba(212,75,36,0.1)', border: '1px solid rgba(212,75,36,0.25)', borderRadius: 8, padding: '0.8rem 1rem', marginBottom: '1rem', fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--coral)' }}>
                Une erreur est survenue. Contactez le prestataire directement via WhatsApp.
              </div>
            )}

            {/* Confirmer */}
            <button
              onClick={handleConfirm}
              disabled={!bookingDate || status === 'loading'}
              style={{
                width: '100%', padding: '14px', borderRadius: 10,
                background: bookingDate ? 'linear-gradient(135deg, #0ea5e9 0%, #0094D4 100%)' : 'var(--bg3)',
                color: bookingDate ? '#fff' : 'var(--td3)',
                fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 900, fontStyle: 'italic',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                border: 'none', cursor: bookingDate ? 'pointer' : 'default',
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

export default function ProviderDetail({ provider }: { provider: Provider }) {
  const packs   = provider.packs   || []
  const options = provider.options || []
  const inclus  = provider.inclus_default || []

  const [selectedPack,    setSelectedPack]    = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set())
  const [paymentMethod,   setPaymentMethod]   = useState<'card' | 'cash' | 'nika_token'>('card')
  const [showModal,       setShowModal]       = useState(false)

  const pack = packs[selectedPack]

  // Calcul du total
  const optionsTotal  = options
    .filter(o => selectedOptions.has(o.key) && o.price !== null)
    .reduce((sum, o) => sum + (o.price || 0), 0)
  const baseTotal     = (pack?.price || 0) + optionsTotal
  const nikaDiscount  = paymentMethod === 'nika_token' ? Math.round(baseTotal * 0.05) : 0
  const total         = baseTotal - nikaDiscount
  const acompte       = Math.round(total * 0.3)

  const toggleOption = (key: string) => {
    setSelectedOptions(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const initials = provider.name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  const sectionTitle = (text: string) => (
    <h2 style={{
      fontFamily: 'var(--fe)', fontSize: 20, fontStyle: 'italic',
      fontWeight: 900, textTransform: 'uppercase',
      color: 'var(--td)', marginBottom: '1rem', margin: '0 0 1rem',
    }}>
      {text}
    </h2>
  )

  const section = (children: React.ReactNode, style?: React.CSSProperties) => (
    <section style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 16, padding: '1.4rem 1.5rem', marginBottom: '1.4rem', ...style }}>
      {children}
    </section>
  )

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(1.5rem,3vw,2.5rem) 1.2rem 6rem' }}>

      {/* ── RETOUR ──────────────────────────────────── */}
      <Link
        href="/riviera"
        style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '1.5rem', textDecoration: 'none' }}
      >
        ← Riviera
      </Link>

      {/* ── HERO CARD ───────────────────────────────── */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd2)', borderRadius: 20, padding: 'clamp(1.4rem,3vw,2rem)', marginBottom: '1.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
          <div className="riv-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              {provider.verified && <span className="riv-verified">✓ Vérifié WOW</span>}
              {provider.category && (
                <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {provider.category}
                </span>
              )}
            </div>
            <h1 style={{
              fontFamily: 'var(--fe)', fontSize: 'clamp(24px,5vw,40px)',
              fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase',
              color: 'var(--td)', lineHeight: 0.92, marginBottom: '0.4rem',
            }}>
              {provider.name}
            </h1>
            {provider.location && (
              <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginBottom: '0.6rem' }}>
                📍 {provider.location}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {provider.rating != null && (
                <span style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--gold2)', fontWeight: 600 }}>
                  ⭐ {provider.rating}
                  {provider.review_count != null && (
                    <span style={{ color: 'var(--td3)', fontWeight: 400 }}> ({provider.review_count} avis)</span>
                  )}
                </span>
              )}
              {provider.boat_model && <span className="riv-chip">⛵ {provider.boat_model}</span>}
              {provider.capacity_max && <span className="riv-chip">👥 {provider.capacity_max} pers. max</span>}
            </div>
          </div>
        </div>

        {provider.tagline && (
          <p style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td2)', lineHeight: 1.65, marginBottom: inclus.length ? '1rem' : 0 }}>
            {provider.tagline}
          </p>
        )}

        {inclus.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {inclus.map(item => (
              <span key={item} className="riv-chip">✓ {item}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── GALERIE PHOTOS ──────────────────────────── */}
      <div className="riv-gallery" style={{ marginBottom: '1.4rem' }}>
        {(provider.photos?.length ?? 0) > 0
          ? provider.photos!.map((url, i) => (
            <div key={i} className="riv-gallery-item" style={{ flexShrink: 0, width: 280, height: 180, borderRadius: 12, overflow: 'hidden', scrollSnapAlign: 'start' }}>
              <img src={url} alt={`${provider.name} photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))
          : [1, 2, 3].map(i => (
            <div key={i} style={{ flexShrink: 0, width: 280, height: 180, borderRadius: 12, background: 'linear-gradient(135deg, var(--bg3) 0%, #061828 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, opacity: 0.6, scrollSnapAlign: 'start' }}>
              ⛵
            </div>
          ))
        }
      </div>

      {/* ── FORMULES ────────────────────────────────── */}
      {packs.length > 0 && (
        <section style={{ marginBottom: '1.4rem' }}>
          {sectionTitle('Choisir une formule')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {packs.map((p, i) => (
              <button
                key={p.name}
                className={`riv-pack${selectedPack === i ? ' active' : ''}`}
                onClick={() => setSelectedPack(i)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', fontWeight: 700, color: 'var(--td)', marginBottom: '0.2rem' }}>
                      {p.name}
                    </div>
                    {p.hours       && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>🕐 {p.hours}</div>}
                    {p.destination && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>📍 {p.destination}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--fn)', fontSize: 26, color: '#0ea5e9', lineHeight: 1 }}>
                      {p.price}€
                    </div>
                    {p.original_price && (
                      <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', textDecoration: 'line-through' }}>
                        {p.original_price}€
                      </div>
                    )}
                  </div>
                </div>
                {p.inclus && p.inclus.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {p.inclus.map(item => (
                      <span key={item} style={{ fontFamily: 'var(--fo)', fontSize: 11, padding: '3px 8px', borderRadius: 12, background: 'rgba(14,165,233,0.08)', color: 'var(--az2)', border: '1px solid rgba(14,165,233,0.15)' }}>
                        ✓ {item}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── OPTIONS À LA CARTE ──────────────────────── */}
      {options.length > 0 && section(
        <>
          {sectionTitle('Options à la carte')}
          <div>
            {options.map(opt => (
              <label key={opt.key} className="riv-opt-row" style={{ cursor: 'pointer', display: 'flex' }}>
                <input
                  type="checkbox"
                  checked={selectedOptions.has(opt.key)}
                  onChange={() => toggleOption(opt.key)}
                  style={{ marginTop: 2, accentColor: '#0ea5e9', width: 18, height: 18, flexShrink: 0, cursor: 'pointer' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td)', fontWeight: 600 }}>{opt.label}</div>
                  {opt.description && (
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginTop: 2 }}>{opt.description}</div>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--fn)', fontSize: 18, flexShrink: 0, marginLeft: 8, color: opt.price ? 'var(--amber)' : 'var(--td3)' }}>
                  {opt.price !== null ? `+${opt.price}€` : 'Incl.'}
                </div>
              </label>
            ))}
          </div>
        </>
      )}

      {/* ── MODE DE PAIEMENT ────────────────────────── */}
      {section(
        <>
          {sectionTitle('Mode de paiement')}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {([
              { id: 'card'       as const, label: '💳 Carte' },
              { id: 'cash'       as const, label: '💵 Espèces' },
              { id: 'nika_token' as const, label: '🪙 NIKKA Token' },
            ] as const).map(btn => (
              <button
                key={btn.id}
                className={`riv-pay-btn${paymentMethod === btn.id ? ' active' : ''}`}
                onClick={() => setPaymentMethod(btn.id)}
              >
                {btn.label}
              </button>
            ))}
          </div>
          {paymentMethod === 'nika_token' && (
            <div style={{ marginTop: '1rem', background: 'rgba(224,112,56,0.07)', border: '1px solid rgba(224,112,56,0.22)', borderRadius: 10, padding: '0.75rem 1rem' }}>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--amber)', fontWeight: 600 }}>
                🪙 −5% appliqué avec vos NIKKA Tokens
              </div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginTop: 4 }}>
                Solde disponible : <strong style={{ color: 'var(--gold2)' }}>{NIKA_MOCK_BALANCE.toLocaleString('fr-FR')} NIKO</strong>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── RÉCAP + RÉSERVER ────────────────────────── */}
      {section(
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginBottom: 2 }}>
                {pack?.name || '—'}
                {selectedOptions.size > 0 && ` + ${selectedOptions.size} option${selectedOptions.size > 1 ? 's' : ''}`}
              </div>
              {nikaDiscount > 0 && (
                <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--amber)' }}>
                  −{nikaDiscount}€ NIKKA Token
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--fn)', fontSize: 34, color: 'var(--az2)', lineHeight: 1 }}>
                {total}€
              </div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>
                Acompte 30% : <strong style={{ color: 'var(--gold2)' }}>{acompte}€</strong>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            disabled={!pack}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 10,
              background: pack ? 'linear-gradient(135deg, #0ea5e9 0%, #0094D4 100%)' : 'var(--bg3)',
              color: pack ? '#fff' : 'var(--td3)',
              fontFamily: 'var(--fe)', fontSize: 16, fontWeight: 900, fontStyle: 'italic',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              border: 'none', cursor: pack ? 'pointer' : 'default',
            }}
          >
            {pack ? `Réserver — ${total}€ →` : 'Choisir une formule ci-dessus'}
          </button>
        </>,
        { border: '1px solid var(--bd2)' }
      )}

      {/* ── PROMO SOCIAL ────────────────────────────── */}
      {provider.promo_social && (
        <div style={{ background: 'rgba(224,112,56,0.06)', border: '1px solid rgba(224,112,56,0.2)', borderRadius: 16, padding: '1.2rem 1.4rem', marginBottom: '1.4rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: 28, flexShrink: 0 }}>📸</span>
          <div>
            <div style={{ fontFamily: 'var(--fe)', fontSize: 14, fontStyle: 'italic', color: 'var(--amber)', fontWeight: 700, marginBottom: '0.3rem' }}>
              Offre Instagram
            </div>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.6, margin: 0 }}>
              {provider.promo_social}
            </p>
          </div>
        </div>
      )}

      {/* ── AVIS CLIENTS ────────────────────────────── */}
      <section style={{ marginBottom: '1.4rem' }}>
        {sectionTitle('Avis clients')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {SAMPLE_REVIEWS.map((r, i) => (
            <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 12, padding: '1rem 1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td)' }}>{r.author}</span>
                <span style={{ fontSize: 12, letterSpacing: 2 }}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <span key={j} style={{ color: j < r.stars ? 'var(--gold2)' : 'var(--td3)' }}>★</span>
                  ))}
                </span>
              </div>
              <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.6, margin: 0 }}>{r.text}</p>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: '0.4rem' }}>{r.date}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONTACT ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
        {provider.contact_whatsapp && (
          <a
            href={`https://wa.me/${provider.contact_whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flex: 1, minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', borderRadius: 10, background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)', color: '#25d366', fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
          >
            📱 WhatsApp
          </a>
        )}
        {provider.contact_instagram && (
          <a
            href={`https://instagram.com/${provider.contact_instagram.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flex: 1, minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', borderRadius: 10, background: 'rgba(225,48,108,0.1)', border: '1px solid rgba(225,48,108,0.25)', color: '#e1306c', fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
          >
            📸 {provider.contact_instagram}
          </a>
        )}
      </div>

      {/* ── MODAL RÉSERVATION ───────────────────────── */}
      {showModal && (
        <BookingModal
          provider={provider}
          pack={pack}
          selectedOptions={selectedOptions}
          options={options}
          paymentMethod={paymentMethod}
          total={total}
          acompte={acompte}
          onClose={() => setShowModal(false)}
        />
      )}
    </main>
  )
}
