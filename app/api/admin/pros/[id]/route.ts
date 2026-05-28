import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'dan@nika.fr';
type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Non configuré' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Admin client non configuré' }, { status: 503 });

  const body = await request.json();
  const allowedFields = ['verified', 'active'];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowedFields.includes(k)));

  const { error } = await admin.from('pros').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
