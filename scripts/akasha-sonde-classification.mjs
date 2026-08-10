// scripts/akasha-sonde-classification.mjs — LES « Classification » EXISTANTES + LES ALIAS DU CORPUS.
//
// POURQUOI : « Summon » est cité 14 fois par des personnages isolés. Avant de créer une fiche, il
// faut savoir dans quel tiroir le corpus range déjà ce genre d'entité (status/category=Classification)
// et si un mécanisme d'alias existe pour rattraper les écarts de nom (« Kagetsu Family » côté wiki,
// « Clan Kagetsu » chez nous). N'écrit RIEN.
import { clientSite } from '../lib/ops/db.mjs';

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
const entries = await page('akasha_entries', 'id, slug, name, type, universe, summary, image_url, attributes, rarity, is_fiction, description');
const naruto = entries.filter((e) => e.universe === 'Naruto');

console.log('=== status / category = Classification (Naruto) ===');
for (const e of naruto.filter((x) => x.type === 'status' && x.attributes?.category === 'Classification')) {
  console.log(`  ${e.slug.padEnd(30)} ${String(e.name).padEnd(34)} scope=${e.attributes?.scope} · img=${e.image_url ? 'oui' : 'non'} · descFr=${e.attributes?.descFr ? 'oui' : 'non'}`);
}
const unClassif = naruto.find((x) => x.type === 'status' && x.attributes?.category === 'Classification' && x.attributes?.descFr);
console.log('\n--- une fiche Classification en entier ---');
console.log(JSON.stringify(unClassif, null, 1));

console.log('\n=== clés d\'alias employées quelque part dans le corpus ? ===');
const clesAlias = {};
for (const e of entries) for (const k of Object.keys(e.attributes ?? {})) {
  if (/alias|alt|autre|nom|name|titre|title/i.test(k)) clesAlias[`${e.universe}:${k}`] = (clesAlias[`${e.universe}:${k}`] ?? 0) + 1;
}
console.log(Object.entries(clesAlias).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => `  ${k} ×${v}`).join('\n'));

console.log('\n=== les 4 cibles clan/équipe : que contient DÉJÀ la base ? ===');
for (const s of ['kagetsu', 'wagarashi', 'kanabun', 'prajna', 'prajña']) {
  const hits = naruto.filter((e) => e.slug.includes(s) || String(e.name).toLowerCase().includes(s));
  console.log(`  « ${s} » → ${hits.map((e) => `${e.type}/${e.slug} « ${e.name} »`).join(' · ') || 'aucune'}`);
}

console.log('\n=== les 93 isolées Naruto, par type ===');
const rels = await page('akasha_relations', 'from_entry, to_entry');
const deg = new Set();
for (const r of rels) { deg.add(r.from_entry); deg.add(r.to_entry); }
const iso = naruto.filter((e) => !deg.has(e.id));
const parType = {};
for (const e of iso) parType[e.type] = (parType[e.type] ?? 0) + 1;
console.log(`${iso.length} isolées Naruto · ${JSON.stringify(parType)}`);
console.log(iso.map((e) => `  ${e.type.padEnd(10)} ${e.slug.padEnd(38)} ${e.name}`).join('\n'));
