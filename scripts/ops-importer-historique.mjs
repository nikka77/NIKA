// scripts/ops-importer-historique.mjs — rapatrie l'HISTORIQUE agent_results de Supabase
// vers la base de travail VPS (03/08, après la levée des restrictions — Supabase Pro).
//
// La console repartait de zéro : « Approuvées 5 » là où 2 599 fiches avaient été publiées.
// On importe la mémoire, PAS le travail périmé : la vieille pile « à relire » (pending +
// done/suspect) reste dehors — ses cibles ont été re-produites par le circuit neuf, la
// ressusciter noierait le tableau de Dan sous des doublons d'un autre âge. Les refusées
// voyagent en revanche : c'est la mémoire des sans-source dont vit le Rédacteur.
//
// Idempotent : marqueur import_source sur chaque ligne importée, reprise par plage d'id.
// Usage : node --env-file=.env.local scripts/ops-importer-historique.mjs [--dry]
import { createClient } from '@supabase/supabase-js';
import { clientOps } from '../lib/ops/db.mjs';

const DRY = process.argv.includes('--dry');
const source = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  global: { fetch: (u, o) => fetch(u, { ...o, signal: AbortSignal.timeout(90_000) }) },
});
const dest = clientOps();

// Reprise : dernier id source déjà importé (rangé dans result.import_source pour ne pas
// toucher au schéma — les lignes d'historique ne repassent jamais en machine).
let apres = 0;
{
  const { data } = await dest.from('agent_results').select('result')
    .not('result->import_source', 'is', null)
    .order('id', { ascending: false }).limit(1);
  apres = Number(data?.[0]?.result?.import_source ?? 0);
}
console.log(`reprise après id source ${apres}`);

let importees = 0, sautees = 0;
for (;;) {
  const { data: page, error } = await source.from('agent_results').select('*')
    .gt('id', apres).order('id').limit(500);
  if (error) { console.error('lecture source :', error.message.slice(0, 100), '— pause 15 s'); await new Promise((r) => setTimeout(r, 15_000)); continue; }
  if (!page?.length) break;
  apres = page[page.length - 1].id;

  // L'historique voyage ; la vieille pile à relire reste (voir en-tête).
  const garder = page.filter((r) => !(r.review_status === 'pending' && ['done', 'suspect'].includes(r.status)));
  sautees += page.length - garder.length;
  if (garder.length && !DRY) {
    const lignes = garder.map(({ id, ...r }) => ({
      ...r, result: { ...(r.result ?? {}), import_source: id },
    }));
    const { error: eIns } = await dest.from('agent_results').insert(lignes);
    if (eIns) { console.error('insertion VPS :', eIns.message.slice(0, 120)); process.exit(1); }
  }
  importees += garder.length;
  if (importees % 5000 < 500) console.log(`  … ${importees} importée(s), ${sautees} pile périmée sautée(s) (id source ${apres})`);
}
console.log(`FINAL — ${importees} ligne(s) d'historique importées · ${sautees} de pile périmée laissées sur Supabase`);
