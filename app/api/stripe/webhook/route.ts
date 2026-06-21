import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !whSecret) return NextResponse.json({ error: 'unconfigured' }, { status: 503 });

  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'no signature' }, { status: 400 });
  const body = await req.text();

  const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, credits } = session.metadata || {};
    const creditAmount = parseInt(credits || '', 10);
    const paymentId = (session.payment_intent as string) || session.id;
    if (!userId || !Number.isFinite(creditAmount) || creditAmount <= 0) {
      return NextResponse.json({ received: true });
    }

    const admin = createAdminClient();
    if (!admin) { console.error('[stripe] service-role indisponible'); return NextResponse.json({ received: true }); }

    // Idempotent + atomique : la RPC insère la transaction (stripe_payment_id UNIQUE)
    // et ne crédite qu'une seule fois (no-op si l'évènement est rejoué).
    const { error } = await admin.rpc('grant_purchase_credits', {
      p_user: userId, p_amount: creditAmount, p_payment_id: paymentId,
    });
    if (error) console.error('[stripe] grant_purchase_credits', error.message);
  }

  return NextResponse.json({ received: true });
}
