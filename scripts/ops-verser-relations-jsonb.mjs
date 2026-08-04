// scripts/ops-verser-relations-jsonb.mjs — VERSE au graphe les relations restées dans le JSONB.
//
// POURQUOI (05/08/2026, décision 2 du plan minimal)
// Avant le 01/08, l'application des productions écrivait les relations dans
// `akasha_entries.attributes.relations` — un champ qu'AUCUN composant du site ne lit. Le correctif
// a rebranché l'usine sur `akasha_relations` (la seule table que le site interroge), mais il n'a
// jamais rapatrié l'existant.
//
// Mesuré avant ce script : 1 933 fiches portent encore `attributes.relations`, soit 7 955 relations
// dormantes, dont environ deux tiers n'ont AUCUNE arête correspondante dans le graphe. C'est du
// travail d'agents déjà payé, déjà relu, et invisible.
//
// Le versement réutilise `poserAuGraphe` — le MÊME code que l'usine. Deux chemins d'écriture qui
// divergent, ce sont deux graphes qui divergent : c'est exactement la faute qu'on répare.
//
// L'ordre importe : on verse d'abord, on ne purge le champ QUE pour les fiches effectivement
// versées, et la contrainte qui interdit le champ ne vient qu'après (voir supabase/).
//
// Usage : node --env-file=.env.local scripts/ops-verser-relations-jsonb.mjs [--dry] [--limit=0]
//         [--purger]   ← retire attributes.relations des fiches versées (à faire en second passage)
import { clientSite } from '../lib/ops/db.mjs';
import { poserAuGraphe } from '../lib/akasha/relations.ts';

const DRY = process.argv.includes('--dry');
const PURGER = process.argv.includes('--purger');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0);

const s = clientSite();

// Toutes les fiches qui portent encore le champ, paginées (PostgREST plafonne à 1 000).
const fiches = [];
for (let d = 0; ; d += 1000) {
  const { data, error } = await s.from('akasha_entries')
    .select('id, slug, name, universe, attributes')
    .not('attributes->relations', 'is', null)
    .order('id').range(d, d + 999);
  if (error) { console.error('✗ lecture :', error.message); process.exit(1); }
  fiches.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
const lot = LIMIT ? fiches.slice(0, LIMIT) : fiches;
const dormantes = lot.reduce((n, f) => n + (Array.isArray(f.attributes?.relations) ? f.attributes.relations.length : 0), 0);
console.log(`${lot.length} fiche(s) portant attributes.relations · ${dormantes} relation(s) dormante(s)`);

// Un seul index d'univers pour toute la passe : sans lui, chaque fiche re-scanne son registre.
const cache = new Map();
let creees = 0, dejaLa = 0, ignorees = 0, purgees = 0, echecs = 0;
const motifs = new Map();

for (const [i, f] of lot.entries()) {
  const relations = Array.isArray(f.attributes?.relations) ? f.attributes.relations : [];
  if (!relations.length) continue;

  let res = { posees: 0, creees: 0, ignorees: [] };
  if (!DRY) {
    try {
      // resultId=0 : ces relations ne viennent pas d'une production en cours mais du JSONB.
      res = await poserAuGraphe(s, { resultId: 0, slug: f.slug, relations }, cache);
    } catch (e) { echecs++; if (echecs <= 3) console.log(`  ✗ ${f.slug} : ${String(e.message ?? e).slice(0, 90)}`); continue; }
  }
  creees += res.creees ?? 0;
  dejaLa += (res.posees ?? 0) - (res.creees ?? 0);
  ignorees += (res.ignorees ?? []).length;
  for (const g of res.ignorees ?? []) motifs.set(g.motif, (motifs.get(g.motif) ?? 0) + 1);

  // PURGE : seulement après un versement réussi, et seulement du champ mort — le reste des
  // attributs (sections, descFr, axes) n'est jamais touché.
  if (PURGER && !DRY) {
    const attributes = { ...(f.attributes ?? {}) };
    delete attributes.relations;
    delete attributes.relationsSource;
    const { error } = await s.from('akasha_entries').update({ attributes }).eq('id', f.id);
    if (error) { echecs++; } else purgees++;
  }
  if ((i + 1) % 100 === 0) console.log(`  … ${i + 1}/${lot.length} · ${creees} arête(s) créée(s)`);
}

console.log(`FINAL — ${creees} arête(s) CRÉÉE(S) · ${dejaLa} déjà présente(s) · ${ignorees} cible(s) non résolue(s)${PURGER ? ` · ${purgees} champ(s) purgé(s)` : ''}${echecs ? ` · ${echecs} échec(s)` : ''}${DRY ? ' (DRY)' : ''}`);
if (motifs.size) {
  console.log('motifs de non-résolution :');
  for (const [m, n] of [...motifs].sort((a, b) => b[1] - a[1]).slice(0, 6)) console.log(`   ${String(n).padStart(5)} ${m}`);
}
