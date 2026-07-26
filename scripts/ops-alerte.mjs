// scripts/ops-alerte.mjs — envoyer une alerte depuis le shell : node scripts/ops-alerte.mjs "message"
import { envoyerAlerte } from './lib/alerte.mjs';
const texte = process.argv.slice(2).join(' ').trim();
if (!texte) { console.error('usage: node scripts/ops-alerte.mjs "message"'); process.exit(1); }
console.log('canaux :', (await envoyerAlerte(texte)).join(' · '));
