// scripts/ops-ecoute-fenetre.mjs — ÉCOUTE des messages WhatsApp adressés à la SESSION Claude Code.
//
// POURQUOI (04/08/2026, demande de Dan)
// Deux Claude répondent sur WhatsApp et ils ne se valent pas : le CLI du VPS est disponible 24/7
// mais repart de zéro à chaque message ; la session ouverte sur le Mac porte tout le contexte de
// la journée (ce qu'on a réparé, où en est chaque univers, ce qu'on a décidé). Le préfixe
// « Claude ici » aiguille vers la seconde — le worker du VPS se met alors en retrait
// (voir agent-worker.mjs, garde `pourLaFenetre`) et dépose le message dans ops_notes/wa_fenetre.
//
// Ce script est le versant écoute : une boucle légère qui n'ÉMET que s'il y a du nouveau. Branché
// sur un Monitor, il transforme un sondage en notifications — la session n'est réveillée que
// quand Dan écrit vraiment, et la latence tombe à ~20 s au lieu des 5 min d'un réveil périodique.
//
// Usage : node --env-file=.env.local scripts/ops-ecoute-fenetre.mjs [--intervalle=20]
import { clientOps } from '../lib/ops/db.mjs';

const INTERVALLE = Number(process.argv.find((a) => a.startsWith('--intervalle='))?.split('=')[1] ?? 20);
const sb = clientOps();
const vus = new Set();

// Au démarrage : on marque comme vus les messages DÉJÀ traités, sinon un redémarrage de l'écoute
// rejouerait tout l'historique en rafale de notifications.
{
  const { data } = await sb.from('ops_notes').select('id').eq('source', 'wa_fenetre').eq('done', true);
  for (const n of data ?? []) vus.add(n.id);
}

for (;;) {
  try {
    const { data, error } = await sb.from('ops_notes').select('id, content')
      .eq('source', 'wa_fenetre').eq('done', false).order('id', { ascending: true }).limit(5);
    if (error) throw new Error(error.message);
    for (const n of data ?? []) {
      if (vus.has(n.id)) continue;
      vus.add(n.id);
      let texte = n.content;
      try { texte = JSON.parse(n.content).texte ?? n.content; } catch { /* contenu brut */ }
      // UNE ligne = UNE notification. Le préfixe permet de la reconnaître d'un coup d'œil.
      console.log(`📨 WHATSAPP DE DAN [note ${n.id}] : ${String(texte).replace(/\s+/g, ' ').slice(0, 400)}`);
      await sb.from('ops_notes').update({ done: true }).eq('id', n.id);
    }
  } catch (e) {
    // Une panne réseau ne doit pas tuer l'écoute — on le dit et on continue.
    console.log(`⚠ écoute : ${String(e.message ?? e).slice(0, 120)}`);
  }
  await new Promise((r) => setTimeout(r, INTERVALLE * 1000));
}
