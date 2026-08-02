// scripts/ops-litiges-claude.mjs — BALAYEUR des litiges vers l'arbitre Claude (02/08/2026).
//
// Troisième étage de la hiérarchie mesurée aujourd'hui : les petits modèles jugent en masse
// (0,0002 $ le verdict), Claude tranche les litiges (0,006 $), Dan ne voit que les cas d'école.
// L'atelier manuel du 02/08 a chiffré l'enjeu : sur 128 litiges Death Note, 77 % des refus
// contestés étaient des FAUX POSITIFS des petits juges — autant de fiches justes qui seraient
// restées garées dans la pile humaine.
//
// Un LITIGE = production en attente (pending, status done) dont les verdicts sont RÉGLÉS mais
// ne publient pas : accord « à corriger »/« rejeter », ou désaccord tranché non-valide par
// l'arbitre machine. Les « suspect » (preuve douteuse) restent à Dan — c'est leur bac.
// Le message embarque TOUT (production, source, reproches) : le worker n'a rien à re-résoudre.
//
// Usage : node --env-file=.env.local scripts/ops-litiges-claude.mjs [--dry] [--limit=120]
//         [--age-min=20] [--universe="Death Note"]
import { createClient } from '@supabase/supabase-js';
import { clientOps } from '../lib/ops/db.mjs';
import { fetchFandomProse } from './lib/fandom.mjs';
import { splitPreuves } from './lib/akasha-axes.mjs';

const supabase = clientOps();
const DRY = process.argv.includes('--dry');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 120);
const AGE_MIN = Number(process.argv.find((a) => a.startsWith('--age-min='))?.split('=')[1] ?? 20);
const UNIVERSE = process.argv.find((a) => a.startsWith('--universe='))?.split('=')[1];

let q = supabase.from('agent_results')
  .select('id, task_type, target_slug, payload, result, status, auto_verdict, auto_motif, auto2_verdict, auto2_motif, arbitre_verdict, arbitre_motif, arbitre_at')
  .eq('review_status', 'pending').in('status', ['done', 'suspect'])
  .neq('task_type', 'review_local')
  .not('auto_verdict', 'is', null).not('auto2_verdict', 'is', null)
  .lt('created_at', new Date(Date.now() - AGE_MIN * 60_000).toISOString())
  .order('id').limit(LIMIT * 3);
if (UNIVERSE) q = q.eq('payload->>universe', UNIVERSE);
const { data: rows } = await q;

// Réglé-sans-publication : accord pour refuser, arbitre machine non-valide — ET, depuis le
// 02/08 au soir (« dispatche tout ça »), les SUSPECT réglés : la preuve douteuse trouve son
// juge de sortie dans l'arbitre Claude au lieu d'attendre l'œil de Dan indéfiniment.
const litiges = (rows ?? []).filter((r) => {
  if (r.arbitre_motif?.startsWith('⚖ Claude')) return false;         // déjà arbitré par Claude
  if (r.status === 'suspect') return Boolean(r.auto_verdict && r.auto2_verdict);
  if (r.auto_verdict === r.auto2_verdict) return r.auto_verdict !== 'valide';
  return Boolean(r.arbitre_verdict) && r.arbitre_verdict !== 'valide';
}).slice(0, LIMIT);
console.log(`${litiges.length} litige(s) mûr(s) pour l'arbitre Claude${UNIVERSE ? ` [${UNIVERSE}]` : ''}`);
if (!litiges.length) process.exit(0);

// MIROIR de chainReview : la production telle que les juges l'ont vue, et SA source.
function productionDe(r) {
  if (r.task_type === 'akasha_attrs') {
    const { valeurs, preuves } = splitPreuves(r.result);
    return Object.entries(valeurs).filter(([, v]) => v && v !== 'inconnu')
      .map(([k, v]) => `${k} = ${v}  (preuve : « ${preuves[k] ?? 'aucune'} »)`).join('\n') || null;
  }
  if (r.task_type === 'akasha_relations') {
    return (r.result?.relations ?? []).map((x) => `${x.avec} (${x.nature}) : ${x.resume}  (preuve : « ${x.preuve} »)`).join('\n') || null;
  }
  if (r.task_type === 'fiche_section') return r.result?.texte ? `Section « ${r.result?.titre} » :\n${r.result.texte}` : null;
  if (r.task_type === 'toilettage_fr') return r.result?.texte ?? null;
  return r.result?.descFr ?? null;
}
async function sourceDe(r) {
  const p = r.payload ?? {};
  if (r.task_type === 'fiche_section') return String(p.section_texte ?? '');
  if (r.task_type === 'toilettage_fr') return String(p.texte ?? '');
  const page = await fetchFandomProse(p.universe, p.name, { maxChars: 6000 }).catch(() => null);
  return page?.text ?? '';
}

// EN LOTS DE 10 : un litige par appel CLI coûtait 1 314 appels pour la pile — trois jours au
// guichet. Dix par appel : la même pile tient en ~130 appels, une soirée.
const dossiers = [];
for (const r of litiges) {
  const production = productionDe(r);
  const source = await sourceDe(r);
  if (!production || !source) continue;
  const motifs = [
    r.auto_motif && `Juge n°1 (${r.auto_verdict}) : ${r.auto_motif}`,
    r.auto2_motif && `Juge n°2 (${r.auto2_verdict}) : ${r.auto2_motif}`,
    r.arbitre_motif && `Arbitre machine (${r.arbitre_verdict}) : ${r.arbitre_motif}`,
    r.status === 'suspect' && 'Statut : SUSPECT (preuve douteuse signalée par les gardes)',
  ].filter(Boolean).join('\n');
  dossiers.push({ id: r.id, name: r.payload?.name, universe: r.payload?.universe,
    task_type_origine: r.task_type, production: String(production).slice(0, 2500), source: String(source).slice(0, 2800), motifs });
}
const messages = [];
for (let i = 0; i < dossiers.length; i += 10)
  messages.push({ type: 'arbitrage_claude_lot', payload: { litiges: dossiers.slice(i, i + 10) } });
console.log(`→ ${dossiers.length} litige(s) en ${messages.length} lot(s) de 10`);
if (DRY || !messages.length) process.exit(0);
for (let i = 0; i < messages.length; i += 50)
  await supabase.rpc('ops_queue_send_batch', { messages: messages.slice(i, i + 50) });
console.log(`✓ envoyés à l'arbitre Claude (guichet : 400/jour ≈ 2,60 $ maximum)`);
