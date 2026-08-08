// scripts/akasha-jojo-tree-slugs.mjs — LOT 4b, suite. Complète le prérequis « rapprochement des 8
// slugs manquants par alias de romanisation » (tasks/akasha-architecture.md §6.5 + §LOT 4) qui
// n'avait PAS été exécuté sous le nom « 3d » (le lot 3d réellement livré ne couvre que Naruto/
// Bleach/2 arêtes possede, grep confirmé sur data/audits/lot3d-corrections-*.json — aucune trace
// JoJo). scripts/akasha-jojo-family-tree-fixes.mjs (exécuté plus tôt) a posé les arêtes de graphe
// manquantes ; CE script complète les 8 entrées `attributes.family` qui citaient un nom sans jamais
// résoudre son slug, alors que la fiche existe déjà sous une romanisation légèrement différente
// (mesuré indépendamment le 08/08/2026 : exactement 8, sur 4 fiches) :
//
//   jonathan-joestar : father→George Joestar I, wife→Erina Pendleton, son→George Joestar II (×3)
//   joseph-joestar   : grandmother→Erina Joestar, wife→Suzi Q, daughter→Holy Kujo (×3)
//   jotaro-kujo      : mother→Holy Kujo (×1)
//   josuke-higashikata : mother→Tomoko Higashikata (×1)
//
// Chaque cible a une fiche vérifiée en base (slug donné en dur ci-dessous, résolu par requête,
// jamais deviné). AUCUNE de ces 8 entrées n'est modifiée en `rel`/`name` — seul le `slug` manquant
// est complété (ne jamais réécrire une curation existante).
//
// Complète aussi 5 fiches jusqu'ici SANS AUCUN attributes.family (vérifié : les 5 sont à "ABSENT"),
// toutes nécessaires pour que l'arbre remonte au-delà de Jonathan/Joseph sans mentir :
//   - george-i-joestar (père de Jonathan, père adoptif de Dio) — sourcé sur son propre descFr :
//     « George Joestar Ier est le père de Jonathan. […] George […] recueille donc Dio ».
//   - dario-brando (père biologique de Dio) — sourcé sur son propre descFr (« il envoie Dio vivre
//     chez George ») + l'arête famille déjà existante dario-brando→dio-brando (non créée ici).
//   - erina-pendleton (épouse de Jonathan) — sourcé : « ils […] se marièrent ». Volontairement PAS
//     de rel « son : George Joestar II » ici : son propre descFr mentionne un « nourrisson orphelin »
//     recueilli en fuyant le naufrage, formulation trop ambiguë pour trancher sans risquer d'énoncer
//     une filiation inventée — la filiation Jonathan/Erina→George II reste établie par AILLEURS
//     (jonathan-joestar.family + george-joestar-ii.family, déjà curés, croisés sur 3 infobox par le
//     script précédent), pas besoin de la répéter ici pour que le graphe tienne.
//   - ryouhei-higashikata / tomoko-higashikata — sourcés sur le propre descFr de Ryouhei : « Le
//     grand-père de Josuke, et le père de Tomoko Higashikata. » (FR déjà en base, aucune traduction
//     de ma part).
//
// Pose aussi l'UNIQUE arête `famille` manquante identifiée par cette mesure : josuke-higashikata ↔
// tomoko-higashikata (mère-fils). Elle est doublement sourcée (attributes.family déjà curé côté
// Josuke + descFr de Tomoko : « Elle est la mère célibataire de Josuke Higashikata ») mais absente
// du graphe `akasha_relations` — sans elle, la fiche Tomoko reste un îlot malgré la donnée déjà
// écrite ailleurs qui la relie.
//
// TRACE AVANT ÉCRITURE (data/audits/, horodatée). Sans --write : dry-run pur. Idempotent.
//
// Usage :
//   node --env-file=.env.local scripts/akasha-jojo-tree-slugs.mjs             # dry-run
//   node --env-file=.env.local scripts/akasha-jojo-tree-slugs.mjs --write     # applique
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WRITE = process.argv.includes('--write');
const db = clientSite();

const SLUGS = [
  'jonathan-joestar', 'joseph-joestar', 'jotaro-kujo', 'josuke-higashikata',
  'george-i-joestar', 'dario-brando', 'erina-pendleton', 'ryouhei-higashikata', 'tomoko-higashikata',
  'dio-brando', 'george-joestar-ii', 'holy-kuujou', 'suzie-q',
];

// ─────────────────────────────────────────────────────────────────────────
// 1. Compléter le `slug` manquant sur 8 entrées attributes.family EXISTANTES
//    (jamais toucher rel/name — seulement remplir slug si absent, sur la bonne entrée par nom).
// ─────────────────────────────────────────────────────────────────────────
const SLUG_FILLS = [
  { slug: 'jonathan-joestar', name: 'George Joestar I', fillSlug: 'george-i-joestar' },
  { slug: 'jonathan-joestar', name: 'Erina Pendleton', fillSlug: 'erina-pendleton' },
  { slug: 'jonathan-joestar', name: 'George Joestar II', fillSlug: 'george-joestar-ii' },
  { slug: 'joseph-joestar', name: 'Erina Joestar', fillSlug: 'erina-pendleton' },
  { slug: 'joseph-joestar', name: 'Suzi Q', fillSlug: 'suzie-q' },
  { slug: 'joseph-joestar', name: 'Holy Kujo', fillSlug: 'holy-kuujou' },
  { slug: 'jotaro-kujo', name: 'Holy Kujo', fillSlug: 'holy-kuujou' },
  { slug: 'josuke-higashikata', name: 'Tomoko Higashikata', fillSlug: 'tomoko-higashikata' },
];

async function planSlugFills(bySlug) {
  const plan = [];
  for (const f of SLUG_FILLS) {
    const e = bySlug.get(f.slug);
    if (!e) { plan.push({ ...f, status: 'fiche-introuvable' }); continue; }
    const target = bySlug.get(f.fillSlug);
    if (!target) { plan.push({ ...f, status: 'cible-introuvable' }); continue; }
    const arr = e.attributes?.family ?? [];
    const idx = arr.findIndex((x) => x.name === f.name);
    if (idx === -1) { plan.push({ ...f, status: 'entree-introuvable-dans-family', current: arr }); continue; }
    if (arr[idx].slug) { plan.push({ ...f, status: 'deja-slugee', current: arr[idx] }); continue; }
    plan.push({ ...f, status: 'a-completer', id: e.id, idx, before: arr, entry: arr[idx] });
  }
  return plan;
}

async function executeSlugFills(plan) {
  // BUG CORRIGÉ (rejoué le 08/08 après un premier passage) : plusieurs fills peuvent viser la
  // MÊME fiche (jonathan-joestar ×3, joseph-joestar ×3). Écrire un `update` par fill, chacun basé
  // sur `p.before` (l'instantané pris AU PLAN, avant toute écriture), fait que le 2e et 3e fill
  // écrasent le 1er avec l'ancien tableau non corrigé — seul le DERNIER fill par fiche survivait.
  // Correctif : grouper par fiche, appliquer TOUS les fills de cette fiche sur UNE lecture fraîche,
  // puis UN SEUL write par fiche.
  let updated = 0, skipped = 0;
  const byEntryId = new Map();
  for (const p of plan) {
    if (p.status !== 'a-completer') { skipped++; continue; }
    if (!byEntryId.has(p.id)) byEntryId.set(p.id, []);
    byEntryId.get(p.id).push(p);
  }
  for (const [id, fills] of byEntryId) {
    const attrs = await currentAttrs(id);
    const arr = attrs.family ?? [];
    const next = arr.map((x) => {
      const f = fills.find((f) => f.name === x.name && !x.slug);
      return f ? { ...x, slug: f.fillSlug } : x;
    });
    const { error } = await db.from('akasha_entries').update({ attributes: { ...attrs, family: next } }).eq('id', id);
    if (error) { console.error('  ✗', id, error.message); continue; }
    for (const f of fills) { updated++; console.log(`  slug complété : ${f.slug}.family["${f.name}"] → ${f.fillSlug}`); }
  }
  console.log(`  Slugs complétés : ${updated}, ${skipped} ignorés (déjà à jour/introuvable)`);
  return { updated, skipped };
}

async function currentAttrs(id) {
  const { data } = await db.from('akasha_entries').select('attributes').eq('id', id).single();
  return data?.attributes || {};
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Nouvelle curation attributes.family sur 5 fiches jusqu'ici sans AUCUNE — set uniquement si
//    le tableau actuel est vide (jamais d'écrasement).
// ─────────────────────────────────────────────────────────────────────────
const NEW_FAMILY = {
  'george-i-joestar': { set: [
    { rel: 'son', name: 'Jonathan Joestar', slug: 'jonathan-joestar' },
    { rel: 'adoptive_son', name: 'Dio Brando', slug: 'dio-brando' },
  ] },
  'dario-brando': { set: [
    { rel: 'son', name: 'Dio Brando', slug: 'dio-brando' },
  ] },
  'erina-pendleton': { set: [
    { rel: 'husband', name: 'Jonathan Joestar', slug: 'jonathan-joestar' },
  ] },
  'ryouhei-higashikata': { set: [
    { rel: 'daughter', name: 'Tomoko Higashikata', slug: 'tomoko-higashikata' },
    { rel: 'grandson', name: 'Josuke Higashikata', slug: 'josuke-higashikata' },
  ] },
  'tomoko-higashikata': { set: [
    { rel: 'father', name: 'Ryouhei Higashikata', slug: 'ryouhei-higashikata' },
    { rel: 'son', name: 'Josuke Higashikata', slug: 'josuke-higashikata' },
  ] },
};

async function planNewFamily(bySlug) {
  const plan = [];
  for (const [slug, patch] of Object.entries(NEW_FAMILY)) {
    const e = bySlug.get(slug);
    if (!e) { plan.push({ slug, status: 'fiche-introuvable' }); continue; }
    const current = e.attributes?.family || [];
    if (current.length) { plan.push({ slug, status: 'deja-curee', current }); continue; }
    plan.push({ slug, status: 'a-ecrire', id: e.id, next: patch.set });
  }
  return plan;
}

async function executeNewFamily(plan) {
  let updated = 0, skipped = 0;
  for (const p of plan) {
    if (p.status !== 'a-ecrire') { skipped++; continue; }
    const cur = await currentAttrs(p.id);
    const { error } = await db.from('akasha_entries').update({ attributes: { ...cur, family: p.next } }).eq('id', p.id);
    if (error) { console.error('  ✗', p.slug, error.message); continue; }
    updated++;
    console.log(`  attributes.family créé : ${p.slug} (${p.next.length} lien(s))`);
  }
  console.log(`  Nouvelles curations : ${updated}, ${skipped} ignorées`);
  return { updated, skipped };
}

// ─────────────────────────────────────────────────────────────────────────
// 3. L'unique arête `famille` manquante : Josuke ↔ Tomoko (mère-fils, doublement sourcée, cf. en-tête)
// ─────────────────────────────────────────────────────────────────────────
async function planMissingEdge(bySlug) {
  const from = bySlug.get('josuke-higashikata');
  const to = bySlug.get('tomoko-higashikata');
  if (!from || !to) return { status: 'fiche-introuvable' };
  const { data } = await db.from('akasha_relations').select('id')
    .eq('relation', 'famille').or(`and(from_entry.eq.${from.id},to_entry.eq.${to.id}),and(from_entry.eq.${to.id},to_entry.eq.${from.id})`);
  return { status: data && data.length ? 'deja-posee' : 'a-poser', fromId: from.id, toId: to.id };
}

async function executeMissingEdge(plan) {
  if (plan.status !== 'a-poser') { console.log(`  Josuke↔Tomoko : ${plan.status}, rien à faire`); return { created: 0 }; }
  const { error } = await db.from('akasha_relations').insert({ from_entry: plan.fromId, to_entry: plan.toId, relation: 'famille' });
  if (error) { console.error('  ✗', error.message); return { created: 0 }; }
  console.log('  + famille : Josuke Higashikata → Tomoko Higashikata');
  return { created: 1 };
}

// ─────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(WRITE ? '=== JoJo tree slugs — EXÉCUTION (--write) ===' : '=== JoJo tree slugs — DRY-RUN (trace only) ===');

  const { data: entries, error } = await db.from('akasha_entries').select('id,slug,name,attributes').eq('universe', "JoJo's Bizarre Adventure").in('slug', SLUGS);
  if (error) throw new Error(error.message);
  const bySlug = new Map(entries.map((e) => [e.slug, e]));
  console.log(`\nFiches résolues : ${bySlug.size}/${SLUGS.length}`);

  console.log('\n[1/3] Compléter 8 slugs manquants dans attributes.family existants…');
  const fillPlan = await planSlugFills(bySlug);
  for (const p of fillPlan) console.log(`  ${p.slug}.family["${p.name}"] : ${p.status}`);

  console.log('\n[2/3] Nouvelle curation attributes.family (5 fiches vides)…');
  const newPlan = await planNewFamily(bySlug);
  for (const p of newPlan) console.log(`  ${p.slug} : ${p.status}`);

  console.log('\n[3/3] Arête manquante Josuke ↔ Tomoko…');
  const edgePlan = await planMissingEdge(bySlug);
  console.log(`  statut: ${edgePlan.status}`);

  const trace = { started_at: new Date().toISOString(), write: WRITE, resolvedSlugs: [...bySlug.keys()], fillPlan, newPlan, edgePlan };
  const stamp = trace.started_at.replace(/[:.]/g, '-');
  const tracePath = path.join(ROOT, `data/audits/jojo-tree-slugs-trace-${stamp}.json`);
  fs.writeFileSync(tracePath, JSON.stringify(trace, null, 2));
  console.log(`\nTrace écrite → ${path.relative(ROOT, tracePath)}`);

  if (!WRITE) { console.log('\n(dry-run — relancer avec --write pour appliquer)'); return; }

  console.log('\n=== APPLICATION ===');
  const execReport = { started_at: trace.started_at, applied_at: new Date().toISOString() };
  execReport.fillPlan = await executeSlugFills(fillPlan);
  execReport.newPlan = await executeNewFamily(newPlan);
  execReport.edgePlan = await executeMissingEdge(edgePlan);
  const execPath = path.join(ROOT, `data/audits/jojo-tree-slugs-exec-${stamp}.json`);
  fs.writeFileSync(execPath, JSON.stringify(execReport, null, 2));
  console.log(`\nRapport d'exécution → ${path.relative(ROOT, execPath)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
