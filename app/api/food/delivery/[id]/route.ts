// app/api/food/delivery/[id]/route.ts — détail d'une livraison pour l'app livreur.
// Le livreur s'identifie par localStorage (pas de session Supabase) → rôle anon, qui
// n'a plus accès aux colonnes PII de food_orders (cf. nika_food_pii.sql). On lit donc
// via le client ADMIN (service-role), par l'UUID de livraison qui fait office de jeton.
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Service indisponible' }, { status: 503 });

  const { data, error } = await admin
    .from('food_deliveries')
    .select('id, status, eta_seconds, driver_id, food_orders(id, customer_name, delivery_address, customer_phone, delivery_lat, delivery_lng)')
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Livraison introuvable' }, { status: 404 });
  return NextResponse.json({ delivery: data });
}
