// scripts/fetch-jikan-about.mjs — récupère le `about` (bio EN complète) de CHAQUE personnage MAL
// des castings AKASHA → cache RÉSUMABLE data/jikan-about.json. Jikan gratuit, rate-limité (~60/min).
// Relançable : ignore ce qui est déjà en cache. Budget par run pour éviter les runs interminables.
//   node --env-file=.env.local scripts/fetch-jikan-about.mjs [budget]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const JIKAN = 'https://api.jikan.moe/v4';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CACHE = 'data/jikan-about.json';
const BUDGET = parseInt(process.argv[2] || '4000', 10);

// Toutes les séries AKASHA (anime MAL) — mêmes ids que les builds.
const ANIME_IDS = [20, 1735, 34566, 21, 813, 223, 225, 30694, 269, 11061, 14719, 20899, 31933, 37991, 48661, 185, 730, 1535];

async function jget(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 429) { await sleep(2000 * (i + 1)); continue; }
      if (r.ok) return await r.json();
    } catch { /* retry */ }
    await sleep(600 * (i + 1));
  }
  return null;
}

// 1) Collecter tous les (mal_id, name) des castings.
const roster = new Map(); // mal_id → name
for (const id of ANIME_IDS) {
  const j = await jget(`${JIKAN}/anime/${id}/characters`);
  for (const c of j?.data ?? []) { const cid = c.character?.mal_id; const nm = c.character?.name; if (cid && nm && !roster.has(cid)) roster.set(cid, nm); }
  await sleep(1100);
}
console.log(`→ ${roster.size} personnages uniques dans les castings`);

// 2) Cache existant (résumable).
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
const done = new Set(Object.keys(cache).map(Number));
console.log(`→ ${done.size} déjà en cache`);

// 3) Fetch about des non-cachés, dans la limite du budget.
let fetched = 0, empty = 0;
for (const [cid, name] of roster) {
  if (done.has(cid)) continue;
  if (fetched >= BUDGET) { console.log(`→ budget ${BUDGET} atteint, arrêt (résumable).`); break; }
  const j = await jget(`${JIKAN}/characters/${cid}`);
  const about = j?.data?.about;
  if (about && String(about).trim().length > 30) {
    cache[cid] = { name, about: String(about).replace(/\s+/g, ' ').trim().slice(0, 1500) };
  } else { empty++; cache[cid] = { name, about: null }; } // marquer pour ne pas re-tenter
  fetched++;
  if (fetched % 40 === 0) { writeFileSync(CACHE, JSON.stringify(cache)); console.log(`  … ${fetched} récupérés (${empty} vides)`); }
  await sleep(1050); // ~57/min, sous la limite Jikan
}
writeFileSync(CACHE, JSON.stringify(cache));
const withText = Object.values(cache).filter((v) => v.about).length;
console.log(`✓ cache jikan-about : ${Object.keys(cache).length} entrées (${withText} avec texte) → ${CACHE}`);
