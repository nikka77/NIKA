// scripts/ops-remplir-auto.mjs — REMPLISSEUR ADAPTATIF de l'usine continue (L23, 01/08/2026).
//
// L'usine tourne désormais 24/7 (nika-usine.service) au lieu d'une salve nocturne. Ce script
// est son ravitaillement : appelé toutes les 20 min par un timer, il ne fait quelque chose
// QUE si la file est presque vide, et il commande exactement ce que le budget du jour permet.
//
// Deux règles qui expliquent tout le code :
//  1. RECHARGE À FILE BASSE. Les remplisseurs excluent les fiches ayant déjà une relecture en
//     attente, mais PAS celles déjà en file (aucune trace en base tant qu'elles ne sont pas
//     traitées). Ne recharger qu'à file quasi vide rend donc les doublons impossibles en
//     pratique, sans table de suivi ni RPC supplémentaire.
//  2. DIMENSIONNÉ PAR LES JUGES. Chaque production consomme 1 appel à CHAQUE juge : la
//     cadence maximale du jour n'est pas celle du producteur mais celle du juge le plus
//     contraint. On commande ce nombre-là, jamais plus — sinon la file gonfle de tâches qui
//     seront reportées (et le worker passerait sa nuit à faire la sieste).
//
// Usage : node --env-file=.env.local scripts/ops-remplir-auto.mjs [--dry] [--seuil=30] [--max=400]
import { createClient } from '@supabase/supabase-js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');
const SEUIL = Number(process.argv.find((a) => a.startsWith('--seuil='))?.split('=')[1] ?? 30);
const MAX = Number(process.argv.find((a) => a.startsWith('--max='))?.split('=')[1] ?? 400);

// Les juges du double verdict, avec leur plafond quotidien (miroir de LIMITES_FOURNISSEURS
// dans agent-worker.mjs — si tu changes un plafond là-bas, reporte-le ici).
const JUGES = [
  { cle: process.env.NIKA_JUGE1 ?? 'gemini/gemma-4-31b-it', parJour: 11_500 },
  { cle: process.env.NIKA_JUGE2 ?? 'groq/llama-3.3-70b-versatile', parJour: 800 },
];
// Répartition des commandes. `fiches` a été ajoutée le 01/08 et c'est LE déblocage : jusque-là
// seuls les PERSONNAGES étaient servis (ops-fill-fandom), ce qui laissait 1 972 entrées Naruto
// — jutsu, artefacts, lieux, statuts — hors d'atteinte de l'usine, quelle que soit la cadence.
// Naruto : 43 % de la base pour 19 % de descFr, contre 88 % à Hunter x Hunter.
// `relations` est à ZÉRO en attendant que l'usine soit branchée sur le graphe : ses relations
// s'écrivent aujourd'hui dans un champ que le site ne lit pas — des jetons et des tours de
// review dépensés pour rien. À remonter à ~0,15 dès le branchement livré.
const PART = {
  fandom: Number(process.env.NIKA_PART_FANDOM ?? 0.40),
  fiches: Number(process.env.NIKA_PART_FICHES ?? 0.40),
  attrs: Number(process.env.NIKA_PART_ATTRS ?? 0.20),
  relations: Number(process.env.NIKA_PART_RELATIONS ?? 0),
};
// Les quatre rôles non-personnages tournent, un par passage du timer (20 min) : chacun est
// servi toutes les 80 min, sans qu'un rôle prolifique n'affame les autres.
const ROLES_TOUR = ['fiche_technique', 'fiche_lexique', 'fiche_artefact', 'fiche_lieu'];
const ROLE_DU_TOUR = ROLES_TOUR[Math.floor(Date.now() / 1_200_000) % ROLES_TOUR.length];

const { data: metrics } = await supabase.rpc('ops_queue_metrics');
const enFile = metrics?.[0]?.queue_length ?? 0;
if (enFile > SEUIL) {
  console.log(`file à ${enFile} tâche(s) (> ${SEUIL}) — rien à commander, l'usine a de quoi faire`);
  process.exit(0);
}

// Budget restant du jour, juge par juge. La fenêtre de 24 h GLISSE (elle ne se remet pas à
// zéro à minuit) : une ligne dont la fenêtre a plus de 24 h est déjà périmée, donc pleine.
const { data: quotas } = await supabase.from('ops_quotas').select('fournisseur, requetes, fenetre_debut');
const consomme = new Map((quotas ?? []).map((q) => [q.fournisseur, q]));
let plafond = Infinity;
const detail = [];
for (const j of JUGES) {
  const ligne = consomme.get(`${j.cle}:jour`);
  const perimee = !ligne || Date.now() - new Date(ligne.fenetre_debut).getTime() > 86_400_000;
  const restant = perimee ? j.parJour : Math.max(0, j.parJour - (ligne.requetes ?? 0));
  detail.push(`${j.cle.split('/').pop()} ${restant}/${j.parJour}`);
  plafond = Math.min(plafond, restant);
}
console.log(`file : ${enFile} · budget juges restant → ${detail.join(' · ')}`);

// Marge de 10 % : l'arbitre et les relectures rejouées consomment aussi ces guichets.
const commande = Math.min(MAX, Math.floor(plafond * 0.9));
if (commande < 10) {
  console.log('budget du jour épuisé — on laisse la fenêtre glisser (aucune commande)');
  process.exit(0);
}

const lots = {
  fandom: Math.round(commande * PART.fandom),
  fiches: Math.round(commande * PART.fiches),
  attrs: Math.round(commande * PART.attrs),
  relations: Math.round(commande * PART.relations),
};
console.log(`commande : ${commande} tâches → personnages ${lots.fandom} · ${ROLE_DU_TOUR} ${lots.fiches}`
  + ` · axes ${lots.attrs} · relations ${lots.relations}`);
if (DRY) process.exit(0);

// Chaque entrée porte ses arguments propres : le rôle du tour n'est passé qu'aux fiches.
const SCRIPTS = {
  fandom: ['scripts/ops-fill-fandom.mjs'],
  fiches: ['scripts/ops-fill-fiches.mjs', `--role=${ROLE_DU_TOUR}`],
  attrs: ['scripts/ops-fill-attrs.mjs'],
  relations: ['scripts/ops-fill-relations.mjs'],
};
for (const [nom, n] of Object.entries(lots)) {
  if (n < 1) continue;
  try {
    const { stdout } = await run(process.execPath, ['--env-file=.env.local', ...SCRIPTS[nom], `--limit=${n}`],
      { cwd: process.cwd(), maxBuffer: 8 * 1024 * 1024, timeout: 300_000 });
    console.log(`  ${nom} :`, stdout.trim().split('\n').pop() ?? 'ok');
  } catch (e) {
    // Jamais silencieux : un remplisseur muet = une usine qui tourne à vide sans qu'on le sache.
    console.error(`  ✗ ${nom} :`, String(e.message ?? e).slice(0, 200));
  }
}
