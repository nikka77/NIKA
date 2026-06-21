// app/api/next-number/route.ts — prochain numéro NIKA disponible (CTA « Rejoindre #N »).
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return Response.json({ next: 10 });
  const { data, error } = await supabase.rpc('get_next_number');
  if (error || data == null) return Response.json({ next: 10 });
  return Response.json({ next: Number(data) });
}
