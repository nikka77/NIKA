// app/api/reservation/route.ts — capture d'une demande de réservation (lead) issue d'un module hero.
// Persiste dans contact_messages (table existante, pas de DDL) ; rattache l'utilisateur si connecté.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const cap = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n);

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = cap(body.name, 120);
  const phone = cap(body.phone, 40);
  const email = cap(body.email, 160);
  const domaine = cap(body.domaine, 20);
  const ref = cap(body.ref, 60);
  const label = cap(body.label, 160);
  const date = cap(body.date, 60);
  const note = cap(body.note, 500);
  if (!name || !phone) return NextResponse.json({ error: 'Nom et téléphone requis' }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Service indisponible' }, { status: 503 });

  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const subject = `Réservation ${domaine.toUpperCase()} — ${label || ref}`;
  const message = [
    `Domaine : ${domaine}`,
    `Sélection : ${label || '—'} (réf ${ref || '—'})`,
    `Téléphone : ${phone}`,
    `Date souhaitée : ${date || '—'}`,
    `Note : ${note || '—'}`,
    `Utilisateur : ${user?.id || 'invité'}`,
  ].join('\n');

  // email NOT NULL en base → repli sur le téléphone si l'utilisateur n'en donne pas.
  const { error } = await admin.from('contact_messages').insert({ name, email: email || `tel:${phone}`, subject, message });
  if (error) return NextResponse.json({ error: 'Échec de l’enregistrement' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
