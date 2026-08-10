// scripts/audit-hors-carnet-recherche-cause.mjs — POURQUOI LA RECHERCHE NE TROUVE PAS.
//
// Le test de surface (audit-hors-carnet-recherche.mjs) dit QUE 12 requêtes sur 20 ne ramènent pas
// la fiche demandée. Celui-ci dit OÙ la fiche se perd, en rejouant les trois étages du chemin :
//   1. le `.or(name.ilike, descFr.ilike)` SANS ordre, plafonné à 30 lignes  → lib/akasha/queries.ts
//   2. le groupement par type                                              → api/search/route.ts
//   3. le `.slice(0, 8)` par groupe                                        → api/search/route.ts
// Pour chaque cas : combien de candidats existent, à quel rang PHYSIQUE sort la bonne fiche, et
// lequel des trois étages la jette.
//
// Il ne modifie RIEN. Trace : data/audits/hors-carnet-recherche-cause-<ISO>.json
// Usage : node --env-file=.env.local scripts/audit-hors-carnet-recherche-cause.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');

const CAS = [
  ['Nico Robin', 'nico-robin'], ['Ace', 'portgas-d-ace'], ['Fruit du Démon', 'fruit-du-demon'],
  ['Naruto Uzumaki', 'naruto-uzumaki'], ['Roronoa Zoro', 'roronoa-zoro'], ['Kenpachi Zaraki', 'kenpachi-zaraki'],
  ['Zoro', 'roronoa-zoro'], ['Kakashi', 'kakashi-hatake'], ['Sharingan', 'sharingan'], ['Rasengan', 'rasengan'],
  ['Jugo', 'jugo'], ['Hozuki', 'mangetsu-hozuki'], ['Chôji', 'choji-akimichi'],
  ['Busō-shoku no Haki', 'haki-de-l-armement'], ['Armament Haki', 'haki-de-l-armement'],
];

const out = [];
for (const [q, cible] of CAS) {
  const s = q.replace(/[%,()]/g, ' ').trim();
  // Étage 1 — LA REQUÊTE RÉELLE, copiée de omniSearch() : ni .order(), ni tri de pertinence.
  const { data: brut } = await db.from('akasha_entries')
    .select('id, slug, name, type').or(`name.ilike.%${s}%,attributes->>descFr.ilike.%${s}%`).limit(30);
  const rows = brut ?? [];

  // Combien de candidats EXISTENT vraiment (les deux jambes du `or`, comptées séparément).
  const { count: parNom } = await db.from('akasha_entries').select('id', { count: 'exact', head: true }).ilike('name', `%${s}%`);
  const { count: parDesc } = await db.from('akasha_entries').select('id', { count: 'exact', head: true }).ilike('attributes->>descFr', `%${s}%`);

  const rangDans30 = rows.findIndex((r) => r.slug === cible);
  // Étage 3 — groupement par type puis 8 par groupe.
  const parType = new Map();
  for (const r of rows) { const a = parType.get(r.type) ?? []; a.push(r); parType.set(r.type, a); }
  const apresSlice = [...parType.values()].flatMap((a) => a.slice(0, 8));
  const survit = apresSlice.some((r) => r.slug === cible);

  // La cible existe-t-elle et matcherait-elle par NOM ? (une cible qui ne matche pas par nom dit
  // que le défaut est l'absence de repli accent/romanisation, pas l'ordre.)
  // La question porte sur LA CIBLE, pas sur la population : compter les fiches dont le descFr
  // contient le terme ne dit rien de celle-ci (défaut de mon premier jet, corrigé).
  const { data: c } = await db.from('akasha_entries').select('id, slug, name, type, attributes->>roman_name, attributes->>descFr').eq('slug', cible).maybeSingle();
  const matcheNom = c ? c.name.toLowerCase().includes(s.toLowerCase()) : null;
  const matcheRoman = c?.roman_name ? c.roman_name.toLowerCase().includes(s.toLowerCase()) : false;
  const matcheDescCible = c?.descFr ? c.descFr.toLowerCase().includes(s.toLowerCase()) : false;

  const etage = !c ? 'cible absente du corpus'
    : (!matcheNom && !matcheDescCible) ? `ÉTAGE 0 — la cible « ${c.name} » ne matche NI par nom NI par son descFr : aucune jambe du \`or\` ne peut la ramener${matcheRoman ? ' (son roman_name, lui, matche — mais il n\'est pas cherché)' : ''}`
    : rangDans30 < 0 ? `ÉTAGE 1 — jetée par le .limit(30) sans ordre (${(parNom ?? 0) + (parDesc ?? 0)} candidats)`
    : !survit ? `ÉTAGE 3 — jetée par le .slice(0,8) du groupe « ${c.type} » (rang physique ${rangDans30 + 1}/30)`
    : `SERVIE (rang physique ${rangDans30 + 1})`;

  out.push({ q, cible, nomCible: c?.name ?? null, romanCible: c?.roman_name ?? null, candidatsParNom: parNom ?? 0, candidatsParDescFr: parDesc ?? 0, matcheNom, matcheRoman, matcheDescCible, rangDans30: rangDans30 < 0 ? null : rangDans30 + 1, survitAuSlice: survit, etage });
  console.log(`${q.padEnd(22)} → ${etage}`);
}

const dest = path.join(ROOT, 'data/audits', `hors-carnet-recherche-cause-${STAMP}.json`);
fs.writeFileSync(dest, JSON.stringify({ mesureLe: new Date().toISOString(), cas: out }, null, 2));
console.log(`\ntrace → ${dest}`);
