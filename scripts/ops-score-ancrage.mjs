// scripts/ops-score-ancrage.mjs — note l'ANCRAGE FACTUEL des productions en attente.
// Passe HHEM (CPU, ~1,5 s/paire) sur chaque production : « ce que l'agent affirme est-il
// étayé par l'article source ? ». Tourne en parallèle du worker sans lui voler le GPU.
// Usage : node --env-file=.env.local scripts/ops-score-ancrage.mjs [--limit=30] [--write]
//   sans --write : affiche seulement (mode inspection)
import { createClient } from '@supabase/supabase-js';
import { clientOps } from '../lib/ops/db.mjs';
import { fetchFandomProse } from './lib/fandom.mjs';
import { construireAffirmations, scorerHHEM } from './lib/ancrage.mjs';

const supabase = clientOps();
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 30);
const WRITE = process.argv.includes('--write');

const { data: rows } = await supabase
  .from('agent_results')
  .select('id, target_slug, task_type, payload, result, status')
  .eq('review_status', 'pending')
  .in('status', ['done', 'suspect'])
  .order('id', { ascending: false })
  .limit(LIMIT);

const items = [];
for (const r of rows ?? []) {
  const p = r.payload ?? {};
  const page = await fetchFandomProse(p.universe, p.name).catch(() => null);
  if (!page?.text) continue;
  items.push(...construireAffirmations(r, page.text.slice(0, 4000)));
}

if (!items.length) { console.log('rien à noter'); process.exit(0); }
console.log(`${items.length} affirmation(s) à vérifier…`);

const scores = await scorerHHEM(items);
if (!scores) { console.log('HHEM indisponible — aucun score produit'); process.exit(1); }

// Regroupe par production : la note d'une production = son affirmation la MOINS étayée.
const parProduction = new Map();
for (const it of items) {
  const [rid] = it.id.split(':');
  const s = scores.get(it.id) ?? 0;
  const cur = parProduction.get(rid);
  if (!cur || s < cur.min) parProduction.set(rid, { min: s, pire: it.claim, name: it.name });
}

for (const [rid, { min, pire, name }] of [...parProduction].sort((a, b) => a[1].min - b[1].min)) {
  const flag = min >= 0.5 ? '✓' : min >= 0.15 ? '~' : '⚠';
  console.log(`${flag} ${String(min.toFixed(3)).padStart(6)}  ${String(name).padEnd(24)} ${pire.slice(0, 70)}`);
  if (WRITE) await supabase.from('agent_results').update({ auto_score: min }).eq('id', Number(rid));
}
console.log(WRITE ? '\nscores écrits (colonne auto_score)' : '\n(mode inspection — relancer avec --write pour enregistrer)');
