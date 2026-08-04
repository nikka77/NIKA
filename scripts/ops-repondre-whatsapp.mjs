// scripts/ops-repondre-whatsapp.mjs — répond à Dan sur WhatsApp depuis la session Claude Code.
//
// Pendant du script d'écoute (ops-ecoute-fenetre.mjs) : celui-ci écoute, celui-là parle. Il passe
// par envoyerOuParquer, donc il respecte la fenêtre de 24 h de Meta — hors fenêtre, le message
// est parqué et livré dès que Dan réécrit, au lieu d'être jeté en silence par l'API.
//
// Usage : node --env-file=.env.local scripts/ops-repondre-whatsapp.mjs "le texte de la réponse"
//         echo "texte" | node --env-file=.env.local scripts/ops-repondre-whatsapp.mjs
import { envoyerOuParquer } from './lib/whatsapp.mjs';

const argTexte = process.argv.slice(2).filter((a) => !a.startsWith('--')).join(' ').trim();
const texte = argTexte || await new Promise((res) => {
  let buf = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => { buf += d; });
  process.stdin.on('end', () => res(buf.trim()));
});
if (!texte) { console.error('rien à envoyer'); process.exit(1); }

// Signature explicite : Dan doit savoir LEQUEL des deux Claude lui répond — celui qui a le
// contexte de la session, ou le CLI du VPS qui repart de zéro.
const sort = await envoyerOuParquer(`🖥️ Claude Code (session) — ${texte.slice(0, 3800)}`);
console.log(sort === 'direct' ? '✓ envoyé' : '⏸ parqué (fenêtre 24 h fermée) — livré au prochain message de Dan');
