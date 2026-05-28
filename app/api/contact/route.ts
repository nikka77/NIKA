import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const body = await req.json();
  const { name, email, subject, message } = body;
  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  const admin = createAdminClient();
  if (admin) {
    await admin.from('contact_messages').insert({ name, email, subject, message });
  }
  return NextResponse.json({ ok: true });
}
