// scripts/akasha-op-cibles-sonde.mjs — MESURER LE MUR AVANT DE LE PERCER (One Piece, vague 6).
//
// POURQUOI (10/08/2026)
// La vague 5 a fait tomber les isolées One Piece de 451 à 366 puis a buté sur un mur qu'elle a
// chiffré dans sa trace (data/audits/isolees-html-one-piece-trace-2026-08-10T13-18-05-781Z.json) :
// 204 des 229 liens perdus visent une entité qu'AKASHA n'a pas, réparties sur 71 titres distincts.
//
// CETTE SONDE N'ÉCRIT RIEN EN BASE. Elle répond à trois questions, sur données FRAÎCHES et
// PAGINÉES, avant qu'une seule fiche soit créée :
//  1. combien d'isolées One Piece RESTENT, et lesquelles des 204 liens perdus partent encore d'une
//     isolée (la vague 5 a désisolé 85 fiches : une partie des liens perdus ne rapporte plus rien) ;
//  2. la cible existe-t-elle DÉJÀ sous un autre nom (le contrôle qui a évité trois doublons à la
//     vague 3) — par nom, roman_name, slug, et par le registre d'alias-cibles ;
//  3. le gain réel par cible : le nombre d'isolées DISTINCTES qu'elle sortirait, et le gabarit qui
//     rendra le lien sur la fiche source (leçon du soir : une arête invisible n'est pas livrée).
//
// Usage : node --env-file=.env.local scripts/akasha-op-cibles-sonde.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';
import { norm } from './audit-isolees-fandom.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const HORODATE = new Date().toISOString().replace(/[:.]/g, '-');
const UNIVERS = 'One Piece';

const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;      // un select nu s'arrête à 1000 SANS erreur
  }
  console.log(`  ${t} : ${out.length} lignes`);
  return out;
};

/* La trace de la vague 5 : c'est elle qui porte les liens perdus, avec leur champ et leur source. */
const REP = path.join(ROOT, 'data/audits');
const TRACE5 = fs.readdirSync(REP).filter((f) => /^isolees-html-one-piece-trace-/.test(f)).sort().pop();
const trace5 = JSON.parse(fs.readFileSync(path.join(REP, TRACE5), 'utf8'));
console.log(`trace de la vague 5 : ${TRACE5}`);

console.log('→ lecture de la base (paginée)…');
const entries = await page('akasha_entries', 'id, slug, name, type, universe, summary, description, image_url, attributes');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');

const degre = new Set();
for (const r of rels) { degre.add(r.from_entry); degre.add(r.to_entry); }
const isolees = entries.filter((e) => !degre.has(e.id));
const lot = isolees.filter((e) => e.universe === UNIVERS);
const op = entries.filter((e) => e.universe === UNIVERS);
console.log(`\nMAINTENANT : ${entries.length} fiches · ${rels.length} arêtes · ${isolees.length} isolées`);
console.log(`One Piece : ${op.length} fiches · ${lot.length} isolées`);

const parType = {};
for (const e of op) parType[e.type] = (parType[e.type] ?? 0) + 1;
console.log(`types One Piece : ${Object.entries(parType).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' · ')}`);
const professions = op.filter((e) => e.type === 'profession');
console.log(`professions One Piece (${professions.length}) : ${professions.map((e) => `${e.name} [${e.slug}]`).join(' · ') || '—'}`);
const parTypeIso = {};
for (const e of lot) parTypeIso[e.type] = (parTypeIso[e.type] ?? 0) + 1;
console.log(`types des ${lot.length} isolées : ${Object.entries(parTypeIso).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' · ')}`);

/* ═══ Anti-doublon : la cible existe-t-elle déjà sous un autre nom ? ══════════════════════════ */
const indexOP = new Map();       // clé normalisée → [fiches]
const pousser = (cle, e) => { if (!cle) return; if (!indexOP.has(cle)) indexOP.set(cle, []); if (!indexOP.get(cle).some((x) => x.id === e.id)) indexOP.get(cle).push(e); };
for (const e of op) { pousser(norm(e.name), e); pousser(norm(e.attributes?.roman_name), e); pousser(norm(e.slug), e); }
const aliasCible = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/alias-cibles-one-piece.json'), 'utf8'))[UNIVERS] ?? {}; }
  catch { return {}; }
})();
const parSlug = new Map(entries.map((e) => [e.slug, e]));

/* ═══ Les liens perdus de la vague 5, repassés sur l'état FRAIS ═══════════════════════════════ */
const parNom = new Map();
for (const e of op) { if (!parNom.has(e.name)) parNom.set(e.name, e); }
const cibles = new Map();        // titre wiki → { n, champs, sources:Set, isolees:Set }
for (const x of trace5.echecs ?? []) {
  if (!/aucune fiche/.test(x.motif)) continue;
  const m = /nommée « (.*) »/.exec(x.motif);
  const titre = m ? m[1] : x.titreWiki;
  if (!cibles.has(titre)) cibles.set(titre, { titre, titresDemandes: new Set(), n: 0, champs: {}, sources: new Map() });
  const c = cibles.get(titre);
  c.n++;
  c.titresDemandes.add(x.titreWiki);
  c.champs[x.champ] = (c.champs[x.champ] ?? 0) + 1;
  const src = parNom.get(x.de);
  c.sources.set(x.de, { nom: x.de, slug: src?.slug ?? null, type: src?.type ?? null, encoreIsolee: src ? !degre.has(src.id) : null });
}

const lignes = [];
for (const c of cibles.values()) {
  const encore = [...c.sources.values()].filter((s) => s.encoreIsolee);
  const dejaLa = indexOP.get(norm(c.titre)) ?? [];
  const parAlias = aliasCible[c.titre] ? parSlug.get(aliasCible[c.titre].slug) : null;
  lignes.push({
    titre: c.titre,
    titresDemandes: [...c.titresDemandes],
    liens: c.n,
    champs: c.champs,
    gainIsoleesEncore: encore.length,
    typesDesSources: encore.reduce((a, s) => ({ ...a, [s.type ?? '?']: (a[s.type ?? '?'] ?? 0) + 1 }), {}),
    sourcesEncoreIsolees: encore.map((s) => `${s.nom} [${s.type}/${s.slug}]`),
    dejaEnBase: dejaLa.map((e) => `${e.type}/${e.slug} « ${e.name} »`),
    parAliasCible: parAlias ? `${parAlias.type}/${parAlias.slug} « ${parAlias.name} »` : null,
  });
}
lignes.sort((a, b) => b.gainIsoleesEncore - a.gainIsoleesEncore || b.liens - a.liens);

/* Union : le vrai livrable n'est pas la somme des gains (une isolée peut citer deux cibles). */
const unionToutes = new Set();
for (const c of cibles.values()) for (const s of c.sources.values()) if (s.encoreIsolee) unionToutes.add(s.slug ?? s.nom);

console.log(`\n=== 204 LIENS PERDUS, REPASSÉS SUR L'ÉTAT FRAIS ===`);
console.log(`cibles distinctes : ${lignes.length}`);
console.log(`isolées One Piece encore sortables par ces cibles (union) : ${unionToutes.size} / ${lot.length}`);
console.log(`cibles qui ne rapportent plus rien (leurs sources sont déjà sorties) : ${lignes.filter((l) => !l.gainIsoleesEncore).length}`);
console.log(`cibles DÉJÀ en base sous un autre nom : ${lignes.filter((l) => l.dejaEnBase.length || l.parAliasCible).length}`);
console.log('');
for (const l of lignes) {
  const marque = l.dejaEnBase.length ? ` ⚠ DÉJÀ : ${l.dejaEnBase.join(' , ')}` : (l.parAliasCible ? ` ⚠ ALIAS → ${l.parAliasCible}` : '');
  console.log(`${String(l.gainIsoleesEncore).padStart(3)} isolées · ${String(l.liens).padStart(3)} liens  ${l.titre}  [${Object.entries(l.champs).map(([a, b]) => `${a}=${b}`).join(',')}] {${Object.entries(l.typesDesSources).map(([a, b]) => `${a}=${b}`).join(',')}}${marque}`);
}

const sortie = path.join(REP, `op-cibles-sonde-${HORODATE}.json`);
fs.writeFileSync(sortie, JSON.stringify({
  chantier: 'mesurer les cibles One Piece manquantes avant de créer les fiches (vague 6)',
  quand: new Date().toISOString(), traceLue: TRACE5,
  etat: { fiches: entries.length, aretes: rels.length, isoleesTotales: isolees.length, isoleesOnePiece: lot.length,
    fichesOnePiece: op.length, parTypeOnePiece: parType, parTypeIsolees: parTypeIso,
    professionsOnePiece: professions.map((e) => ({ slug: e.slug, name: e.name })) },
  unionIsoleesSortables: [...unionToutes],
  cibles: lignes,
}, null, 1));
console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);
