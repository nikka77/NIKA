// scripts/lib/alerte.mjs — canal d'alerte NIKA OPS (routine de nuit, audit hebdo, sentinelles).
// Trois transports, du meilleur au repli — on envoie sur TOUS ceux qui sont configurés :
//   1. WhatsApp via Meta Cloud API (officiel)  : WHATSAPP_TOKEN + WHATSAPP_PHONE_ID + WHATSAPP_TO
//   2. WhatsApp via CallMeBot (perso, 2 min)   : CALLMEBOT_PHONE + CALLMEBOT_APIKEY
//   3. Notification macOS (toujours disponible) : rien à configurer
// Jamais de secret ni de donnée client dans une alerte : uniquement de l'état opérationnel.
import { execFile } from 'node:child_process';

export async function envoyerAlerte(texte) {
  const canaux = [];

  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID && process.env.WHATSAPP_TO) {
    try {
      const r = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
        method: 'POST',
        signal: AbortSignal.timeout(15_000),
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp', to: process.env.WHATSAPP_TO,
          type: 'text', text: { body: texte },
        }),
      });
      canaux.push(r.ok ? 'whatsapp-meta' : `whatsapp-meta HTTP ${r.status}`);
    } catch (e) { canaux.push('whatsapp-meta erreur: ' + String(e).slice(0, 60)); }
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

  // Repli local : toujours, pour que l'alarme existe dès ce soir même sans clé WhatsApp.
  await new Promise((resolve) => {
    execFile('osascript', ['-e',
      `display notification ${JSON.stringify(texte.slice(0, 200))} with title "NIKA OPS" sound name "Submarine"`,
    ], () => resolve());
  });
  canaux.push('notification-macos');

  return canaux;
}
