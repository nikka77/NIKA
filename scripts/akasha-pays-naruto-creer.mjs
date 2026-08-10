// scripts/akasha-pays-naruto-creer.mjs — CRÉER LES FICHES QUE DES ISOLÉES CITENT ET QUI MANQUENT.
//
// POURQUOI (10/08/2026)
// `akasha-isolees-html.mjs` lit 270 liens dans les infobox rendues de naruto.fandom.com et n'en
// pose AUCUN sur les champs d'appartenance : les cibles n'existent pas en base. Mesuré sur la sonde
// du 10/08 09:01 : 19 pays, 2 « Family », 1 « Gang », 1 « Group » manquants.
//
// CE SCRIPT N'INSÈRE QUE DES LIGNES NEUVES dans akasha_entries. Il ne met à jour AUCUNE fiche
// existante et ne touche à aucune autre table : quatre chantiers écrivent en parallèle dans
// `attributes`, et le geste le plus sûr est de n'y jamais repasser.
//
// TROIS GARDES, dans cet ordre, avant chaque insertion :
//  1. ANTI-DOUBLON — le slug est libre ET aucune fiche Naruto ne porte déjà ce nom normalisé. Ce
//     filet a déjà retiré trois cibles de la liste initiale : « Kagetsu Family » (= « Clan
//     Kagetsu »), « Summon » (= « Créature invoquée »), « Daimyō » (= « Daimyō (seigneur) »).
//  2. RÉSOLUTION — norm(slug) doit égaler norm(titre du wiki), sinon la fiche créée ne sera jamais
//     atteinte par le lien d'infobox et le travail n'aura servi à rien.
//  3. NOM ATTESTÉ — le nom FR retenu doit se trouver au moins une fois dans le texte du corpus
//     Naruto. Un nom qu'on est seul à écrire est un nom qu'on a inventé.
//
// Usage :
//   node --env-file=.env.local scripts/akasha-pays-naruto-creer.mjs --sonde   (mesure, rien écrit)
//   node --env-file=.env.local scripts/akasha-pays-naruto-creer.mjs           (écrit)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';
import { norm } from './audit-isolees-fandom.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const SONDE = process.argv.includes('--sonde');
const HORODATE = new Date().toISOString().replace(/[:.]/g, '-');

/* La collecte la plus récente : c'est elle qui porte l'URL, l'image et le texte source. */
const REP = path.join(ROOT, 'data/audits');
const COLLECTE = fs.readdirSync(REP).filter((f) => f.startsWith('pays-naruto-collecte-')).sort().pop();
if (!COLLECTE) throw new Error('aucune collecte : lancer d\'abord akasha-pays-naruto-collecte.mjs');
const collecte = JSON.parse(fs.readFileSync(path.join(REP, COLLECTE), 'utf8'));
const parTitre = new Map(collecte.fiches.map((f) => [f.slugPropose, f]));
console.log(`collecte lue : ${COLLECTE} (${collecte.fiches.length} cibles)`);

const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/akasha/naruto-pays-manquants.json'), 'utf8'));

const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;      // un select nu s'arrête à 1000 SANS erreur
  }
  return out;
};

console.log('→ lecture de la base (paginée)…');
const entries = await page('akasha_entries', 'id, slug, name, type, universe, summary, description, image_url, attributes');
console.log(`  akasha_entries : ${entries.length} lignes`);
const naruto = entries.filter((e) => e.universe === 'Naruto');
const parSlug = new Map(entries.map((e) => [e.slug, e]));
const nomsNaruto = new Map();
for (const e of naruto) for (const c of [norm(e.name), norm(e.slug)]) if (c && !nomsNaruto.has(c)) nomsNaruto.set(c, e);
const texteCorpus = naruto.map((e) => [e.name, e.summary, e.description, JSON.stringify(e.attributes ?? {})].join(' ')).join('\n');
const normCorpus = norm(texteCorpus);   // comparaison insensible à la casse et aux diacritiques

/* Parc d'images : un visuel déjà porté par une autre fiche, ou dont le nom de fichier désigne une
   entité que nous possédons, n'est pas le visuel de CE sujet. C'est la leçon des 4 portraits
   usurpés du 09/08, appliquée en amont plutôt qu'en réparation. */
const fichierDe = (u) => {
  const m = /\/images\/[0-9a-f]\/[0-9a-f]{2}\/([^/?]+)/i.exec(String(u ?? ''));
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return m[1]; }
};
const urlsPrises = new Set(entries.map((e) => e.image_url).filter(Boolean));
const fichiersPris = new Set([...urlsPrises].map(fichierDe).filter(Boolean).map((f) => f.toLowerCase()));

const aInserer = [], refuses = [];
for (const f of source.fiches) {
  const c = parTitre.get(f.slug);
  const motifs = [];
  if (!c) motifs.push('absente de la collecte');
  if (c?.manquante) motifs.push('page absente chez la source');
  if (parSlug.has(f.slug)) motifs.push(`slug déjà pris par « ${parSlug.get(f.slug).name} »`);
  const homonyme = nomsNaruto.get(norm(f.name));
  if (homonyme) motifs.push(`nom déjà porté par ${homonyme.type}/${homonyme.slug} « ${homonyme.name} »`);
  if (c && norm(c.slugPropose) !== norm(c.titreDemande)) motifs.push(`slug non résolvable (norm « ${norm(c.slugPropose)} » ≠ « ${norm(c.titreDemande)} »)`);
  // NOM ATTESTÉ, par l'une de trois voies seulement — et la comparaison se fait sur `norm`, sinon
  // « groupe Prajñā » (minuscule, en cours de phrase) ne reconnaîtrait pas « Groupe Prajñā ».
  //  a) le nom se lit tel quel dans le texte du corpus ;
  //  b) c'est le titre canonique du wiki (aucune forme FR n'existe) ;
  //  c) il suit un GABARIT du corpus — « Clan X » : 30 fiches Naruto le portent, dont « Clan
  //     Kagetsu » dont la page du wiki s'intitule « Kagetsu Family », exactement le même cas.
  //     On exige alors que le nom propre X, lui, soit attesté.
  const attesteCorpus = normCorpus.includes(norm(f.name));
  const estCanon = c && f.name === c.titreDemande;
  let parGabarit = null;
  if (f.gabarit === 'Clan X') {
    const reste = /^Clan\s+(.+)$/.exec(f.name)?.[1];
    const pairs = naruto.filter((e) => /^Clan\s/.test(e.name ?? '')).length;
    if (reste && pairs >= 10 && normCorpus.includes(norm(reste))) parGabarit = `gabarit « Clan X » (${pairs} fiches Naruto), nom propre « ${reste} » attesté dans le corpus`;
  }
  if (!attesteCorpus && !estCanon && !parGabarit) motifs.push(`nom « ${f.name} » ni attesté dans le corpus, ni canonique, ni conforme à un gabarit`);

  // Image : on la garde sauf si son nom de fichier désigne une entité déjà en base.
  let image = c?.image ?? null, motifImage = null;
  const nf = fichierDe(image);
  const cleFichier = nf ? norm(nf.replace(/\.[a-z0-9]+$/i, '')) : null;
  if (image && urlsPrises.has(image)) { motifImage = 'URL déjà portée par une autre fiche'; image = null; }
  else if (nf && fichiersPris.has(nf.toLowerCase())) { motifImage = `fichier « ${nf} » déjà porté par une autre fiche`; image = null; }
  else if (cleFichier && nomsNaruto.has(cleFichier) && cleFichier !== norm(c.titreDemande)) {
    motifImage = `le fichier « ${nf} » désigne ${nomsNaruto.get(cleFichier).type}/${nomsNaruto.get(cleFichier).slug} — visuel d'un autre sujet`;
    image = null;
  }

  if (motifs.length) { refuses.push({ slug: f.slug, name: f.name, motifs }); continue; }

  const attributes = {
    category: f.category ?? 'Pays',
    descFr: f.descFr,
    descFrSource: `claude-opus-5 (traduit de l'introduction de ${c.url}, 10/08/2026)`,
  };
  if (f.scope) attributes.scope = f.scope;

  aInserer.push({
    ligne: {
      slug: f.slug, type: f.type, name: f.name, is_fiction: true, universe: 'Naruto',
      summary: f.summary,
      description: null,          // colonne morte sur 7 599 / 7 632 fiches : on ne la réveille pas ici
      image_url: image,
      attributes,
      rarity: 'common',           // valeur par défaut des places Naruto (30/39) ; aucune hiérarchie inventée
    },
    preuve: {
      source: c.url,
      titreWiki: c.titreDemande,
      resolution: `norm('${f.slug}') === norm('${c.titreDemande}') → « ${norm(f.slug)} »`,
      nom: f.nomPreuve,
      nomAttesteDansLeCorpus: attesteCorpus,
      nomParGabarit: parGabarit,
      texteSource: c.introSource,
      imageSource: c?.image ?? null,
      imageRefusee: motifImage,
      citeePar: c.citants,
    },
  });
}

console.log(`\n=== BILAN AVANT ÉCRITURE ===`);
console.log(`à insérer : ${aInserer.length} / ${source.fiches.length}`);
console.log(`  places : ${aInserer.filter((x) => x.ligne.type === 'place').length} · status : ${aInserer.filter((x) => x.ligne.type === 'status').length}`);
console.log(`  avec image : ${aInserer.filter((x) => x.ligne.image_url).length} · sans : ${aInserer.filter((x) => !x.ligne.image_url).length}`);
console.log(`images écartées : ${aInserer.filter((x) => x.preuve.imageRefusee).map((x) => `${x.ligne.slug} (${x.preuve.imageRefusee})`).join(' · ') || 'aucune'}`);
console.log(`noms canoniques (pas de forme FR attestée) : ${aInserer.filter((x) => !x.preuve.nomAttesteDansLeCorpus).map((x) => x.ligne.name).join(' · ') || 'aucun'}`);
console.log(`refusés : ${refuses.length}`);
for (const r of refuses) console.log(`  ✗ ${r.slug} « ${r.name} » : ${r.motifs.join(' ; ')}`);

const trace = path.join(REP, `pays-naruto-${SONDE ? 'sonde' : 'trace'}-${HORODATE}.json`);
fs.writeFileSync(trace, JSON.stringify({
  chantier: 'créer les fiches Naruto citées par des isolées mais absentes du corpus',
  quand: new Date().toISOString(), mode: SONDE ? 'sonde' : 'écriture',
  collecte: COLLECTE,
  avant: { fiches: entries.length, narutoPlaces: naruto.filter((e) => e.type === 'place').length },
  regles: { nom: source.regleDeNom, slug: source.regleDeSlug, texte: source.regleDeTexte, image: source.regleDImage },
  aInserer, refuses,
}, null, 1));
console.log(`\ntrace AVANT écriture : ${path.relative(ROOT, trace)}`);

console.log('\n=== LES 22 CAS, À RELIRE UN PAR UN ===');
for (const x of aInserer) {
  console.log(`\n· ${x.ligne.name}  [${x.ligne.type}/${x.ligne.slug}]  ${x.ligne.image_url ? '' : '(sans visuel)'}`);
  console.log(`  nom   : ${x.preuve.nom}`);
  console.log(`  résumé: ${x.ligne.summary}`);
  console.log(`  descFr: ${x.ligne.attributes.descFr}`);
  console.log(`  source: ${x.preuve.source}`);
  console.log(`  citée par : ${x.preuve.citeePar.join(', ')}`);
}

if (SONDE) { console.log('\n--sonde : rien écrit.'); process.exit(0); }

let ecrites = 0;
for (let i = 0; i < aInserer.length; i += 50) {
  const paquet = aInserer.slice(i, i + 50).map((x) => x.ligne);
  const { data, error } = await db.from('akasha_entries').insert(paquet).select('id, slug');
  if (error) { console.error(`  ✗ paquet ${i} : ${error.message}`); continue; }
  ecrites += data?.length ?? 0;
}
console.log(`\nfiches insérées : ${ecrites} / ${aInserer.length}`);

const apres = await page('akasha_entries', 'id, slug, name, type, universe');
const cree = apres.filter((e) => aInserer.some((x) => x.ligne.slug === e.slug));
const exec = path.join(REP, `pays-naruto-exec-${HORODATE}.json`);
fs.writeFileSync(exec, JSON.stringify({
  quand: new Date().toISOString(), tentees: aInserer.length, ecrites,
  avant: { fiches: entries.length }, apres: { fiches: apres.length },
  fichesCreees: cree.map((e) => ({ id: e.id, slug: e.slug, name: e.name, type: e.type })),
}, null, 1));
console.log(`APRÈS : ${apres.length} fiches (avant ${entries.length})`);
console.log(`trace d'exécution : ${path.relative(ROOT, exec)}`);
