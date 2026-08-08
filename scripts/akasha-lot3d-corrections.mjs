// scripts/akasha-lot3d-corrections.mjs — LOT 3d, « corrections data gratuites » (tasks/akasha-architecture.md §LOT 3-3d) :
//   1. Bleach — peuple attributes.monde (Terre·Karakura / Soul Society / Hueco Mundo / Wandenreich)
//      depuis l'axe `race` (prioritaire) COMPLÉTÉ par les arêtes `habite` (jamais l'inverse — en
//      désaccord, race gagne, l'arête habite est journalée mais n'écrase rien).
//   2. Fusionne le doublon de personnage Bleach « nelliel » / « nelliel-tu-oderschvank » (même
//      pattern que scripts/akasha-merge-dupes.ts : relations repointées + dédupliquées, attributs
//      complétés SANS écraser le survivant, entrée perdante supprimée). Gotei 13 est DÉJÀ fusionné
//      (next.config.js l.54, vérifié) — non retraité ici.
//   3. Pose 2 arêtes `possede` isolées (canon non ambigu, cité dans le texte même des fiches) :
//      yoru → dracule-mihawk, wado-ichimonji → roronoa-zoro.
//
// TRACE AVANT ÉCRITURE : ce script calcule TOUJOURS le plan complet et l'écrit sur disque
// (data/audits/lot3d-corrections-trace.json) avant la moindre requête d'écriture. Sans --write,
// c'est un dry-run pur (aucune mutation). Idempotent : relançable sans effet si déjà appliqué.
//
// Usage :
//   node --env-file=.env.local scripts/akasha-lot3d-corrections.mjs             # dry-run + trace
//   node --env-file=.env.local scripts/akasha-lot3d-corrections.mjs --write     # applique
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WRITE = process.argv.includes('--write');
const db = clientSite();

async function allRows(table, sel, filterFn) {
  let rows = [];
  let from = 0;
  const step = 1000;
  for (;;) {
    let q = db.from(table).select(sel).range(from, from + step - 1);
    if (filterFn) q = filterFn(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message || JSON.stringify(error)}`);
    rows = rows.concat(data);
    if (data.length < step) break;
    from += step;
  }
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────
// 1. BLEACH — les quatre mondes
// ─────────────────────────────────────────────────────────────────────────

// Mapping race → monde, identique à la logique déjà en production dans
// components/akasha/hub/BleachWorldsMap.tsx (REALMS[].races + WANDENREICH.races) — on ne réinvente
// rien, on la rend PERSISTANTE par personnage au lieu de la recalculer côté client à partir de
// l'axe seul.
const RACE_WORLD = {
  Shinigami: 'Soul Society',
  Humain: 'Terre · Karakura',
  Fullbringer: 'Terre · Karakura',
  Visored: 'Terre · Karakura',
  Hollow: 'Hueco Mundo',
  Arrancar: 'Hueco Mundo',
  Quincy: 'Wandenreich',
};

// Cible des arêtes `habite` → monde. `las-noches` (forteresse d'Aizen) est GÉOGRAPHIQUEMENT DANS
// Hueco Mundo (canon) : les deux se résolvent au même monde. Aucune fiche `wandenreich` n'existe
// en base (dimension de poche jamais modélisée comme lieu) → ce monde reste dérivé SEULEMENT de
// race=Quincy, jamais de habite (mesuré : 0 arête habite ne peut y mener, confirmé ci-dessous).
const WORLD_OF_HABITE_TARGET = {
  karakura: 'Terre · Karakura',
  'soul-society': 'Soul Society',
  'hueco-mundo': 'Hueco Mundo',
  'las-noches': 'Hueco Mundo',
};

async function planBleachWorlds() {
  const bleachEntries = await allRows('akasha_entries', 'id, slug, name, type, universe, attributes', (q) => q.eq('universe', 'Bleach'));
  const byId = new Map(bleachEntries.map((e) => [e.id, e]));
  const bleachChars = bleachEntries.filter((e) => e.type === 'character');

  const habiteEdges = await allRows('akasha_relations', 'id, from_entry, to_entry, relation', (q) => q.eq('relation', 'habite'));
  const bleachHabite = habiteEdges.filter((e) => byId.has(e.from_entry));

  const habiteWorldByChar = new Map(); // char id -> Set<world>
  const habiteTargetByChar = new Map(); // char id -> [target slug,...] (pour motif)
  for (const e of bleachHabite) {
    const to = byId.get(e.to_entry);
    if (!to) continue;
    const w = WORLD_OF_HABITE_TARGET[to.slug];
    if (!w) continue;
    if (!habiteWorldByChar.has(e.from_entry)) { habiteWorldByChar.set(e.from_entry, new Set()); habiteTargetByChar.set(e.from_entry, []); }
    habiteWorldByChar.get(e.from_entry).add(w);
    habiteTargetByChar.get(e.from_entry).push(to.slug);
  }

  const rows = []; // {id, slug, name, currentMonde, decidedMonde, source, motif}
  const disagreements = [];
  const stillWithout = [];

  for (const c of bleachChars) {
    const race = c.attributes?.race;
    const raceWorld = race ? RACE_WORLD[race] : undefined;
    const habiteWorlds = habiteWorldByChar.get(c.id);
    const habiteWorld = habiteWorlds && habiteWorlds.size ? [...habiteWorlds][0] : undefined; // mesuré : jamais >1 valeur distincte

    let decided, source, motif;
    if (raceWorld) {
      decided = raceWorld;
      source = 'race';
      motif = `race="${race}" → monde déclaré (BleachWorldsMap.REALMS)`;
      if (habiteWorld && habiteWorld !== raceWorld) {
        disagreements.push({ slug: c.slug, name: c.name, race, raceWorld, habiteWorld, habiteTargets: habiteTargetByChar.get(c.id) });
        motif += ` — arête habite→${habiteTargetByChar.get(c.id).join(',')} suggère "${habiteWorld}", NON appliquée (race prioritaire, cf. tâche « en complément »)`;
      }
    } else if (habiteWorld) {
      decided = habiteWorld;
      source = 'habite';
      motif = `aucun monde via race (race="${race ?? 'absente'}") — comblé par arête habite→${habiteTargetByChar.get(c.id).join(',')}`;
    } else {
      stillWithout.push({ slug: c.slug, name: c.name, race: race ?? null });
      continue;
    }

    const already = c.attributes?.monde;
    rows.push({ id: c.id, slug: c.slug, name: c.name, race: race ?? null, currentMonde: already ?? null, decidedMonde: decided, source, motif, noop: already === decided });
  }

  return {
    totalBleachCharacters: bleachChars.length,
    totalHabiteEdgesFromBleach: bleachHabite.length,
    rows,
    counts: {
      viaRace: rows.filter((r) => r.source === 'race').length,
      viaHabiteGain: rows.filter((r) => r.source === 'habite').length,
      totalPopulated: rows.length,
      disagreements: disagreements.length,
      stillWithout: stillWithout.length,
    },
    disagreements,
    stillWithout,
  };
}

async function executeBleachWorlds(plan) {
  let updated = 0, skippedNoop = 0;
  for (const r of plan.rows) {
    if (r.noop) { skippedNoop++; continue; }
    const { data: cur, error: e1 } = await db.from('akasha_entries').select('attributes').eq('id', r.id).single();
    if (e1) { console.error('  ✗', r.slug, e1.message); continue; }
    const nextAttrs = { ...(cur.attributes || {}), monde: r.decidedMonde };
    const { error: e2 } = await db.from('akasha_entries').update({ attributes: nextAttrs }).eq('id', r.id);
    if (e2) { console.error('  ✗', r.slug, e2.message); continue; }
    updated++;
  }
  console.log(`  Bleach monde : ${updated} écrits, ${skippedNoop} déjà à jour (idempotent)`);
  return { updated, skippedNoop };
}

// ─────────────────────────────────────────────────────────────────────────
// 2. NELLIEL — fusion du doublon de personnage
// ─────────────────────────────────────────────────────────────────────────
// keep=nelliel : slug canonique posé par scripts/build-akasha-universes.mjs (l.74/108/892),
// descFr curé (blitz 03/08, rôle précis « Ex-Tercera Espada »).
// drop=nelliel-tu-oderschvank : aucune trace dans un script du dépôt (grep "oderschvank" = 0 hit),
// vraisemblablement un import MAL/Jikan parallèle (voiceActors + favorites, champs typiques Jikan)
// qui n'a pas dédupliqué contre l'alias de romanisation déjà en base — même classe de bug que la
// leçon « Oderschvank≡Odelschwanck » (tasks/lessons.md #99), mais ici DEUX fiches existent au lieu
// d'un refus de garde.
const NELLIEL_KEEP_SLUG = 'nelliel';
const NELLIEL_DROP_SLUG = 'nelliel-tu-oderschvank';

async function planNelliel() {
  const { data: rows } = await db.from('akasha_entries').select('id,slug,name,attributes').in('slug', [NELLIEL_KEEP_SLUG, NELLIEL_DROP_SLUG]);
  const keep = rows?.find((r) => r.slug === NELLIEL_KEEP_SLUG);
  const drop = rows?.find((r) => r.slug === NELLIEL_DROP_SLUG);
  if (!keep) return { status: 'keep-introuvable', keepSlug: NELLIEL_KEEP_SLUG, dropSlug: NELLIEL_DROP_SLUG };
  if (!drop) return { status: 'deja-fusionne', keepSlug: NELLIEL_KEEP_SLUG, dropSlug: NELLIEL_DROP_SLUG, keepId: keep.id };

  const [outRel, inRel, keepOut, keepIn, dropSections, keepSections] = await Promise.all([
    db.from('akasha_relations').select('id,relation,to_entry').eq('from_entry', drop.id).then((r) => r.data ?? []),
    db.from('akasha_relations').select('id,relation,from_entry').eq('to_entry', drop.id).then((r) => r.data ?? []),
    db.from('akasha_relations').select('relation,to_entry').eq('from_entry', keep.id).then((r) => r.data ?? []),
    db.from('akasha_relations').select('relation,from_entry').eq('to_entry', keep.id).then((r) => r.data ?? []),
    db.from('akasha_sections').select('id,idx,titre,texte').eq('entry_id', drop.id).then((r) => r.data ?? []),
    db.from('akasha_sections').select('titre,texte').eq('entry_id', keep.id).then((r) => r.data ?? []),
  ]);

  const keepOutSet = new Set(keepOut.map((r) => `${r.relation}:${r.to_entry}`));
  const keepInSet = new Set(keepIn.map((r) => `${r.relation}:${r.from_entry}`));

  const relOutPlan = outRel.map((r) => {
    const k = `${r.relation}:${r.to_entry}`;
    const dup = keepOutSet.has(k) || r.to_entry === keep.id;
    return { id: r.id, relation: r.relation, to_entry: r.to_entry, action: dup ? 'delete-dup' : 'reassign-from' };
  });
  const relInPlan = inRel.map((r) => {
    const k = `${r.relation}:${r.from_entry}`;
    const dup = keepInSet.has(k) || r.from_entry === keep.id;
    return { id: r.id, relation: r.relation, from_entry: r.from_entry, action: dup ? 'delete-dup' : 'reassign-to' };
  });

  // Sections : dédup par TITRE EXACT (même limite assumée que le chantier doublets-conteneurs,
  // tasks/akasha-hierarchies.md §8 Q1 — « ne déduplique que sur titre exact »). Les 9 titres de
  // `drop` collisionnent tous avec les 9 de `keep` ⇒ migration attendue = 0. Écarts de longueur de
  // prose CONSTATÉS mais NON arbitrés ici (jugement éditorial FR hors mandat de ce chantier data) :
  // journalisés pour une passe qualité future, jamais appliqués silencieusement.
  const keepTitles = new Set(keepSections.map((s) => (s.titre || '').trim().toLowerCase()));
  const sectionPlan = dropSections.map((s) => {
    const dup = keepTitles.has((s.titre || '').trim().toLowerCase());
    const keepEquiv = keepSections.find((k) => (k.titre || '').trim().toLowerCase() === (s.titre || '').trim().toLowerCase());
    return {
      id: s.id, titre: s.titre, dropLen: s.texte.length, keepLen: keepEquiv ? keepEquiv.texte.length : null,
      action: dup ? 'skip-title-collision' : 'migrate',
    };
  });

  // Attributs : keep gagne sur toute clé commune ; on ne COMPLÈTE que les clés absentes de keep.
  const missingKeys = Object.keys(drop.attributes || {}).filter((k) => !(k in (keep.attributes || {})));
  const attrPlan = { missingKeysAddedToKeep: missingKeys, values: Object.fromEntries(missingKeys.map((k) => [k, drop.attributes[k]])) };

  return {
    status: 'a-fusionner',
    keepSlug: keep.slug, keepId: keep.id, keepName: keep.name,
    dropSlug: drop.slug, dropId: drop.id, dropName: drop.name,
    motif: 'Même personnage Bleach (Nelliel tu Odelschwanck / Nel), deux fiches de deux passes de seed distinctes — slug canonique posé par build-akasha-universes.mjs (nelliel) vs import isolé sans trace de script (nelliel-tu-oderschvank, champs voiceActors/favorites typiques Jikan/MAL).',
    relOutPlan, relInPlan, sectionPlan, attrPlan,
    counts: {
      relOutReassign: relOutPlan.filter((r) => r.action === 'reassign-from').length,
      relOutDupDrop: relOutPlan.filter((r) => r.action === 'delete-dup').length,
      relInReassign: relInPlan.filter((r) => r.action === 'reassign-to').length,
      relInDupDrop: relInPlan.filter((r) => r.action === 'delete-dup').length,
      sectionsMigrated: sectionPlan.filter((s) => s.action === 'migrate').length,
      sectionsSkipped: sectionPlan.filter((s) => s.action === 'skip-title-collision').length,
      attrKeysAdded: missingKeys.length,
    },
  };
}

async function executeNelliel(plan) {
  if (plan.status !== 'a-fusionner') { console.log(`  Nelliel : ${plan.status}, rien à faire`); return { status: plan.status }; }

  let moved = 0, dupDeleted = 0;
  for (const r of plan.relOutPlan) {
    if (r.action === 'delete-dup') { await db.from('akasha_relations').delete().eq('id', r.id); dupDeleted++; }
    else { await db.from('akasha_relations').update({ from_entry: plan.keepId }).eq('id', r.id); moved++; }
  }
  for (const r of plan.relInPlan) {
    if (r.action === 'delete-dup') { await db.from('akasha_relations').delete().eq('id', r.id); dupDeleted++; }
    else { await db.from('akasha_relations').update({ to_entry: plan.keepId }).eq('id', r.id); moved++; }
  }

  let sectionsMigrated = 0;
  for (const s of plan.sectionPlan) {
    if (s.action !== 'migrate') continue;
    const { data: full } = await db.from('akasha_sections').select('idx,titre,texte,source').eq('id', s.id).single();
    if (!full) continue;
    await db.from('akasha_sections').insert({ entry_id: plan.keepId, idx: full.idx, titre: full.titre, texte: full.texte, source: full.source });
    sectionsMigrated++;
  }
  await db.from('akasha_sections').delete().eq('entry_id', plan.dropId);

  if (plan.attrPlan.missingKeysAddedToKeep.length) {
    const { data: keepNow } = await db.from('akasha_entries').select('attributes').eq('id', plan.keepId).single();
    const merged = { ...(keepNow?.attributes || {}), ...plan.attrPlan.values, ...(keepNow?.attributes || {}) }; // keep gagne toujours sur conflit
    await db.from('akasha_entries').update({ attributes: merged }).eq('id', plan.keepId);
  }

  await db.from('akasha_entries').delete().eq('id', plan.dropId);

  console.log(`  Nelliel : ${moved} relations repointées, ${dupDeleted} doublons supprimés, ${sectionsMigrated} sections migrées, ${plan.attrPlan.missingKeysAddedToKeep.length} attributs complétés, fiche "${plan.dropSlug}" supprimée`);
  return { moved, dupDeleted, sectionsMigrated, attrsAdded: plan.attrPlan.missingKeysAddedToKeep.length };
}

// ─────────────────────────────────────────────────────────────────────────
// 3. DEUX ARÊTES ISOLÉES — canon cité dans le texte même des fiches
// ─────────────────────────────────────────────────────────────────────────
const SWORD_FIXES = [
  {
    itemSlug: 'yoru', ownerSlug: 'dracule-mihawk',
    motif: 'descFr de la fiche `yoru` : « Mihawk le met sur son dos quand il ne s\'en sert pas » — canon non ambigu, 0/0 arête avant correction.',
  },
  {
    itemSlug: 'wado-ichimonji', ownerSlug: 'roronoa-zoro',
    motif: 'Un des trois sabres de Zoro (Wadō Ichimonji, hérité de Kuina) — canon non ambigu cité par la tâche, 0/0 arête avant correction.',
  },
];

async function planSwords() {
  const slugs = SWORD_FIXES.flatMap((f) => [f.itemSlug, f.ownerSlug]);
  const { data: entries } = await db.from('akasha_entries').select('id,slug,name,type').in('slug', slugs);
  const bySlug = new Map((entries ?? []).map((e) => [e.slug, e]));

  const plan = [];
  for (const f of SWORD_FIXES) {
    const item = bySlug.get(f.itemSlug);
    const owner = bySlug.get(f.ownerSlug);
    if (!item || !owner) { plan.push({ ...f, status: 'fiche-introuvable', itemFound: !!item, ownerFound: !!owner }); continue; }
    const { data: existing } = await db.from('akasha_relations').select('id').eq('from_entry', owner.id).eq('to_entry', item.id).eq('relation', 'possede');
    plan.push({
      ...f, itemId: item.id, ownerId: owner.id, itemName: item.name, ownerName: owner.name,
      status: existing && existing.length ? 'deja-pose' : 'a-poser',
    });
  }
  return plan;
}

async function executeSwords(plan) {
  let created = 0, skipped = 0;
  for (const f of plan) {
    if (f.status !== 'a-poser') { skipped++; continue; }
    const { error } = await db.from('akasha_relations').insert({ from_entry: f.ownerId, to_entry: f.itemId, relation: 'possede' });
    if (error) { console.error('  ✗', f.itemSlug, error.message); continue; }
    created++;
    console.log(`  + possede : ${f.ownerName} → ${f.itemName}`);
  }
  console.log(`  Arêtes possede : ${created} posées, ${skipped} déjà présentes/ignorées`);
  return { created, skipped };
}

// ─────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(WRITE ? '=== LOT 3d — EXÉCUTION (--write) ===' : '=== LOT 3d — DRY-RUN (trace only) ===');

  console.log('\n[1/3] Bleach — les quatre mondes…');
  const bleachPlan = await planBleachWorlds();
  console.log(`  ${bleachPlan.totalBleachCharacters} personnages Bleach · via race: ${bleachPlan.counts.viaRace} · gagnés via habite: ${bleachPlan.counts.viaHabiteGain} · désaccords race/habite (race gagne): ${bleachPlan.counts.disagreements} · restent sans monde: ${bleachPlan.counts.stillWithout}`);

  console.log('\n[2/3] Bleach — fusion Nelliel…');
  const nellielPlan = await planNelliel();
  console.log(`  statut: ${nellielPlan.status}`);

  console.log('\n[3/3] Arêtes possede isolées (yoru, wado-ichimonji)…');
  const swordsPlan = await planSwords();
  for (const f of swordsPlan) console.log(`  ${f.itemSlug} → ${f.ownerSlug} : ${f.status}`);

  const trace = {
    started_at: new Date().toISOString(),
    write: WRITE,
    bleachWorlds: bleachPlan,
    nelliel: nellielPlan,
    swords: swordsPlan,
  };
  const tracePath = path.join(ROOT, 'data/audits/lot3d-corrections-trace.json');
  fs.writeFileSync(tracePath, JSON.stringify(trace, null, 2));
  console.log(`\nTrace écrite → ${path.relative(ROOT, tracePath)}`);

  if (!WRITE) {
    console.log('\n(dry-run — relancer avec --write pour appliquer)');
    return;
  }

  console.log('\n=== APPLICATION ===');
  const execReport = { started_at: trace.started_at, applied_at: new Date().toISOString() };
  execReport.bleachWorlds = await executeBleachWorlds(bleachPlan);
  execReport.nelliel = await executeNelliel(nellielPlan);
  execReport.swords = await executeSwords(swordsPlan);
  const execPath = path.join(ROOT, 'data/audits/lot3d-corrections-exec.json');
  fs.writeFileSync(execPath, JSON.stringify(execReport, null, 2));
  console.log(`\nRapport d'exécution → ${path.relative(ROOT, execPath)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
