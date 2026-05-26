import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

// NIKA Credits packages: 10€ = 100 crédits, 25€ = 300 crédits, 50€ = 700 crédits
const CREDIT_PACKAGES: Record<string, { credits: number; price: number }> = {
  starter:   { credits: 100,  price: 1000  }, // 10€ en centimes
  standard:  { credits: 300,  price: 2500  }, // 25€
  premium:   { credits: 700,  price: 5000  }, // 50€
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const { packageId } = await req.json();
  const pkg = CREDIT_PACKAGES[packageId];
  if (!pkg) return NextResponse.json({ error: 'Package invalide' }, { status: 400 });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'eur',
        unit_amount: pkg.price,
        product_data: {
          name: `${pkg.credits} Crédits NIKA`,
          description: `Rechargement de ${pkg.credits} crédits NIKA pour votre compte`,
          images: [`${process.env.NEXT_PUBLIC_APP_URL}/logo.png`],
        },
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits`,
    metadata: { userId: user.id, credits: String(pkg.credits) },
  });

  return NextResponse.json({ url: session.url });
}
