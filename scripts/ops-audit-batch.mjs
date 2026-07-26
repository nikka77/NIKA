// scripts/ops-audit-batch.mjs — outillage de l'audit à l'aveugle mené par Claude (26/07, demande Dan).
// --list [--limit=8] [--skip=N] [--recent] : imprime les prochaines fiches À AUDITER avec leur SOURCE.
//   --recent : les plus RÉCENTES d'abord (audit hebdo : surveiller la dérive de la semaine, surtout les ⚡auto).
// --vote '[{"id":123,"v":"exact","m":"..."}]' : enregistre les verdicts via l'API (juge=claude,
//   ce qui déclenche aussi l'annulation en base si « faux » sur une fiche déjà appliquée).
import { createClient } from '@supabase/supabase-js';
import { fetchFandomProse } from './lib/fandom.mjs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 8);
const SKIP = Number(process.argv.find((a) => a.startsWith('--skip='))?.split('=')[1] ?? 0);

async function dejaVus() {
  const { data } = await supabase.from('ops_notes').select('content').eq('source', 'audit');
  return new Set((data ?? []).flatMap((n) => { try { return [JSON.parse(n.content).result_id]; } catch { return []; } }));
}

if (process.argv.includes('--list')) {
  const vus = await dejaVus();
  const { data: pool } = await supabase
    .from('agent_results')
    .select('id, task_type, target_slug, payload, result, review_status')
    .eq('auto_verdict', 'valide')
    .in('status', ['done', 'suspect'])
    .order('id', { ascending: !process.argv.includes('--recent') })
    .limit(200);
  const aFaire = (pool ?? []).filter((r) => !vus.has(r.id)).slice(SKIP, SKIP + LIMIT);
  console.log(`restants après ceux-ci : ${(pool ?? []).filter((r) => !vus.has(r.id)).length - SKIP - aFaire.length}`);
  for (const r of aFaire) {
    const p = r.payload ?? {};
    console.log(`\n████ #${r.id} · ${r.task_type} · ${p.name} [${p.universe}] · ${r.review_status === 'approved' ? 'DÉJÀ APPLIQUÉE' : 'en attente'}`);
    if (r.task_type === 'akasha_attrs') {
      for (const [k, v] of Object.entries(r.result ?? {}))
        if (!k.endsWith('_preuve') && v !== 'inconnu') console.log(`  ${k} = ${v}\n    preuve : « ${r.result[k + '_preuve'] ?? ''} »`);
    } else if (r.result?.relations) {
      for (const x of r.result.relations) console.log(`  ${x.avec} · ${x.nature} · ${x.periode} — ${x.resume}\n    preuve : « ${x.preuve} »`);
    } else if (r.result?.descFr) console.log(`  ${r.result.descFr}`);
    const page = await fetchFandomProse(p.universe, p.name).catch(() => null);
    console.log(`  ── SOURCE (${page?.title ?? 'indisponible'}) ──`);
    console.log('  ' + (page?.text ?? '(pas de source)').slice(0, 3300).replace(/\n/g, '\n  '));
  }
} else if (process.argv.includes('--vote')) {
  // Écriture DIRECTE en base (MIROIR de app/api/ops/audit/route.ts — reporter tout changement) :
  // l'audit hebdo tourne la nuit, sans serveur de dev. Annulation comprise si « faux » sur une
  // fiche appliquée — exacte, car les remplisseurs ne ciblent que des champs vides.
  const votes = JSON.parse(process.argv[process.argv.indexOf('--vote') + 1]);
  for (const { id, v, m } of votes) {
    const { data: row } = await supabase.from('agent_results').select('*').eq('id', id).single();
    if (!row) { console.log(`#${id} → introuvable`); continue; }
    await supabase.from('ops_notes').insert({
      source: 'audit',
      content: JSON.stringify({ result_id: id, verdict_dan: v, verdict_ia: row.auto_verdict, task_type: row.task_type, juge: 'claude', motif: m }),
    });
    let annule = false;
    if (v === 'faux' && row.review_status === 'approved') {
      const { data: entry } = await supabase.from('akasha_entries').select('attributes').eq('slug', row.target_slug).single();
      if (entry) {
        const patch = { ...(entry.attributes ?? {}) };
        if (row.task_type === 'akasha_relations') { delete patch.relations; delete patch.relationsSource; }
        else if (row.task_type === 'akasha_attrs') {
          for (const k of Object.keys(row.result ?? {})) if (!k.endsWith('_preuve')) delete patch[k];
        } else { delete patch.descFr; delete patch.descFrSource; }
        await supabase.from('akasha_entries').update({ attributes: patch }).eq('slug', row.target_slug);
        await supabase.from('agent_results').update({ review_status: 'rejected' }).eq('id', id);
        annule = true;
      }
    }
    console.log(`#${id} → ${v}${annule ? ' (ANNULÉE en base)' : ''}`);
  }
  const { data: notes } = await supabase.from('ops_notes').select('content').eq('source', 'audit');
  const vs = (notes ?? []).flatMap((n) => { try { return [JSON.parse(n.content)]; } catch { return []; } });
  const exacts = vs.filter((x) => x.verdict_dan === 'exact').length;
  console.log(`\nbilan : ${vs.length} jugées · accord ${Math.round(100 * exacts / vs.length)} % · ${vs.length - exacts} désaccord(s)`);
}
