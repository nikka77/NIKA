// scripts/ops-sonder-techniques-op.mjs — RÉSOUT les attaques One Piece sans page propre (entrée 29).
//
// Le sondage préalable (07/08) a montré que les attaques restantes n'ont PAS d'article sur
// onepiece.fandom.com : leur prose vit en SECTIONS de pages hôtes (fruit, style, sous-page
// /Techniques, sous-page d'arme) que fetchFandomSections écarte — toclevel 3+ filtré, et garde
// d'identité par titre de PAGE quand ici l'identité se prouve par le titre de SECTION.
// fetchFandomTechnique (lib/fandom.mjs) suit les quatre routes constatées ; ce script l'applique
// au lot et écrit la résolution pour l'applicateur. Rien n'est inventé : tout texte sort du
// wikitext découpé de la page hôte.
//
// Usage : node --env-file=.env.local scripts/ops-sonder-techniques-op.mjs [--limit=N]
// Entrée : /tmp/attaques-op-a-resoudre.json   [{ slug, id, name, porteurs }]
// Sortie : /tmp/attaques-op-resolution.json   { resolues: [...], echecs: [{ slug, raison }] }
import { readFile, writeFile } from 'node:fs/promises';
import { fetchFandomTechnique } from './lib/fandom.mjs';

const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0);
const ENTREE = '/tmp/attaques-op-a-resoudre.json';
const SORTIE = '/tmp/attaques-op-resolution.json';

const attaques = JSON.parse(await readFile(ENTREE, 'utf8'));
const lot = LIMIT > 0 ? attaques.slice(0, LIMIT) : attaques;
console.log(`${lot.length} attaque(s) à résoudre${LIMIT ? ` (sur ${attaques.length})` : ''}`);

const resolues = [];
const echecs = [];
for (const a of lot) {
  try {
    const r = await fetchFandomTechnique('One Piece', a.name, { porteurs: a.porteurs ?? [], slug: a.slug });
    if (!r) {
      // Absence VRAIE : toutes les pages candidates ont répondu, aucune section ne porte ce nom.
      echecs.push({ slug: a.slug, raison: 'aucune section au nom de l’attaque sur les pages candidates (absence vraie)' });
      console.log(`  ✗ ${a.name}`);
      continue;
    }
    resolues.push({
      slug: a.slug, id: a.id, name: a.name, porteurs: a.porteurs ?? [],
      route: r.route, pageTitre: r.pageTitre, sectionTitre: r.sectionTitre, url: r.url,
      sections: r.sections,
    });
    const car = r.sections.reduce((n, s) => n + s.texte.length, 0);
    console.log(`  ✓ ${a.name.padEnd(30)} [${r.route}] ${r.pageTitre} § ${r.sectionTitre} — ${r.sections.length} section(s), ${car} car.`);
  } catch (err) {
    // PANNE ≠ ABSENCE (convention fandom.mjs) : wget CRIE sur réseau mort. On note un échec
    // REJOUABLE — distinct d'une absence vraie — et on continue le lot au lieu de tout perdre.
    echecs.push({ slug: a.slug, raison: `panne réseau (rejouable) : ${err.message}` });
    console.log(`  ⚠ ${a.name} — ${err.message}`);
  }
}

const parRoute = {};
for (const r of resolues) parRoute[r.route] = (parRoute[r.route] ?? 0) + 1;
console.log(`\n${resolues.length} résolue(s) / ${lot.length} — routes : ${
  Object.entries(parRoute).sort().map(([k, v]) => `${k}=${v}`).join('  ') || 'aucune'}`);
if (echecs.length) console.log(`${echecs.length} échec(s) : ${echecs.map((e) => e.slug).join(', ')}`);
// Comptage croisé : chaque attaque du lot finit résolue OU en échec, jamais ni l'un ni l'autre.
if (resolues.length + echecs.length !== lot.length) {
  console.error(`⚠ comptage croisé faux : ${resolues.length} + ${echecs.length} ≠ ${lot.length}`);
  process.exit(1);
}

await writeFile(SORTIE, JSON.stringify({ resolues, echecs }, null, 1));
console.log(`→ ${SORTIE}`);
