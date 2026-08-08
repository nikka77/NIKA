// scripts/ops-curer-axes-sales.mjs — CURATION DES 3 AXES SALES (08/08/2026).
//
// Applique le petit lot de renommages issu de l'audit `data/audits/curation-axes-sales.json` :
// des variantes de graphie repliées sur la valeur déjà curée (clan Naruto : « Sarutobi Clan » →
// « Sarutobi »…), et deux corrections sourcées par le contenu même de nos fiches (le champ crew
// « L'équipage des Maquereaux » de Macro et Tiger Fisher pointait vers un nom qui n'existe nulle
// part côté wiki — mistraduction probable de « Macro » en « Maquereau » — alors que le résumé de
// CHAQUE fiche énonce déjà sa bonne affiliation).
//
// Trace inverse déjà écrite AVANT ce script : data/audits/curation-axes-sales-trace.json.
// Usage : node --env-file=.env.local scripts/ops-curer-axes-sales.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';

const DRY = process.argv.includes('--dry');
const s = clientSite();

const trace = JSON.parse(readFileSync('data/audits/curation-axes-sales-trace.json', 'utf8'));

console.log(`${trace.fiches.length} fiche(s) à corriger${DRY ? ' (SIMULATION --dry)' : ''}`);

const resultats = [];
for (const f of trace.fiches) {
  const { data: avant, error: errLecture } = await s.from('akasha_entries')
    .select('id,attributes').eq('slug', f.slug).single();
  if (errLecture || !avant) { console.error(`  ✗ ${f.slug} : lecture impossible (${errLecture?.message})`); continue; }
  const valeurActuelle = avant.attributes?.[f.champ];
  if (valeurActuelle !== f.avant) {
    console.error(`  ✗ ${f.slug}.${f.champ} : valeur en base « ${valeurActuelle} » ≠ trace « ${f.avant} » — ARRÊT, pas de correction sur un état inattendu`);
    resultats.push({ ...f, statut: 'divergence', valeurEnBase: valeurActuelle });
    continue;
  }
  if (DRY) {
    console.log(`  · ${f.slug}.${f.champ} : « ${f.avant} » → « ${f.apres} » (simulé)`);
    resultats.push({ ...f, statut: 'simule' });
    continue;
  }
  const nouvellesAttributs = { ...avant.attributes, [f.champ]: f.apres };
  const { error: errEcriture } = await s.from('akasha_entries').update({ attributes: nouvellesAttributs }).eq('id', avant.id);
  if (errEcriture) { console.error(`  ✗ ${f.slug} : écriture échouée (${errEcriture.message})`); resultats.push({ ...f, statut: 'echec' }); continue; }
  console.log(`  ✓ ${f.slug}.${f.champ} : « ${f.avant} » → « ${f.apres} »`);
  resultats.push({ ...f, statut: 'ecrit' });
}

if (!DRY) {
  writeFileSync('data/audits/curation-axes-sales-exec.json', JSON.stringify({ genere_le: new Date().toISOString(), resultats }, null, 1) + '\n');
  console.log('✓ data/audits/curation-axes-sales-exec.json écrit');
}
