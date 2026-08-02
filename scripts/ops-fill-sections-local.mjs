// scripts/ops-fill-sections-local.mjs — DÉCOUPE SANS SUPABASE (03/08/2026, plan C).
//
// Pendant les restrictions egress, akasha_entries est illisible (Cloudflare 522) : le
// découpeur classique ne peut même plus LISTER les personnages. Celui-ci prend les listes
// dans le build local (data/akasha-universes.json — mêmes 293/478/203/179 persos que la
// base, vérifié), découpe depuis Fandom et enfile dans la base de travail VPS. Zéro
// dépendance à Supabase. Revers assumé : il ne sait pas qui a déjà un dossier — les
// doublons éventuels sont bénins (application idempotente par index de section) et se
// dédoublonnent en SQL local si le transfert de l'ancienne file aboutit ensuite.
//
// Usage : node --env-file=.env.local scripts/ops-fill-sections-local.mjs
//         --universe="Dragon Ball" [--limit=500] [--max-sections=8] [--autres]
import { readFileSync } from 'node:fs';
import { fetchFandomSections } from './lib/fandom.mjs';
import { clientOps } from '../lib/ops/db.mjs';

const UNIVERSE = process.argv.find((a) => a.startsWith('--universe='))?.split('=')[1];
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 500);
const MAX_SECTIONS = Number(process.argv.find((a) => a.startsWith('--max-sections='))?.split('=')[1] ?? 8);
const AUTRES = process.argv.includes('--autres');
if (!UNIVERSE) { console.error('--universe obligatoire'); process.exit(1); }

const ops = clientOps();
const build = JSON.parse(readFileSync(new URL('../data/akasha-universes.json', import.meta.url), 'utf8'));
const candidates = build.entries
  .filter((e) => e.universe === UNIVERSE && (AUTRES ? e.type !== 'character' : e.type === 'character'))
  .slice(0, LIMIT);
console.log(`${candidates.length} fiche(s) à découper [${UNIVERSE}${AUTRES ? ' · autres entrées' : ' · personnages'}] — listes du build local`);

// Idempotence LOCALE : ne pas ré-enfiler un slug déjà présent dans la file VPS.
const dejaEnFile = new Set();
const { data: parType } = await ops.rpc('ops_queue_by_type');
if ((parType ?? []).some((r) => r.task_type === 'fiche_section')) {
  const { data: lus } = await ops.rpc('ops_queue_read_couloir', { p_vt: 1, p_qty: 10000, p_types: ['fiche_section'] });
  for (const m of lus ?? []) dejaEnFile.add(m.message?.payload?.slug);
  await new Promise((r) => setTimeout(r, 1500));   // le vt d'1 s expire, rien n'est réservé
}

let total = 0, sansSource = 0, mauvaiseEntite = 0, sautees = 0;
let lot = [];
const envoyer = async () => {
  if (!lot.length) return;
  const { error } = await ops.rpc('ops_queue_send_batch', { messages: lot });
  if (error) console.error('  ✗ envoi :', error.message.slice(0, 80));
  else total += lot.length;
  lot = [];
};

for (const e of candidates) {
  if (dejaEnFile.has(e.slug)) { sautees++; continue; }
  const page = await fetchFandomSections(e.universe, e.name, { maxSections: MAX_SECTIONS });
  if (page?.refus) { mauvaiseEntite++; console.log(`  ✗ ${e.name.padEnd(26)} ${page.refus}`); continue; }
  if (!page?.sections?.length) { sansSource++; continue; }
  const sommaire = page.sections.map((s) => s.titre).join(', ');
  console.log(`  · ${e.name.padEnd(26)} ${page.sections.length} section(s)`);
  for (const s of page.sections) {
    lot.push({
      type: 'fiche_section',
      payload: {
        slug: e.slug, name: e.name, type: e.type, universe: e.universe, summary: e.summary,
        section_index: s.index, section_titre: s.titre, section_texte: s.texte,
        fandomTitle: page.title, fandomUrl: page.url, sommaire,
        ...(page.alias ? { alias_de: page.alias } : {}),
      },
    });
  }
  if (lot.length >= 60) await envoyer();
}
await envoyer();
console.log(`\nFINAL — ${total} section(s) en file VPS · ${sautees} slug(s) déjà en file · ${sansSource} sans source · ${mauvaiseEntite} mauvaise(s) entité(s)`);
