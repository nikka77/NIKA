// app/api/whatsapp/route.ts — webhook WhatsApp Cloud API (L5, secrétaire NIKA).
// SEUL rôle : vérifier l'origine et déposer les messages entrants dans la file pgmq.
// Aucune IA ici, aucun droit d'écriture sur le dépôt — le worker du Mac fait le reste.
// Déployé sur Vercel (Meta exige une URL publique) : c'est sûr précisément parce que c'est bête.
import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const admin = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

/** Vérification d'abonnement Meta : echo du challenge si le jeton correspond. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN)
    return new Response(challenge ?? '', { status: 200 });
  return NextResponse.json({ error: 'forbidden' }, { status: 403 });
}

/** Réception des évènements : chaque message TEXTE de Dan part dans la file. */
export async function POST(req: Request) {
  const supabase = admin();
  if (!supabase) return NextResponse.json({ error: 'supabase absent' }, { status: 500 });

  // SIGNATURE : la route est publique — sans ce contrôle, n'importe qui peut injecter des tâches
  // dans la file de production. Meta signe chaque livraison en HMAC-SHA256 avec la clé de l'app.
  const brut = await req.text();
  const signature = req.headers.get('x-hub-signature-256') ?? '';
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return NextResponse.json({ error: 'secret absent' }, { status: 500 });
  const attendue = 'sha256=' + createHmac('sha256', secret).update(brut).digest('hex');
  const a = Buffer.from(signature), b = Buffer.from(attendue);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    return NextResponse.json({ error: 'signature invalide' }, { status: 401 });

  let corps: {
    entry?: Array<{ changes?: Array<{ value?: {
      messages?: Array<{ from?: string; id?: string; type?: string; timestamp?: string; text?: { body?: string } }>;
    } }> }>;
  };
  try { corps = JSON.parse(brut); } catch { return NextResponse.json({ ok: true }); }

  const messages = (corps.entry ?? [])
    .flatMap((e) => e.changes ?? [])
    .flatMap((c) => c.value?.messages ?? [])
    .filter((m) => m.type === 'text' && m.text?.body);

  // Secrétaire PERSONNEL : seuls les messages du numéro de Dan sont traités. Les autres
  // expéditeurs sont ignorés (200 quand même : Meta re-livre sinon, inutilement).
  const de_dan = messages.filter((m) => m.from && process.env.WHATSAPP_TO?.replace('+', '') === m.from);

  if (de_dan.length) {
    await supabase.rpc('ops_queue_send_batch', {
      messages: de_dan.map((m) => ({
        type: 'whatsapp_reponse',
        payload: { de: m.from, texte: m.text!.body, message_id: m.id, recu_a: m.timestamp },
      })),
    });
  }

  // Toujours 200 : Meta coupe les webhooks qui échouent trop souvent.
  return NextResponse.json({ ok: true });
}
