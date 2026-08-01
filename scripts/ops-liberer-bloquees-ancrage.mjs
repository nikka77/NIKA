// scripts/ops-liberer-bloquees-ancrage.mjs — rattrape les fiches que le veto d'ancrage a
// retenues à tort entre le 31/07 et le 01/08 (script à usage unique, conservé pour la trace).
//
// Le veto exigeait un score HHEM ≥ 0,50 avant application automatique. Mesuré depuis : sur les
// phrases d'attributs, HHEM ne discrimine pas le vrai du faux (« faction Pirate » FAUX à 0,74
// contre « Fruit Logia » VRAI à 0,0099). Le veto a donc bloqué des fiches justes que LES DEUX
// juges avaient validées. Ce script rejoue leur application — rien d'autre : mêmes conditions
// que l'automatisme normal (double verdict valide, statut done, review encore en attente).
//
// Usage : node --env-file=.env.local scripts/ops-liberer-bloquees-ancrage.mjs [--dry]
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');

const { data: rows, error } = await supabase.from('agent_results')
  .select('id, task_type, target_slug, payload, result, auto_score')
  .eq('review_status', 'pending').eq('status', 'done')
  .eq('auto_verdict', 'valide').eq('auto2_verdict', 'valide')
  .not('auto_score', 'is', null);
if (error) { console.error(error.message); process.exit(1); }

console.log(`${rows?.length ?? 0} fiche(s) double-validée(s) retenue(s) par l'ancrage :`);
for (const r of rows ?? []) {
  const quoi = r.task_type === 'akasha_attrs'
    ? Object.entries(r.result ?? {}).filter(([k, v]) => !k.endsWith('_preuve') && v && v !== 'inconnu').map(([k, v]) => `${k}=${v}`).join(' · ')
    : String(r.result?.descFr ?? '').slice(0, 70);
  console.log(`  · ${(r.payload?.name ?? r.target_slug).padEnd(22)} ancrage ${String(r.auto_score).padStart(6)} — ${quoi}`);
}
if (DRY || !rows?.length) { console.log(DRY ? '\n(à blanc — rien appliqué)' : ''); process.exit(0); }

// MIROIR de verrouEtAppliquer (scripts/agent-worker.mjs) : mêmes filtres, même verrou optimiste,
// mêmes règles d'écriture. Si tu changes une règle là-bas, reporte-la ici.
let applique = 0;
for (const r of rows) {
  const { data: gagne } = await supabase.from('agent_results')
    .update({ review_status: 'approved', auto_applique: true, reviewed_at: new Date().toISOString() })
    .eq('id', r.id).eq('review_status', 'pending').eq('status', 'done')
    .eq('auto_verdict', 'valide').eq('auto2_verdict', 'valide')
    .select('*').single();
  if (!gagne) continue;

  const { data: entry } = await supabase.from('akasha_entries').select('attributes').eq('slug', gagne.target_slug).single();
  if (!entry) continue;
  const patch = { ...(entry.attributes ?? {}) };
  const DESCFR = ['fandom_descfr', 'flavor_akasha', 'fiche_technique', 'fiche_artefact', 'fiche_lieu', 'fiche_lexique'];
  if (DESCFR.includes(gagne.task_type)) {
    patch.descFr = gagne.result?.descFr;
    patch.descFrSource = gagne.model;
  } else if (gagne.task_type === 'akasha_attrs') {
    for (const [k, v] of Object.entries(gagne.result ?? {}))
      if (v && v !== 'inconnu' && !k.endsWith('_preuve')) patch[k] = v;
  } else continue;
  await supabase.from('akasha_entries').update({ attributes: patch }).eq('slug', gagne.target_slug);
  applique++;
  console.log(`  ⚡ appliquée : ${gagne.target_slug}`);
}
console.log(`\n${applique} fiche(s) rendue(s) à l'automatisme — autant de moins dans la pile de Dan.`);
