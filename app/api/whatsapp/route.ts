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
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    // UN REFUS SILENCIEUX EST INDISCERNABLE D'UN SILENCE (08/08/2026). Dan n'a plus reçu de
    // réponse pendant quatre jours ; la file du secrétaire était vide et son journal muet — donc
    // impossible de savoir si Meta n'appelait plus, ou si le webhook rejetait ses appels. On
    // consigne le refus (métadonnées seulement, jamais le corps signé) : la question se tranche
    // alors d'un coup d'œil dans ops_notes.
    await supabase.from('ops_notes').insert({
      source: 'wa_webhook', done: false,
      content: `signature REFUSÉE — reçue « ${signature.slice(0, 16)}… » (${signature.length} car.), attendue ${attendue.length} car. Le secret d'application de Vercel ne correspond pas à celui de l'app Meta.`,
    });
    return NextResponse.json({ error: 'signature invalide' }, { status: 401 });
  }

  let corps: {
    entry?: Array<{ changes?: Array<{ value?: {
      messages?: Array<{ from?: string; id?: string; type?: string; timestamp?: string; text?: { body?: string } }>;
      statuses?: Array<{ id?: string; status?: string; errors?: Array<{ code?: number; title?: string; message?: string }> }>;
    } }> }>;
  };
  try { corps = JSON.parse(brut); } catch { return NextResponse.json({ ok: true }); }

  const changements = (corps.entry ?? []).flatMap((e) => e.changes ?? []);

  // STATUTS D'ENVOI (audit 02/08) : Meta signale ici les échecs de NOS envois (template en pause
  // qualité, fenêtre fermée 131047, jeton…) — on les jetait, et une alerte perdue restait perdue
  // sans trace. Un statut « failed » part en ops_notes : visible dans /ops, et le contenu sera
  // relivré par le parc au prochain message de Dan.
  const echecs = changements
    .flatMap((c) => c.value?.statuses ?? [])
    .filter((st) => st.status === 'failed');
  if (echecs.length) {
    const supa = admin();
    if (supa) {
      // `content`, pas `note` : la table n'a JAMAIS eu de colonne `note` (08/08). Cet insert
      // échouait donc à chaque fois, et son erreur n'était pas lue — les échecs de livraison
      // WhatsApp, précisément ce qu'on voulait ne plus perdre, se perdaient en silence.
      const { error: errNote } = await supa.from('ops_notes').insert(echecs.map((st) => ({
        source: 'wa_echec', done: false,
        content: `whatsapp NON LIVRÉ (${st.id?.slice(-8) ?? '?'}) : ${(st.errors ?? []).map((e) => `${e.code} ${e.title ?? e.message ?? ''}`).join(' · ').slice(0, 200) || 'sans détail'}`,
      })));
      if (errNote) console.error('ops_notes (échec livraison) :', errNote.message);
    }
  }

  const messages = changements
    .flatMap((c) => c.value?.messages ?? [])
    .filter((m) => m.type === 'text' && m.text?.body);

  // Secrétaire PERSONNEL : seuls les messages du numéro de Dan sont traités. Les autres
  // expéditeurs sont ignorés (200 quand même : Meta re-livre sinon, inutilement).
  const de_dan = messages.filter((m) => m.from && process.env.WHATSAPP_TO?.replace('+', '') === m.from);

  // ÉCARTÉ ≠ ABSENT (08/08) : un message reçu mais rejeté par ce filtre partait avec un 200 et ne
  // laissait aucune trace. Si WHATSAPP_TO est mal renseigné côté Vercel — vide, ou dans un autre
  // format que celui de Meta — TOUS les messages de Dan disparaissent poliment. On consigne donc
  // ce qu'on a comparé, sans jamais publier le numéro en clair.
  const ecartes = messages.filter((m) => !de_dan.includes(m));
  if (ecartes.length) {
    const attendu = process.env.WHATSAPP_TO?.replace('+', '') ?? '';
    await supabase.from('ops_notes').insert({
      source: 'wa_webhook', done: false,
      content: `${ecartes.length} message(s) ÉCARTÉ(S) : expéditeur « …${(ecartes[0].from ?? '').slice(-4)} » `
        + `≠ WHATSAPP_TO « ${attendu ? '…' + attendu.slice(-4) : '(VIDE — variable absente côté Vercel)'} ».`,
    });
  }

  if (de_dan.length) {
    const { error: errFile } = await supabase.rpc('ops_chat_send_batch', {
      messages: de_dan.map((m) => ({
        type: 'whatsapp_reponse',
        payload: { de: m.from, texte: m.text!.body, message_id: m.id, recu_a: m.timestamp },
      })),
    });
    // Une mise en file qui échoue sans être lue, c'est un message perdu de plus.
    if (errFile) {
      console.error('ops_chat_send_batch :', errFile.message);
      await supabase.from('ops_notes').insert({
        source: 'wa_webhook', done: false,
        content: `mise en file IMPOSSIBLE pour ${de_dan.length} message(s) : ${errFile.message.slice(0, 180)}`,
      });
    }
  }

  // Toujours 200 : Meta coupe les webhooks qui échouent trop souvent.
  return NextResponse.json({ ok: true });
}
