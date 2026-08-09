// scripts/lib/whatsapp.mjs — envoi WhatsApp conscient de la FENÊTRE DE 24 H de Meta.
// Hors fenêtre (24 h après le dernier message ENTRANT de Dan), le texte libre est jeté en
// silence par Meta (erreur différée 131047 — l'API répond 200). Stratégie : parquer le
// message (ops_notes, source wa_sortant), prévenir par les canaux de repli, et livrer
// automatiquement dès que Dan écrit à nouveau (viderParc, appelé par le worker du chat).
import { createClient } from '@supabase/supabase-js';
import { clientOps } from '../../lib/ops/db.mjs';

const sb = clientOps();

/** La fenêtre de service est-elle sûrement ouverte ? (marge d'1 h par défaut sur les 24 h) */
export async function fenetreOuverte(margeHeures = 1) {
  // On lit la RÉCEPTION (`wa_entrant`, écrit par le webhook à chaque message de Dan) autant que
  // l'échange réussi (`whatsapp`). Se fonder sur le seul échange réussi rendait le système aveugle
  // exactement quand il était en panne : quatre jours durant, les réponses échouaient, aucun
  // échange ne s'enregistrait, et tout partait au parc « fenêtre fermée » alors que Dan écrivait.
  //
  // ET `wa_fenetre` (09/08/2026), qui manquait — c'est la trace posée quand un message « Claude
  // ici » est routé vers la session. Les messages qui M'ÉTAIENT ADRESSÉS étaient donc exactement
  // ceux qui ne comptaient pas comme preuve de réception : Dan écrivait, je voyais son message, et
  // ma réponse partait au parc « fenêtre fermée » alors qu'elle venait de s'ouvrir. `wa_entrant`
  // ne compense pas : il est écrit par le webhook Vercel, dont le correctif n'est pas déployé.
  // Toute note qui PROUVE une réception ouvre la fenêtre — peu importe qui l'a écrite.
  const { data } = await sb.from('ops_notes').select('content')
    .in('source', ['whatsapp', 'wa_entrant', 'wa_fenetre'])
    .order('id', { ascending: false }).limit(5);
  const derniere = (data ?? []).reduce((max, n) => {
    try { return Math.max(max, Number(JSON.parse(n.content ?? '{}').a ?? 0)); } catch { return max; }
  }, 0);
  return derniere > 0 && Date.now() / 1000 - derniere < (24 - margeHeures) * 3600;
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

/** Texte direct si la fenêtre est sûre, sinon parc — le nudge de repli est au choix de l'appelant.
 *
 *  ANTI-RÉPÉTITION (07/08/2026) : une sentinelle qui crie toutes les cinq secondes parce qu'un
 *  service redémarre en boucle a rempli le parc de 8 039 exemplaires du MÊME message en deux jours
 *  (« nika-secretaire.service a ÉCHOUÉ », 7 952 rien que le 03/08). Une alerte répétée n'informe
 *  pas mieux : elle enterre tout le reste. On ne parque donc pas un message déjà parqué à
 *  l'identique et non encore livré — c'est le même fait, il attend déjà son tour. */
export async function envoyerOuParquer(texte) {
  if (await fenetreOuverte()) {
    if (await envoyerTexteBrut(texte).catch(() => false)) return 'direct';
  }
  const { count } = await sb.from('ops_notes')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'wa_sortant').eq('done', false).eq('content', texte);
  if (count) return 'déjà parqué';
  await sb.from('ops_notes').insert({ source: 'wa_sortant', done: false, content: texte });
  return 'parqué';
}

/** À l'arrivée d'un message de Dan (fenêtre garantie ouverte) : livrer ce qui attendait.
 *
 *  LES PLUS RÉCENTS D'ABORD (07/08/2026). Ce vidage servait les 5 PLUS ANCIENS : Dan recevait donc,
 *  à chaque message qu'il écrivait, cinq alertes vieilles de cinq jours sur un service qui
 *  remarchait depuis — pendant que les rapports du jour dormaient sous 8 000 messages, hors
 *  d'atteinte (il aurait fallu écrire 1 600 fois pour les faire remonter). Une nouvelle vaut
 *  toujours mieux qu'une nouvelle périmée : on sert du plus récent au plus ancien, et on solde
 *  d'office ce qui a plus de 24 h — une alerte de la semaine dernière n'appelle plus d'action,
 *  elle reste consultable en base mais n'encombre plus la conversation. */
export async function viderParc({ limite = 5, peremptionHeures = 24 } = {}) {
  const seuil = new Date(Date.now() - peremptionHeures * 3600_000).toISOString();
  const { count: perimes } = await sb.from('ops_notes')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'wa_sortant').eq('done', false).lt('created_at', seuil);
  if (perimes) {
    await sb.from('ops_notes').update({ done: true })
      .eq('source', 'wa_sortant').eq('done', false).lt('created_at', seuil);
  }

  const { data } = await sb.from('ops_notes').select('id, content').eq('source', 'wa_sortant')
    .eq('done', false).order('id', { ascending: false }).limit(limite);
  let livres = 0;
  for (const n of (data ?? []).reverse()) {          // remis dans l'ordre du temps à la lecture
    if (await envoyerTexteBrut(`📬 Arrivé pendant ton absence :\n${n.content}`).catch(() => false)) {
      await sb.from('ops_notes').update({ done: true }).eq('id', n.id);
      livres++;
    }
  }
  // Reste-t-il du courrier ? On le dit plutôt que de le laisser deviner.
  const { count: reste } = await sb.from('ops_notes')
    .select('id', { count: 'exact', head: true }).eq('source', 'wa_sortant').eq('done', false);
  if (reste) await envoyerTexteBrut(`📬 (${reste} message(s) plus ancien(s) encore en attente — écris à nouveau pour la suite.)`).catch(() => false);
  return livres;
}
