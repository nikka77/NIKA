// scripts/lib/whatsapp.mjs — envoi WhatsApp conscient de la FENÊTRE DE 24 H de Meta.
// Hors fenêtre (24 h après le dernier message ENTRANT de Dan), le texte libre est jeté en
// silence par Meta (erreur différée 131047 — l'API répond 200). Stratégie : parquer le
// message (ops_notes, source wa_sortant), prévenir par les canaux de repli, et livrer
// automatiquement dès que Dan écrit à nouveau (viderParc, appelé par le worker du chat).
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/** La fenêtre de service est-elle sûrement ouverte ? (marge d'1 h par défaut sur les 24 h) */
export async function fenetreOuverte(margeHeures = 1) {
  const { data } = await sb.from('ops_notes').select('content').eq('source', 'whatsapp')
    .order('id', { ascending: false }).limit(1);
  try {
    const a = Number(JSON.parse(data?.[0]?.content ?? '{}').a ?? 0);
    return a > 0 && Date.now() / 1000 - a < (24 - margeHeures) * 3600;
  } catch { return false; }
}

export async function envoyerTexteBrut(texte, vers = process.env.WHATSAPP_TO) {
  const r = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    signal: AbortSignal.timeout(20_000),
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: vers, type: 'text', text: { body: texte } }),
  });
  return r.ok;
}

/** Texte direct si la fenêtre est sûre, sinon parc — le nudge de repli est au choix de l'appelant. */
export async function envoyerOuParquer(texte) {
  if (await fenetreOuverte()) {
    if (await envoyerTexteBrut(texte).catch(() => false)) return 'direct';
  }
  await sb.from('ops_notes').insert({ source: 'wa_sortant', done: false, content: texte });
  return 'parqué';
}

/** À l'arrivée d'un message de Dan (fenêtre garantie ouverte) : livrer ce qui attendait. */
export async function viderParc() {
  const { data } = await sb.from('ops_notes').select('id, content').eq('source', 'wa_sortant')
    .eq('done', false).order('id', { ascending: true }).limit(5);
  let livres = 0;
  for (const n of data ?? []) {
    if (await envoyerTexteBrut(`📬 Arrivé pendant ton absence :\n${n.content}`).catch(() => false)) {
      await sb.from('ops_notes').update({ done: true }).eq('id', n.id);
      livres++;
    }
  }
  return livres;
}
