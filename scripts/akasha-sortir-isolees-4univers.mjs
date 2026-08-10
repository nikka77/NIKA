// scripts/akasha-sortir-isolees-4univers.mjs — poser les arêtes des isolées JoJo/Bleach/HxH/Death Note.
//
// POURQUOI (10/08/2026)
// La vague 1 a conclu « rendement nul » sur ces quatre univers. L'étape 1 a montré que cette
// conclusion mesurait sa propre sonde, pas le wiki :
//   · le témoin (Jotaro, Ichigo, Gon, Light) est SERVI sur les quatre hôtes → le wiki est le bon ;
//   · `parametresInfobox()` lisait le PREMIER gabarit du wikitexte, qui est du décor
//     ({{template:AnimeContent}}, {{Quotes|…}}, {{Parent Tab Template}}) et jamais l'infobox ;
//   · la liste de champs ne collait pas aux gabarits réels (JoJo lie par `stand`, HxH par
//     `previous occupation`, Death Note par `species`) ;
//   · nos titres viennent de MAL en wapuro (Toudou), le wiki titre en macrons (Tōdō).
//
// Trois ponts, et TROIS SEULEMENT, pour rapprocher une cible anglaise d'une de nos fiches. Chacun
// laisse une phrase-preuve à côté de la valeur posée :
//   1. nom identique (ou identique une fois la romanisation repliée) ;
//   2. lien interlangue `fr` déclaré par le wiki lui-même ;
//   3. `attributes.descFrSource` de NOTRE fiche qui nomme sa page source anglaise
//      (« claude-haiku (blitz 03/08) · Bow and Arrow (JoJo Wiki) »).
//
// Un quatrième pont a été essayé puis JETÉ : « le titre anglais apparaît dans notre texte ».
// Mesuré sur ses trois cas, il en a donné deux faux (Cluck rattaché à « Hunter » parce que le mot
// « Zodiacs » traîne dans la description de la profession). Une mention n'est pas une identité.
//
// Gardes : jamais de cible de type `character` · jamais de redirection de SECTION (la page atteinte
// est celle d'un autre) · jamais d'arête inter-univers (index construit par univers) · le titre du
// lien, jamais son libellé · pas de doublon d'une arête déjà posée.
//
// Usage : node --env-file=.env.local scripts/akasha-sortir-isolees-4univers.mjs [--appliquer]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';
import { ciblesDuParametre } from './audit-isolees-fandom.mjs';
import { WIKIS, infoboxDuWikitexte } from './audit-isolees-gisement-4univers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const APPLIQUER = process.argv.includes('--appliquer');
const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (audit graphe, contact tulbured06@gmail.com)' };

/** La nature de l'arête suit le TYPE DE LA CIBLE, pas le nom du champ d'infobox : c'est le type
 *  qui décide du libellé lu par le visiteur (lib/akasha/relation-labels.ts). « exerce Tour Céleste »
 *  se lirait « Exerce Tour Céleste » sur la fiche — un lieu ne s'exerce pas. */
const RELATION_PAR_TYPE = {
  place: 'habite', profession: 'exerce', skill: 'maitrise', power: 'maitrise',
  artifact: 'possede', status: 'appartient', organization: 'appartient',
};

const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const normRoman = (s) => norm(s).replace(/ou/g, 'o').replace(/uu/g, 'u').replace(/oo/g, 'o');

/** Jeux de mots signifiants d'un titre : articles français retirés, pluriel simple replié.
 *  « Association des Hunters » et « Association Hunter » (le fr du wiki) doivent se rencontrer,
 *  sans pour autant confondre deux entités qui ne partagent pas leurs mots pleins. */
const VIDES = new Set(['de', 'des', 'du', 'la', 'le', 'les', 'l', 'd', 'the', 'of', 'a']);
const jetons = (s) => new Set(norm(s).split(' ').filter((m) => m && !VIDES.has(m)).map((m) => m.replace(/s$/, '')));
const memesJetons = (a, b) => { const x = jetons(a), y = jetons(b); return x.size > 0 && x.size === y.size && [...x].every((m) => y.has(m)); };

function variantesMacron(nom) {
  let sorties = [nom];
  for (const [w, m] of [['ou', 'ō'], ['oo', 'ō'], ['uu', 'ū']]) {
    const suiv = new Set();
    for (const s of sorties) {
      suiv.add(s);
      if (s.toLowerCase().includes(w)) suiv.add(s.replace(new RegExp(w, 'g'), m).replace(new RegExp(w[0].toUpperCase() + w[1], 'g'), m.toUpperCase()));
    }
    sorties = [...suiv].slice(0, 8);
  }
  return sorties.filter((s) => s !== nom);
}

/** Titre de page source cité dans `descFrSource` : « modèle (campagne) · Bow and Arrow (JoJo Wiki) ».
 *  On ne garde que les formes à UN seul titre — « mentions : a, b, c » ne désigne rien. */
function titreSourceCite(descFrSource) {
  const s = String(descFrSource ?? '');
  const i = s.lastIndexOf('·');
  if (i < 0) return null;
  let t = s.slice(i + 1).trim();
  if (/^mentions?\s*:/i.test(t) || t.includes(',')) return null;
  const url = t.match(/\/wiki\/([^\s,]+)$/);
  if (url) return decodeURIComponent(url[1]).replace(/_/g, ' ');
  if (/^https?:/.test(t)) return null;
  t = t.replace(/\s*\((?:[A-Za-z' ]*Wiki|Bleach Wiki|JoJo Wiki|Stand)\)\s*$/i, '').trim();
  return t || null;
}

async function pagesDe(hote, titres) {
  const out = new Map();
  for (let i = 0; i < titres.length; i += 50) {
    const url = `https://${hote}/api.php?${new URLSearchParams({
      action: 'query', prop: 'revisions|langlinks', rvprop: 'content', rvslots: 'main',
      lllang: 'fr', lllimit: 'max', redirects: '1', format: 'json', formatversion: '2',
      titles: titres.slice(i, i + 50).join('|'),
    })}`;
    const r = await fetch(url, { headers: UA });
    await new Promise((x) => setTimeout(x, 180));
    if (!r.ok) continue;
    const j = await r.json();
    const origine = new Map(), fragment = new Map();
    for (const n of j.query?.normalized ?? []) origine.set(n.to, n.from);
    for (const n of j.query?.redirects ?? []) {
      const dem = origine.get(n.from) ?? n.from;
      origine.set(n.to, dem);
      if (n.tofragment) fragment.set(dem, `${n.to}#${n.tofragment}`);
    }
    for (const p of j.query?.pages ?? []) {
      const dem = origine.get(p.title) ?? p.title;
      out.set(dem, p.missing ? null : {
        titre: p.title, texte: p.revisions?.[0]?.slots?.main?.content ?? '',
        fragment: fragment.get(dem) ?? null, fr: p.langlinks?.[0]?.title ?? null,
      });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
console.log(`→ mode : ${APPLIQUER ? 'APPLICATION' : 'à blanc'}`);
const entries = await page('akasha_entries', 'id, slug, name, type, universe, attributes');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');
const deg = new Set();
for (const r of rels) { deg.add(r.from_entry); deg.add(r.to_entry); }
const dejaLa = new Set(rels.map((r) => `${r.from_entry}>${r.to_entry}>${r.relation}`));
const isolees = entries.filter((e) => !deg.has(e.id));
console.log(`${entries.length} fiches · ${rels.length} arêtes · ${isolees.length} isolées`);

const retenus = [], refuses = [];
const parUnivers = {};

for (const [univers, cfg] of Object.entries(WIKIS)) {
  const lot = isolees.filter((e) => e.universe === univers).sort((a, b) => a.slug.localeCompare(b.slug));
  if (!lot.length) continue;
  const memeUnivers = entries.filter((e) => e.universe === univers);

  const idx = new Map();
  for (const e of memeUnivers) {
    for (const cle of [norm(e.name), normRoman(e.name), norm(e.slug), norm(e.attributes?.roman_name)]) {
      if (!cle) continue;
      if (!idx.has(cle)) idx.set(cle, []);
      if (!idx.get(cle).some((c) => c.id === e.id)) idx.get(cle).push(e);
    }
  }
  // Pont 3, monté à l'avance : titre anglais cité par notre propre fiche → notre fiche.
  const parSourceCitee = new Map();
  for (const e of memeUnivers) {
    const t = titreSourceCite(e.attributes?.descFrSource);
    if (!t) continue;
    const cle = norm(t);
    if (!parSourceCitee.has(cle)) parSourceCitee.set(cle, []);
    parSourceCitee.get(cle).push(e);
  }

  const candidatsTitre = new Map();
  for (const e of lot) {
    candidatsTitre.set(e.name, e);
    for (const v of variantesMacron(e.name)) if (!candidatsTitre.has(v)) candidatsTitre.set(v, e);
  }
  const pages = await pagesDe(cfg.hote, [...candidatsTitre.keys()]);

  const brut = [], vus = new Set();
  for (const [titre, e] of candidatsTitre) {
    if (vus.has(e.id)) continue;
    const p = pages.get(titre);
    if (!p || p.fragment) continue;               // page absente, ou redirection de section : refus
    vus.add(e.id);
    const ib = infoboxDuWikitexte(p.texte);
    for (const champ of Object.keys(cfg.champs)) {
      for (const c of ciblesDuParametre(ib.params[champ])) {
        brut.push({ e, titreSource: p.titre, alias: titre !== e.name ? titre : null, champ, cible: c.titre, gabarit: ib.nom });
      }
    }
  }

  const aPonter = new Set();
  for (const b of brut) {
    const hit = idx.get(norm(b.cible)) ?? idx.get(normRoman(b.cible));
    if (hit?.length === 1) { b.vers = hit[0]; b.pont = 'nom identique'; b.preuve = `${cfg.hote}/wiki/${encodeURIComponent(b.titreSource)} — infobox {{${b.gabarit}}}, ${b.champ} = [[${b.cible}]] ; « ${b.cible} » est le nom de notre fiche`; }
    else if (hit?.length > 1) b.refus = `homonyme en base (${hit.map((h) => h.type).join('/')})`;
    else aPonter.add(b.cible);
  }

  const pagesCibles = aPonter.size ? await pagesDe(cfg.hote, [...aPonter]) : new Map();
  const pont = new Map();
  for (const [t, p] of pagesCibles) {
    if (!p || p.fragment) continue;
    // Pont 2 : le wiki déclare lui-même l'équivalent français.
    if (p.fr) {
      const cands = memeUnivers.filter((e) => e.type !== 'character' && (norm(e.name) === norm(p.fr) || memesJetons(e.name, p.fr)));
      if (cands.length === 1) { pont.set(t, { e: cands[0], voie: 'lien interlangue', preuve: `${cfg.hote} déclare le lien interlangue fr de « ${p.titre} » : « ${p.fr} » ; notre fiche porte « ${cands[0].name} »` }); continue; }
    }
    // Pont 3 : notre fiche cite elle-même sa page source anglaise.
    const cands = (parSourceCitee.get(norm(t)) ?? []).filter((e) => e.type !== 'character');
    if (cands.length === 1) pont.set(t, { e: cands[0], voie: 'source citée en base', preuve: `notre fiche « ${cands[0].name} » déclare descFrSource = « ${cands[0].attributes.descFrSource} », qui nomme la page « ${t} »` });
  }
  for (const b of brut) {
    if (b.vers || b.refus) continue;
    const p = pont.get(b.cible);
    if (p) { b.vers = p.e; b.pont = p.voie; b.preuve = `${cfg.hote}/wiki/${encodeURIComponent(b.titreSource)} — infobox {{${b.gabarit}}}, ${b.champ} = [[${b.cible}]] ; pont « ${p.voie} » : ${p.preuve}`; }
    else b.refus = pagesCibles.get(b.cible) ? 'cible sans équivalent en base' : 'page cible absente du wiki';
  }

  const uniques = new Map();
  for (const b of brut) {
    if (!b.vers) { refuses.push({ univers, de: b.e.name, champ: b.champ, cible: b.cible, motif: b.refus }); continue; }
    if (b.vers.type === 'character') { refuses.push({ univers, de: b.e.name, champ: b.champ, cible: b.cible, motif: `cible personne refusée (${b.vers.name})` }); continue; }
    if (b.vers.id === b.e.id) { refuses.push({ univers, de: b.e.name, champ: b.champ, cible: b.cible, motif: 'auto-arête' }); continue; }
    const relation = RELATION_PAR_TYPE[b.vers.type] ?? 'appartient';
    const cle = `${b.e.id}>${b.vers.id}>${relation}`;
    if (dejaLa.has(cle)) { refuses.push({ univers, de: b.e.name, champ: b.champ, cible: b.cible, motif: 'arête déjà posée' }); continue; }
    // Une même paire ne mérite qu'une arête : `affiliation` et `base of operations` pointent
    // tous deux « Soul Society », ça ne fait pas deux liens à afficher.
    const paire = `${b.e.id}>${b.vers.id}`;
    if ([...uniques.values()].some((u) => `${u.e.id}>${u.vers.id}` === paire)) continue;
    uniques.set(cle, { ...b, relation });
  }
  for (const u of uniques.values()) retenus.push({ univers, ...u });
  parUnivers[univers] = { hote: cfg.hote, isolees: lot.length, ciblesBrutes: brut.length, aretes: uniques.size, isoleesSorties: new Set([...uniques.values()].map((u) => u.e.id)).size };
  console.log(`  ${univers} : ${lot.length} isolées → ${uniques.size} arêtes, ${parUnivers[univers].isoleesSorties} fiches sorties`);
}

console.log(`\n╔══ ${retenus.length} arêtes retenues · ${new Set(retenus.map((r) => r.e.id)).size} isolées sortiraient`);
for (const r of retenus) console.log(`  · [${r.univers}] ${r.e.name} --${r.relation}--> ${r.vers.name} (${r.vers.type})  [${r.champ} · pont ${r.pont}]`);

// TRACE AVANT ÉCRITURE — chemin horodaté différent à chaque exécution qui écrit.
const horodatage = new Date().toISOString().replace(/[:.]/g, '-');
const trace = path.join(ROOT, `data/audits/isolees-4univers-${APPLIQUER ? 'application' : 'blanc'}-${horodatage}.json`);
fs.writeFileSync(trace, JSON.stringify({
  chantier: 'sortie des isolées JoJo/Bleach/HxH/Death Note par infobox Fandom',
  quand: new Date().toISOString(), mode: APPLIQUER ? 'application' : 'à blanc',
  base: { fiches: entries.length, aretes: rels.length, isolees: isolees.length },
  parUnivers,
  aretes: retenus.map((r) => ({
    univers: r.univers, deSlug: r.e.slug, de: r.e.name, relation: r.relation,
    versSlug: r.vers.slug, vers: r.vers.name, versType: r.vers.type,
    champ: r.champ, gabarit: r.gabarit, titreWiki: r.titreSource,
    aliasRomanisation: r.alias, pont: r.pont, preuve: r.preuve,
  })),
  refuses,
}, null, 1));
console.log(`trace : ${path.relative(ROOT, trace)}`);

if (!APPLIQUER) { console.log('\n(à blanc — relancer avec --appliquer)'); process.exit(0); }

let pose = 0;
for (const r of retenus) {
  const { error } = await db.from('akasha_relations').insert({ from_entry: r.e.id, to_entry: r.vers.id, relation: r.relation });
  if (error) console.error(`  ✗ ${r.e.name} → ${r.vers.name} : ${error.message}`);
  else pose++;
}
console.log(`\n${pose}/${retenus.length} arêtes posées.`);
