// scripts/descfr-mesure.mjs — MESURE (lecture seule) du chantier « fiches sans texte français ».
//
// POURQUOI ce script existe alors que le carnet donne déjà 454 : le chiffre du carnet est daté du
// 10/08 au matin et l'usine publie en parallèle. Un chantier qui part d'un chiffre cité au lieu
// d'un chiffre recompté écrit sur des fiches déjà servies.
//
// PAGINATION OBLIGATOIRE : un select nu s'arrête à 1 000 lignes SANS erreur (leçon du 07/08 —
// le garde d'idempotence de l'usine mentait exactement comme ça).
//
// Usage : node --env-file=.env.local scripts/descfr-mesure.mjs
import { writeFile } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';

const s = clientSite();
const PAS = 1000;

/** Tout le corpus, page par page. Le `.order('id')` fixe l'ordre : sans lui, deux pages
 *  successives peuvent se recouvrir ou sauter des lignes. */
async function toutLire(colonnes) {
  const out = [];
  for (let d = 0; ; d += PAS) {
    const { data, error } = await s.from('akasha_entries').select(colonnes)
      .order('id').range(d, d + PAS - 1);
    if (error) throw new Error(`lecture @${d} : ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < PAS) break;
  }
  return out;
}

const lignes = await toutLire('id,slug,name,type,universe,summary,image_url,attributes');
console.log(`corpus : ${lignes.length} fiches`);

const vide = (x) => typeof x !== 'string' || !x.trim();
const sans = lignes.filter((l) => vide(l.attributes?.descFr));

const parUnivers = {};
for (const l of sans) {
  const u = l.universe ?? '(sans univers)';
  parUnivers[u] ??= { total: 0, parType: {} };
  parUnivers[u].total++;
  parUnivers[u].parType[l.type ?? '?'] = (parUnivers[u].parType[l.type ?? '?'] ?? 0) + 1;
}

// Un nom FRANÇAIS curé n'a aucune chance sur un wiki anglophone mais est un titre exact sur le
// wiki francophone : c'est la population que ce chantier vise en priorité.
const ACCENT = /[àâäéèêëîïôöùûüçœÀÂÄÉÈÊËÎÏÔÖÙÛÜÇŒ]/;
const avecAccent = sans.filter((l) => ACCENT.test(l.name ?? '')).length;

const trace = {
  chantier: 'fiches sans descFr — mesure d\'ouverture',
  quand: new Date().toISOString(),
  corpus: lignes.length,
  sansDescFr: sans.length,
  sansDescFrNiSummary: sans.filter((l) => vide(l.summary)).length,
  nomAccentue: avecAccent,
  parUnivers,
  echantillon: sans.slice(0, 40).map((l) => ({ slug: l.slug, name: l.name, universe: l.universe, type: l.type })),
  slugs: sans.map((l) => l.slug),
};
const chemin = `data/audits/descfr-mesure-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
await writeFile(new URL(`../${chemin}`, import.meta.url), JSON.stringify(trace, null, 1));

console.log(`sans descFr : ${sans.length}`);
console.log(`  dont sans summary non plus : ${trace.sansDescFrNiSummary}`);
console.log(`  dont nom accentué (français) : ${avecAccent}`);
for (const [u, v] of Object.entries(parUnivers).sort((a, b) => b[1].total - a[1].total)) {
  console.log(`  ${u.padEnd(26)} ${String(v.total).padStart(4)}  ${Object.entries(v.parType).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}:${n}`).join(' ')}`);
}
console.log(`trace → ${chemin}`);
