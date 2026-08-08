// scripts/akasha-jojo-family-tree-fixes.mjs — LOT 4b, prérequis « arbre Joestar »
// (tasks/akasha-architecture.md §6.5 + §LOT 4). Corrige le graphe `famille` de JoJo AVANT que
// components/akasha/hub/JoestarTree.tsx ne le lise, pour que l'arbre ne mente sur aucune filiation.
//
// Mesuré le 08/08/2026 (recompte indépendant, PAS le chiffre du plan) : 45 arêtes `famille` sur le
// corpus JoJo (233 fiches), PAS 35. La composante connexe Joestar (15 nœuds) contient UNE arête
// fausse et il manque DEUX générations de conjointes jamais reliées à la lignée bien qu'existant
// déjà comme fiches. Sourcé sur l'infobox `family` de jojo.fandom.com (MediaWiki wikitext, action=
// parse, cf. tasks/lessons.md #65 sur le format d'extraction Fandom) :
//
//  1. FAUSSE arête à retirer : Roses --famille--> Holy Kuujou. Roses est le majordome/chauffeur de
//     Joseph Joestar et Suzi Q (infobox Roses : affiliation=Joestar Family, occupation=Butler — AUCUN
//     champ `family`). La fiche akasha elle-même le dit : « Roses est le majordome responsable de la
//     famille Joestar ». Confondre « affilié à » et « famille de » est l'erreur d'attribution déjà
//     documentée (lessons.md #78 « camp=Shinigami pour L », #171 même famille de bug).
//
//  2. Arêtes MANQUANTES à poser (les deux fiches existent déjà, aucune création d'entité) :
//     - Lisa Lisa (lisa-lisa) est révélée être Elizabeth Joestar, ÉPOUSE de George Joestar II et
//       MÈRE de Joseph Joestar (infobox Lisa Lisa : « George Joestar II (husband) », « Joseph
//       Joestar (son) » ; infobox George Joestar II : « Elizabeth Joestar (Wife) » ; texte de la
//       fiche : « Lisa Lisa is the wife of George Joestar II and the mother of Joseph Joestar »).
//       Elle est DISTINCTE d'Erina Joestar (épouse de Jonathan, grand-mère de Joseph — déjà juste
//       dans attributes.family de joseph-joestar). Sans cette arête, Joseph Joestar n'a AUCUNE mère
//       reliée dans le graphe alors que la fiche existe et est même déjà connectée à Straizo.
//     - Suzi Q (suzie-q) est ÉPOUSE de Joseph Joestar et MÈRE de Holy Kujo (infobox Suzi Q : « Joseph
//       Joestar (husband) », « Holy Kujo (daughter) » — confirmé aussi par Jotaro Kujo : « Suzi Q
//       (Grandmother) »). Sans cette arête, Holy Kuujou n'a aucune mère reliée.
//     - Shizuka Joestar (shizuka-joestar) est fille ADOPTIVE de Joseph Joestar et Suzi Q (infobox
//       Shizuka Joestar : « Joseph Joestar (Adoptive father) », « Suzi Q (Adoptive mother) » —
//       confirmé par les 3 infobox Suzi Q/Josuke/Jotaro qui la citent toutes). Fiche déjà en base,
//       aujourd'hui totalement isolée du graphe famille (0 arête).
//
//  3. attributes.family (le format déjà utilisé sur 6 fiches, {rel, name, slug?}) complété sur les
//     fiches concernées : la mère manquante de Joseph, et les 4 fiches nouvellement connectées
//     n'avaient encore AUCUN family curé.
//
// Volontairement HORS PÉRIMÈTRE (pas la lignée Joestar, pas touché) : le cluster Kars/Esidisi/
// Wamuu/Santana (Hommes-Piliers) porte aussi une arête `famille` project douteuse, et Sadao Kujo
// (père de Jotaro, confirmé canon) n'a AUCUNE fiche dans les 233 — aucune arête possible sans créer
// une entité, ce qui n'est pas le mandat de ce script. L'arbre se dégradera honnêtement à cet endroit
// (branche « père » manquante pour Jotaro) plutôt que d'inventer.
//
// TRACE AVANT ÉCRITURE : plan calculé et écrit sur disque (horodaté — la leçon du 08/08 sur
// lot3d-corrections-trace.json qui s'écrasait lui-même est appliquée ici) avant toute mutation.
// Sans --write : dry-run pur. Idempotent (check-then-insert/update, jamais d'upsert aveugle).
//
// Usage :
//   node --env-file=.env.local scripts/akasha-jojo-family-tree-fixes.mjs             # dry-run
//   node --env-file=.env.local scripts/akasha-jojo-family-tree-fixes.mjs --write     # applique
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WRITE = process.argv.includes('--write');
const db = clientSite();

const SLUGS = ['lisa-lisa', 'george-joestar-ii', 'joseph-joestar', 'suzie-q', 'holy-kuujou', 'shizuka-joestar', 'straizo', 'roses'];

// ─────────────────────────────────────────────────────────────────────────
// 1. L'arête fausse à retirer
// ─────────────────────────────────────────────────────────────────────────
async function planRemoveRoses(bySlug) {
  const roses = bySlug.get('roses');
  const holy = bySlug.get('holy-kuujou');
  if (!roses || !holy) return { status: 'fiche-introuvable' };
  const { data } = await db.from('akasha_relations').select('id,from_entry,to_entry,relation')
    .eq('relation', 'famille').or(`and(from_entry.eq.${roses.id},to_entry.eq.${holy.id}),and(from_entry.eq.${holy.id},to_entry.eq.${roses.id})`);
  if (!data || !data.length) return { status: 'deja-absente' };
  return { status: 'a-retirer', rows: data, motif: 'Roses est le majordome/chauffeur des Joestar (infobox: affiliation=Joestar Family, occupation=Butler, AUCUN champ family) — pas un lien de sang ni d\'adoption.' };
}

async function executeRemoveRoses(plan) {
  if (plan.status !== 'a-retirer') { console.log(`  Roses→Holy : ${plan.status}, rien à faire`); return { deleted: 0 }; }
  let deleted = 0;
  for (const r of plan.rows) {
    const { error } = await db.from('akasha_relations').delete().eq('id', r.id);
    if (error) { console.error('  ✗', r.id, error.message); continue; }
    deleted++;
  }
  console.log(`  Roses→Holy : ${deleted} arête(s) fausse(s) retirée(s)`);
  return { deleted };
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Les arêtes manquantes (les deux fiches existent déjà)
// ─────────────────────────────────────────────────────────────────────────
const MISSING_EDGES = [
  { fromSlug: 'lisa-lisa', toSlug: 'george-joestar-ii', motif: 'Épouse — infobox Lisa Lisa "George Joestar II (husband)" / infobox George Joestar II "Elizabeth Joestar (Wife)".' },
  { fromSlug: 'joseph-joestar', toSlug: 'lisa-lisa', motif: 'Mère — infobox Lisa Lisa "Joseph Joestar (son)" ; texte : "Lisa Lisa is the wife of George Joestar II and the mother of Joseph Joestar".' },
  { fromSlug: 'suzie-q', toSlug: 'joseph-joestar', motif: 'Épouse — infobox Suzi Q "Joseph Joestar (husband)".' },
  { fromSlug: 'holy-kuujou', toSlug: 'suzie-q', motif: 'Mère — infobox Suzi Q "Holy Kujo (daughter)" ; confirmé infobox Jotaro Kujo "Suzi Q (Grandmother)".' },
  { fromSlug: 'shizuka-joestar', toSlug: 'joseph-joestar', motif: 'Fille adoptive — infobox Shizuka Joestar "Joseph Joestar (Adoptive father)" / infobox Suzi Q "Shizuka Joestar (adoptive daughter)".' },
];

async function planMissingEdges(bySlug) {
  const plan = [];
  for (const e of MISSING_EDGES) {
    const from = bySlug.get(e.fromSlug);
    const to = bySlug.get(e.toSlug);
    if (!from || !to) { plan.push({ ...e, status: 'fiche-introuvable', fromFound: !!from, toFound: !!to }); continue; }
    const { data } = await db.from('akasha_relations').select('id')
      .eq('relation', 'famille').or(`and(from_entry.eq.${from.id},to_entry.eq.${to.id}),and(from_entry.eq.${to.id},to_entry.eq.${from.id})`);
    plan.push({ ...e, fromId: from.id, toId: to.id, fromName: from.name, toName: to.name, status: data && data.length ? 'deja-posee' : 'a-poser' });
  }
  return plan;
}

async function executeMissingEdges(plan) {
  let created = 0, skipped = 0;
  for (const e of plan) {
    if (e.status !== 'a-poser') { skipped++; continue; }
    const { error } = await db.from('akasha_relations').insert({ from_entry: e.fromId, to_entry: e.toId, relation: 'famille' });
    if (error) { console.error('  ✗', e.fromSlug, '→', e.toSlug, error.message); continue; }
    created++;
    console.log(`  + famille : ${e.fromName} → ${e.toName}`);
  }
  console.log(`  Arêtes famille : ${created} posées, ${skipped} déjà présentes/ignorées`);
  return { created, skipped };
}

// ─────────────────────────────────────────────────────────────────────────
// 3. attributes.family — compléter (jamais écraser une entrée existante)
// ─────────────────────────────────────────────────────────────────────────
const FAMILY_ATTR_PATCH = {
  'joseph-joestar': { add: [{ rel: 'mother', name: 'Lisa Lisa', slug: 'lisa-lisa' }] },
  'george-joestar-ii': { set: [
    { rel: 'father', name: 'Jonathan Joestar', slug: 'jonathan-joestar' },
    { rel: 'mother', name: 'Erina Joestar', slug: 'erina-pendleton' },
    { rel: 'wife', name: 'Lisa Lisa', slug: 'lisa-lisa' },
    { rel: 'son', name: 'Joseph Joestar', slug: 'joseph-joestar' },
  ] },
  'lisa-lisa': { set: [
    // Straizo↔Lisa Lisa : SOURCE AJOUTÉE A POSTERIORI par le vérificateur final (08/08/2026) —
    // absente ici à l'exécution initiale, contrairement au motif systématique des autres entrées
    // de ce fichier (rupture de traçabilité relevée par la revue). Recherche croisée confirmant le
    // canon : Lisa Lisa (Elizabeth Joestar), trouvée bébé sur un navire en perdition par Erina
    // Joestar, est adoptée et formée au Hamon par Straizo jusqu'à ses 18 ans (jojo.fandom.com/wiki
    // /Lisa_Lisa, section historique Battle Tendency). Fait confirmé exact ; seule la trace de
    // l'écriture originale manquait, pas la donnée elle-même.
    { rel: 'adoptive_father', name: 'Straizo', slug: 'straizo' },
    { rel: 'husband', name: 'George Joestar II', slug: 'george-joestar-ii' },
    { rel: 'son', name: 'Joseph Joestar', slug: 'joseph-joestar' },
  ] },
  'suzie-q': { set: [
    { rel: 'husband', name: 'Joseph Joestar', slug: 'joseph-joestar' },
    { rel: 'daughter', name: 'Holy Kujo', slug: 'holy-kuujou' },
    { rel: 'adoptive_daughter', name: 'Shizuka Joestar', slug: 'shizuka-joestar' },
  ] },
  'holy-kuujou': { set: [
    { rel: 'father', name: 'Sadao Kujo' },
    { rel: 'mother', name: 'Suzi Q', slug: 'suzie-q' },
    { rel: 'son', name: 'Jotaro Kujo', slug: 'jotaro-kujo' },
    { rel: 'half_brother', name: 'Josuke Higashikata', slug: 'josuke-higashikata' },
  ] },
  'shizuka-joestar': { set: [
    { rel: 'adoptive_father', name: 'Joseph Joestar', slug: 'joseph-joestar' },
    { rel: 'adoptive_mother', name: 'Suzi Q', slug: 'suzie-q' },
  ] },
};

async function planAttrPatch(bySlug) {
  const plan = [];
  for (const [slug, patch] of Object.entries(FAMILY_ATTR_PATCH)) {
    const e = bySlug.get(slug);
    if (!e) { plan.push({ slug, status: 'fiche-introuvable' }); continue; }
    const current = e.attributes?.family || [];
    let next;
    if (patch.set) {
      // set : n'écrase que si le tableau ACTUEL est vide (jamais de perte de curation existante)
      if (current.length) { plan.push({ slug, status: 'deja-curee', current }); continue; }
      next = patch.set;
    } else {
      const currentNames = new Set(current.map((f) => f.name));
      const toAdd = patch.add.filter((f) => !currentNames.has(f.name));
      if (!toAdd.length) { plan.push({ slug, status: 'deja-a-jour', current }); continue; }
      next = [...current, ...toAdd];
    }
    plan.push({ slug, status: 'a-ecrire', id: e.id, current, next });
  }
  return plan;
}

async function executeAttrPatch(plan) {
  let updated = 0, skipped = 0;
  for (const p of plan) {
    if (p.status !== 'a-ecrire') { skipped++; continue; }
    const { data: cur, error: e1 } = await db.from('akasha_entries').select('attributes').eq('id', p.id).single();
    if (e1) { console.error('  ✗', p.slug, e1.message); continue; }
    const nextAttrs = { ...(cur.attributes || {}), family: p.next };
    const { error: e2 } = await db.from('akasha_entries').update({ attributes: nextAttrs }).eq('id', p.id);
    if (e2) { console.error('  ✗', p.slug, e2.message); continue; }
    updated++;
    console.log(`  attributes.family écrit : ${p.slug} (${p.next.length} lien(s))`);
  }
  console.log(`  attributes.family : ${updated} fiches écrites, ${skipped} déjà à jour/ignorées`);
  return { updated, skipped };
}

// ─────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(WRITE ? '=== JoJo family-tree fixes — EXÉCUTION (--write) ===' : '=== JoJo family-tree fixes — DRY-RUN (trace only) ===');

  const { data: entries, error } = await db.from('akasha_entries').select('id,slug,name,attributes').eq('universe', "JoJo's Bizarre Adventure").in('slug', SLUGS);
  if (error) throw new Error(error.message);
  const bySlug = new Map(entries.map((e) => [e.slug, e]));
  console.log(`\nFiches résolues : ${[...bySlug.keys()].join(', ')} (${bySlug.size}/${SLUGS.length})`);

  console.log('\n[1/3] Arête fausse Roses→Holy…');
  const rosesPlan = await planRemoveRoses(bySlug);
  console.log(`  statut: ${rosesPlan.status}`);

  console.log('\n[2/3] Arêtes manquantes (Lisa Lisa, Suzi Q, Shizuka)…');
  const edgesPlan = await planMissingEdges(bySlug);
  for (const e of edgesPlan) console.log(`  ${e.fromSlug} → ${e.toSlug} : ${e.status}`);

  console.log('\n[3/3] attributes.family (compléter, jamais écraser)…');
  const attrPlan = await planAttrPatch(bySlug);
  for (const p of attrPlan) console.log(`  ${p.slug} : ${p.status}`);

  const trace = {
    started_at: new Date().toISOString(),
    write: WRITE,
    resolvedSlugs: [...bySlug.keys()],
    removeRoses: rosesPlan,
    missingEdges: edgesPlan,
    attrPatch: attrPlan,
  };
  const stamp = trace.started_at.replace(/[:.]/g, '-');
  const tracePath = path.join(ROOT, `data/audits/jojo-family-tree-fixes-trace-${stamp}.json`);
  fs.writeFileSync(tracePath, JSON.stringify(trace, null, 2));
  console.log(`\nTrace écrite → ${path.relative(ROOT, tracePath)}`);

  if (!WRITE) {
    console.log('\n(dry-run — relancer avec --write pour appliquer)');
    return;
  }

  console.log('\n=== APPLICATION ===');
  const execReport = { started_at: trace.started_at, applied_at: new Date().toISOString() };
  execReport.removeRoses = await executeRemoveRoses(rosesPlan);
  execReport.missingEdges = await executeMissingEdges(edgesPlan);
  execReport.attrPatch = await executeAttrPatch(attrPlan);
  const execPath = path.join(ROOT, `data/audits/jojo-family-tree-fixes-exec-${stamp}.json`);
  fs.writeFileSync(execPath, JSON.stringify(execReport, null, 2));
  console.log(`\nRapport d'exécution → ${path.relative(ROOT, execPath)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
