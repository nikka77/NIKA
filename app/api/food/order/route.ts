// app/api/food/order/route.ts — création de commande côté serveur.
// SÉCURITÉ : le total ET le débit de crédits sont recalculés ici à partir du prix
// réel du listing et du solde réel en base — jamais depuis le corps de la requête.
// L'utilisateur est dérivé de la session (getUser), pas du body. Le débit passe par
// la RPC atomique spend_nika_credits (autorisée par le trigger guard_users_privileged).
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// 10 crédits NIKA = 1 €
const CREDITS_PER_EURO = 10;

export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service indisponible' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const listingId = String(body.listingId ?? '');
  const proId = String(body.proId ?? '');
  const qty = Math.max(1, Math.min(50, Math.floor(Number(body.qty) || 1)));
  const payMode = body.payMode === 'credits' ? 'credits' : 'cash';
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) || null : null;
  if (!listingId || !proId) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Service indisponible' }, { status: 503 });

  // Prix de référence = celui du listing en base (jamais celui envoyé par le client).
  const { data: listing } = await admin
    .from('listings')
    .select('id, price, available, pro_id')
    .eq('id', listingId)
    .single();
  if (!listing || listing.available === false) {
    return NextResponse.json({ error: 'Article indisponible' }, { status: 400 });
  }
  if (listing.pro_id && listing.pro_id !== proId) {
    return NextResponse.json({ error: 'Article et commerce incohérents' }, { status: 400 });
  }

  const unit = Number(listing.price) || 0;
  const totalPrice = Math.round(unit * qty * 100) / 100;

  // Crédits : plafonnés au solde réel lu côté serveur.
  let creditsToUse = 0;
  let cashAmount = totalPrice;
  if (payMode === 'credits') {
    const { data: me } = await admin.from('users').select('nika_credits').eq('id', user.id).single();
    const balance = me?.nika_credits ?? 0;
    creditsToUse = Math.min(balance, Math.round(totalPrice * CREDITS_PER_EURO));
    cashAmount = Math.max(0, Math.round((totalPrice - creditsToUse / CREDITS_PER_EURO) * 100) / 100);
  }

  // Débit AVANT l'insert : si le solde a bougé, on échoue sans créer de commande fantôme.
  if (creditsToUse > 0) {
    const { error: debitErr } = await admin.rpc('spend_nika_credits', {
      p_user: user.id,
      p_amount: creditsToUse,
    });
    if (debitErr) {
      return NextResponse.json({ error: 'Solde de crédits insuffisant' }, { status: 409 });
    }
  }

  const { error: orderErr } = await admin.from('orders').insert({
    user_id: user.id,
    pro_id: proId,
    listing_id: listingId,
    status: 'pending',
    amount: cashAmount,
    nika_credits_used: creditsToUse,
    notes,
  });
  if (orderErr) {
    // Remboursement best-effort si l'insert échoue après le débit (service-role → autorisé par le guard).
    if (creditsToUse > 0) {
      const { data: cur } = await admin.from('users').select('nika_credits').eq('id', user.id).single();
      await admin.from('users').update({ nika_credits: (cur?.nika_credits ?? 0) + creditsToUse }).eq('id', user.id);
    }
    return NextResponse.json({ error: 'Échec de la commande' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, totalPrice, creditsUsed: creditsToUse, cashAmount });
}
