// scripts/ops-score-ancrage.mjs — note l'ANCRAGE FACTUEL des productions en attente.
// Passe HHEM (CPU, ~1,5 s/paire) sur chaque production : « ce que l'agent affirme est-il
// étayé par l'article source ? ». Tourne en parallèle du worker sans lui voler le GPU.
// Usage : node --env-file=.env.local scripts/ops-score-ancrage.mjs [--limit=30] [--write]
//   sans --write : affiche seulement (mode inspection)
import { createClient } from '@supabase/supabase-js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { splitPreuves, termeAnglais } from './lib/akasha-axes.mjs';
import { fetchFandomProse } from './lib/fandom.mjs';

const run = promisify(execFile);
// fileURLToPath (pas .pathname) : le projet vit dans iCloud, dont le chemin contient des
// espaces — .pathname les rend « %20 » et spawn échoue avec ENOENT.
const PY = fileURLToPath(new URL('../.ops-venv/bin/python', import.meta.url));
const SCORER = fileURLToPath(new URL('./hhem/score.py', import.meta.url));

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 30);
const WRITE = process.argv.includes('--write');

/** Attributs → phrases naturelles : HHEM juge des PHRASES, pas des « clé = valeur ». */
const PHRASES = {
  village: (n, v) => `${n} is a shinobi of ${v}.`,
  clan: (n, v) => `${n} belongs to the ${v} clan.`,
  rank: (n, v) => `${n} holds the ninja rank of ${v}.`,
  faction: (n, v) => `${n} belongs to the ${v} faction.`,
  crew: (n, v) => `${n} is a member of the crew ${v}.`,
  fruit_type: (n, v) => `${n} ate a Devil Fruit of the ${v} type.`,
  race: (n, v) => `${n} is a ${v}.`,
  division: (n, v) => `${n} serves in the ${v} of the Gotei 13.`,
  saga: (n, v) => `${n} appears in the ${v}.`,
  nen: (n, v) => `${n} is a Nen user of the ${v} category.`,
  partie: (n, v) => `${n} appears in ${v} of JoJo's Bizarre Adventure.`,
  camp: (n, v) => `${n} belongs to the ${v} camp.`,
  affiliation: (n, v) => `${n} races for the team ${v}.`,
  col: (n, v) => `${n} races on ${v}.`,
};

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
  const source = page.text.slice(0, 4000);

  if (r.task_type === 'akasha_attrs') {
    const { valeurs } = splitPreuves(r.result);
    for (const [attr, v] of Object.entries(valeurs)) {
      if (!v || v === 'inconnu' || !PHRASES[attr]) continue;
      items.push({ id: `${r.id}:${attr}`, name: p.name, source, claim: PHRASES[attr](p.name, termeAnglais(v)) });
    }
  } else if (r.result?.descFr) {
    items.push({ id: `${r.id}:descFr`, name: p.name, source, claim: r.result.descFr });
  }
}

if (!items.length) { console.log('rien à noter'); process.exit(0); }
console.log(`${items.length} affirmation(s) à vérifier…`);

// Fichier temporaire plutôt que stdin : execFile n'a PAS d'option `input` (c'est execFileSync),
// et le script Python restait bloqué à attendre une entrée qui n'arrivait jamais (25/07).
const tmp = join(tmpdir(), `nika-hhem-${Date.now()}.json`);
await writeFile(tmp, JSON.stringify(items.map(({ id, source, claim }) => ({ id, source, claim }))));
const { stdout } = await run(PY, [SCORER, tmp], { maxBuffer: 32 * 1024 * 1024 });
await unlink(tmp).catch(() => {});
const scores = new Map(JSON.parse(stdout).map((s) => [s.id, s.score]));

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
