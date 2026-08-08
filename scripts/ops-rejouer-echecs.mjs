// scripts/ops-rejouer-echecs.mjs — REMET EN FILE les tâches mortes pour une cause désormais réparée.
//
// POURQUOI (08/08/2026)
// 2 802 tâches dormaient en `pending|failed`. Elles n'ont pas échoué à cause de leur contenu : la
// grande majorité a heurté un couloir LLM fermé pendant que le worker classait ce 402 comme « tâche
// fautive » (corrigé le 07/08) puis retentait DeepInfra sans fin (cause racine corrigée le 08/08 :
// la clé qui marquait un couloir épuisé n'était pas celle qui vérifiait sa disponibilité). Un échec
// rejouable qui dort est du travail perdu ; un échec structurel rejoué en boucle est de l'argent
// brûlé. Ce script fait le tri sur le MOTIF, et lui seul.
//
// Ce qu'il REJOUE :
//   · guichet fermé (402/401/403) et quotas transitoires (429) — la cause est réparée
//   · réseau et délais dépassés — l'aléa ne se reproduit pas forcément
//   · lots d'arbitrage refusés sur `id` attendu en nombre — le schéma accepte désormais la chaîne
//     (z.coerce.number, 07/08), mais SEULEMENT si --arbitrages est demandé : cet étage a son propre
//     guichet (400 lots/jour, modèle fixe) et l'inonder affamerait les autres.
// Ce qu'il N'ÉCARTE PAS À LA LÉGÈRE — et ne rejoue donc pas :
//   · corruption détectée par la garde de code (charabia, langue étrangère) : le refus est JUSTE
//   · CLI claude absent : vrai sur le VPS, ce n'est pas un aléa
//   · schémas non respectés : à instruire, pas à relancer en masse
//
// Usage : node --env-file=.env.local scripts/ops-rejouer-echecs.mjs [--dry] [--limit=800] [--arbitrages]
import { writeFile } from 'node:fs/promises';
import { clientOps } from '../lib/ops/db.mjs';
import { dejaEnFile } from './lib/deja-en-file.mjs';

const DRY = process.argv.includes('--dry');
const AVEC_ARBITRAGES = process.argv.includes('--arbitrages');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 800);
const o = clientOps();

/** Le motif dit-il « la tâche était mauvaise » ou « le moment était mauvais » ? */
function famille(err, type) {
  const s = String(err ?? '');
  if (/402|positive balance|401|403|api key|unauthor/i.test(s)) return { cle: 'guichet fermé', rejouable: true };
  if (/429|rate limit|quota|plafond/i.test(s)) return { cle: 'quota transitoire', rejouable: true };
  if (/timeout|ETIMEDOUT|fetch failed|ECONNRESET|socket|network/i.test(s)) return { cle: 'réseau', rejouable: true };
  if (/corruption|charabia|langue étrang/i.test(s)) return { cle: 'corruption (refus juste)', rejouable: false };
  if (/\bclaude\b/i.test(s) && /introuv|absent|ENOENT|not found/i.test(s)) return { cle: 'CLI claude absent', rejouable: false };
  if (/expected.*number|invalid_type/i.test(s) && /arbitrage/.test(type)) return { cle: 'lot d\'arbitrage (schéma corrigé)', rejouable: AVEC_ARBITRAGES };
  // PLAFOND DE JETONS RELEVÉ le 08/08 (fiche_section 1 600 → 2 600) : les sections mortes sur
  // « titre » ou « texte » coupé sont redevenues produisibles. Leur cause est fermée, pas contournée.
  if (/fiche_section/.test(type) && /custom|too_small|coupée|plafond/i.test(s)) return { cle: 'section coupée (plafond relevé)', rejouable: true };
  // Le CLI répondait en prose faute de jeton valide — jeton régénéré le 08/08.
  if (/Command failed: claude/i.test(s)) return { cle: 'CLI claude (jeton régénéré)', rejouable: true };
  // Source momentanément injoignable : l'absence de réponse n'est pas une absence de source.
  if (/fandom injoignable|saturé|HTTP 5\d\d/i.test(s)) return { cle: 'source ou couloir saturé', rejouable: true };
  if (/schema|zod|invalid_type|too_small|parse/i.test(s)) return { cle: 'schéma non respecté', rejouable: false };
  return { cle: 'motif non classé', rejouable: false };
}

const rows = [];
for (let d = 0; ; d += 1000) {
  const { data, error } = await o.from('agent_results')
    .select('id, task_type, target_slug, payload, error, created_at')
    .eq('review_status', 'pending').eq('status', 'failed')
    .order('id', { ascending: true }).range(d, d + 999);
  if (error) { console.error(error.message); process.exit(1); }
  rows.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
console.log(`${rows.length} tâche(s) en échec examinée(s)`);

// IDEMPOTENCE : on ne recommande pas ce qui attend déjà (leçon du 07/08 — 97 productions pour la
// même entité parce qu'aucun garde ne regardait la file).
const dejaVus = await dejaEnFile(o);

const comptes = new Map();
const aRejouer = [];
const ecartes = [];
for (const r of rows) {
  const f = famille(r.error, r.task_type);
  comptes.set(f.cle, (comptes.get(f.cle) ?? 0) + 1);
  if (!f.rejouable) { ecartes.push({ id: r.id, type: r.task_type, slug: r.target_slug, motif: f.cle }); continue; }
  if (r.target_slug && dejaVus.has(r.target_slug)) { ecartes.push({ id: r.id, type: r.task_type, slug: r.target_slug, motif: 'déjà en attente' }); continue; }
  if (!r.payload) { ecartes.push({ id: r.id, type: r.task_type, slug: r.target_slug, motif: 'charge utile absente' }); continue; }
  aRejouer.push(r);
}
console.log('── par famille :');
for (const [k, v] of [...comptes.entries()].sort((a, b) => b[1] - a[1])) console.log(`   ${String(v).padStart(5)}  ${k}`);

// UN SEUL EXEMPLAIRE PAR COUPLE (entité, type) : plusieurs échecs d'une même fiche décrivent le
// même travail, pas plusieurs travaux.
const vus = new Set();
const lot = [];
for (const r of aRejouer) {
  const cle = `${r.target_slug ?? r.id}|${r.task_type}`;
  if (vus.has(cle)) continue;
  vus.add(cle);
  lot.push(r);
  if (lot.length >= LIMIT) break;
}
console.log(`\n${aRejouer.length} rejouable(s) → ${lot.length} message(s) après déduplication et plafond (--limit=${LIMIT})`);
console.log(`${ecartes.length} écartée(s) avec motif`);

const trace = {
  chantier: 'rejeu des échecs', quand: new Date().toISOString(), dry: DRY,
  examinees: rows.length, familles: [...comptes.entries()].map(([cle, n]) => ({ cle, n })),
  rejoues: lot.map((r) => ({ id: r.id, type: r.task_type, slug: r.target_slug })),
  ecartes,
};
await writeFile(new URL('../data/audits/rejeu-echecs-trace.json', import.meta.url), JSON.stringify(trace, null, 1));

if (DRY) { console.log('\n(à blanc — rien envoyé)'); process.exit(0); }
if (!lot.length) { console.log('rien à rejouer'); process.exit(0); }

const messages = lot.map((r) => ({ type: r.task_type, payload: r.payload }));
let envoyes = 0;
for (let i = 0; i < messages.length; i += 200) {
  const { data: ids, error } = await o.rpc('ops_queue_send_batch', { messages: messages.slice(i, i + 200) });
  if (error) { console.error('envoi pgmq:', error.message); break; }
  envoyes += ids?.length ?? 0;
}
// Les lignes d'origine sortent de `pending` : leur rejeu vit désormais dans la file, et les laisser
// en attente bloquerait le garde d'idempotence sur ces entités (leçon du 07/08).
for (let i = 0; i < lot.length; i += 200) {
  await o.from('agent_results').update({ review_status: 'rejected', error: '↻ rejoué le 08/08 (cause réparée) — voir data/audits/rejeu-echecs-trace.json' })
    .in('id', lot.slice(i, i + 200).map((r) => r.id));
}
console.log(`→ ${envoyes} tâche(s) remise(s) en file, ${lot.length} ligne(s) d'origine closes`);
console.log('trace : data/audits/rejeu-echecs-trace.json');
