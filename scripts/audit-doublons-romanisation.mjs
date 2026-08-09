// scripts/audit-doublons-romanisation.mjs — LE MÊME PERSONNAGE SOUS DEUX ROMANISATIONS.
//
// POURQUOI (09/08/2026)
// `akasha-dedup.mjs` groupe sur le nom NORMALISÉ au sens latin : minuscules, accents retirés,
// ponctuation écrasée. « Jūshirō Ukitake » et « Jushiro Ukitake » y arrivent identiques — mais
// « Juushirou Ukitake », la romanisation à voyelles doublées que rend MyAnimeList, non. Résultat :
// deux fiches Bleach pour le même capitaine, chacune avec ses arêtes, sa moitié de texte et sa
// place au classement. L'audit par image partagée en a trouvé deux ; il ne pouvait voir que celles
// qui portaient déjà un visuel.
//
// Ce script normalise EN PLUS l'allongement vocalique — la seule chose qui distingue ces graphies :
//   ou/ō/oo → o · uu/ū → u · ei → e · les redoublements de consonne · le « h » d'allongement.
// Il ne fusionne rien : deux noms voisins ne sont pas deux fiches identiques (Sanji ≠ Sanjuu), et
// un frère peut porter le nom de son aîné. Il produit la liste à lire, avec de quoi trancher.
//
// Usage : node --env-file=.env.local scripts/audit-doublons-romanisation.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();

/** Réduit une graphie latine du japonais à son squelette phonétique. */
export function squelette(nom) {
  return String(nom ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // ō → o, ū → u
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/ou/g, 'o').replace(/uu/g, 'u').replace(/oo/g, 'o').replace(/ei/g, 'e')
    .replace(/([a-z])\1+/g, '$1')                        // consonnes redoublées : kk → k
    .replace(/([aeiou])h\b/g, '$1')                      // « oh » final d'allongement
    .replace(/\s+/g, ' ')
    .trim();
}

const entries = [];
for (let d = 0; ; d += 1000) {
  const { data, error } = await db.from('akasha_entries')
    .select('id, slug, name, type, universe, summary, image_url').order('slug').range(d, d + 999);
  if (error) { console.error(error.message); process.exit(1); }
  entries.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}

const rels = [];
for (let d = 0; ; d += 1000) {
  const { data } = await db.from('akasha_relations').select('from_entry, to_entry').range(d, d + 999);
  rels.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
const degre = new Map();
for (const r of rels) {
  degre.set(r.from_entry, (degre.get(r.from_entry) ?? 0) + 1);
  degre.set(r.to_entry, (degre.get(r.to_entry) ?? 0) + 1);
}

const groupes = new Map();
for (const e of entries) {
  const k = `${e.universe}|${e.type}|${squelette(e.name)}`;
  if (!groupes.has(k)) groupes.set(k, []);
  groupes.get(k).push(e);
}

// On ne retient que les groupes dont les noms BRUTS diffèrent : ceux qui sont déjà identiques mot
// pour mot relèvent de la déduplication existante, pas de la romanisation.
const suspects = [...groupes.entries()]
  .filter(([, g]) => g.length > 1 && new Set(g.map((e) => e.name.toLowerCase())).size > 1)
  .map(([cle, g]) => ({
    cle,
    fiches: g.map((e) => ({
      slug: e.slug, nom: e.name, type: e.type, universe: e.universe,
      aretes: degre.get(e.id) ?? 0, image: !!e.image_url,
      resume: String(e.summary ?? '').slice(0, 110),
    })).sort((a, b) => b.aretes - a.aretes),
  }))
  .sort((a, b) => b.fiches[0].aretes - a.fiches[0].aretes);

const rapport = {
  chantier: 'doublons de romanisation', quand: new Date().toISOString(),
  fiches: entries.length, groupes: suspects.length,
  fichesConcernees: suspects.reduce((n, g) => n + g.fiches.length, 0),
  detail: suspects,
};
const sortie = path.join(ROOT, 'data/audits/doublons-romanisation.json');
fs.mkdirSync(path.dirname(sortie), { recursive: true });
fs.writeFileSync(sortie, JSON.stringify(rapport, null, 1));

console.log(`${entries.length} fiches → ${suspects.length} groupe(s) au squelette identique mais à la graphie différente\n`);
for (const g of suspects.slice(0, 30)) {
  console.log(`${g.fiches[0].universe.padEnd(12)} ${g.fiches.map((f) => `${f.nom} [${f.slug}] (${f.aretes})`).join('   ≟   ')}`);
}
console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);
