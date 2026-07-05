// scripts/inject-translations.mjs — injecte les traductions VF (data/akasha-translations.json, slug→fr)
// dans les JSON de build (attributes.descFr) PUIS en base (PATCH merge), sans refaire un build complet.
// descFr = description traduite en VF canon (affichée dans l'onglet Histoire, fallback de `bio`).
// Le fichier de traductions est la SOURCE DE VÉRITÉ (survit aux rebuilds : les builds le relisent aussi).
//   node --env-file=.env.local scripts/inject-translations.mjs           → JSON + base
//   node scripts/inject-translations.mjs --json-only                     → JSON seulement
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const JSON_ONLY = process.argv.includes('--json-only');
const TL = 'data/akasha-translations.json';
if (!existsSync(TL)) { console.error(`✗ ${TL} absent — lance d'abord la traduction.`); process.exit(1); }
const tl = JSON.parse(readFileSync(TL, 'utf8'));
console.log(`→ ${Object.keys(tl).length} traductions FR`);

let injected = 0;
for (const file of ['data/akasha-universes.json', 'data/akasha-naruto.json']) {
  if (!existsSync(file)) continue;
  const data = JSON.parse(readFileSync(file, 'utf8'));
  let n = 0;
  for (const e of data.entries) {
    if (tl[e.slug] && String(tl[e.slug]).trim().length > 10) {
      e.attributes = e.attributes || {};
      e.attributes.descFr = String(tl[e.slug]).trim();
      n++; injected++;
    }
  }
  writeFileSync(file, JSON.stringify(data));
  console.log(`  ✓ ${file} : +${n} descFr`);
}
console.log(`✓ ${injected} descFr injectées dans les JSON`);

if (JSON_ONLY) { console.log('(--json-only : pas d\'écriture DB — reseed pour propager)'); process.exit(0); }

// PATCH direct en base (merge attributes) — évite un reseed complet.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('✗ env Supabase manquant (--env-file=.env.local ou --json-only)'); process.exit(1); }
const h = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };

const slugs = Object.keys(tl);
let patched = 0, miss = 0;
for (let i = 0; i < slugs.length; i += 300) {
  const chunk = slugs.slice(i, i + 300);
  const rows = await (await fetch(`${url}/rest/v1/akasha_entries?slug=in.(${chunk.map((s) => '"' + s + '"').join(',')})&select=id,slug,attributes`, { headers: h })).json();
  const bySlug = new Map((Array.isArray(rows) ? rows : []).map((r) => [r.slug, r]));
  for (const slug of chunk) {
    const row = bySlug.get(slug);
    const fr = String(tl[slug] || '').trim();
    if (!row || fr.length < 10) { if (!row) miss++; continue; }
    const attrs = { ...(row.attributes || {}), descFr: fr };
    const r = await fetch(`${url}/rest/v1/akasha_entries?id=eq.${row.id}`, { method: 'PATCH', headers: h, body: JSON.stringify({ attributes: attrs }) });
    if (r.ok) patched++;
  }
  console.log(`  … ${Math.min(i + 300, slugs.length)}/${slugs.length}`);
}
console.log(`✓ base : ${patched} fiches enrichies (descFr), ${miss} slugs absents`);
