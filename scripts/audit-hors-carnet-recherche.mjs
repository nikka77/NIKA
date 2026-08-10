// scripts/audit-hors-carnet-recherche.mjs — LA RECHERCHE TROUVE-T-ELLE CE QU'ON LUI DEMANDE ?
//
// POURQUOI (10/08/2026)
// Aucun chantier du carnet n'a jamais interrogé /learn/akasha/api/search. Vingt requêtes RÉELLES,
// chacune avec la fiche qu'elle DOIT ramener (attestée en base, pas supposée) : nom exact, nom
// approché, accent absent, romanisation, terme anglais, terme français.
//
// Il ne modifie RIEN. Trace : data/audits/hors-carnet-recherche-<ISO>.json
// Usage : dev server sur :3000, puis
//   node --env-file=.env.local scripts/audit-hors-carnet-recherche.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE ?? 'http://localhost:3000';
const db = clientSite();
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');

// [requête, slug ATTENDU, classe de requête]. Chaque slug est vérifié en base avant le test :
// une attente qui ne correspond à aucune fiche mesurerait le test, pas la recherche.
const CAS = [
  ['Naruto Uzumaki', 'naruto-uzumaki', 'nom exact'],
  ['Roronoa Zoro', 'roronoa-zoro', 'nom exact'],
  ['Kenpachi Zaraki', 'kenpachi-zaraki', 'nom exact'],
  ['Nico Robin', 'nico-robin', 'nom exact'],
  ['Rasengan', 'rasengan', 'nom exact'],
  ['Zoro', 'roronoa-zoro', 'nom partiel'],
  ['Ace', 'portgas-d-ace', 'nom partiel'],
  ['Kakashi', 'kakashi-hatake', 'nom partiel'],
  ['Uzumaki Naruto', 'naruto-uzumaki', 'ordre japonais'],
  ['Jugo', 'jugo', 'accent absent (ū)'],
  ['Hozuki', 'mangetsu-hozuki', 'accent absent (ō)'],
  ['Jugo', 'jugo', 'accent absent (ū) — doublon volontaire'],
  ['Chôji', 'choji-akimichi', 'accent surnuméraire'],
  ['Buso-shoku', 'haki-de-l-armement', 'romanisation (roman_name)'],
  ['Busō-shoku no Haki', 'haki-de-l-armement', 'romanisation exacte'],
  ['Armament Haki', 'haki-de-l-armement', 'terme anglais'],
  ['Shadow Clone', 'shadow-clone-technique', 'terme anglais'],
  ['Multiclonage', 'shadow-clone-technique', 'terme français'],
  ['Sharingan', 'sharingan', 'nom exact'],
  ['Gomu Gomu', 'gomu-gomu-no-mi', 'nom partiel japonais'],
  ['Fruit du Démon', 'fruit-du-demon', 'nom français'],
  ['naruto-uzumaki', 'naruto-uzumaki', 'slug tapé tel quel'],
];

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// 1) Vérifier que chaque slug attendu EXISTE — sinon le cas mesure le test, pas la recherche.
const slugs = [...new Set(CAS.map((c) => c[1]))];
const { data: fiches, error } = await db.from('akasha_entries').select('slug, name, universe, attributes->>roman_name').in('slug', slugs);
if (error) throw new Error(error.message);
const enBase = new Map((fiches ?? []).map((f) => [f.slug, f]));
const attentesMortes = slugs.filter((s) => !enBase.has(s));

const resultats = [];
for (const [q, slugAttendu, classe] of CAS) {
  if (!enBase.has(slugAttendu)) { resultats.push({ q, classe, slugAttendu, verdict: 'ATTENTE MORTE — slug absent du corpus' }); continue; }
  const url = `${BASE}/learn/akasha/api/search?q=${encodeURIComponent(q)}`;
  let json = null, err = null;
  try { const r = await fetch(url); json = await r.json(); } catch (e) { err = String(e); }
  const items = (json?.groups ?? []).flatMap((g) => (g.items ?? []).map((i) => ({ ...i, groupe: g.type })));
  const rang = items.findIndex((i) => i.slug === slugAttendu);
  resultats.push({
    q, classe, slugAttendu, nomAttendu: enBase.get(slugAttendu).name,
    romanAttendu: enBase.get(slugAttendu).roman_name ?? null,
    err, total: json?.total ?? 0, nRendus: items.length,
    rang: rang < 0 ? null : rang + 1,
    verdict: err ? 'ERREUR' : rang === 0 ? 'TROUVÉ 1er' : rang > 0 ? `TROUVÉ rang ${rang + 1}` : 'ABSENT',
    premiers: items.slice(0, 4).map((i) => `${i.name} (${i.slug})`),
  });
}

const absents = resultats.filter((r) => r.verdict === 'ABSENT');
const rapport = { mesureLe: new Date().toISOString(), base: BASE, attentesMortes, nCas: CAS.length, nAbsents: absents.length, resultats };
const dest = path.join(ROOT, 'data/audits', `hors-carnet-recherche-${STAMP}.json`);
fs.writeFileSync(dest, JSON.stringify(rapport, null, 2));

for (const r of resultats) {
  console.log(`${r.verdict.padEnd(16)} « ${r.q} » → ${r.slugAttendu} [${r.classe}]${r.verdict === 'ABSENT' ? `  (rendus: ${r.premiers.join(' · ') || 'aucun'})` : ''}`);
}
console.log(`\nattentes mortes : ${attentesMortes.length ? attentesMortes.join(', ') : 'aucune'}`);
console.log(`ABSENTS : ${absents.length} / ${CAS.length}`);
console.log(`trace → ${dest}`);
