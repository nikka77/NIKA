// scripts/build-akasha-op-links.mjs — LIENS perso→Fruit du Démon via l'API api-onepiece /characters/fr
// (champ `fruit` = lien DIRECT fourni par l'API, plus propre que parser les descRaw). Résout perso ET
// fruit contre le graphe existant, crée des relations 'maitrise' (perso maîtrise le Fruit). Additif.
// Sortie : data/akasha-op-links.json { relations } → seed-akasha-relations.ts.
//   node scripts/build-akasha-op-links.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const tokset = (s) => norm(s).split(' ').filter(Boolean).sort().join(' ');
const slugify = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const graph = JSON.parse(readFileSync('data/akasha-universes.json', 'utf8')).entries.filter((e) => e.universe === 'One Piece');
// Index persos (nom/slug/tokens) et fruits (nom/roman_name/tokens).
const chars = graph.filter((e) => e.type === 'character');
const fruits = graph.filter((e) => e.attributes?.category === 'Fruit du Démon');
const idx = (entries, extraKey) => {
  const byNorm = new Map(), byTok = new Map(), bySlug = new Map();
  for (const e of entries) {
    bySlug.set(e.slug, e);
    for (const nm of [e.name, extraKey ? e.attributes?.[extraKey] : null].filter(Boolean)) {
      byNorm.set(norm(nm), e); byTok.set(tokset(nm), e);
    }
  }
  // Essaie le nom entier PUIS chaque partie « / » (l'API donne « Baggy / Le Clown », « Linlin / Big Mom »).
  return (name) => {
    for (const part of [name, ...String(name).split(/\s*\/\s*/)]) {
      const hit = byNorm.get(norm(part)) || bySlug.get(slugify(part)) || byTok.get(tokset(part));
      if (hit) return hit;
    }
    return null;
  };
};
const resolveChar = idx(chars);
const resolveFruit = idx(fruits, 'roman_name');

async function main() {
  console.log('→ api-onepiece /characters/fr…');
  const list = (await (await fetch('https://api.api-onepiece.com/v2/characters/fr')).json()) ?? [];
  console.log(`  ${list.length} persos`);

  const relations = [];
  const seen = new Set();
  let linked = 0; const unresChar = new Map(), unresFruit = new Map();
  for (const c of Array.isArray(list) ? list : []) {
    const fruitName = c?.fruit?.name || (typeof c?.fruit === 'string' ? c.fruit : null);
    if (!c?.name || !fruitName) continue;
    const ce = resolveChar(c.name);
    if (!ce) { unresChar.set(c.name, (unresChar.get(c.name) || 0) + 1); continue; }
    const fe = resolveFruit(fruitName);
    if (!fe) { unresFruit.set(fruitName, (unresFruit.get(fruitName) || 0) + 1); continue; }
    if (ce.slug === fe.slug) continue;
    const k = `${ce.slug}|maitrise|${fe.slug}`;
    if (seen.has(k)) continue; seen.add(k);
    relations.push({ from: ce.slug, to: fe.slug, relation: 'maitrise' });
    linked++;
  }

  console.log(`\n=== LIENS perso→Fruit ===`);
  console.log(`Relations : ${linked}`);
  const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k).join(' | ');
  if (unresChar.size) console.log(`  ⚠ persos non résolus (${unresChar.size}) : ${top(unresChar)}`);
  if (unresFruit.size) console.log(`  ⚠ fruits non résolus (${unresFruit.size}) : ${top(unresFruit)}`);

  writeFileSync('data/akasha-op-links.json', JSON.stringify({ relations }, null, 1));
  console.log(`✓ écrit data/akasha-op-links.json`);
}
main();
