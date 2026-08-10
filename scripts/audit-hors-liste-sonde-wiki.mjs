// scripts/audit-hors-liste-sonde-wiki.mjs — SONDE WIKI, lecture seule, zéro écriture en base.
// Chantier 4 : pour chaque valeur d'axe hors liste, aller voir si elle existe VRAIMENT comme
// entité de la nature de l'axe sur le wiki de l'univers (api.php). On imprime le début du
// wikitext et les catégories : c'est ce qui sert de phrase-preuve dans la trace.
// Usage : node scripts/audit-hors-liste-sonde-wiki.mjs
const CIBLES = [
  ['naruto', 'Sannin'],
  ['naruto', 'Head Ninja'],
  ['naruto', 'Ninja Rank'],
  ['naruto', 'Missing-nin'],
  ['naruto', 'Orochimaru'],
  ['naruto', 'Kisame Hoshigaki'],
  ['naruto', 'Kakuzu'],
  ['naruto', 'Head Ninja of Kumogakure'],
  ['dragonball', 'Machine Mutant'],
  ['dragonball', 'Turtle'],
  ['dragonball', 'Umigame'],
  ['dragonball', 'Jaco'],
  ['dragonball', 'Glind'],
  ['dragonball', 'Shin'],
  ['bleach', 'Modified Soul'],
  ['bleach', 'Soul'],
  ['bleach', 'Zanpakutō Spirit'],
  ['bleach', 'Kūkaku Shiba'],
  ['bleach', 'Hisana Kuchiki'],
  ['bleach', 'Katen Kyōkotsu'],
  ['onepiece', 'Clone'],
  ['onepiece', 'Devil Fruit'],
];

const UA = { 'user-agent': 'NIKA-AKASHA-audit/1.0 (contact: nika.local)' };

for (const [wiki, titre] of CIBLES) {
  const url = `https://${wiki}.fandom.com/api.php?action=parse&page=${encodeURIComponent(titre)}`
    + '&prop=wikitext|categories&redirects=1&format=json&formatversion=2&maxlag=5';
  try {
    const r = await fetch(url, { headers: UA });
    const j = await r.json();
    if (j.error) { console.log(`\n=== ${wiki}:${titre} → ABSENTE (${j.error.code})`); continue; }
    const p = j.parse;
    const wt = (p.wikitext ?? '').replace(/\s+/g, ' ');
    const cats = (p.categories ?? []).map((c) => c.category ?? c['*']).join(' | ');
    console.log(`\n=== ${wiki}:${titre} → « ${p.title} »`);
    console.log(`CAT: ${cats.slice(0, 400)}`);
    console.log(`WT : ${wt.slice(0, 900)}`);
  } catch (e) {
    console.log(`\n=== ${wiki}:${titre} → ERREUR ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 350));
}
