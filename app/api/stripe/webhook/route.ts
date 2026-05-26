import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, credits } = session.metadata || {};
    if (!userId || !credits) return NextResponse.json({ received: true });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const creditAmount = parseInt(credits);

    // Log transaction
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: creditAmount,
      type: 'purchase',
      stripe_payment_id: session.payment_intent as string,
    });

    // Add credits to user
    const { data: user } = await supabase.from('users').select('nika_credits').eq('id', userId).single();
    if (user) {
      await supabase.from('users').update({ nika_credits: user.nika_credits + creditAmount }).eq('id', userId);
    }
  }

  return NextResponse.json({ received: true });
}
