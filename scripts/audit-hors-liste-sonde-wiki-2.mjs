// scripts/audit-hors-liste-sonde-wiki-2.mjs — SONDE WIKI, 2e passe (lecture seule).
// Lève les doutes restants du chantier 4 : appartenance de chaque valeur à la CATÉGORIE de
// l'axe (Ninja Ranks / Races), et champ `Race`/`race` des fiches-personnages concernées.
// Usage : node scripts/audit-hors-liste-sonde-wiki-2.mjs
const UA = { 'user-agent': 'NIKA-AKASHA-audit/1.0 (contact: nika.local)' };

/** Membres d'une catégorie (jusqu'à 500). */
async function categorie(wiki, cat) {
  const url = `https://${wiki}.fandom.com/api.php?action=query&list=categorymembers`
    + `&cmtitle=${encodeURIComponent('Category:' + cat)}&cmlimit=500&format=json&formatversion=2`;
  const j = await (await fetch(url, { headers: UA })).json();
  return (j.query?.categorymembers ?? []).map((m) => m.title);
}

/** Wikitext d'une page (tronqué). */
async function page(wiki, titre, n = 1400) {
  const url = `https://${wiki}.fandom.com/api.php?action=parse&page=${encodeURIComponent(titre)}`
    + '&prop=wikitext|categories&redirects=1&format=json&formatversion=2';
  const j = await (await fetch(url, { headers: UA })).json();
  if (j.error) return { titre, absente: true, code: j.error.code };
  return {
    titre: j.parse.title,
    cats: (j.parse.categories ?? []).map((c) => c.category).join(' | '),
    wt: (j.parse.wikitext ?? '').replace(/\s+/g, ' ').slice(0, n),
  };
}

console.log('--- naruto : Category:Ninja Ranks ---');
console.log((await categorie('naruto', 'Ninja Ranks')).join(' · '));

console.log('\n--- dragonball : Category:Races ---');
console.log((await categorie('dragonball', 'Races')).join(' · '));

console.log('\n--- bleach : Category:Races ---');
console.log((await categorie('bleach', 'Races')).join(' · '));

for (const [w, t] of [
  ['naruto', 'S-rank'],
  ['dragonball', 'Animal'],
  ['bleach', 'Katen Kyōkotsu (Zanpakutō spirit)'],
  ['bleach', 'Ganju Shiba'],
]) {
  const p = await page(w, t);
  console.log(`\n=== ${w}:${t} → ${p.absente ? 'ABSENTE (' + p.code + ')' : '« ' + p.titre + ' »'}`);
  if (!p.absente) { console.log(`CAT: ${p.cats.slice(0, 300)}`); console.log(`WT : ${p.wt}`); }
}

// Champ Race exact des 3 personnages Dragon Ball douteux (l'infobox est dans le wikitext).
for (const t of ['Jaco', 'Turtle', 'Giru', 'Shin']) {
  const p = await page('dragonball', t, 6000);
  const m = p.wt?.match(/\|\s*Race\s*=\s*([^|}]{0,160})/i);
  console.log(`\n[DB] ${t} → Race = ${m ? m[1].trim() : '(champ non trouvé)'}`);
}
