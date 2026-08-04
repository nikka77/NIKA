// scripts/ops-jury-export.mjs — prépare un JURY FENÊTRE : exporte les productions en attente avec
// LEUR source Fandom, en chargeurs JSON que des agents Claude Code jugent en masse.
//
// POURQUOI (04/08/2026). Les juges automatiques du VPS tournent sur des guichets gratuits à quota
// journalier. Quand ils sont tous fermés, la pile « à relire » ne bouge plus : ce n'est pas une
// panne, c'est un plafond. La fenêtre prend alors le relais — même barème, même contre-vérif par
// un sceptique, appliqué par ops-jury-appliquer.mjs sous garde stricte.
//
// Usage : node --env-file=.env.local scripts/ops-jury-export.mjs [--dir=…] [--prefixe=juge]
//           [--limit=1500] [--par-chargeur=30]
import fs from 'node:fs';
import { clientOps } from '../lib/ops/db.mjs';
import { fetchFandomProse } from './lib/fandom.mjs';

const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const DIR = arg('dir', '/tmp');
const PREFIXE = arg('prefixe', 'juge');
const LIMIT = Number(arg('limit', 1500));
const PAR = Number(arg('par-chargeur', 30));

const sb = clientOps();

// Le gisement : tout ce qui attend une review et n'a pas encore été tranché par la fenêtre.
const lignes = [];
for (let d = 0; lignes.length < LIMIT; d += 1000) {
  const { data, error } = await sb.from('agent_results')
    .select('id, task_type, target_slug, payload, result, status, auto_motif, auto2_motif, arbitre_motif')
    .eq('review_status', 'pending').in('status', ['done', 'suspect'])
    .neq('task_type', 'review_local').order('id', { ascending: false }).range(d, d + 999);
  if (error) { console.error('✗ lecture :', error.message); process.exit(1); }
  for (const r of data ?? []) {
    // Déjà tranché par une vague fenêtre : ne pas rejuger, c'est du temps d'agent gaspillé.
    if (String(r.arbitre_motif ?? '').startsWith('⚖ Claude')) continue;
    lignes.push(r);
  }
  if ((data ?? []).length < 1000) break;
}
console.log(`${lignes.length} production(s) à juger`);

// La source est tirée UNE fois par entité : dix productions d'un même personnage partagent la
// même page, et Fandom nous limite à ~1 page / 2 s.
const cache = new Map();
const sourceDe = async (universe, name, slug) => {
  const cle = `${universe}|${name}`;
  if (cache.has(cle)) return cache.get(cle);
  let txt = '';
  try {
    // fetchFandomProse préfixe déjà l'infobox à la prose — une seule source de vérité pour ce que
    // « la source » veut dire, partagée avec les juges du VPS.
    const prose = await fetchFandomProse(universe, name, { maxChars: 5000, slug });
    txt = prose?.text ?? '';
  } catch { /* pas de source : l'entrée sera écartée du chargeur */ }
  cache.set(cle, txt);
  return txt;
};

const entrees = []; let sansSource = 0;
for (const r of lignes) {
  const universe = r.payload?.universe, name = r.payload?.name ?? r.target_slug;
  if (!universe || !name) { sansSource++; continue; }
  const source = await sourceDe(universe, name, r.payload?.slug ?? r.target_slug);
  if (!source || source.length < 200) { sansSource++; continue; }
  const production = typeof r.result === 'string' ? r.result : JSON.stringify(r.result);
  entrees.push({
    id: r.id, name, universe, type: r.task_type,
    production: String(production ?? '').slice(0, 4000),
    source: source.slice(0, 6000),
    motifs: [r.auto_motif && `J1: ${r.auto_motif}`, r.auto2_motif && `J2: ${r.auto2_motif}`].filter(Boolean).join(' | ').slice(0, 600),
  });
  if (entrees.length % 100 === 0) console.log(`  … ${entrees.length} préparées (${sansSource} sans source)`);
}

const n = Math.ceil(entrees.length / PAR);
for (let i = 0; i < n; i++) fs.writeFileSync(`${DIR}/${PREFIXE}_${i}.json`, JSON.stringify(entrees.slice(i * PAR, (i + 1) * PAR)));
console.log(`FINAL — ${entrees.length} production(s) · ${n} chargeur(s) · ${sansSource} sans source exploitable`);
