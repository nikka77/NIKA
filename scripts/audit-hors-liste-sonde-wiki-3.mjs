// scripts/audit-hors-liste-sonde-wiki-3.mjs — SONDE WIKI, 3e passe (lecture seule).
// Derniers doutes du chantier 4 : « Alien » et « Turtle » (Dragon Ball), race des Mod-Souls
// (Bleach), et statut de « Clone » côté fruits du démon (One Piece).
// Usage : node scripts/audit-hors-liste-sonde-wiki-3.mjs
const UA = { 'user-agent': 'NIKA-AKASHA-audit/1.0 (contact: nika.local)' };

async function page(wiki, titre, n = 1200) {
  const url = `https://${wiki}.fandom.com/api.php?action=parse&page=${encodeURIComponent(titre)}`
    + '&prop=wikitext|categories&redirects=1&format=json&formatversion=2';
  const j = await (await fetch(url, { headers: UA })).json();
  if (j.error) return { absente: true, code: j.error.code };
  return {
    titre: j.parse.title,
    cats: (j.parse.categories ?? []).map((c) => c.category).join(' | '),
    wt: (j.parse.wikitext ?? ''),
    court: (j.parse.wikitext ?? '').replace(/\s+/g, ' ').slice(0, n),
  };
}

for (const [w, t] of [['dragonball', 'Alien'], ['onepiece', 'Artificial Devil Fruit']]) {
  const p = await page(w, t);
  console.log(`\n=== ${w}:${t} → ${p.absente ? 'ABSENTE (' + p.code + ')' : '« ' + p.titre + ' »'}`);
  if (!p.absente) { console.log(`CAT: ${p.cats.slice(0, 300)}`); console.log(`WT : ${p.court}`); }
}

// La page « Animal » a-t-elle une SECTION « Turtle » (l'ancre visée par [[Animal#Turtle]]) ?
const animal = await page('dragonball', 'Animal', 0);
const sections = [...(animal.wt ?? '').matchAll(/^==+\s*([^=]+?)\s*=+=$/gm)].map((m) => m[1]);
console.log(`\n[DB] Animal → ${sections.length} sections ; « Turtle » présente : ${sections.includes('Turtle')}`);
const iT = (animal.wt ?? '').indexOf('===Turtle===');
console.log(`[DB] extrait section Turtle : ${(animal.wt ?? '').slice(iT, iT + 420).replace(/\s+/g, ' ')}`);

// Race déclarée des trois Mod-Souls Bleach.
for (const t of ['Ririn', 'Noba', 'Nozomi Kujō']) {
  const p = await page('bleach', t, 0);
  const m = p.wt?.match(/\|\s*race\s*=\s*([^|\n}]{0,80})/i);
  console.log(`\n[BL] ${t} → ${p.absente ? 'ABSENTE' : 'race = ' + (m ? m[1].trim() : '(non trouvé)')} — cats: ${(p.cats ?? '').slice(0, 200)}`);
}
