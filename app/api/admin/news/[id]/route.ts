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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const allowed = ['status'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) if (body[key] !== undefined) update[key] = body[key];
  const { error } = await admin.from('news').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const { error } = await admin.from('news').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
