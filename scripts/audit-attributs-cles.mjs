// scripts/audit-attributs-cles.mjs — INVENTAIRE COMPLET DES CLÉS D'`attributes` DU CORPUS.
// Lecture seule. Objectif : ne pas rater un gisement structuré (tableaux de techniques, champs
// d'origine, d'équipage…) au motif qu'on ne connaissait pas son nom.
// Usage : node --env-file=.env.local scripts/audit-attributs-cles.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};
const entries = await page('akasha_entries', 'id, name, type, universe, attributes');

const cles = new Map();   // clé → { n, formes:Map, exemples:[] }
for (const e of entries) {
  for (const [k, v] of Object.entries(e.attributes ?? {})) {
    if (v === null || v === undefined || v === '') continue;
    const forme = Array.isArray(v)
      ? (typeof v[0] === 'object' ? 'tableau d’objets' : 'tableau de chaînes')
      : typeof v;
    if (!cles.has(k)) cles.set(k, { n: 0, formes: new Map(), exemples: [] });
    const c = cles.get(k);
    c.n++;
    c.formes.set(forme, (c.formes.get(forme) ?? 0) + 1);
    if (c.exemples.length < 3) c.exemples.push(`${e.universe}·${e.name}: ${JSON.stringify(v).slice(0, 140)}`);
  }
}

const tri = [...cles].sort((a, b) => b[1].n - a[1].n);
for (const [k, c] of tri) {
  console.log(`${k.padEnd(22)} ${String(c.n).padStart(5)}  ${[...c.formes].map(([f, n]) => `${f}:${n}`).join(' ')}`);
  if (/tableau/.test([...c.formes.keys()].join(''))) for (const x of c.exemples) console.log(`      · ${x}`);
}

const sortie = path.join(ROOT, `data/audits/attributs-cles-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(sortie, JSON.stringify({ quand: new Date().toISOString(), total: entries.length,
  cles: Object.fromEntries(tri.map(([k, c]) => [k, { n: c.n, formes: Object.fromEntries(c.formes), exemples: c.exemples }])) }, null, 1));
console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);
