'use client'
// app/food/afroweek06/checkout/page.tsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type CartItem = {
  id: string
  name: string
  emoji?: string
  price: number
  quantity: number
}

const OPENS_AT = '19:00'
const CLOSES_AT = '23:00'

function generateSlots(opens: string, closes: string): string[] {
  const slots: string[] = []
  const [oh, om] = opens.split(':').map(Number)
  const [ch, cm] = closes.split(':').map(Number)
  let h = oh, m = om
  while (h < ch || (h === ch && m <= cm)) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    m += 30
    if (m >= 60) { h++; m -= 60 }
  }
  return slots
}

type PaymentMethod = 'nikka' | 'cash' | 'card'

export default function CheckoutPage() {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [slot, setSlot] = useState('ASAP')
  const [payment, setPayment] = useState<PaymentMethod>('nikka')

  useEffect(() => {
    const loadCart = async () => {
      try {
        const saved = localStorage.getItem('nika-food-cart-afroweek06')
        if (!saved) { setLoading(false); return }
        const cartRaw: Record<string, number> = JSON.parse(saved)
        const ids = Object.keys(cartRaw)
        if (!ids.length) { setLoading(false); return }

        const supabase = createClient()
        if (!supabase) { setLoading(false); return }
        const { data: items } = await supabase
          .from('food_items')
          .select('id, name, emoji, price')
          .in('id', ids)
        if (items) {
          setCartItems(items.map(i => ({ ...i, quantity: cartRaw[i.id] })))
        }
      } catch {}
      setLoading(false)
    }
    loadCart()
  }, [])

  const slots = ['ASAP', ...generateSlots(OPENS_AT, CLOSES_AT)]
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0)
  const deliveryFee = 2
  const total = subtotal + deliveryFee
  const isValid = name.trim() && phone.trim() && address.trim() && cartItems.length > 0 && payment !== 'card'

  const submit = async () => {
    if (!isValid) return
    setSubmitting(true)
    setError('')

    const supabase = createClient()
    if (!supabase) { setError('Connexion impossible.'); setSubmitting(false); return }

    const { data: provider } = await supabase
      .from('food_providers')
      .select('id')
      .eq('slug', 'afroweek06')
      .single()
    if (!provider) { setError('Prestataire introuvable.'); setSubmitting(false); return }

    const today = new Date().toISOString().split('T')[0]
    const { data: session } = await supabase
      .from('food_sessions')
      .select('id, status')
      .eq('provider_id', provider.id)
      .eq('date', today)
      .maybeSingle()

    if (!session || session.status !== 'open') {
      setError('Aucune session ouverte ce soir. Réessayez demain.')
      setSubmitting(false)
      return
    }

    const { data: order, error: orderErr } = await supabase
      .from('food_orders')
      .insert({
        session_id:       session.id,
        provider_id:      provider.id,
        customer_name:    name.trim(),
        customer_phone:   phone.trim(),
        delivery_address: address.trim(),
        scheduled_time:   slot === 'ASAP' ? null : slot,
        payment_method:   payment,
        total,
        delivery_fee:     deliveryFee,
        notes:            notes.trim() || null,
        status:           'pending',
      })
      .select('id')
      .single()

    if (orderErr || !order) {
      setError('Erreur lors de la commande. Réessayez.')
      setSubmitting(false)
      return
    }

    // Insert order items
    await supabase.from('food_order_items').insert(
      cartItems.map(i => ({
        order_id:   order.id,
        item_id:    i.id,
        quantity:   i.quantity,
        unit_price: i.price,
      }))
    )

    // Decrement stocks via RPC
    for (const item of cartItems) {
      await supabase.rpc('decrement_stock', {
        p_session_id: session.id,
        p_item_id:    item.id,
        p_qty:        item.quantity,
      })
    }

    localStorage.removeItem('nika-food-cart-afroweek06')
    router.push(`/food/afroweek06/track/${order.id}`)
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.2rem', textAlign: 'center', fontFamily: 'var(--fo)', color: 'var(--td3)' }}>
        Chargement…
      </main>
    )
  }

  if (cartItems.length === 0) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.2rem', textAlign: 'center' }}>
        <div className="food-alert">
          <div className="food-alert-emoji">🛒</div>
          <div className="food-alert-title">Panier vide</div>
          <div className="food-alert-sub">Retournez choisir vos plats.</div>
        </div>
        <Link href="/food/afroweek06" style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--food-brand)', fontWeight: 700 }}>
          ← Retour au menu
        </Link>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.2rem 5rem' }}>
      <Link
        href="/food/afroweek06"
        style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', display: 'inline-flex', gap: 4, marginBottom: '1.6rem', textDecoration: 'none' }}
      >
        ← Menu
      </Link>

      <h1 style={{ fontFamily: 'var(--fn)', fontSize: 'clamp(26px,5vw,40px)', color: 'var(--food-brand)', marginBottom: '2rem', letterSpacing: '0.05em' }}>
        COMMANDER
      </h1>

      {/* Récap */}
      <div className="food-form-section">
        <h2 style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: 'var(--td)', marginBottom: '0.8rem' }}>Votre commande</h2>
        {cartItems.map(item => (
          <div key={item.id} className="food-order-line" style={{ padding: '4px 0' }}>
            <span>{item.emoji} {item.quantity}× {item.name}</span>
            <span>{(item.price * item.quantity).toFixed(2)} €</span>
          </div>
        ))}
        <div className="food-order-line food-order-line--fee" style={{ marginTop: 6 }}>
          <span>Livraison</span>
          <span>{deliveryFee.toFixed(2)} €</span>
        </div>
        <div className="food-order-line food-order-line--total" style={{ marginTop: 4 }}>
          <span>Total</span>
          <span>{total.toFixed(2)} €</span>
        </div>
      </div>

      {/* Infos livraison */}
      <div className="food-form-section">
        <h2 style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: 'var(--td)', marginBottom: '1rem' }}>
          Infos livraison
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div>
            <label className="food-form-label">Nom</label>
            <input
              className="food-form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Prénom et nom"
            />
          </div>
          <div>
            <label className="food-form-label">Téléphone</label>
            <input
              className="food-form-input"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+33 6 …"
            />
          </div>
          <div>
            <label className="food-form-label">Adresse de livraison</label>
            <input
              className="food-form-input"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Numéro, rue, ville"
            />
          </div>
          <div>
            <label className="food-form-label">Notes (facultatif)</label>
            <input
              className="food-form-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Allergies, étage, digicode…"
            />
          </div>
        </div>
      </div>

      {/* Créneaux */}
      <div className="food-form-section">
        <h2 style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: 'var(--td)', marginBottom: '0.8rem' }}>
          Créneau de livraison
        </h2>
        <div className="food-slots">
          {slots.map(s => (
            <button
              key={s}
              className={`food-slot-btn${slot === s ? ' active' : ''}`}
              onClick={() => setSlot(s)}
            >
              {s === 'ASAP' ? '⚡ Dès que possible' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Paiement */}
      <div className="food-form-section">
        <h2 style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: 'var(--td)', marginBottom: '0.8rem' }}>
          Paiement
        </h2>
        <div className="food-pay-btns">
          <button
            className={`food-pay-btn${payment === 'nikka' ? ' active' : ''}`}
            onClick={() => setPayment('nikka')}
          >
            <div style={{ fontSize: 22, marginBottom: 4 }}>🟠</div>
            NIKKA Pay
          </button>
          <button
            className={`food-pay-btn${payment === 'cash' ? ' active' : ''}`}
            onClick={() => setPayment('cash')}
          >
            <div style={{ fontSize: 22, marginBottom: 4 }}>💵</div>
            Espèces
          </button>
          <button
            className={`food-pay-btn${payment === 'card' ? ' active' : ''}`}
            onClick={() => setPayment('card')}
          >
            <div style={{ fontSize: 22, marginBottom: 4 }}>💳</div>
            Carte / Apple Pay
          </button>
        </div>
        {payment === 'nikka' && (
          <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--teal)', marginTop: '0.6rem' }}>
            ✓ NIKKA Pay — aucune saisie de carte requise
          </p>
        )}
        {payment === 'cash' && (
          <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginTop: '0.6rem' }}>
            Règlement en espèces à la livraison.
          </p>
        )}
        {payment === 'card' && (
          <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginTop: '0.6rem' }}>
            Paiement par carte bientôt disponible — choisissez NIKKA Pay ou Espèces.
          </p>
        )}
      </div>

      {error && (
        <div style={{
          fontFamily: 'var(--fo)', fontSize: 13, color: '#f87171',
          background: 'rgba(212,75,36,0.1)', border: '1px solid rgba(212,75,36,0.25)',
          borderRadius: 8, padding: '0.8rem 1rem', marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      <button
        className="food-submit-btn"
        onClick={submit}
        disabled={!isValid || submitting}
      >
        {submitting ? 'Envoi en cours…' : `Confirmer ma commande — ${total.toFixed(2)} €`}
      </button>
    </main>
  )
}
