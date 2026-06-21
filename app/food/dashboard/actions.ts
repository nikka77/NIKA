'use server'
// app/food/dashboard/actions.ts — écritures du dashboard via admin client.
// SÉCURITÉ : les Server Actions sont appelables par quiconque connaît leur id (extrait
// du bundle) → chaque action exige une session authentifiée. NB : modèle mono-tenant
// (afroweek06) ; pour du multi-tenant, ajouter food_providers.owner_id + vérif de propriété.
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function requireUser() {
  const sb = await createClient()
  if (!sb) return null
  const { data: { user } } = await sb.auth.getUser()
  return user
}

// ─── Stocks ──────────────────────────────────────────────────────────────────

export async function updateStocks(updates: { id: string; remaining_stock: number }[]) {
  if (!(await requireUser())) return { error: 'Non authentifié' }
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
  if (!(await requireUser())) return { error: 'Non authentifié' }
  if (!['pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'].includes(status)) {
    return { error: 'Statut invalide' }
  }
  const supabase = createAdminClient()
  if (!supabase) return { error: 'Service indisponible' }

  const { error } = await supabase
    .from('food_orders')
    .update({ status })
    .eq('id', orderId)

  return { error: error?.message ?? null }
}

export async function cancelOrder(orderId: string) {
  if (!(await requireUser())) return { error: 'Non authentifié' }
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
  if (!(await requireUser())) return { error: 'Non authentifié', sessionId: null }
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
  if (!(await requireUser())) return { error: 'Non authentifié' }
  const supabase = createAdminClient()
  if (!supabase) return { error: 'Service indisponible' }

  const { error } = await supabase
    .from('food_sessions')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', sessionId)

  revalidatePath('/food/dashboard')
  return { error: error?.message ?? null }
}
