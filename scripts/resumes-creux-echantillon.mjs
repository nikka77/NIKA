// scripts/resumes-creux-echantillon.mjs — LECTURE SEULE : sort le texte descFr complet des fiches
// au résumé de remplissage, pour concevoir la règle de condensation à la main, sur pièces.
// Usage : node --env-file=.env.local scripts/resumes-creux-echantillon.mjs <sortie.json>
import fs from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';

const db = clientSite();
const sortie = process.argv[2];
if (!sortie) throw new Error('chemin de sortie requis');

const page = async (table, sel) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(table).select(sel).range(d, d + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};

const MOTIF = /^(personnage|lieu|objet|technique)\s+(secondaire|mineur|de l'univers)[^.]{0,60}\.?$/i;

const entries = await page('akasha_entries', 'id, slug, name, type, universe, summary, attributes');
const cibles = entries.filter((e) => MOTIF.test(String(e.summary ?? '').trim()));

const lot = cibles.map((e) => ({
  id: e.id, slug: e.slug, name: e.name, type: e.type, universe: e.universe,
  summary: e.summary,
  descFr: String(e.attributes?.descFr ?? '').replace(/\s+/g, ' ').trim(),
  descFrSource: e.attributes?.descFrSource ?? null,
  bio: String(e.attributes?.bio ?? '').replace(/\s+/g, ' ').trim() || null,
  cles: Object.keys(e.attributes ?? {}),
}));

fs.writeFileSync(sortie, JSON.stringify({ quand: new Date().toISOString(), n: lot.length, lot }, null, 1));
console.log(`${lot.length} fiches · trace ${sortie}`);
