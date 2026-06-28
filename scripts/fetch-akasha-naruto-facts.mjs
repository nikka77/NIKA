// scripts/fetch-akasha-naruto-facts.mjs
// AKASHA — Pipeline de FAITS canon depuis Narutopedia (API Semantic-MediaWiki).
// ----------------------------------------------------------------------------
// Interroge https://naruto.fandom.com/api.php :
//   • action=browsebysubject  → propriétés structurées par personnage
//     (Age[], Height[], Weight[], Ninja_Rank[], Classification[], Chakra_Nature[],
//      Clan, Affiliation[], Occupation[], Blood_type, Birthdate, Sex)
//   • action=ask              → timeline des arcs (Partie I & Shippūden)
// Sort : data/akasha-naruto-facts.json (clé = slug) + data/akasha-naruto-arcs.json
//
// NOTE COPYRIGHT : on n'enregistre QUE des faits structurés (chiffres, listes courtes),
// jamais les paragraphes narratifs de Fandom. Chaque entrée garde source_url pour
// l'attribution CC-BY-SA. Les descriptions restent rédigées côté NIKA (build).
//
// Run : node scripts/fetch-akasha-naruto-facts.mjs
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://naruto.fandom.com/api.php';
const UA = 'NIKA-Akasha/0.2 (registre LEARN; faits canon; contact: nika)';
const THROTTLE_MS = 500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slugify = (s) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function getJSON(params) {
  const url = API + '?' + new URLSearchParams({ ...params, format: 'json' }).toString();
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// "Konohagakure#0##" → "Konohagakure" ; "Wind_Release" → "Wind Release"
const cleanItem = (v) => String(v).split('#')[0].replace(/_/g, ' ').trim();

// ─── 1. Faits par personnage (browsebysubject) ───────────────────────────────
async function charFacts(title) {
  const d = await getJSON({ action: 'browsebysubject', subject: title.replace(/ /g, '_') });
  const data = d?.query?.data;
  if (!Array.isArray(data)) return null;
  const props = {};
  for (const it of data) {
    if (!it.property || it.property.startsWith('_')) continue;
    props[it.property] = (it.dataitem ?? []).map((x) => x.item);
  }
  const nums = (p) => (props[p] ?? []).map((v) => parseFloat(String(v))).filter((n) => !Number.isNaN(n));
  const strs = (p) => (props[p] ?? []).map(cleanItem).filter(Boolean);
  const uniq = (a) => [...new Set(a)];

  return {
    title,
    ages: uniq(nums('Age').map((n) => Math.round(n))),
    heightsCm: uniq(nums('Height').map((m) => Math.round(m * 100 * 10) / 10)), // m → cm
    weightsKg: uniq(nums('Weight')),
    ranks: uniq(strs('Ninja_Rank')),
    classification: uniq(strs('Classification')),
    naturesAll: uniq(strs('Chakra_Nature')),
    clan: strs('Clan')[0] ?? null,
    affiliation: uniq(strs('Affiliation')),
    occupation: uniq(strs('Occupation')),
    team: uniq(strs('Team')).slice(0, 6),
    bloodType: strs('Blood_type')[0] ?? null,
    birthdate: strs('Birthdate')[0] ?? null,
    sex: strs('Sex')[0] ?? null,
    sourceUrl: `https://naruto.fandom.com/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
  };
}

// ─── 2. Timeline des arcs (action=ask) ───────────────────────────────────────
async function fetchArcs(animeValue, series) {
  const query =
    `[[Category:Arcs]][[Anime::${animeValue}]]|?Anime Arc number|?Arc number|mainlabel=Arc|sort=Anime Arc number|order=asc|limit=200`;
  const d = await getJSON({ action: 'ask', query });
  const results = d?.query?.results ?? {};
  const arcs = [];
  for (const [name, row] of Object.entries(results)) {
    const po = row.printouts ?? {};
    const num = (po['Anime Arc number'] ?? po['Arc number'] ?? [])[0] ?? null;
    arcs.push({ name, number: typeof num === 'number' ? num : (num?.value ?? null), series, url: row.fullurl ?? null });
  }
  arcs.sort((a, b) => (a.number ?? 999) - (b.number ?? 999));
  return arcs;
}

async function main() {
  // Titres des personnages = lus depuis le build existant (hors Bijū).
  let titles = [];
  try {
    const data = JSON.parse(readFileSync(join(ROOT, 'data', 'akasha-naruto.json'), 'utf8'));
    titles = data.entries.filter((e) => e.type === 'character' && !/\(Bijū\)/.test(e.name)).map((e) => e.name);
  } catch {
    console.error('✗ data/akasha-naruto.json introuvable — lance d\'abord build-akasha-naruto.mjs');
    process.exit(1);
  }

  console.log(`\n🌀 Faits SMW Narutopedia · ${titles.length} personnages\n`);
  const facts = {};
  for (const title of titles) {
    process.stdout.write(`• ${title} … `);
    try {
      const f = await charFacts(title);
      if (!f) { console.log('aucune donnée'); }
      else { facts[slugify(title)] = f; console.log(`ok (âges ${f.ages.join('/')||'—'} · tailles ${f.heightsCm.join('/')||'—'})`); }
    } catch (e) {
      console.log('✗ ' + e.message);
    }
    await sleep(THROTTLE_MS);
  }
  writeFileSync(join(ROOT, 'data', 'akasha-naruto-facts.json'), JSON.stringify(facts, null, 2));
  console.log(`\n✓ ${Object.keys(facts).length} fiches → data/akasha-naruto-facts.json`);

  console.log('\n🌀 Timeline des arcs …');
  const arcs = [
    ...(await fetchArcs('Naruto', 'Partie I')),
    ...(await fetchArcs('Naruto: Shippūden', 'Partie II')),
  ];
  writeFileSync(join(ROOT, 'data', 'akasha-naruto-arcs.json'), JSON.stringify(arcs, null, 2));
  console.log(`✓ ${arcs.length} arcs → data/akasha-naruto-arcs.json`);
  console.log('  premiers:', arcs.slice(0, 6).map((a) => `${a.number}.${a.name}`).join(' · '));
}

main().catch((e) => { console.error('✗', e); process.exit(1); });
