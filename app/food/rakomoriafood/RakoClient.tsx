'use client'
// app/food/rakomoriafood/RakoClient.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import HalalBadge from '@/components/food/rakomoria/HalalBadge'
import DailySpecialBanner from '@/components/food/rakomoria/DailySpecialBanner'
import MangaMenuSection, { type FoodItem as MangaItem } from '@/components/food/rakomoria/MangaMenuSection'
import BundleQtySelector from '@/components/food/rakomoria/BundleQtySelector'
import ZoneSelector, { type DeliveryZone } from '@/components/food/rakomoria/ZoneSelector'
import Spin360 from '@/components/Spin360'
import { visual } from '@/lib/visuals'

// ─── Constantes métier ────────────────────────────────────────────────────────

const DAILY_SPECIAL_SLUGS: Record<string, string> = {
  tuesday:   'couscousma',
  wednesday: 'riz-sauce-rouge-boeuf',
  thursday:  'foutra-burger',
  friday:    'riz-viande-rougai',
  saturday:  'gratin-pates',
  sunday:    'riz-legumes-boeuf',
}

const RMR_SLUGS = new Set([
  'tacos-tenders', 'tacos-viande-hachee', 'cheese-burger',
  'chicken-burger', 'tasty-croust', 'foutra-burger',
])

const RMR_DAYS = new Set(['thursday', 'friday', 'saturday'])

const BUNDLE_SLUGS = new Set(['triangle', 'samboussa'])

const BUNDLE_OPTIONS: Record<string, { qty: number; price: number; label: string }[]> = {
  triangle:  [{ qty: 2, price: 5, label: '× 2 pièces' }, { qty: 4, price: 10, label: '× 4 pièces' }],
  samboussa: [{ qty: 5, price: 6, label: '× 5 pièces' }, { qty: 10, price: 10, label: '× 10 pièces' }],
}

const DELIVERY_ZONES: DeliveryZone[] = [
  { name: 'Nice Est / Nord',     min: 10 },
  { name: 'Nice Centre / Ouest', min: 20 },
]

const CART_KEY = 'nika-food-cart-rakomoriafood'

type FoodItem = {
  id: string
  name: string
  description?: string
  price: number
  category: 'main' | 'side' | 'drink'
  emoji?: string
  remaining_stock: number
  slug: string
}

type Provider = {
  id: string; name: string; description?: string; instagram?: string
  city?: string; opens_at?: string; closes_at?: string
}

type Props = {
  provider: Provider
  sessionId: string | null
  sessionStatus: 'open' | 'closed' | 'sold_out'
  items: FoodItem[]
}

type Cart = Record<string, number>
type BundleCart = Record<string, { qty: number; price: number }>
type Tab = 'all' | 'main' | 'side' | 'drink'

export default function RakoClient({ provider, sessionId, sessionStatus, items }: Props) {
  const [cart, setCart] = useState<Cart>({})
  const [bundleCart, setBundleCart] = useState<BundleCart>({})
  const [stocks, setStocks] = useState<Record<string, number>>(
    Object.fromEntries(items.map(i => [i.id, i.remaining_stock]))
  )
  const [liveStatus, setLiveStatus] = useState(sessionStatus)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [zone, setZone] = useState(DELIVERY_ZONES[0].name)

  // Restore cart
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setCart(parsed.cart ?? {})
        setBundleCart(parsed.bundleCart ?? {})
      }
    } catch {}
  }, [])

  // Realtime
  useEffect(() => {
    if (!sessionId) return
    const supabase = createClient()
    if (!supabase) return

    const stockCh = supabase
      .channel(`stocks-rako-${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'food_session_stocks', filter: `session_id=eq.${sessionId}` },
        (p) => {
          const row = p.new as { item_id: string; remaining_stock: number }
          setStocks(prev => ({ ...prev, [row.item_id]: row.remaining_stock }))
        })
      .subscribe()

    const sessCh = supabase
      .channel(`session-rako-${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'food_sessions', filter: `id=eq.${sessionId}` },
        (p) => setLiveStatus((p.new as { status: 'open' | 'closed' | 'sold_out' }).status))
      .subscribe()

    return () => { supabase.removeChannel(stockCh); supabase.removeChannel(sessCh) }
  }, [sessionId])

  const saveCart = (c: Cart, b: BundleCart) => {
    setCart(c); setBundleCart(b)
    try { localStorage.setItem(CART_KEY, JSON.stringify({ cart: c, bundleCart: b })) } catch {}
  }

  const add = (id: string) => {
    const cur = cart[id] ?? 0
    if (cur >= (stocks[id] ?? 0)) return
    saveCart({ ...cart, [id]: cur + 1 }, bundleCart)
  }

  const remove = (id: string) => {
    const cur = cart[id] ?? 0
    if (cur === 0) return
    const next = { ...cart }
    if (cur === 1) delete next[id]
    else next[id] = cur - 1
    saveCart(next, bundleCart)
  }

  const addBundle = (itemId: string, qty: number, price: number) => {
    const key = `${itemId}-${qty}`
    const cur = bundleCart[key]?.qty ?? 0
    const next = { ...bundleCart, [key]: { qty: cur + 1, price } }
    saveCart(cart, next)
  }

  const removeBundle = (itemId: string, qty: number) => {
    const key = `${itemId}-${qty}`
    const cur = bundleCart[key]?.qty ?? 0
    if (cur === 0) return
    const next = { ...bundleCart }
    if (cur === 1) delete next[key]
    else next[key] = { ...next[key], qty: cur - 1 }
    saveCart(cart, next)
  }

  const isOpen = liveStatus === 'open'
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
  const isRMRDay = RMR_DAYS.has(today)
  const dailySlug = DAILY_SPECIAL_SLUGS[today]

  const itemsWithStock = items.map(i => ({ ...i, remaining_stock: stocks[i.id] ?? 0 }))

  // Séparer les items
  const standardMains = itemsWithStock.filter(i => i.category === 'main' && !RMR_SLUGS.has(i.slug))
  const rmrItems = itemsWithStock.filter(i => RMR_SLUGS.has(i.slug))
  const bundleItems = itemsWithStock.filter(i => BUNDLE_SLUGS.has(i.slug))
  const normalSides = itemsWithStock.filter(i => i.category === 'side' && !BUNDLE_SLUGS.has(i.slug))
  const drinks = itemsWithStock.filter(i => i.category === 'drink')

  // Total panier (cart classique + bundle)
  const cartTotal =
    items.reduce((s, item) => s + (cart[item.id] ?? 0) * item.price, 0) +
    Object.values(bundleCart).reduce((s, v) => s + v.qty * v.price, 0)

  const cartItemCount =
    Object.values(cart).reduce((s, q) => s + q, 0) +
    Object.values(bundleCart).reduce((s, v) => s + v.qty, 0)

  const currentZone = DELIVERY_ZONES.find(z => z.name === zone)
  const minOrder = currentZone?.min ?? 0
  const canCheckout = cartTotal >= minOrder && cartItemCount > 0

  // Filtrer les plats par onglet
  const getTabItems = () => {
    if (activeTab === 'all') return standardMains
    if (activeTab === 'main') return standardMains
    if (activeTab === 'side') return normalSides
    if (activeTab === 'drink') return drinks
    return []
  }

  const TAB_LABELS: Record<Tab, string> = {
    all: 'Menu', main: 'Plats', side: 'Snacks', drink: 'Boissons',
  }

  const renderDishCard = (item: FoodItem) => {
    const outOfStock = item.remaining_stock === 0
    const qty = cart[item.id] ?? 0
    const isDailySpecial = item.slug === dailySlug

    return (
      <div key={item.id} style={{
        background: '#0D1A0D',
        border: `1px solid ${isDailySpecial ? '#F5C518' : outOfStock ? '#1a2a1a' : '#1a3a1a'}`,
        borderRadius: 14, padding: '12px',
        display: 'flex', gap: 10,
        opacity: outOfStock ? 0.55 : 1,
        position: 'relative',
      }}>
        {isDailySpecial && !outOfStock && (
          <div style={{
            position: 'absolute', top: -1, right: 12,
            background: '#F5C518', color: '#0D0D0D',
            fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 900,
            padding: '3px 8px', borderRadius: '0 0 8px 8px',
            letterSpacing: '0.05em',
          }}>
            ★ PLAT DU SOIR
          </div>
        )}

        <Spin360
          emoji={item.emoji || '🍽️'}
          alt={item.name}
          accent="#F5C518"
          size={58}
          {...visual('food/rakomoria', item.slug)}
        />

        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: outOfStock ? '#555' : '#fff', marginBottom: 2 }}>
            {item.name}
          </div>
          {item.description && (
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: '#666', lineHeight: 1.45, marginBottom: 6 }}>
              {item.description}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--fo)', fontSize: 15, fontWeight: 700, color: outOfStock ? '#555' : '#F5C518' }}>
              {item.price}€
            </span>
            {outOfStock ? (
              <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: '#555' }}>Épuisé</span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => remove(item.id)} disabled={qty === 0} style={{
                  width: 36, height: 36, borderRadius: '50%',
                  border: '1px solid #F5C51860', background: 'transparent',
                  color: '#F5C518', fontSize: 16, cursor: qty === 0 ? 'default' : 'pointer',
                  opacity: qty === 0 ? 0.35 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>−</button>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: qty > 0 ? '#fff' : '#555', minWidth: 14, textAlign: 'center' }}>
                  {qty}
                </span>
                <button onClick={() => isOpen && add(item.id)} disabled={qty >= item.remaining_stock || !isOpen} style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: qty >= item.remaining_stock ? 'transparent' : '#F5C518',
                  border: `1px solid ${qty >= item.remaining_stock ? '#555' : '#F5C518'}`,
                  color: '#0D0D0D', fontSize: 16, fontWeight: 700,
                  cursor: qty >= item.remaining_stock ? 'default' : 'pointer',
                  opacity: qty >= item.remaining_stock ? 0.35 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>+</button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ===== HERO ===== */}
      <div style={{
        background: 'url(/images/food/nuit/rakomoria-bg.jpg) center/cover no-repeat',
        position: 'relative', overflow: 'hidden',
        borderBottom: '1px solid #1a3a1a',
      }}>
        {/* Motif tropical SVG */}
        <svg style={{ position: 'absolute', top: 0, right: 0, opacity: 0.04, width: 200, height: 200 }} viewBox="0 0 100 100" fill="none">
          <path d="M50 0 C30 20 20 40 50 60 C80 40 70 20 50 0Z" fill="#F5C518"/>
          <path d="M20 30 C0 50 10 70 40 60 C30 40 10 30 20 30Z" fill="#F5C518"/>
          <path d="M80 30 C100 50 90 70 60 60 C70 40 90 30 80 30Z" fill="#F5C518"/>
        </svg>

        {/* Voile sombre au-dessus du motif fleuri (lisibilité) */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,12,8,0.82) 0%, rgba(5,12,8,0.6) 55%, rgba(5,12,8,0.92) 100%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', padding: '1.4rem 1.4rem 1.2rem', maxWidth: 720, margin: '0 auto' }}>
          {/* Top */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <Link href="/food" style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#F5C518', fontSize: 14, textDecoration: 'none',
            }}>←</Link>
            <span style={{
              background: isOpen ? '#1A4D1A' : liveStatus === 'sold_out' ? '#3D0D0D' : 'rgba(50,50,60,0.6)',
              color: isOpen ? '#F5C518' : liveStatus === 'sold_out' ? '#C0392B' : '#666',
              border: `1px solid ${isOpen ? '#2d7a2d' : liveStatus === 'sold_out' ? '#C0392B60' : '#333'}`,
              fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 99,
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--fo)',
            }}>
              {isOpen && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5C518', animation: 'pulse 2s infinite', display: 'inline-block' }} />}
              {isOpen ? 'Ouvert ce soir' : liveStatus === 'sold_out' ? 'Épuisé' : 'Fermé'}
            </span>
          </div>

          {/* Halal badges */}
          <div style={{ marginBottom: 12 }}>
            <HalalBadge />
          </div>

          {/* Nom + tagline */}
          <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'rgba(245,197,24,0.5)', letterSpacing: '0.1em', marginBottom: 4 }}>
            NIKKA FOOD · {provider.city?.toUpperCase() ?? 'NICE'}
          </div>
          <div style={{ fontFamily: 'var(--fn)', fontSize: 30, color: '#fff', letterSpacing: '0.02em', marginBottom: 6 }}>
            {provider.name}
          </div>
          <div style={{
            fontFamily: 'var(--fo)', fontSize: 14, fontStyle: 'italic',
            color: '#F5C518', marginBottom: 12, fontWeight: 700,
          }}>
            &ldquo;Du goût, du frais, du bonheur !&rdquo;
          </div>
          {provider.description && (
            <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 12, lineHeight: 1.5 }}>
              {provider.description}
            </div>
          )}

          {/* Chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ background: '#1A4D1A', border: '1px solid #2d7a2d', color: '#F5C518', fontSize: 11, padding: '4px 10px', borderRadius: 99, fontFamily: 'var(--fo)', fontWeight: 700 }}>
              🕙 21h00 – 03h00
            </span>
            <span style={{ background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.2)', color: '#F5C518', fontSize: 11, padding: '4px 10px', borderRadius: 99, fontFamily: 'var(--fo)' }}>
              🛵 Nice Est / Nord min. 10€
            </span>
            <span style={{ background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.2)', color: '#F5C518', fontSize: 11, padding: '4px 10px', borderRadius: 99, fontFamily: 'var(--fo)' }}>
              🛵 Nice Centre / Ouest min. 20€
            </span>
          </div>
        </div>
      </div>

      {/* ===== FERMÉ ===== */}
      {!isOpen && (
        <div style={{ maxWidth: 720, margin: '1.4rem auto', padding: '0 1.2rem' }}>
          <div className="food-alert">
            <div className="food-alert-emoji">{liveStatus === 'sold_out' ? '🍽️' : '🌙'}</div>
            <div className="food-alert-title">
              {liveStatus === 'sold_out' ? 'Épuisé ce soir' : 'Fermé pour le moment'}
            </div>
            <div className="food-alert-sub">
              {liveStatus === 'sold_out'
                ? 'Rakomoria a tout vendu ! Rendez-vous demain.'
                : 'Ouverture à 21h00, du mardi au dimanche.'}
            </div>
          </div>
        </div>
      )}

      {/* ===== TABS ===== */}
      <div style={{
        background: '#0D0D0D', borderBottom: '1px solid #1a3a1a',
        display: 'flex', overflowX: 'auto', scrollbarWidth: 'none',
        maxWidth: 720, margin: '0 auto',
      }}>
        {(['all', 'main', 'side', 'drink'] as Tab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '11px 18px', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700,
            color: activeTab === tab ? '#F5C518' : '#555',
            background: 'transparent', border: 'none', cursor: 'pointer',
            borderBottom: `2px solid ${activeTab === tab ? '#F5C518' : 'transparent'}`,
            whiteSpace: 'nowrap', transition: 'color 0.15s',
          }}>
            {({ all: 'Tout', main: 'Plats', side: 'Snacks', drink: 'Boissons' } as Record<Tab,string>)[tab]}
          </button>
        ))}
      </div>

      {/* ===== CONTENT ===== */}
      <main style={{
        maxWidth: 720, margin: '0 auto',
        padding: '0.8rem 1.2rem',
        paddingBottom: cartItemCount > 0 ? '7rem' : '3rem',
        background: '#0D0D0D', minHeight: '40vh',
      }}>
        {/* Plat du jour */}
        {(activeTab === 'all' || activeTab === 'main') && <DailySpecialBanner />}

        {/* Section manga (jeu/ven/sam) */}
        {isRMRDay && (activeTab === 'all' || activeTab === 'main') && rmrItems.length > 0 && (
          <MangaMenuSection
            items={rmrItems as MangaItem[]}
            cart={cart}
            onAdd={add}
            onRemove={remove}
            isOpen={isOpen}
          />
        )}

        {/* Plats principaux standards */}
        {(activeTab === 'all' || activeTab === 'main') && standardMains.length > 0 && (
          <div style={{ marginBottom: '1.2rem' }}>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: '#2d7a2d', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 0' }}>
              🍽️ Plats Comoriens
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {standardMains.map(renderDishCard)}
            </div>
          </div>
        )}

        {/* Bundle items (triangles, samboussa) */}
        {(activeTab === 'all' || activeTab === 'side') && bundleItems.length > 0 && (
          <div style={{ marginBottom: '1.2rem' }}>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: '#2d7a2d', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 0' }}>
              🥟 Snacks Comoriens
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bundleItems.map(item => (
                <BundleQtySelector
                  key={item.id}
                  itemId={item.id}
                  slug={item.slug}
                  name={item.name}
                  emoji={item.emoji}
                  description={item.description}
                  bundleOptions={BUNDLE_OPTIONS[item.slug] ?? [{ qty: 1, price: item.price, label: '× 1' }]}
                  cart={bundleCart}
                  onAdd={addBundle}
                  onRemove={removeBundle}
                  remainingStock={item.remaining_stock}
                  isOpen={isOpen}
                />
              ))}
            </div>
          </div>
        )}

        {/* Snacks normaux */}
        {(activeTab === 'all' || activeTab === 'side') && normalSides.length > 0 && (
          <div style={{ marginBottom: '1.2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {normalSides.map(renderDishCard)}
            </div>
          </div>
        )}

        {/* Boissons */}
        {(activeTab === 'all' || activeTab === 'drink') && drinks.length > 0 && (
          <div style={{ marginBottom: '1.2rem' }}>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: '#2d7a2d', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 0' }}>
              🌿 Boissons 100% Maison
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {drinks.map(renderDishCard)}
            </div>
          </div>
        )}
      </main>

      {/* ===== CART BAR ===== */}
      {isOpen && cartItemCount > 0 && (
        <div className="page-action-bar" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#1A4D1A', borderTop: '1px solid #2d7a2d',
          padding: '0.9rem 1.4rem', zIndex: 360,
        }}>
          {/* Zone selector compact */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {DELIVERY_ZONES.map(z => (
              <button key={z.name} onClick={() => setZone(z.name)} style={{
                fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
                padding: '5px 12px', borderRadius: 99, whiteSpace: 'nowrap',
                background: zone === z.name ? '#F5C518' : 'rgba(245,197,24,0.1)',
                color: zone === z.name ? '#0D0D0D' : '#F5C518',
                border: `1px solid ${zone === z.name ? '#F5C518' : 'rgba(245,197,24,0.3)'}`,
                cursor: 'pointer',
              }}>
                {z.name} (min. {z.min}€)
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: '#fff' }}>
                {cartItemCount} article{cartItemCount > 1 ? 's' : ''} — {cartTotal.toFixed(2)} €
              </div>
              {!canCheckout && (
                <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: '#F5C51899' }}>
                  {(minOrder - cartTotal).toFixed(2)} € avant commande
                </div>
              )}
            </div>
            <Link
              href={canCheckout ? '/food/rakomoriafood/checkout' : '#'}
              onClick={e => !canCheckout && e.preventDefault()}
              style={{
                fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700,
                padding: '11px 24px', borderRadius: 10,
                background: canCheckout ? '#F5C518' : '#2d5a2d',
                color: canCheckout ? '#0D0D0D' : '#555',
                textDecoration: 'none', cursor: canCheckout ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s',
              }}
            >
              Commander →
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
