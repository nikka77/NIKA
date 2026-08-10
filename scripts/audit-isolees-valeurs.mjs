// scripts/audit-isolees-valeurs.mjs — QUE DISENT AU JUSTE LES AXES DES FICHES ISOLÉES ?
// Lecture seule. Le premier audit a montré que 951 isolées portent des axes (category 226,
// material 83, region 101, partie 46…) mais que la valeur ne tombe sur AUCUNE fiche du même
// univers. Avant de conclure « rien à faire », il faut lire les valeurs elles-mêmes : soit la
// cible n'existe pas, soit elle existe sous un autre nom.
// Usage : node --env-file=.env.local scripts/audit-isolees-valeurs.mjs
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
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const entries = await page('akasha_entries', 'id, slug, name, type, universe, attributes');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');
const degre = new Map();
for (const r of rels) {
  degre.set(r.from_entry, (degre.get(r.from_entry) ?? 0) + 1);
  degre.set(r.to_entry, (degre.get(r.to_entry) ?? 0) + 1);
}
const isolees = entries.filter((e) => !(degre.get(e.id) ?? 0));

const AXES = ['role', 'category', 'region', 'material', 'element', 'partie', 'race', 'saga',
  'meito_grade', 'col', 'clan', 'scope', 'blade_type', 'boat_class', 'occupation', 'affiliation',
  'faction', 'crew', 'village', 'organization', 'equipe', 'division', 'rank', 'camp', 'monde', 'nen'];

const rapport = {};
for (const axe of AXES) {
  const parUnivers = {};
  for (const e of isolees) {
    const v = e.attributes?.[axe];
    if (typeof v !== 'string' || !v.trim() || v === 'inconnu') continue;
    parUnivers[e.universe] ??= {};
    parUnivers[e.universe][v] = (parUnivers[e.universe][v] ?? 0) + 1;
  }
  if (Object.keys(parUnivers).length) rapport[axe] = parUnivers;
}

// Pour chaque valeur, une fiche de ce nom existe-t-elle dans l'univers ? Et sous quel type ?
const index = new Map();
for (const e of entries) {
  const u = e.universe;
  if (!index.has(u)) index.set(u, new Map());
  for (const cle of [norm(e.name), norm(e.attributes?.roman_name), norm(e.slug)]) {
    if (!cle) continue;
    if (!index.get(u).has(cle)) index.get(u).set(cle, []);
    if (!index.get(u).get(cle).some((c) => c.id === e.id)) index.get(u).get(cle).push(e);
  }
}

for (const [axe, parU] of Object.entries(rapport)) {
  console.log(`\n════ ${axe} ════`);
  for (const [u, vals] of Object.entries(parU)) {
    const tri = Object.entries(vals).sort((a, b) => b[1] - a[1]);
    console.log(`  ${u} (${tri.length} valeurs distinctes)`);
    for (const [v, n] of tri.slice(0, 25)) {
      const hit = index.get(u)?.get(norm(v));
      console.log(`    ${String(n).padStart(4)}× ${v.padEnd(34)} ${hit ? '→ ' + hit.map((h) => `${h.name}(${h.type})`).join(' | ') : '— aucune fiche'}`);
    }
    if (tri.length > 25) console.log(`    … ${tri.length - 25} autres valeurs`);
  }
}

const sortie = path.join(ROOT, `data/audits/isolees-valeurs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(sortie, JSON.stringify({ quand: new Date().toISOString(), isolees: isolees.length, rapport }, null, 1));
console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);
