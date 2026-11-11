// app/api/dan/[matricule]/mots/route.ts — livre d'or et suggestions d'une carte DAN.
// GET  → { livre: [{nom, texte, date}], suggestions: [texte] }
// POST → { genre: 'livre' | 'suggestion', texte, nom? }
// Sans base configurée, répond 503 : la carte retombe alors sur le stockage de l'appareil.
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { trouverCarte } from '@/lib/dan/cartes';

const cap = (v: unknown, n: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

type Ctx = { params: Promise<{ matricule: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { matricule } = await params;
  if (!trouverCarte(matricule)) return NextResponse.json({ error: 'Carte inconnue' }, { status: 404 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Service indisponible' }, { status: 503 });
  const { data, error } = await admin.from('dan_mots')
    .select('genre, nom, texte, created_at')
    .eq('matricule', matricule).eq('visible', true)
    .order('created_at', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: 'Lecture impossible' }, { status: 503 });
  const rows = data ?? [];
  return NextResponse.json({
    livre: rows.filter(r => r.genre === 'livre').map(r => ({ nom: r.nom, texte: r.texte, date: r.created_at })),
    suggestions: rows.filter(r => r.genre === 'suggestion').map(r => r.texte).reverse(),
  });
}

export async function POST(req: Request, { params }: Ctx) {
  const { matricule } = await params;
  if (!trouverCarte(matricule)) return NextResponse.json({ error: 'Carte inconnue' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const genre = body.genre === 'suggestion' ? 'suggestion' : body.genre === 'livre' ? 'livre' : null;
  const texte = cap(body.texte, genre === 'suggestion' ? 200 : 280);
  const nom = (cap(body.nom, 40) || 'Anonyme').toUpperCase();
  if (!genre || !texte) return NextResponse.json({ error: 'Texte manquant' }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Service indisponible' }, { status: 503 });
  const { data, error } = await admin.from('dan_mots')
    .insert({ matricule, genre, nom, texte })
    .select('nom, texte, created_at').single();
  if (error || !data) return NextResponse.json({ error: 'Enregistrement impossible' }, { status: 503 });
  return NextResponse.json({ mot: { nom: data.nom, texte: data.texte, date: data.created_at } });
}
