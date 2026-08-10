// scripts/descfr-corriger-espaces.mjs — répare une espace parasite laissée par MON extracteur.
//
// Défaut constaté sur la page rendue, après écriture : « (マクロ一味, Makuro Ichimi ) ». Le marqueur
// de frontière de blocs que j'insère pour séparer les notes de renvoi de la définition (`</i>` →
// « ¶ ») laisse une espace là où le wiki n'en met pas — le nom romanisé vit dans son propre `<i>`.
// 36 des 53 textes posés en portent une. C'est MON défaut, pas celui de la source : je le répare
// sur MES textes seulement, et le correctif est aussi posé dans l'extracteur pour que la prochaine
// exécution n'ait rien à réparer.
//
// PÉRIMÈTRE STRICT : uniquement les fiches dont `descFrSource` commence par « wiki FR » — celles
// de ce chantier. Les textes de l'usine ne m'appartiennent pas.
// En français, l'espace AVANT « : ; ! ? » » est la règle ; seule celle avant « ) , . » est fautive.
//
// Usage : node --env-file=.env.local scripts/descfr-corriger-espaces.mjs [--appliquer]
import { writeFile } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';

const DRY = !process.argv.includes('--appliquer');
const s = clientSite();

const PAS = 1000; const corpus = [];
for (let d = 0; ; d += PAS) {
  const { data, error } = await s.from('akasha_entries')
    .select('id,slug,name,universe,attributes').order('id').range(d, d + PAS - 1);
  if (error) throw new Error(`lecture @${d} : ${error.message}`);
  corpus.push(...(data ?? []));
  if (!data || data.length < PAS) break;
}
const miennes = corpus.filter((e) => typeof e.attributes?.descFrSource === 'string'
  && e.attributes.descFrSource.startsWith('wiki FR ')
  && typeof e.attributes?.descFr === 'string');
const aReparer = miennes.filter((e) => /\s+[),.]/.test(e.attributes.descFr));
console.log(`corpus ${corpus.length} · textes de ce chantier ${miennes.length} · à réparer ${aReparer.length}`);

const trace = aReparer.map((e) => ({ slug: e.slug, universe: e.universe,
  avant: e.attributes.descFr, apres: e.attributes.descFr.replace(/\s+([),.])/g, '$1') }));
const chemin = `data/audits/descfr-espaces-${DRY ? 'dry' : 'application'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
await writeFile(new URL(`../${chemin}`, import.meta.url), JSON.stringify(
  { quand: new Date().toISOString(), mode: DRY ? 'dry' : 'application', mienne: miennes.length, aReparer: trace.length, cas: trace }, null, 1));
console.log(`trace → ${chemin}`);
if (trace.length) console.log(`exemple : ${JSON.stringify(trace[0].avant.slice(0, 90))}\n     →    ${JSON.stringify(trace[0].apres.slice(0, 90))}`);
if (DRY) process.exit(0);

let ok = 0, echecs = 0;
for (const e of aReparer) {
  // Relecture juste avant écriture : `attributes` a pu bouger depuis le scan.
  const { data } = await s.from('akasha_entries').select('id,attributes').eq('id', e.id).limit(1);
  const cur = data?.[0];
  if (!cur || typeof cur.attributes?.descFr !== 'string') { echecs++; continue; }
  if (!String(cur.attributes.descFrSource ?? '').startsWith('wiki FR ')) { echecs++; continue; }
  const attributes = { ...cur.attributes, descFr: cur.attributes.descFr.replace(/\s+([),.])/g, '$1') };
  const { error } = await s.from('akasha_entries').update({ attributes }).eq('id', e.id);
  if (error) { echecs++; console.log(`  ✗ ${e.slug} : ${error.message}`); continue; }
  ok++;
}
console.log(`FINAL — ${ok} réparée(s) · ${echecs} échec(s)`);
