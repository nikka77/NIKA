import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'dan@nika.fr';

export async function GET(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Non configuré' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Admin client non configuré' }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pending';

  const { data: pois, error } = await admin.from('pois').select('*').eq('status', status).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pois });
}
