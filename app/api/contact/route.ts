import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cap = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n);

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = cap(body.name, 120);
  const email = cap(body.email, 160);
  const subject = cap(body.subject, 160);
  const message = cap(body.message, 4000);
  if (!name || !email || !subject || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Email invalide' }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  const { error } = await admin.from('contact_messages').insert({ name, email, subject, message });
  if (error) return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
