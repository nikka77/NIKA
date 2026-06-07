'use client'
// app/food/afroweek06/FoodClient.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import DishCard, { type FoodItem } from '@/components/food/DishCard'
import CartBar from '@/components/food/CartBar'

type Provider = {
  id: string
  name: string
  description?: string
  instagram?: string
  city?: string
  opens_at?: string
  closes_at?: string
}

type Props = {
  provider: Provider
  sessionId: string | null
  sessionStatus: 'open' | 'closed' | 'sold_out'
  items: FoodItem[]
}

type Cart = Record<string, number>
type Tab = 'main' | 'side' | 'drink'

const TAB_LABELS: Record<Tab, string> = {
  main:  'Plats',
  side:  'Accomp.',
  drink: 'Boissons',
}

const CAT_LABEL_FULL: Record<Tab, string> = {
  main:  '⭐ Les incontournables',
  side:  'Accompagnements',
  drink: 'Boissons',
}

const STATUS_LABELS: Record<string, string> = {
  open:     'Ouvert ce soir',
  closed:   'Fermé',
  sold_out: 'Épuisé',
}

const CART_KEY = 'nika-food-cart-afroweek06'

export default function FoodClient({ provider, sessionId, sessionStatus, items }: Props) {
  const [cart, setCart] = useState<Cart>({})
  const [stocks, setStocks] = useState<Record<string, number>>(
    Object.fromEntries(items.map(i => [i.id, i.remaining_stock]))
  )
  const [liveStatus, setLiveStatus] = useState(sessionStatus)
  const [activeTab, setActiveTab] = useState<Tab>('main')

  // Restore cart
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY)
      if (saved) setCart(JSON.parse(saved))
    } catch {}
  }, [])

  // Realtime stocks + session status
  useEffect(() => {
    if (!sessionId) return
    const supabase = createClient()
    if (!supabase) return

    const stockChannel = supabase
      .channel(`stocks-vitrine-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'food_session_stocks',
        filter: `session_id=eq.${sessionId}`,
      }, payload => {
        const p = payload.new as { item_id: string; remaining_stock: number }
        setStocks(prev => ({ ...prev, [p.item_id]: p.remaining_stock }))
      })
      .subscribe()

    const sessionChannel = supabase
      .channel(`session-vitrine-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'food_sessions',
        filter: `id=eq.${sessionId}`,
      }, payload => {
        setLiveStatus((payload.new as { status: 'open' | 'closed' | 'sold_out' }).status)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(stockChannel)
      supabase.removeChannel(sessionChannel)
    }
  }, [sessionId])

  const saveCart = (next: Cart) => {
    setCart(next)
    try { localStorage.setItem(CART_KEY, JSON.stringify(next)) } catch {}
  }

  const add = (itemId: string) => {
    const current = cart[itemId] ?? 0
    if (current >= (stocks[itemId] ?? 0)) return
    saveCart({ ...cart, [itemId]: current + 1 })
  }

  const remove = (itemId: string) => {
    const current = cart[itemId] ?? 0
    if (current === 0) return
    const next = { ...cart }
    if (current === 1) delete next[itemId]
    else next[itemId] = current - 1
    saveCart(next)
  }

  const itemCount = Object.values(cart).reduce((s, q) => s + q, 0)
  const total = items.reduce((s, item) => s + (cart[item.id] ?? 0) * item.price, 0)
  const isOpen = liveStatus === 'open'

  const itemsWithStock = items.map(i => ({ ...i, remaining_stock: stocks[i.id] ?? 0 }))
  const tabItems = itemsWithStock.filter(i => i.category === activeTab)

  const availableTabs = (['main', 'side', 'drink'] as Tab[]).filter(t =>
    items.some(i => i.category === t)
  )

  return (
    <>
      {/* ===== HERO ===== */}
      <div style={{
        background: '#8B2500',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Diagonal pattern overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'repeating-linear-gradient(45deg,rgba(255,255,255,0.03) 0,rgba(255,255,255,0.03) 1px,transparent 0,transparent 50%)',
          backgroundSize: '20px 20px',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', padding: '1.4rem 1.4rem 1.2rem', maxWidth: 720, margin: '0 auto' }}>
          {/* Top row: back + status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
            <Link
              href="/food"
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 14, textDecoration: 'none',
              }}
            >
              ←
            </Link>
            <span style={{
              background: isOpen ? '#16a34a' : liveStatus === 'sold_out' ? '#dc2626' : 'rgba(100,100,120,0.6)',
              color: '#fff', fontSize: 11, fontWeight: 700,
              padding: '5px 12px', borderRadius: 99,
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--fo)',
            }}>
              {isOpen && (
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', background: '#fff',
                  animation: 'pulse 2s infinite',
                  display: 'inline-block',
                }} />
              )}
              {STATUS_LABELS[liveStatus]}
            </span>
          </div>

          {/* Provider info */}
          <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4, letterSpacing: '0.06em' }}>
            NIKKA FOOD · {provider.city?.toUpperCase() ?? 'NICE'}
          </div>
          <div style={{ fontFamily: 'var(--fn)', fontSize: 28, color: '#fff', letterSpacing: '0.03em', marginBottom: 4 }}>
            {provider.name}
          </div>
          {provider.description && (
            <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: '0.9rem', lineHeight: 1.5 }}>
              {provider.description}
            </div>
          )}

          {/* Chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {provider.opens_at && provider.closes_at && (
              <span style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)', fontSize: 11, padding: '4px 9px', borderRadius: 99, fontFamily: 'var(--fo)', display: 'flex', alignItems: 'center', gap: 4 }}>
                🕖 {provider.opens_at.slice(0, 5)}–{provider.closes_at.slice(0, 5)}
              </span>
            )}
            <span style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)', fontSize: 11, padding: '4px 9px', borderRadius: 99, fontFamily: 'var(--fo)', display: 'flex', alignItems: 'center', gap: 4 }}>
              🛵 2€ livraison
            </span>
            <span style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)', fontSize: 11, padding: '4px 9px', borderRadius: 99, fontFamily: 'var(--fo)', display: 'flex', alignItems: 'center', gap: 4 }}>
              ⏱ ~30 min
            </span>
            {provider.city && (
              <span style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)', fontSize: 11, padding: '4px 9px', borderRadius: 99, fontFamily: 'var(--fo)', display: 'flex', alignItems: 'center', gap: 4 }}>
                📍 {provider.city}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ===== DELIVERY BANNER ===== */}
      {isOpen && (
        <div style={{
          background: '#1a1a1a', padding: '10px 1.4rem',
          display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '1px solid #2a2a2a',
          maxWidth: '100%',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--food-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, flexShrink: 0,
          }}>
            🛵
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: '#fff' }}>
              Livraison estimée
            </div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: '#888' }}>
              Commande dès maintenant
            </div>
          </div>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--food-brand)' }}>
            25–40 min
          </div>
        </div>
      )}

      {/* ===== CLOSED ALERT ===== */}
      {!isOpen && (
        <div style={{ maxWidth: 720, margin: '1.4rem auto', padding: '0 1.2rem' }}>
          <div className="food-alert">
            <div className="food-alert-emoji">{liveStatus === 'sold_out' ? '🍽️' : '🌙'}</div>
            <div className="food-alert-title">
              {liveStatus === 'sold_out' ? 'Épuisé ce soir' : 'Fermé pour le moment'}
            </div>
            <div className="food-alert-sub">
              {liveStatus === 'sold_out'
                ? 'Tous les plats ont été commandés. Rendez-vous demain !'
                : `Ouverture à ${provider.opens_at?.slice(0, 5) ?? '19:00'} tous les soirs.`}
            </div>
          </div>
        </div>
      )}

      {/* ===== CATEGORY TABS ===== */}
      <div style={{
        display: 'flex', gap: 0,
        background: '#111',
        borderBottom: '1px solid #222',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        maxWidth: 720, margin: '0 auto',
      }}>
        {availableTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '11px 16px',
              fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700,
              color: activeTab === tab ? 'var(--food-brand)' : '#666',
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: `2px solid ${activeTab === tab ? 'var(--food-brand)' : 'transparent'}`,
              whiteSpace: 'nowrap',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* ===== CONTENT ===== */}
      <main style={{
        maxWidth: 720, margin: '0 auto',
        padding: '0.8rem 1.2rem',
        paddingBottom: itemCount > 0 ? '7rem' : '3rem',
        background: '#111',
        minHeight: '40vh',
      }}>
        <div style={{
          fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
          color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em',
          padding: '8px 0 8px',
        }}>
          {CAT_LABEL_FULL[activeTab]}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tabItems.length === 0 ? (
            <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', padding: '2rem', textAlign: 'center' }}>
              Aucun article dans cette catégorie.
            </div>
          ) : tabItems.map(item => (
            <DishCard
              key={item.id}
              item={item}
              qty={cart[item.id] ?? 0}
              onAdd={() => isOpen && add(item.id)}
              onRemove={() => remove(item.id)}
            />
          ))}
        </div>
      </main>

      {isOpen && (
        <CartBar
          itemCount={itemCount}
          total={total}
          checkoutHref="/food/afroweek06/checkout"
        />
      )}
    </>
  )
}
