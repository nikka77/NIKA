// scripts/ops-fill-relations.mjs — met en file l'extraction des relations entre personnages.
// Usage : node --env-file=.env.local scripts/ops-fill-relations.mjs [--dry] [--limit=10]
//         [--universe="One Piece"] [--slug=trafalgar-law]
// Les personnages MAJEURS (favorites) passent d'abord : c'est là que l'histoire est la plus riche.
import { createClient } from '@supabase/supabase-js';
import { clientOps, clientSite } from '../lib/ops/db.mjs';
import { AXES } from './lib/akasha-axes.mjs';
// Node ≥ 22.18 retire les types tout seul : une seule définition de « l'histoire est racontée »,
// partagée avec la console OPS.
import { NATURES_HISTOIRE } from '../lib/akasha/relations.ts';

const supabase = clientOps();
const DRY = process.argv.includes('--dry');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 10);
const UNIVERSE = process.argv.find((a) => a.startsWith('--universe='))?.split('=')[1];
const SLUG = process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1];

/** Le tri par favorites est un ORDRE DE PRIORITÉ, pas un filtre.
 *  Avant le 01/08 un `.limit(400)` le transformait en filtre : 3 638 des 4 038 personnages étaient
 *  hors d'atteinte À JAMAIS, quel que soit le nombre de passages. On pagine donc tout le corpus, et
 *  c'est `--limit` (la taille du lot envoyé) qui borne le travail, pas la fenêtre de lecture. */
async function tousLesPersonnages() {
  const out = [];
  for (let debut = 0; ; debut += 1000) {
    let q = clientSite().from('akasha_entries')
      .select('id, slug, name, type, universe')
      .eq('type', 'character')
      .order('attributes->favorites', { ascending: false, nullsFirst: false })
      // Départage stable : sans second critère, deux pages successives peuvent réordonner les
      // ex æquo (ils sont légion à favorites nul) et faire sauter des fiches entre les tranches.
      .order('slug', { ascending: true })
      .range(debut, debut + 999);
    if (SLUG) q = q.eq('slug', SLUG);
    else if (UNIVERSE) q = q.eq('universe', UNIVERSE);
    else q = q.in('universe', Object.keys(AXES));
    const { data, error } = await q;
    if (error) { console.error('✗ lecture akasha_entries :', error.message); process.exit(1); }
    out.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  return out;
}

/** Personnages dont le GRAPHE porte déjà une arête d'histoire. C'est là qu'il fallait regarder :
 *  le test d'avant interrogeait attributes.relations, que rien ne lit et que rien ne fait autorité
 *  (la console écrit désormais dans akasha_relations — c'est la seule table que le site consulte). */
async function dejaRacontes() {
  const ids = new Set();
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await clientSite()
      .from('akasha_relations').select('from_entry').in('relation', NATURES_HISTOIRE).range(debut, debut + 999);
    if (error) { console.error('✗ lecture akasha_relations :', error.message); process.exit(1); }
    for (const r of data ?? []) ids.add(r.from_entry);
    if ((data ?? []).length < 1000) break;
  }
  return ids;
}

/** Fiches dont une production attend la review OU a déjà été appliquée. Les REJETÉES redeviennent
 *  candidates : un rejet veut dire que l'histoire reste à écrire. */
async function dejaEnUsine() {
  const slugs = new Set();
  for (let debut = 0; ; debut += 1000) {
    const { data } = await supabase
      .from('agent_results').select('target_slug, review_status')
      .eq('task_type', 'akasha_relations').range(debut, debut + 999);
    for (const r of data ?? []) if (['pending', 'approved'].includes(r.review_status)) slugs.add(r.target_slug);
    if ((data ?? []).length < 1000) break;
  }
  return slugs;
}

const [personnages, racontes, enUsine] = await Promise.all([tousLesPersonnages(), dejaRacontes(), dejaEnUsine()]);
const candidats = personnages.filter((e) => !racontes.has(e.id) && !enUsine.has(e.slug));

console.log(`corpus : ${personnages.length} personnage(s) · déjà racontés : ${personnages.filter((e) => racontes.has(e.id)).length} · déjà en usine : ${personnages.filter((e) => enUsine.has(e.slug)).length}`);
const lot = candidats.slice(0, LIMIT);
console.log(`${candidats.length} candidat(s) — ${lot.length} envoyé(s) ce tour :`);
for (const c of lot) console.log(`  · ${c.name} [${c.universe}]`);

if (DRY || !lot.length) process.exit(0);

// Le résumé n'est chargé QUE pour le lot : le tirer pour 4 038 fiches à chaque passage, ce sont
// quelques Mo transférés pour dix qui servent.
const { data: resumes } = await clientSite().from('akasha_entries').select('slug, summary').in('slug', lot.map((c) => c.slug));
const resumeParSlug = new Map((resumes ?? []).map((r) => [r.slug, r.summary]));

const messages = lot.map((c) => ({
  type: 'akasha_relations',
  payload: { slug: c.slug, name: c.name, type: c.type, universe: c.universe, summary: resumeParSlug.get(c.slug) },
}));
const { data: ids, error: sendErr } = await supabase.rpc('ops_queue_send_batch', { messages });
if (sendErr) { console.error('envoi pgmq:', sendErr.message); process.exit(1); }
console.log(`→ ${ids?.length ?? 0} tâches akasha_relations envoyées`);
