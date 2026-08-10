// scripts/audit-isolees-recon-4univers.mjs — RECONNAISSANCE, aucune écriture.
//
// POURQUOI (10/08/2026)
// La vague 1 a conclu « rendement nul » sur JoJo/Bleach/HxH/Death Note et a avancé une explication
// pour JoJo — la communauté aurait migré vers jojowiki.com — que son propre vérificateur a réfutée.
// Avant de re-sonder un wiki, il faut savoir CE QU'ON LUI DEMANDE : le champ `name` de nos isolées,
// leur type, et ce que `attributes` garde de leur provenance. Une recherche wiki ne peut pas
// réussir si le libellé interrogé n'est pas un titre d'article possible.
//
// Usage : node --env-file=.env.local scripts/audit-isolees-recon-4univers.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const CIBLES = ["JoJo's Bizarre Adventure", 'Bleach', 'Hunter x Hunter', 'Death Note'];

/** Un select nu s'arrête à 1000 lignes SANS ERREUR — d'où la pagination systématique. */
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

const entries = await page('akasha_entries', 'id, slug, name, type, universe, summary, attributes');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');
console.log(`base : ${entries.length} fiches · ${rels.length} arêtes`);

const deg = new Set();
for (const r of rels) { deg.add(r.from_entry); deg.add(r.to_entry); }
const isolees = entries.filter((e) => !deg.has(e.id));
console.log(`isolées toutes univers : ${isolees.length}`);

const rapport = { quand: new Date().toISOString(), totalFiches: entries.length, totalAretes: rels.length, totalIsolees: isolees.length, parUnivers: {} };
for (const u of CIBLES) {
  const lot = isolees.filter((e) => e.universe === u);
  const clefs = {};
  for (const e of lot) for (const k of Object.keys(e.attributes ?? {})) clefs[k] = (clefs[k] ?? 0) + 1;
  const types = {};
  for (const e of lot) types[e.type] = (types[e.type] ?? 0) + 1;
  rapport.parUnivers[u] = {
    isolees: lot.length,
    types,
    clefsAttributs: Object.fromEntries(Object.entries(clefs).sort((a, b) => b[1] - a[1])),
    fiches: lot.map((e) => ({ slug: e.slug, name: e.name, type: e.type, summary: (e.summary ?? '').slice(0, 90), attrs: e.attributes ?? {} })),
  };
  console.log(`\n──── ${u} : ${lot.length} isolées ── types ${JSON.stringify(types)}`);
  console.log('  clés attributs :', Object.entries(clefs).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' · '));
  for (const e of lot.slice(0, 60)) console.log(`   · ${e.name}  [${e.type}]  ${JSON.stringify(e.attributes ?? {}).slice(0, 150)}`);
}

const sortie = path.join(ROOT, `data/audits/isolees-recon-4univers-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(sortie, JSON.stringify(rapport, null, 1));
console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);
