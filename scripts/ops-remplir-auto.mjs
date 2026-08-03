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
import { clientOps } from '../lib/ops/db.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { LIMITES_FOURNISSEURS } from '../lib/ops/limites.mjs';

const run = promisify(execFile);
const supabase = clientOps();
const DRY = process.argv.includes('--dry');
const SEUIL = Number(process.argv.find((a) => a.startsWith('--seuil='))?.split('=')[1] ?? 30);
const MAX = Number(process.argv.find((a) => a.startsWith('--max='))?.split('=')[1] ?? 400);

// Les juges du double verdict et leur plafond quotidien. Les plafonds ne sont PLUS recopiés ici :
// ils viennent de lib/ops/limites.mjs, la même source que le worker et la console (02/08). La
// copie manuelle annonçait encore gemma-4-31b à 11 500/jour et llama-70b à 800 — deux modèles
// qui ne sont plus au jury — et dimensionnait donc les commandes sur un budget imaginaire.
// Un juge sans guichet quotidien (DeepInfra, facturé au jeton) ne limite rien : Infinity.
const JUGES = [
  process.env.NIKA_JUGE1 ?? 'deepinfra/meta-llama/Llama-3.3-70B-Instruct-Turbo',
  process.env.NIKA_JUGE2 ?? 'openrouter/google/gemma-4-26b-a4b-it:free',
].map((cle) => ({
  cle,
  parJour: LIMITES_FOURNISSEURS[cle]?.parJour
    ?? LIMITES_FOURNISSEURS[String(cle).split('/')[0]]?.parJour
    ?? Infinity,
}));
// Répartition des commandes. `fiches` a été ajoutée le 01/08 et c'est LE déblocage : jusque-là
// seuls les PERSONNAGES étaient servis (ops-fill-fandom), ce qui laissait 1 972 entrées Naruto
// — jutsu, artefacts, lieux, statuts — hors d'atteinte de l'usine, quelle que soit la cadence.
// Naruto : 43 % de la base pour 19 % de descFr, contre 88 % à Hunter x Hunter.
// `relations` est ROUVERTE depuis le 01/08 : l'usine écrivait jusque-là dans un champ que le
// site ne lit pas (70 liens validés par Dan, 0 arête de graphe). Maintenant que l'approbation
// verse dans akasha_relations, chaque relation produite devient visible sur la fiche publique.
// Sa part reste modeste : l'infobox Fandom couvre le factuel en masse et gratuitement, l'IA
// n'a de valeur que sur le narratif qu'aucune infobox ne dit (« a trahi », « ancien élève de »).
const PART = {
  fandom: Number(process.env.NIKA_PART_FANDOM ?? 0.35),
  fiches: Number(process.env.NIKA_PART_FICHES ?? 0.35),
  attrs: Number(process.env.NIKA_PART_ATTRS ?? 0.15),
  relations: Number(process.env.NIKA_PART_RELATIONS ?? 0.15),
};
// Les quatre rôles non-personnages tournent, un par passage du timer (20 min) : chacun est
// servi toutes les 80 min, sans qu'un rôle prolifique n'affame les autres.
const ROLES_TOUR = ['fiche_technique', 'fiche_lexique', 'fiche_artefact', 'fiche_lieu'];
const ROLE_DU_TOUR = ROLES_TOUR[Math.floor(Date.now() / 1_200_000) % ROLES_TOUR.length];

// On ne compte QUE les tâches de PRODUCTION. Bug du 01/08 : la file totale servait de seuil,
// or elle contient aussi les relectures — 89 verdicts en attente faisaient croire à une usine
// occupée et le ravitaillement ne commandait plus rien. Résultat : zéro production pendant une
// heure pendant que les juges finissaient tranquillement leur travail. Les deux étages ont des
// rythmes différents (1 production = 2 relectures), il faut les jauger séparément.
const { data: parType } = await supabase.rpc('ops_queue_by_type');
// ARBITRAGE EXCLU AUSSI (03/08) : les lots `arbitrage_claude_lot` ne sont pas de la production
// — ils vivent sur le guichet Claude (400/jour) et, une fois celui-ci fermé, s'accumulent sans
// être servis. 2 234 lots morts comptaient comme « 2 234 productions en file » : le
// ravitaillement s'est tu pendant des heures et l'usine a tourné à vide, file pleine. Un étage
// qui a son propre guichet doit être jaugé à part, comme les juges.
const enFileProd = (parType ?? [])
  .filter((r) => r.task_type !== 'review_local' && !String(r.task_type).startsWith('arbitrage_'))
  .reduce((n, r) => n + Number(r.en_attente ?? 0), 0);
const enFileJuges = (parType ?? [])
  .filter((r) => r.task_type === 'review_local')
  .reduce((n, r) => n + Number(r.en_attente ?? 0), 0);
if (enFileProd > SEUIL) {
  console.log(`${enFileProd} production(s) en file (> ${SEUIL}) — rien à commander`);
  process.exit(0);
}
console.log(`file : ${enFileProd} production(s) · ${enFileJuges} relecture(s) en attente`);

// Budget restant du jour, juge par juge. La fenêtre de 24 h GLISSE (elle ne se remet pas à
// zéro à minuit) : une ligne dont la fenêtre a plus de 24 h est déjà périmée, donc pleine.
const { data: quotas } = await supabase.from('ops_quotas').select('fournisseur, requetes, fenetre_debut');
const consomme = new Map((quotas ?? []).map((q) => [q.fournisseur, q]));
// SOMME et non MINIMUM (02/08) : depuis la rotation de couloirs, un juge à guichet fermé est
// REMPLACÉ (Qwen, mistral-small…), il ne bloque plus la chaîne. Dimensionner sur le plus
// contraint refusait de commander dès que gemma finissait ses 450 — pendant que DeepInfra
// (sans plafond) attendait du travail. Chaque production consomme DEUX verdicts tirés du pool :
// le vrai plafond du jour est (somme des guichets restants) / 2.
let total = 0;
const detail = [];
for (const j of JUGES) {
  const ligne = consomme.get(`${j.cle}:jour`);
  const perimee = !ligne || Date.now() - new Date(ligne.fenetre_debut).getTime() > 86_400_000;
  const restant = perimee ? j.parJour : Math.max(0, j.parJour - (ligne.requetes ?? 0));
  detail.push(`${j.cle.split('/').pop()} ${restant}/${j.parJour}`);
  total += restant;
}
const plafond = total / 2;
console.log(`budget juges restant → ${detail.join(' · ')}`);

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
