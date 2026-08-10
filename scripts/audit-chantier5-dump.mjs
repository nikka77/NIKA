// scripts/audit-chantier5-dump.mjs — INSTANTANÉ LOCAL DU CORPUS, pour inspecter sans re-payer.
//
// POURQUOI : le chantier 5 cherche des défauts INCONNUS. Une inspection exploratoire relance
// vingt requêtes différentes sur le même corpus ; les tirer une fois et travailler sur un fichier
// évite autant d'allers-retours Supabase (et le risque, à chaque tir, d'oublier la pagination).
//
// `.order('id')` n'est pas décoratif : sans ORDER BY, LIMIT/OFFSET laisse au moteur le droit de
// renvoyer les lignes dans n'importe quel ordre entre deux pages (leçon du 10/08).
//
// Il ne modifie rien.
// Usage : node --env-file=.env.local scripts/audit-chantier5-dump.mjs <chemin-sortie.json>
import fs from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';

const db = clientSite();
const sortie = process.argv[2];
if (!sortie) throw new Error('chemin de sortie requis');

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

const entries = await page('akasha_entries', 'id, slug, name, type, universe, summary, description, image_url, attributes, rarity');
const rels = await page('akasha_relations', 'id, from_entry, to_entry, relation');
const secs = await page('akasha_sections', 'id, entry_id, idx, titre, texte');

console.log(`entries=${entries.length} relations=${rels.length} sections=${secs.length}`);
fs.writeFileSync(sortie, JSON.stringify({ quand: new Date().toISOString(), entries, rels, secs }));
console.log(`écrit → ${sortie}`);
