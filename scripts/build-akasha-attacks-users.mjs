// scripts/build-akasha-attacks-users.mjs — ÉTEND les attaques Dragon Ball au-delà des 8 héros à
// page-liste : pour chaque technique DB déjà en base (atk-db-*), on parse les liens de SA page Fandom
// et on garde ceux qui résolvent vers un personnage DB du graphe → relations perso→technique. Ça
// rattache les secondaires (Roshi, Tien, Buu, Beerus, Androïdes, Broly…) qui n'ont pas de page-liste.
// Sortie : data/akasha-attacks-users.json { relations } → seed-akasha-relations.ts (additif).
//   node scripts/build-akasha-attacks-users.mjs [budget]
import { readFileSync, writeFileSync } from 'node:fs';

const API = 'https://dragonball.fandom.com/api.php';
const BUDGET = parseInt(process.argv[2] || '600', 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const tokset = (s) => norm(s).split(' ').filter(Boolean).sort().join(' ');
const slugify = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Nom Fandom (anglais) → slug du graphe (romanisation MAL) pour les persos qui ne matchent pas seuls.
const ALIAS = {
  goku: 'son-goku', 'son goku': 'son-goku', gohan: 'son-gohan', 'son gohan': 'son-gohan',
  goten: 'son-goten', frieza: 'freeza', 'master roshi': 'muten-roushi', roshi: 'muten-roushi',
  'tien shinhan': 'tenshinhan', tien: 'tenshinhan', 'android 16': 'jinzouningen-16-gou',
  'android 17': 'jinzouningen-17-gou', 'android 18': 'jinzouningen-18-gou', 'android 19': 'jinzouningen-19-gou',
  'android 8': 'jinzouningen-8-gou', 'dr. gero': 'dr-gero', 'kid buu': 'majin-buu', 'majin buu': 'majin-buu',
  'super buu': 'majin-buu', 'mr. satan': 'mr-satan', 'grand elder guru': 'saichourou',
  'king piccolo': 'piccolo-daimao', 'future trunks': 'trunks', 'goku black': 'gokuu-black',
};

const graph = JSON.parse(readFileSync('data/akasha-universes.json', 'utf8')).entries
  .filter((e) => e.universe === 'Dragon Ball' && e.type === 'character');
const byNorm = new Map(), byTok = new Map(), bySlug = new Map();
for (const e of graph) { bySlug.set(e.slug, e); byNorm.set(norm(e.name), e); byTok.set(tokset(e.name), e); }
const resolve = (name) => {
  const k = norm(name);
  if (ALIAS[k] && bySlug.has(ALIAS[k])) return bySlug.get(ALIAS[k]);
  return byNorm.get(k) || bySlug.get(slugify(name)) || byTok.get(tokset(name)) || null;
};

const techs = JSON.parse(readFileSync('data/akasha-attacks.json', 'utf8')).entities.filter((e) => e.universe === 'Dragon Ball');
console.log(`→ ${techs.length} techniques DB à sonder (budget ${BUDGET})`);

async function wget(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url, { headers: { 'User-Agent': 'NIKA-AKASHA/1.0' } }); if (r.status === 429) { await sleep(1500 * (i + 1)); continue; } if (r.ok) return await r.json(); } catch { /* retry */ }
    await sleep(400 * (i + 1));
  }
  return null;
}

async function main() {
  const relations = []; const seen = new Set();
  const usersPerTech = [];
  let done = 0, hit = 0;
  for (const t of techs) {
    if (done >= BUDGET) { console.log(`budget atteint (${BUDGET})`); break; }
    const j = await wget(`${API}?action=parse&page=${encodeURIComponent(t.name)}&prop=wikitext&section=0&format=json`);
    done++;
    const wt = j?.parse?.wikitext?.['*'] || '';
    // Champ `users`/`user` de l'infobox (jusqu'au prochain champ ou fin d'infobox).
    const fm = wt.match(/\|\s*users?\s*=([\s\S]*?)(?=\n\s*\|\s*[\w]+\s*=|\n\}\})/i);
    const usersField = fm ? fm[1] : '';
    // Liens [[Nom]] NON suivis de <ref> = utilisateurs CANON (anime/manga) ; les <ref> pointent des jeux.
    const names = [];
    for (const m of usersField.matchAll(/\[\[([^\]|]+?)(?:\|[^\]]*)?\]\](?!\s*<ref)/g)) names.push(m[1].trim());
    let u = 0;
    for (const nm of names) {
      const ce = resolve(nm);
      if (!ce) continue;
      const k = `${ce.slug}|maitrise|${t.slug}`;
      if (seen.has(k)) continue; seen.add(k);
      relations.push({ from: ce.slug, to: t.slug, relation: 'maitrise' });
      u++; hit++;
    }
    if (u) usersPerTech.push({ tech: t.name, users: u });
    if (done % 50 === 0) { console.log(`  … ${done}/${techs.length} sondées, ${hit} relations`); writeFileSync('data/akasha-attacks-users.json', JSON.stringify({ relations }, null, 1)); }
    await sleep(220);
  }
  writeFileSync('data/akasha-attacks-users.json', JSON.stringify({ relations }, null, 1));
  const chars = new Set(relations.map((r) => r.from));
  console.log(`\n=== ÉTENSION attaques (users par technique) ===`);
  console.log(`Techniques sondées : ${done} | relations perso→technique : ${relations.length} | persos couverts : ${chars.size}`);
  console.log(`Top techniques partagées : ${usersPerTech.sort((a, b) => b.users - a.users).slice(0, 8).map((x) => `${x.tech}×${x.users}`).join(', ')}`);
  console.log(`✓ écrit data/akasha-attacks-users.json`);
}
main();
