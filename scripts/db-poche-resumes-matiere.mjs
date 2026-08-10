// Chantier 4 — MATIÈRE des 132 résumés creux Dragon Ball (lecture seule).
import { clientSite } from '../lib/ops/db.mjs';
import fs from 'node:fs';
const db = clientSite();
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
async function pageAll(table, select) {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(table).select(select).range(d, d + 999);
    if (error) throw new Error(`${table} @${d}: ${error.message}`);
    out.push(...data); if (data.length < 1000) break;
  }
  return out;
}
const entries = await pageAll('akasha_entries', 'id,slug,name,universe,type,summary,attributes');
const MOTIF = /^(personnage|lieu|objet|technique|créature|groupe)\s+(secondaire|mineur|de l'univers)[^.]{0,60}\.?$/i;
const creux = entries.filter((e) => e.universe === 'Dragon Ball' && e.summary && MOTIF.test(e.summary.trim()));
const out = creux.map((e) => {
  const a = e.attributes ?? {};
  return {
    slug: e.slug, name: e.name, summary: e.summary,
    descFrSource: a.descFrSource ?? null,
    descLang: a.descLang ?? null,
    role: a.role ?? null, race: a.race ?? null, saga: a.saga ?? null,
    descFr: typeof a.descFr === 'string' ? a.descFr : null,
    descRaw: typeof a.descRaw === 'string' ? a.descRaw.slice(0, 300) : null,
  };
});
const p = `data/audits/poche-db-resumes-matiere-${STAMP}.json`;
fs.writeFileSync(p, JSON.stringify({ quand: new Date().toISOString(), mode: 'MESURE', n: out.length, fiches: out }, null, 2));
console.log('trace →', p, out.length);
