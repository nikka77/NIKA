// scripts/ops-audit-batch.mjs — outillage de l'audit à l'aveugle mené par Claude (26/07, demande Dan).
// --list [--limit=8] [--skip=N] : imprime les prochaines fiches À AUDITER avec leur SOURCE fraîche.
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
    .order('id', { ascending: true })
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
  const votes = JSON.parse(process.argv[process.argv.indexOf('--vote') + 1]);
  for (const { id, v, m } of votes) {
    const r = await fetch('http://localhost:3000/api/ops/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result_id: id, verdict_dan: v, juge: 'claude', motif: m }),
    });
    const j = await r.json();
    console.log(`#${id} → ${v}${j.annule ? ' (ANNULÉE en base)' : ''}`);
  }
  const etat = await fetch('http://localhost:3000/api/ops/audit').then((r) => r.json());
  console.log(`\nbilan : ${etat.juges} jugées · accord ${etat.accord} % · kappa ${etat.kappa} · ${etat.desaccords} désaccord(s)`);
}
