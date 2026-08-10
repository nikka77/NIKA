// scripts/audit-chantier5-inventaire.mjs — CHANTIER 5 (11/08) : inventaire « ce que la base porte
// vs ce que le site montre ». LECTURE SEULE, aucune écriture en base.
//
// Étape 1 : relever les COLONNES réelles des trois tables (select('*') limit 1 — Supabase REST
// n'expose pas information_schema) puis dumper le corpus PAGINÉ par 1000 avec .order('id')
// (sans ORDER BY, LIMIT/OFFSET peut rejouer ou sauter des lignes entre deux pages — leçon 10/08).
//
// Usage : node --env-file=.env.local scripts/audit-chantier5-inventaire.mjs <sortie.json>
import fs from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';

const db = clientSite();
const sortie = process.argv[2];
if (!sortie) throw new Error('chemin de sortie requis');

const colonnes = async (table) => {
  const { data, error } = await db.from(table).select('*').limit(1);
  if (error) throw new Error(`${table} colonnes: ${error.message}`);
  return data?.[0] ? Object.keys(data[0]) : [];
};

const page = async (table, sel) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(table).select(sel).order('id').range(d, d + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};

const colEntries = await colonnes('akasha_entries');
const colRels = await colonnes('akasha_relations');
const colSecs = await colonnes('akasha_sections');
console.log('colonnes akasha_entries  :', colEntries.join(', '));
console.log('colonnes akasha_relations:', colRels.join(', '));
console.log('colonnes akasha_sections :', colSecs.join(', '));

const entries = await page('akasha_entries', colEntries.join(', '));
const rels = await page('akasha_relations', colRels.join(', '));
const secs = await page('akasha_sections', colSecs.join(', '));

console.log(`entries=${entries.length} relations=${rels.length} sections=${secs.length}`);
fs.writeFileSync(
  sortie,
  JSON.stringify({ quand: new Date().toISOString(), colonnes: { akasha_entries: colEntries, akasha_relations: colRels, akasha_sections: colSecs }, entries, rels, secs }),
);
console.log(`écrit → ${sortie} (${(fs.statSync(sortie).size / 1e6).toFixed(1)} Mo)`);
