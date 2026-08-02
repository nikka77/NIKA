// scripts/ops-prioriser-file.mjs — REORDONNE la file par priorité (01/08/2026).
//
// pgmq sert dans l'ordre d'arrivée, sans notion de priorité. Quand Dan demande « traite Death
// Note maintenant », ses tâches arrivent au fond d'une file de plusieurs centaines et passent
// en dernier — l'inverse de ce qu'il a demandé. Ce script vide la file, trie, et la remplit
// dans l'ordre voulu. RIEN N'EST PERDU : chaque message est réémis avec sa charge utile
// intacte, seul l'ordre change.
//
// Ordre appliqué :
//   1. les RELECTURES (review_local) — elles concernent des productions déjà faites qui
//      attendent leur verdict ; les retarder, c'est retarder toute la chaîne de qualité ;
//   2. les productions des univers PRIORITAIRES, dans l'ordre donné ;
//   3. tout le reste, dans son ordre d'origine.
//
// Usage : node --env-file=.env.local scripts/ops-prioriser-file.mjs --univers="Death Note,Initial D" [--dry]
import { createClient } from '@supabase/supabase-js';
import { clientOps } from '../lib/ops/db.mjs';

const supabase = clientOps();
const DRY = process.argv.includes('--dry');
const PRIORITAIRES = (process.argv.find((a) => a.startsWith('--univers='))?.split('=')[1] ?? '')
  .split(',').map((s) => s.trim()).filter(Boolean);
const DABORD = (process.argv.find((a) => a.startsWith('--dabord='))?.split('=')[1] ?? '')
  .split(',').map((s) => s.trim()).filter(Boolean);

// Visibilité longue (10 min) : le temps de tout lire et de tout réémettre sans qu'un worker
// ne reprenne un message à mi-chemin. On archive AU FUR ET À MESURE de la réémission.
const lus = [];
for (let tour = 0; tour < 60; tour++) {
  const { data, error } = await supabase.rpc('ops_queue_read', { vt: 600, qty: 100 });
  if (error) { console.error('lecture :', error.message); process.exit(1); }
  if (!data?.length) break;
  lus.push(...data);
}
console.log(`${lus.length} message(s) sortis de la file`);
if (!lus.length) process.exit(0);

const universDe = (m) => m.message?.payload?.universe ?? null;
const rang = (m) => {
  // --dabord=<type> : un CHANTIER passe devant tout, relectures comprises (02/08). Sans lui,
  // un pilote de 4 tâches lancé derrière 400 relectures attend une heure pour être vu — le
  // worker cycle à vide, rend les tâches des autres couloirs et se rendort 30 s.
  if (DABORD.length) {
    const i = DABORD.indexOf(m.message?.type);
    if (i >= 0) return -10 + i;
  }
  // La qualité d'abord — mais les relectures ne sont pas interchangeables. Sans distinction
  // d'univers, les 129 verdicts Death Note attendaient derrière 240 verdicts d'univers que Dan
  // n'avait pas demandés : la file avançait, « Death Note en attente » ne bougeait pas (02/08).
  if (m.message?.type === 'review_local') {
    const i = PRIORITAIRES.indexOf(universDe(m));
    return i >= 0 ? -1 + i / 1000 : 0;
  }
  const u = universDe(m);
  const i = PRIORITAIRES.indexOf(u);
  return i >= 0 ? 1 + i : 100;                                    // puis les univers demandés
};
let tri = [...lus].sort((a, b) => rang(a) - rang(b) || a.msg_id - b.msg_id);

// --entrelacer : ALTERNER relectures et productions au lieu de les empiler par bloc (02/08).
//
// Trier par priorité produit une file EN DEUX BLOCS, et pgmq sert dans l'ordre : le nœud passe
// donc une demi-heure à ne faire que juger, puis une demi-heure à ne faire que produire. Mesuré
// aujourd'hui dans les deux sens — 169 verdicts et 0 production, puis 77 productions et 0
// verdict. À chaque fois la moitié des couloirs regarde l'autre travailler, alors qu'ils ont des
// compteurs séparés et pourraient tourner ensemble.
//
// Deux pour un : chaque production appelle DEUX verdicts, c'est le rapport qui garde les deux
// étages au même rythme. Ce qui reste quand un côté s'épuise est simplement mis à la suite.
if (process.argv.includes('--entrelacer')) {
  const relectures = tri.filter((m) => m.message?.type === 'review_local');
  const productions = tri.filter((m) => m.message?.type !== 'review_local');
  const melange = [];
  let i = 0, j = 0;
  while (i < relectures.length || j < productions.length) {
    for (let k = 0; k < 2 && i < relectures.length; k++) melange.push(relectures[i++]);
    if (j < productions.length) melange.push(productions[j++]);
  }
  console.log(`entrelacement : ${relectures.length} relectures et ${productions.length} productions, deux pour une`);
  tri = melange;
}

const compte = {};
for (const m of tri) { const k = rang(m) === 0 ? 'relectures' : (universDe(m) ?? 'autre'); compte[k] = (compte[k] ?? 0) + 1; }
console.log('nouvel ordre :', Object.entries(compte).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));

if (DRY) {
  console.log('(à blanc — la file reste telle quelle, les messages redeviendront visibles dans 10 min)');
  process.exit(0);
}

// Réémission par paquets, PUIS archivage des anciens : si le script meurt entre les deux, on
// aura des doublons (bénins, le remplisseur dédoublonne) plutôt qu'une file amputée.
let remis = 0;
for (let i = 0; i < tri.length; i += 50) {
  const lot = tri.slice(i, i + 50);
  const { error } = await supabase.rpc('ops_queue_send_batch', { messages: lot.map((m) => m.message) });
  if (error) { console.error('réémission :', error.message); process.exit(1); }
  // Par LOT : archiver 750 messages un par un coutait ~30 s de latence reseau pure (40 ms
  // l'aller-retour vers Francfort) — pgmq.archive accepte un tableau depuis toujours.
  await supabase.rpc('ops_queue_archive_batch', { message_ids: lot.map((m) => m.msg_id) });
  remis += lot.length;
  process.stdout.write(`\r  réordonnés : ${remis}/${tri.length}`);
}
console.log(`\n✓ file réordonnée — ${PRIORITAIRES.join(' puis ') || 'aucun univers prioritaire'} passent devant`);
