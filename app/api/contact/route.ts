import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const body = await req.json();
  const { name, email, subject, message } = body;
  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  const { error } = await admin.from('contact_messages').insert({ name, email, subject, message });
  if (error) return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
