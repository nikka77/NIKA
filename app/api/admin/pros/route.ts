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
  const verified = searchParams.get('verified');

  let query = admin.from('pros').select('*').order('created_at', { ascending: false });
  if (verified === 'false') query = query.eq('verified', false);
  if (verified === 'true') query = query.eq('verified', true);

  const { data: pros, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pros });
}
