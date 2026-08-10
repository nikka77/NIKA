// scripts/akasha-sonde-romanname.mjs — À QUOI SERT `attributes.roman_name` DANS LE CORPUS ?
//
// POURQUOI : la résolution de `akasha-isolees-html.mjs` cherche une fiche par `name`, puis par
// `attributes.roman_name`, puis par `slug`. Si l'on nomme les pays en français (« Pays du Feu »),
// c'est `roman_name` qui devra porter le titre du wiki (« Land of Fire ») pour que le lien tombe.
// Encore faut-il que ce soit bien l'usage du corpus et pas une trouvaille de circonstance.
// N'écrit RIEN.
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

const avec = naruto.filter((e) => e.attributes?.roman_name);
console.log(`Naruto : ${naruto.length} fiches · ${avec.length} portent attributes.roman_name`);
const parType = {};
for (const e of avec) parType[e.type] = (parType[e.type] ?? 0) + 1;
console.log(`par type : ${JSON.stringify(parType)}`);
console.log('\n25 exemples « nom FR ⇄ roman_name » :');
console.log(avec.filter((e) => e.name !== e.attributes.roman_name).slice(0, 25)
  .map((e) => `  ${e.type.padEnd(9)} ${String(e.name).padEnd(42)} ⇄ ${e.attributes.roman_name}`).join('\n'));

// Toutes univers confondus : le champ est-il une convention générale ?
const tous = entries.filter((e) => e.attributes?.roman_name);
const parUniv = {};
for (const e of tous) parUniv[e.universe] = (parUniv[e.universe] ?? 0) + 1;
console.log(`\nroman_name toutes univers : ${tous.length} — ${JSON.stringify(parUniv)}`);

console.log('\n=== Y a-t-il DÉJÀ une fiche dont le nom commence par « Pays » ? (tous univers) ===');
const pays = entries.filter((e) => /^pays\b/i.test(e.name ?? ''));
console.log(pays.length ? pays.map((e) => `  ${e.universe} · ${e.type} · ${e.slug} · ${e.name}`).join('\n') : '  aucune');

console.log('\n=== convention de slug : 12 places Naruto et leur nom ===');
console.log(naruto.filter((e) => e.type === 'place').slice(0, 12).map((e) => `  ${e.slug.padEnd(24)} ← ${e.name}`).join('\n'));

console.log('\n=== gabarit d\'une fiche « status » de type Clan la plus légère ===');
const clans = naruto.filter((e) => e.type === 'status' && e.attributes?.category === 'Clan');
console.log(`${clans.length} fiches status/category=Clan`);
const leger = clans.sort((a, b) => Object.keys(a.attributes ?? {}).length - Object.keys(b.attributes ?? {}).length)[0];
console.log(JSON.stringify(leger, null, 1));
const cles = {};
for (const e of clans) for (const k of Object.keys(e.attributes ?? {})) cles[k] = (cles[k] ?? 0) + 1;
console.log(`clés : ${Object.entries(cles).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}/${clans.length}`).join(' · ')}`);

console.log('\n=== gabarit d\'une fiche « status » d\'équipe (Team …) la plus légère ===');
const teams = naruto.filter((e) => e.type === 'status' && /^Team /.test(e.name ?? ''));
const t0 = teams.sort((a, b) => Object.keys(a.attributes ?? {}).length - Object.keys(b.attributes ?? {}).length)[0];
console.log(`${teams.length} fiches Team… — la plus légère :`);
console.log(JSON.stringify(t0, null, 1));
const clesT = {};
for (const e of teams) for (const k of Object.keys(e.attributes ?? {})) clesT[k] = (clesT[k] ?? 0) + 1;
console.log(`clés : ${Object.entries(clesT).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}/${teams.length}`).join(' · ')}`);
const catT = {};
for (const e of teams) catT[e.attributes?.category ?? '—'] = (catT[e.attributes?.category ?? '—'] ?? 0) + 1;
console.log(`category des Team… : ${JSON.stringify(catT)}`);

console.log('\n=== toutes les valeurs de attributes.category chez les « status » Naruto ===');
const cat = {};
for (const e of naruto.filter((x) => x.type === 'status')) cat[e.attributes?.category ?? '—'] = (cat[e.attributes?.category ?? '—'] ?? 0) + 1;
console.log(Object.entries(cat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${k} ×${v}`).join('\n'));

console.log('\n=== image_url : formes employées par les fiches Naruto ===');
const formes = {};
for (const e of naruto) { const u = e.image_url; if (!u) continue; const f = u.startsWith('http') ? new URL(u).host : u.split('/').slice(0, 4).join('/'); formes[f] = (formes[f] ?? 0) + 1; }
console.log(Object.entries(formes).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `  ${k} ×${v}`).join('\n'));
