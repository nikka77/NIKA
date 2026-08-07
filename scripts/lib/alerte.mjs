// scripts/lib/alerte.mjs — canal d'alerte NIKA OPS (routine de nuit, audit hebdo, sentinelles).
// Trois transports, du meilleur au repli — on envoie sur TOUS ceux qui sont configurés :
//   1. WhatsApp via Meta Cloud API (officiel)  : WHATSAPP_TOKEN + WHATSAPP_PHONE_ID + WHATSAPP_TO
//   2. WhatsApp via CallMeBot (perso, 2 min)   : CALLMEBOT_PHONE + CALLMEBOT_APIKEY
//   3. Notification macOS (toujours disponible) : rien à configurer
// Jamais de secret ni de donnée client dans une alerte : uniquement de l'état opérationnel.
import { execFile } from 'node:child_process';
import { envoyerOuParquer } from './whatsapp.mjs';
import { clientOps } from '../../lib/ops/db.mjs';

/** SILENCE APRÈS LA PREMIÈRE FOIS (07/08/2026).
 *
 *  Une unité systemd en `Restart=always` qui refuse de démarrer déclenche son `OnFailure=` à
 *  chaque tentative : nika-secretaire a ainsi émis 7 952 fois la MÊME alerte le 03/08, une toutes
 *  les onze secondes, jusqu'à 8 039 exemplaires au total. Répétée, une alerte n'informe pas mieux —
 *  elle noie tout le reste, et c'est exactement ce qui est arrivé : les rapports de la journée sont
 *  devenus inatteignables sous la pile.
 *
 *  Une alerte identique n'est donc réémise qu'après un délai de garde. Le fait est le même ; s'il
 *  dure, il sera redit — une fois par demi-heure, ce qui suffit largement à ne pas l'oublier.
 *  Le compte des répétitions étouffées voyage avec la réémission : « (×271 depuis 22:14) » dit la
 *  gravité mieux que 271 messages identiques.
 */
const GARDE_MINUTES = Number(process.env.NIKA_ALERTE_GARDE_MIN ?? 30);

async function etoufferSiRepetee(texte) {
  try {
    const sb = clientOps();
    const depuis = new Date(Date.now() - GARDE_MINUTES * 60_000).toISOString();
    const { data } = await sb.from('ops_notes').select('id, created_at')
      .eq('source', 'wa_alerte_emise').eq('content', texte)
      .gte('created_at', depuis).order('id', { ascending: false }).limit(1);
    if (data?.length) return true;                       // déjà dite dans le délai de garde
    await sb.from('ops_notes').insert({ source: 'wa_alerte_emise', done: true, content: texte });
    return false;
  } catch {
    return false;    // base injoignable : on préfère une alerte de trop qu'une alerte perdue
  }
}

export async function envoyerAlerte(texte) {
  const canaux = [];
  if (await etoufferSiRepetee(texte)) return ['étouffée (identique il y a moins de ' + GARDE_MINUTES + ' min)'];

  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID && process.env.WHATSAPP_TO) {
    // Hors fenêtre de 24 h, Meta n'accepte que les TEMPLATES pour un message à l'initiative du
    // système (erreur 131047 sinon) — or nos alarmes partent à 2 h 30 du matin. Stratégie :
    // template « nika_alerte » (corps = {{1}}) si déclaré, texte brut en second essai sinon.
    const appel = (body) => fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: process.env.WHATSAPP_TO, ...body }),
    });
    try {
      let r;
      if (process.env.WHATSAPP_TEMPLATE) {
        r = await appel({
          type: 'template',
          template: {
            name: process.env.WHATSAPP_TEMPLATE,
            language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? 'fr' },
            components: [{ type: 'body', parameters: [{ type: 'text', text: texte.slice(0, 900) }] }],
          },
        });
      } else {
        // Sans template : hors fenêtre de 24 h, Meta jette le texte EN SILENCE (l'API répond
        // 200). envoyerOuParquer garde alors le contenu et le livre au prochain message de Dan.
        canaux.push('whatsapp-meta ' + (await envoyerOuParquer(texte)));
        r = null;
      }
      if (r && r.ok) canaux.push('whatsapp-meta');
      else if (r) {
        // Le template peut mourir sans prévenir (mis en pause qualité, désapprouvé, jeton
        // expiré — erreurs 132xxx/190). Consigner l'échec ne livre rien : une alerte critique
        // de 2 h 30 se perdait définitivement (audit 02/08). On PARQUE, comme le chemin sans
        // template — livrée au prochain message de Dan, jamais perdue.
        canaux.push(`whatsapp-meta HTTP ${r.status}: ${JSON.stringify((await r.json())?.error?.message ?? '').slice(0, 80)}`);
        canaux.push('parc ' + (await envoyerOuParquer(texte)));
      }
    } catch (e) {
      canaux.push('whatsapp-meta erreur: ' + String(e).slice(0, 60));
      try { canaux.push('parc ' + (await envoyerOuParquer(texte))); } catch { /* le parc est en base : si elle est morte, rien à faire */ }
    }
  }

  if (process.env.CALLMEBOT_PHONE && process.env.CALLMEBOT_APIKEY) {
    try {
      const r = await fetch(
        `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(process.env.CALLMEBOT_PHONE)}` +
        `&apikey=${encodeURIComponent(process.env.CALLMEBOT_APIKEY)}&text=${encodeURIComponent(texte)}`,
        { signal: AbortSignal.timeout(15_000) },
      );
      canaux.push(r.ok ? 'whatsapp-callmebot' : `callmebot HTTP ${r.status}`);
    } catch (e) { canaux.push('callmebot erreur: ' + String(e).slice(0, 60)); }
  }

  // Repli local macOS : toujours, pour que l'alarme existe même sans clé WhatsApp.
  // (Sous Linux/VPS : pas d'écran — le parc 24 h et WhatsApp couvrent, on n'émet rien ici.)
  if (process.platform === 'darwin') {
    await new Promise((resolve) => {
      execFile('osascript', ['-e',
        `display notification ${JSON.stringify(texte.slice(0, 200))} with title "NIKA OPS" sound name "Submarine"`,
      ], () => resolve());
    });
    canaux.push('notification-macos');
  }

  return canaux;
}
