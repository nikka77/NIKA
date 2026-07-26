// scripts/ops-bilan-nuit.mjs — bilan de la fenêtre de nuit + SENTINELLES, envoyé en alerte.
// Trois états : 🌙 bilan normal · 🛑 pipeline bloqué (zéro production = panne, pas du calme) ·
// ⚠ taux d'échec anormal. Une nuit silencieuse et une nuit en panne ne doivent JAMAIS se ressembler.
// Usage : node --env-file=.env.local scripts/ops-bilan-nuit.mjs [--heures=8]
import { createClient } from '@supabase/supabase-js';
import { envoyerAlerte } from './lib/alerte.mjs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const HEURES = Number(process.argv.find((a) => a.startsWith('--heures='))?.split('=')[1] ?? 8);
const depuis = new Date(Date.now() - HEURES * 3600_000).toISOString();

const { data: rows } = await supabase
  .from('agent_results')
  .select('task_type, status, review_status, auto_applique, created_at')
  .gte('created_at', depuis)
  .neq('task_type', 'review_local');

const n = rows?.length ?? 0;
const faits = rows?.filter((r) => ['done', 'suspect'].includes(r.status)).length ?? 0;
const echecs = rows?.filter((r) => r.status === 'failed').length ?? 0;
const refus = rows?.filter((r) => r.status === 'refused').length ?? 0;
const autos = rows?.filter((r) => r.auto_applique).length ?? 0;
const { data: metrics } = await supabase.rpc('ops_queue_metrics');
const enFile = metrics?.[0]?.queue_length ?? '?';

let texte;
if (n === 0) {
  texte = `🛑 NIKA OPS : AUCUNE production depuis ${HEURES} h — pipeline bloqué ? (file : ${enFile}). Vérifie ~/.cache/nika/nuit-*.log`;
} else if (echecs > faits) {
  texte = `⚠ NIKA OPS : nuit dégradée — ${echecs} échec(s) pour ${faits} production(s) sur ${HEURES} h. Log : ~/.cache/nika/nuit-*.log`;
} else {
  texte = `🌙 NIKA OPS : ${faits} production(s), ⚡${autos} auto-appliquée(s), ${refus} refus de garde, ${echecs} échec(s), file ${enFile}. Review : localhost:3000/ops`;
}

console.log(texte);
console.log('canaux :', (await envoyerAlerte(texte)).join(' · '));
