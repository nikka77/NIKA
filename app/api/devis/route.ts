// app/api/devis/route.ts — Devis SERV (v1 : demande client → artisan).
// POST : un client connecté crée une DEMANDE de devis (statut 'brouillon') vers un artisan domain='serv'.
// GET  : liste les devis de l'appelant — côté pro (artisan_id ∈ mes pros) ou côté client (client_id).
// SÉCURITÉ : identité dérivée de la session (getUser), jamais du body. Écriture via service-role
// (RLS devis = artisan-write / client-read → le client ne peut pas insérer ; on passe par l'admin,
// en posant client_id = user.id). La réponse de l'artisan (lignes + totaux + envoye/accepte) viendra
// dans une 2ᵉ passe (éditeur de devis).
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service indisponible' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Connecte-toi pour demander un devis' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const artisanId = String(body.artisanId ?? '');
  const categorie = String(body.categorie ?? '').trim().slice(0, 40);
  const description = String(body.description ?? '').trim().slice(0, 1000);
  if (!artisanId || description.length < 5) {
    return NextResponse.json({ error: 'Choisis un artisan et détaille ta demande.' }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Service indisponible' }, { status: 503 });

  // L'artisan doit exister et être du domaine SERV.
  const { data: pro } = await admin.from('pros').select('id, domain').eq('id', artisanId).single();
  if (!pro || pro.domain !== 'serv') {
    return NextResponse.json({ error: 'Artisan introuvable' }, { status: 400 });
  }

  // Snapshot d'identité client (mention légale du devis).
  const { data: me } = await admin.from('users').select('full_name, username').eq('id', user.id).single();
  const clientNom = me?.full_name || me?.username || 'Client NIKA';

  const ref = `DEV-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const validite = new Date();
  validite.setDate(validite.getDate() + 30);

  const { error } = await admin.from('devis').insert({
    reference: ref,
    statut: 'brouillon',
    artisan_id: artisanId,
    client_id: user.id,
    client_nom: clientNom,
    date_validite: validite.toISOString().slice(0, 10),
    notes: categorie ? `[${categorie}] ${description}` : description,
  });
  if (error) return NextResponse.json({ error: 'Échec de la demande' }, { status: 500 });

  return NextResponse.json({ ok: true, reference: ref });
}

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service indisponible' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Service indisponible' }, { status: 503 });

  // Suis-je artisan ? (un pro rattaché à mon compte)
  const { data: myPros } = await admin.from('pros').select('id').eq('user_id', user.id);
  const proIds = (myPros ?? []).map(p => p.id);

  let q = admin.from('devis')
    .select('id, reference, statut, client_nom, notes, artisan_id, total_ttc, date_emission, created_at')
    .order('created_at', { ascending: false }).limit(50);
  q = proIds.length ? q.in('artisan_id', proIds) : q.eq('client_id', user.id);

  const { data } = await q;
  return NextResponse.json({ devis: data ?? [], role: proIds.length ? 'pro' : 'client' });
}
