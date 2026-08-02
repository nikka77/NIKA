// scripts/ops-realias-requeue.mjs — RE-CIRCUIT des écartées désormais CURÉES (02/08/2026).
//
// La pile « écartées par les gardes » contient des centaines de refus antérieurs à la curation
// d'alias : la page existait, seul le titre nous échappait. Pour chaque refus dont le
// (univers, nom) figure maintenant au registre curé, la charge utile d'origine repart en
// production — l'usine résoudra cette fois — et l'ancien refus est clos avec son motif.
//
// Usage : node --env-file=.env.local scripts/ops-realias-requeue.mjs [--dry] [--limit=300]
import { createClient } from '@supabase/supabase-js';
import { clientOps } from '../lib/ops/db.mjs';
import { ALIAS_REGISTRE } from './lib/fandom.mjs';

const supabase = clientOps();
const DRY = process.argv.includes('--dry');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 300);

const vus = new Set();
const aRelancer = [];
for (let d = 0; d < 6000 && aRelancer.length < LIMIT; d += 1000) {
  const { data } = await supabase.from('agent_results')
    .select('id, task_type, payload')
    .eq('status', 'refused').eq('review_status', 'pending')
    .order('id').range(d, d + 999);
  for (const r of data ?? []) {
    const u = r.payload?.universe, n = r.payload?.name;
    if (!u || !n || !ALIAS_REGISTRE[u]?.[n]) continue;
    const cle = `${r.task_type}|${u}|${n}`;
    if (vus.has(cle)) {
      // Doublon du même travail : on clôt sans relancer.
      aRelancer.push({ id: r.id, doublon: true });
      continue;
    }
    vus.add(cle);
    aRelancer.push({ id: r.id, type: r.task_type, payload: r.payload });
  }
  if ((data?.length ?? 0) < 1000) break;
}
const relances = aRelancer.filter((x) => !x.doublon);
console.log(`${aRelancer.length} refus curés (${relances.length} à relancer, ${aRelancer.length - relances.length} doublons clos)`);
if (DRY || !aRelancer.length) process.exit(0);

for (let i = 0; i < relances.length; i += 100)
  await supabase.rpc('ops_queue_send_batch', {
    messages: relances.slice(i, i + 100).map((x) => ({ type: x.type, payload: x.payload })),
  });
await supabase.from('agent_results')
  .update({ review_status: 'rejected', reviewed_at: new Date().toISOString(), error: 'alias curé — relancée en production' })
  .in('id', aRelancer.map((x) => x.id));
console.log(`✓ ${relances.length} production(s) relancée(s) avec le registre curé`);
