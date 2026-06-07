'use server'
// app/food/dashboard/actions.ts — toutes les écritures du dashboard via admin client
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ─── Stocks ──────────────────────────────────────────────────────────────────

export async function updateStocks(updates: { id: string; remaining_stock: number }[]) {
  const supabase = createAdminClient()
  if (!supabase) return { error: 'Service indisponible' }

  const errors: string[] = []
  await Promise.all(updates.map(async ({ id, remaining_stock }) => {
    const { error } = await supabase
      .from('food_session_stocks')
      .update({ remaining_stock })
      .eq('id', id)
    if (error) errors.push(error.message)
  }))

  revalidatePath('/food/dashboard/stock')
  return { error: errors.length ? errors[0] : null }
}

// ─── Commandes ───────────────────────────────────────────────────────────────

export async function updateOrderStatus(orderId: string, status: string) {
  const supabase = createAdminClient()
  if (!supabase) return { error: 'Service indisponible' }

  const { error } = await supabase
    .from('food_orders')
    .update({ status })
    .eq('id', orderId)

  return { error: error?.message ?? null }
}

export async function cancelOrder(orderId: string) {
  const supabase = createAdminClient()
  if (!supabase) return { error: 'Service indisponible' }

  const { error } = await supabase
    .from('food_orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)

  return { error: error?.message ?? null }
}

// ─── Session ─────────────────────────────────────────────────────────────────

export async function openSession(providerId: string) {
  const supabase = createAdminClient()
  if (!supabase) return { error: 'Service indisponible', sessionId: null }

  const today = new Date().toISOString().split('T')[0]

  // Chercher une session existante
  const { data: existing } = await supabase
    .from('food_sessions')
    .select('id, status')
    .eq('provider_id', providerId)
    .eq('date', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('food_sessions')
      .update({ status: 'open', closed_at: null })
      .eq('id', existing.id)
    revalidatePath('/food/dashboard')
    return { error: error?.message ?? null, sessionId: existing.id }
  }

  // Créer une nouvelle session
  const { data: newSession, error } = await supabase
    .from('food_sessions')
    .insert({ provider_id: providerId, date: today, status: 'open' })
    .select('id')
    .single()

  revalidatePath('/food/dashboard')
  return { error: error?.message ?? null, sessionId: newSession?.id ?? null }
}

export async function closeSession(sessionId: string) {
  const supabase = createAdminClient()
  if (!supabase) return { error: 'Service indisponible' }

  const { error } = await supabase
    .from('food_sessions')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', sessionId)

  revalidatePath('/food/dashboard')
  return { error: error?.message ?? null }
}
