import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

async function checkAdmin() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== (process.env.ADMIN_EMAIL || 'dan@nika.fr')) return null;
  return createAdminClient();
}

export async function GET(req: Request) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  let query = admin.from('news').select('id, title, content, upvotes, status, created_at, users(username)').order('created_at', { ascending: false }).limit(50);
  if (status && status !== 'all') query = query.eq('status', status);
  const { data } = await query;
  return NextResponse.json(data || []);
}
