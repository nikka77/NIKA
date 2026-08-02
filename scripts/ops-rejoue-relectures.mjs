// scripts/ops-rejoue-relectures.mjs — rejoue les relectures ORPHELINES (26/07 : Spirit Bomb
// bloquée par deux « fetch failed » du juge local — l'échec technique d'un juge ne doit pas
// laisser une production sans verdict pour toujours).
// Orpheline = production en attente (pending, done/suspect) dont un slot de juge est vide ou en
// erreur, et assez vieille pour ne plus être « en cours » (la file a une visibilité de 10 min).
// Usage : node --env-file=.env.local scripts/ops-rejoue-relectures.mjs [--dry] [--age-min=30]
import { createClient } from '@supabase/supabase-js';
import { clientOps } from '../lib/ops/db.mjs';
import { fetchFandomProse } from './lib/fandom.mjs';
import { splitPreuves } from './lib/akasha-axes.mjs';

const supabase = clientOps();
const DRY = process.argv.includes('--dry');
const AGE_MIN = Number(process.argv.find((a) => a.startsWith('--age-min='))?.split('=')[1] ?? 30);

// --slug=a,b,c : cibler une campagne précise. Sans lui, la requête prend les 60 PLUS ANCIENNES
// productions en attente — un chantier lancé il y a dix minutes n'y figure jamais (02/08).
const SLUGS = (process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1] ?? '')
  .split(',').map((x) => x.trim()).filter(Boolean);
// --universe : rattraper un univers entier d'un coup. 118 sections Death Note se sont retrouvées
// sans aucune relecture en file le 02/08 — produites, jamais jugées, invisibles partout : ni dans
// la file (rien à leur nom), ni dans la pile de Dan (pas de verdict à relire), ni sur le site.
// Une production sans verdict ET sans tâche de verdict ne se signale nulle part.
const UNIVERSE = process.argv.find((a) => a.startsWith('--universe='))?.split('=')[1];

let q = supabase
  .from('agent_results')
  .select('id, task_type, target_slug, payload, result, auto_verdict, auto_motif, auto2_verdict, auto2_motif, created_at')
  .eq('review_status', 'pending')
  .in('status', ['done', 'suspect'])
  .neq('task_type', 'review_local')
  .lt('created_at', new Date(Date.now() - AGE_MIN * 60_000).toISOString())
  .order('id', { ascending: true })
  .limit(Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 60));
if (SLUGS.length) q = q.in('target_slug', SLUGS);
if (UNIVERSE) q = q.eq('payload->>universe', UNIVERSE);
const { data: rows } = await q;

// Un slot est à rejouer si : jamais rempli, ou rempli par une ERREUR technique (pas un verdict).
const enErreur = (verdict, motif) => !verdict && /error|failed|http \d|timeout/i.test(motif ?? '');
const jamaisJuge = (verdict, motif) => !verdict && !motif;

// MIROIR de chainReview (scripts/agent-worker.mjs) : mise en forme de la production pour le juge.
function productionDe(row) {
  if (row.task_type === 'akasha_attrs') {
    const { valeurs, preuves } = splitPreuves(row.result);
    const etablis = Object.entries(valeurs).filter(([, v]) => v && v !== 'inconnu');
    if (!etablis.length) return null;
    return etablis.map(([k, v]) => `${k} = ${v}  (preuve avancée : « ${preuves[k] ?? 'aucune'} »)`).join('\n');
  }
  if (row.task_type === 'akasha_relations') {
    const rel = row.result?.relations ?? [];
    if (!rel.length) return null;
    return rel.map((r) => `${r.avec} (${r.nature}, ${r.periode}) : ${r.resume}  (preuve avancée : « ${r.preuve} »)`).join('\n');
  }
  // Une SECTION porte sa propre source dans sa charge utile — miroir exact de chainReview.
  if (row.task_type === 'fiche_section') {
    return row.result?.texte ? `Section « ${row.result?.titre} » :\n${row.result.texte}` : null;
  }
  if (row.task_type === 'toilettage_fr') return row.result?.corrige ? row.result?.texte ?? null : null;
  return row.result?.descFr ?? null;
}

// MIROIR de chainReview, deuxième moitié : la SOURCE que verra le juge, et la NATURE de la
// tâche. Ce `kind` conditionne tout le contrôle — sans lui, une section était jugée avec le
// barème des données clé=valeur (« ne juge pas la langue »), c'est-à-dire pas du tout.
const KIND = {
  akasha_attrs: 'axes', akasha_relations: 'relations',
  toilettage_fr: 'toilettage', fiche_section: 'section',
};
async function sourceDe(row) {
  const p = row.payload ?? {};
  if (row.task_type === 'fiche_section') return String(p.section_texte ?? '');
  if (row.task_type === 'toilettage_fr') return String(p.texte ?? '');
  const page = await fetchFandomProse(p.universe, p.name, { maxChars: 6000 }).catch(() => null);
  return page?.text ?? '';
}

// Le jury EN SERVICE, pas celui d'il y a une semaine. Les valeurs par défaut suivent usine.sh :
// ce script rejouait encore sur ollama/gemma4 et gemini-flash-lite, deux couloirs sortis du parc.
const JURY = [
  { juge_modele: process.env.NIKA_JUGE1 ?? 'deepinfra/meta-llama/Llama-3.3-70B-Instruct-Turbo', slot: 'auto' },
  { juge_modele: process.env.NIKA_JUGE2 ?? 'openrouter/google/gemma-4-26b-a4b-it:free', slot: 'auto2' },
];

const messages = [];
for (const row of rows ?? []) {
  const slots = [];
  if (enErreur(row.auto_verdict, row.auto_motif) || jamaisJuge(row.auto_verdict, row.auto_motif)) slots.push(JURY[0]);
  if (enErreur(row.auto2_verdict, row.auto2_motif) || jamaisJuge(row.auto2_verdict, row.auto2_motif)) slots.push(JURY[1]);
  if (!slots.length) continue;

  const production = productionDe(row);
  if (!production) continue;                                 // rien à juger (abstention honnête)
  const p = row.payload ?? {};
  const source = await sourceDe(row);
  if (!source) continue;                                     // pas de source → pas de jugement

  for (const j of slots) {
    console.log(`  ↻ #${row.id} ${row.target_slug} → ${j.slot} (${j.juge_modele.split('/')[1] ?? j.juge_modele})`);
    messages.push({
      type: 'review_local',
      payload: {
        reviewed_id: row.id, slug: row.target_slug, name: p.name, universe: p.universe,
        ...(p.alias_de ? { alias_de: p.alias_de } : {}),
        kind: KIND[row.task_type] ?? 'prose',
        production, source: source.slice(0, 6000), ...j,
        evite: JURY.map((x) => x.juge_modele).filter((m) => m !== j.juge_modele),
      },
    });
  }
}

console.log(`${messages.length} relecture(s) orpheline(s) à rejouer`);
if (!DRY && messages.length) {
  const { data: ids, error } = await supabase.rpc('ops_queue_send_batch', { messages });
  console.log(error ? 'envoi pgmq: ' + error.message : `→ ${ids?.length ?? 0} envoyée(s)`);
}
