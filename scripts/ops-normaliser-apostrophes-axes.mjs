// scripts/ops-normaliser-apostrophes-axes.mjs — DEUX APOSTROPHES, DEUX VALEURS, UN AXE COUPÉ EN DEUX.
//
// POURQUOI (11/08/2026)
// L'axe `crew` de One Piece porte « L’équipage du Chapeau de Paille » (apostrophe typographique,
// U+2019) et « L'équipage du Chapeau de Paille » (apostrophe droite, U+0027). Pour l'œil c'est le
// même équipage ; pour un filtre qui compare des chaînes, ce sont deux valeurs étrangères. La
// taxonomie ne déclare que la forme typographique : les fiches qui portent l'autre n'ont AUCUN chip
// au hub, et leur page d'axe ne les liste pas. Elles existent et personne ne peut les atteindre.
//
// Mesuré : 5 valeurs scindées, 8 fiches du mauvais côté — dont « L’équipage aux Cent Bêtes », qui
// en compte 46 d'un côté et 1 de l'autre. La fiche isolée ne se voit nulle part.
//
// LA RÉFÉRENCE EST LA TAXONOMIE, pas la majorité : c'est elle que le site lit pour construire ses
// chips et ses routes. On aligne donc la base sur la forme déclarée, jamais l'inverse.
//
// Usage : node --env-file=.env.local scripts/ops-normaliser-apostrophes-axes.mjs [--write]
import { writeFile } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';
import { UNIVERSE_TAXONOMY } from '../lib/akasha/universe-taxonomy.ts';

const WRITE = process.argv.includes('--write');
const s = clientSite();

/** Les deux apostrophes se valent à la lecture ; c'est la seule différence qu'on efface ici. */
const memeMot = (a, b) => a.replace(/[’']/g, "'") === b.replace(/[’']/g, "'");

const entries = [];
for (let d = 0; ; d += 1000) {
  const { data, error } = await s.from('akasha_entries')
    .select('id, slug, universe, attributes').order('slug').range(d, d + 999);
  if (error) { console.error(error.message); process.exit(1); }
  entries.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}

const aCorriger = [];
for (const u of UNIVERSE_TAXONOMY) {
  for (const axe of u.axes) {
    const curees = axe.values.map((v) => v.v);
    for (const e of entries) {
      if (e.universe !== u.name) continue;
      const v = e.attributes?.[axe.attr];
      if (typeof v !== 'string' || !v.trim() || curees.includes(v)) continue;
      // La valeur n'est pas curée telle quelle : l'est-elle à l'apostrophe près ?
      const cible = curees.find((c) => memeMot(c, v));
      if (cible) aCorriger.push({ id: e.id, slug: e.slug, univers: u.name, axe: axe.attr, avant: v, apres: cible });
    }
  }
}

console.log(`${aCorriger.length} fiche(s) portent une valeur d'axe qui ne diffère d'une valeur curée que par l'apostrophe\n`);
const parValeur = new Map();
for (const c of aCorriger) {
  const k = `${c.univers}.${c.axe} : ${c.avant} → ${c.apres}`;
  parValeur.set(k, (parValeur.get(k) ?? 0) + 1);
}
for (const [k, n] of parValeur) console.log(`   ${String(n).padStart(3)}  ${k}`);

if (WRITE) {
  for (const c of aCorriger) {
    const { data: cur } = await s.from('akasha_entries').select('attributes').eq('id', c.id).single();
    // Garde de concurrence : la valeur a pu changer depuis la lecture, d'autres chantiers écrivent.
    if (cur?.attributes?.[c.axe] !== c.avant) { c.saute = 'valeur modifiée depuis'; continue; }
    await s.from('akasha_entries').update({ attributes: { ...cur.attributes, [c.axe]: c.apres } }).eq('id', c.id);
    c.applique = true;
  }
  console.log(`\n→ ${aCorriger.filter((c) => c.applique).length} fiche(s) alignée(s) sur la forme déclarée`);
}

const nom = `apostrophes-axes-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
await writeFile(new URL(`../data/audits/${nom}`, import.meta.url),
  JSON.stringify({ chantier: 'apostrophes des valeurs d’axe', quand: new Date().toISOString(), write: WRITE, corriges: aCorriger }, null, 1));
console.log(`${WRITE ? '' : '(à blanc — relancer avec --write) '}trace : data/audits/${nom}`);
