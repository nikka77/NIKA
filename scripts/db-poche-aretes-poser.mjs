// Chantier 4 — ARÊTES des isolées Dragon Ball. À blanc par défaut ; `--appliquer` pour écrire.
//
// CE QUI A ÉTÉ MESURÉ AVANT D'ÉCRIRE (traces data/audits/poche-db-aretes-*) :
//  · étape A — 59/146 isolées ont une page EN par titre direct ; gabarits : Character Infobox 52,
//    Infobox Technique 5, Race Infobox2 2. 26 champs portent au moins un lien.
//  · étape B — rendement CHAMP PAR CHAMP vers NOTRE corpus : allegiance 0/61, race 0/51,
//    anime/manga/game/movie debut 0/128, date of death 0/72 ; address 7/16, user 19/53,
//    famconnect 6/20, mentors 3/6, homeworld 2/3, students 1/5, occupation 1/20.
//  · étape D — la cause du zéro n'est pas l'extracteur : notre corpus Dragon Ball compte
//    2 fiches de type organisation/status (Capsule Corporation, Saiyan) pour 61 liens
//    d'allégeance à poser. Il n'y a nulle part où pointer.
//
// CHAMPS RETENUS, et pourquoi la nature de l'arête est celle-là :
//   address / homeworld → `habite` (cible `place`)          — « Réside · X » sur la fiche perso
//   mentors             → `mentor` (isolée → maître)        — « Mentor · X »
//   students            → `eleve`  (isolée → élève)         — « Élève · X »
//   famconnect          → `famille`, UNIQUEMENT si la parenthèse dit un lien de parenté
//                          (brother, sister, father…). « (owner) », « (host) », « (creator) »
//                          ne sont PAS de la famille : Hirudegarn n'est pas le frère de Tapion,
//                          il est enfermé dedans.
//   user                → `possede`, sens PERSONNAGE → OBJET (l'objet est l'isolée, et
//                          EntityZone rend ses arêtes entrantes : « Possédé par · X »)
// CHAMPS ÉCARTÉS malgré des cibles résolues : altname (c'est un autre NOM de la même fiche),
//   counterparts / similar (« voir aussi », pas une relation), inventor (aucune nature qui le dise),
//   occupation (1 cible sur 20, et celle-là ferait « habite Univers 7 »).
//
// PONTS d'identité, tous citables, aucun rapprochement par similarité de chaînes :
//   P1 nom identique (romanisation repliée) · P2 lien interlangue `fr` déclaré par le wiki
//   P3 `descFrSource` de notre fiche qui nomme sa page source · P4 MÊME PAGE : le titre du lien et
//   le nom de notre fiche atteignent la même page canonique du wiki (redirection dure, sans
//   fragment — une redirection de SECTION est refusée, elle mène à la fiche d'un autre).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';
import { infoboxDuWikitexte } from './audit-isolees-gisement-4univers.mjs';
import { ciblesDuParametre } from './audit-isolees-fandom.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const HOTE = 'dragonball.fandom.com';
const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (audit graphe, contact tulbured06@gmail.com)' };
const APPLIQUER = process.argv.includes('--appliquer');
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');

const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? [])); if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const normRoman = (s) => norm(s).replace(/ou/g, 'o').replace(/uu/g, 'u').replace(/oo/g, 'o');
function titreSourceCite(d) {
  const s = String(d ?? ''); const i = s.lastIndexOf('·'); if (i < 0) return null;
  let t = s.slice(i + 1).trim();
  if (/^mentions?\s*:/i.test(t) || t.includes(',')) return null;
  const u = t.match(/\/wiki\/([^\s,]+)$/); if (u) return decodeURIComponent(u[1]).replace(/_/g, ' ');
  if (/^https?:/.test(t)) return null;
  return t.replace(/\s*\([A-Za-z' ]*Wiki\)\s*$/i, '').trim() || null;
}
async function pagesDe(titres) {
  const out = new Map();
  for (let i = 0; i < titres.length; i += 50) {
    const url = `https://${HOTE}/api.php?${new URLSearchParams({
      action: 'query', prop: 'revisions|langlinks', rvprop: 'content', rvslots: 'main',
      lllang: 'fr', lllimit: 'max', redirects: '1', format: 'json', formatversion: '2',
      titles: titres.slice(i, i + 50).join('|'),
    })}`;
    const r = await fetch(url, { headers: UA });
    await new Promise((x) => setTimeout(x, 180));
    if (!r.ok) { console.error(`  ✗ lot ${i} HTTP ${r.status}`); continue; }
    const j = await r.json();
    const origine = new Map(), fragment = new Map();
    for (const n of j.query?.normalized ?? []) origine.set(n.to, n.from);
    for (const n of j.query?.redirects ?? []) {
      const dem = origine.get(n.from) ?? n.from; origine.set(n.to, dem);
      if (n.tofragment) fragment.set(dem, `${n.to}#${n.tofragment}`);
    }
    for (const p of j.query?.pages ?? []) {
      const dem = origine.get(p.title) ?? p.title;
      out.set(dem, p.missing ? null : { titre: p.title, texte: p.revisions?.[0]?.slots?.main?.content ?? '', fragment: fragment.get(dem) ?? null, fr: p.langlinks?.[0]?.title ?? null });
    }
  }
  return out;
}

// Parenté explicite : seule une de ces mentions transforme `famconnect` en `famille`.
const PARENTE = /\b(brother|sister|father|mother|son|daughter|husband|wife|grandfather|grandmother|grandson|granddaughter|uncle|aunt|nephew|niece|cousin|twin|parents?|descendant|ancestor|in-law)\b/i;

console.log(`→ mode : ${APPLIQUER ? 'APPLICATION' : 'à blanc'}`);
const entries = await page('akasha_entries', 'id, slug, name, type, universe, attributes');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');
const deg = new Set(); for (const r of rels) { deg.add(r.from_entry); deg.add(r.to_entry); }
const dejaLa = new Set(rels.map((r) => `${r.from_entry}>${r.to_entry}>${r.relation}`));
const isolees = entries.filter((e) => !deg.has(e.id) && e.universe === 'Dragon Ball');
const memeUnivers = entries.filter((e) => e.universe === 'Dragon Ball');
console.log(`${entries.length} fiches · ${rels.length} arêtes · ${isolees.length} isolées Dragon Ball`);

// ── index P1 / P3 ──
// La clé qui a matché est CONSERVÉE : dire « X est le nom de notre fiche » quand c'est son SLUG
// (« Beerus' Planet » → slug `beerus-planet`, nom « Monde de Beerus ») est une preuve fausse.
const idx = new Map();
for (const e of memeUnivers) for (const [quoi, cle] of [['nom', norm(e.name)], ['nom (romanisation repliée)', normRoman(e.name)], ['slug', norm(e.slug)], ['roman_name', norm(e.attributes?.roman_name)]]) {
  if (!cle) continue; if (!idx.has(cle)) idx.set(cle, []);
  if (!idx.get(cle).some((c) => c.e.id === e.id)) idx.get(cle).push({ e, quoi });
}
const parSourceCitee = new Map();
for (const e of memeUnivers) {
  const t = titreSourceCite(e.attributes?.descFrSource); if (!t) continue;
  const k = norm(t); if (!parSourceCitee.has(k)) parSourceCitee.set(k, []); parSourceCitee.get(k).push(e);
}

// ── pages sources des isolées ──
const candidats = new Map();
for (const e of isolees) {
  candidats.set(e.name, e);
  const s = titreSourceCite(e.attributes?.descFrSource); if (s && !candidats.has(s)) candidats.set(s, e);
}
const pagesSrc = await pagesDe([...candidats.keys()]);
const lues = new Map();
for (const [titre, e] of candidats) {
  if (lues.has(e.id)) continue;
  const p = pagesSrc.get(titre);
  if (p && !p.fragment) lues.set(e.id, { e, p, titreDemande: titre });
}
console.log(`→ ${lues.size} pages sources lues`);

// ── extraction des champs retenus ──
const CHAMPS = {
  address: { relation: 'habite', typesCible: ['place'], sens: 'sortant' },
  homeworld: { relation: 'habite', typesCible: ['place'], sens: 'sortant' },
  mentors: { relation: 'mentor', typesCible: ['character'], sens: 'sortant' },
  students: { relation: 'eleve', typesCible: ['character'], sens: 'sortant' },
  famconnect: { relation: 'famille', typesCible: ['character'], sens: 'sortant', exigeParente: true },
  user: { relation: 'possede', typesCible: ['character'], sens: 'entrant', typesSource: ['artifact'] },
};
const brut = [];
for (const { e, p, titreDemande } of lues.values()) {
  const ib = infoboxDuWikitexte(p.texte);
  for (const [champ, cfg] of Object.entries(CHAMPS)) {
    const val = ib.params[champ]; if (!val) continue;
    if (cfg.typesSource && !cfg.typesSource.includes(e.type)) continue;
    // `famconnect` : chaque lien porte sa propre parenthèse, on découpe ligne à ligne.
    const segments = String(val).split(/<br\s*\/?>/i);
    for (const seg of segments) {
      for (const c of ciblesDuParametre(seg)) {
        // EXCLUSION. `user = [[Ginyu Force]] <small>(sans [[Guldo]])</small>` dit que Guldo est
        // le SEUL du commando à ne PAS en porter. Un lien précédé d'un mot d'exclusion, sans
        // autre lien entre les deux, dit le contraire de ce qu'on allait poser.
        const avant = seg.slice(0, seg.indexOf(`[[${c.titre}`));
        const depuisLienPrecedent = avant.slice(avant.lastIndexOf(']]') + 1);
        if (/\b(sans|except|excepted|excluding|without|minus|hormis|excepté|sauf)\b/i.test(depuisLienPrecedent)) {
          brut.push({ e, champ, cible: c.titre, refus: `exclusion explicite dans « ${seg.trim().slice(0, 90)} »`, titreSource: p.titre, gabarit: ib.nom, segment: seg.trim().slice(0, 120), titreDemande });
          continue;
        }
        if (cfg.exigeParente && !PARENTE.test(seg)) { brut.push({ e, champ, cible: c.titre, refus: `parenté non dite dans « ${seg.trim().slice(0, 80)} »`, titreSource: p.titre, gabarit: ib.nom, segment: seg.trim().slice(0, 120), titreDemande }); continue; }
        brut.push({ e, champ, cible: c.titre, titreSource: p.titre, gabarit: ib.nom, segment: seg.trim().slice(0, 120), titreDemande });
      }
    }
  }
}
console.log(`→ ${brut.length} cibles brutes sur les champs retenus`);

// ── P1 ──
const aPonter = new Set();
for (const b of brut) {
  if (b.refus) continue;
  const hit = idx.get(norm(b.cible)) ?? idx.get(normRoman(b.cible));
  if (hit?.length === 1) { b.vers = hit[0].e; b.pont = `P1 ${hit[0].quoi} identique`; b.preuvePont = `« ${b.cible} » égale le ${hit[0].quoi} de notre fiche « ${hit[0].e.name} »`; }
  else if (hit?.length > 1) b.refus = 'homonyme en base';
  else aPonter.add(b.cible);
}
// ── P2 / P3 / P4 ──
const pagesCibles = aPonter.size ? await pagesDe([...aPonter]) : new Map();
// P4 : où atterrissent les NOMS de nos fiches Dragon Ball ? (une seule passe, 1137 noms)
const nomsCorpus = memeUnivers.map((e) => e.name);
console.log(`→ P4 : résolution des ${nomsCorpus.length} noms du corpus sur le wiki…`);
const pagesCorpus = await pagesDe(nomsCorpus);
const parPageCanonique = new Map();
for (const e of memeUnivers) {
  const p = pagesCorpus.get(e.name);
  if (!p || p.fragment) continue;              // redirection de section refusée
  const k = norm(p.titre);
  if (!parPageCanonique.has(k)) parPageCanonique.set(k, []);
  parPageCanonique.get(k).push({ e, pageTitre: p.titre });
}
console.log(`   ${parPageCanonique.size} pages canoniques atteintes par nos noms`);

const pont = new Map();
for (const [t, p] of pagesCibles) {
  if (!p || p.fragment) continue;
  if (p.fr) {
    const c = memeUnivers.filter((e) => norm(e.name) === norm(p.fr));
    if (c.length === 1) { pont.set(t, { e: c[0], voie: 'P2 lien interlangue', detail: `${HOTE} déclare fr = « ${p.fr} » pour la page « ${p.titre} »` }); continue; }
  }
  const c3 = parSourceCitee.get(norm(t)) ?? [];
  if (c3.length === 1) { pont.set(t, { e: c3[0], voie: 'P3 source citée', detail: `notre fiche « ${c3[0].name} » déclare descFrSource nommant « ${t} »` }); continue; }
  const c4 = parPageCanonique.get(norm(p.titre)) ?? [];
  if (c4.length === 1) pont.set(t, { e: c4[0].e, voie: 'P4 même page', detail: `[[${t}]] et notre fiche « ${c4[0].e.name} » atteignent la même page « ${p.titre} » (redirection dure, sans fragment)` });
  else if (c4.length > 1) pont.set(t, { ambigu: c4.map((x) => x.e.name) });
}
for (const b of brut) {
  if (b.vers || b.refus) continue;
  const p = pont.get(b.cible);
  if (p?.e) { b.vers = p.e; b.pont = p.voie; b.preuvePont = p.detail; }
  else if (p?.ambigu) b.refus = `P4 ambigu (${p.ambigu.join(', ')})`;
  else b.refus = pagesCibles.get(b.cible) ? 'cible sans équivalent en base' : 'page cible absente du wiki';
}

// ── gardes finales ──
const retenus = [], refuses = [];
const paires = new Set();
for (const b of brut) {
  const cfg = CHAMPS[b.champ];
  const jeter = (motif) => refuses.push({ de: b.e.name, deSlug: b.e.slug, champ: b.champ, cible: b.cible, motif });
  if (!b.vers) { jeter(b.refus ?? 'non résolu'); continue; }
  if (!cfg.typesCible.includes(b.vers.type)) { jeter(`type de cible ${b.vers.type} hors ${cfg.typesCible.join('/')}`); continue; }
  if (b.vers.id === b.e.id) { jeter('auto-arête'); continue; }
  if (b.vers.universe !== b.e.universe) { jeter('inter-univers'); continue; }
  const from = cfg.sens === 'sortant' ? b.e : b.vers;
  const to = cfg.sens === 'sortant' ? b.vers : b.e;
  const cle = `${from.id}>${to.id}>${cfg.relation}`;
  if (dejaLa.has(cle)) { jeter('arête déjà posée'); continue; }
  if (paires.has(`${from.id}>${to.id}`)) { jeter('paire déjà retenue'); continue; }
  paires.add(`${from.id}>${to.id}`);
  retenus.push({
    from, to, relation: cfg.relation, champ: b.champ, cible: b.cible, gabarit: b.gabarit,
    titreSource: b.titreSource, titreDemande: b.titreDemande, pont: b.pont,
    preuve: `https://${HOTE}/wiki/${encodeURIComponent(b.titreSource)} — infobox {{${b.gabarit}}}, ${b.champ} = « ${b.segment} » ; pont ${b.pont} : ${b.preuvePont}`,
    isoleeSortie: b.e.slug,
  });
}

console.log(`\n╔══ ${retenus.length} arêtes retenues · ${new Set(retenus.map((r) => r.isoleeSortie)).size} isolées sortiraient`);
for (const r of retenus) {
  console.log(`  · ${r.from.name} --${r.relation}--> ${r.to.name} (${r.to.type})   [${r.champ} · ${r.pont}]`);
  console.log(`      ${r.preuve.slice(0, 200)}`);
}
const motifs = {};
for (const r of refuses) motifs[r.motif.replace(/« .* »/, '…').replace(/\(.*\)/, '(…)')] = (motifs[r.motif.replace(/« .* »/, '…').replace(/\(.*\)/, '(…)')] ?? 0) + 1;
console.log('\nrefus :', JSON.stringify(motifs, null, 1));

// TRACE AVANT ÉCRITURE, chemin différent à chaque exécution.
const trace = path.join(ROOT, `data/audits/poche-db-aretes-${APPLIQUER ? 'application' : 'blanc'}-${STAMP}.json`);
fs.writeFileSync(trace, JSON.stringify({
  chantier: 'chantier 4 — arêtes des isolées Dragon Ball (infobox dragonball.fandom.com)',
  quand: new Date().toISOString(), mode: APPLIQUER ? 'APPLICATION' : 'à blanc',
  base: { fiches: entries.length, aretes: rels.length, isoleesDragonBall: isolees.length, pagesSourcesLues: lues.size },
  champs: CHAMPS,
  aretes: retenus.map((r) => ({ deSlug: r.from.slug, de: r.from.name, deType: r.from.type, relation: r.relation, versSlug: r.to.slug, vers: r.to.name, versType: r.to.type, isoleeSortie: r.isoleeSortie, champ: r.champ, gabarit: r.gabarit, titreWiki: r.titreSource, pont: r.pont, preuve: r.preuve })),
  refuses, motifsRefus: motifs,
}, null, 1));
console.log(`trace : ${path.relative(ROOT, trace)}`);

if (!APPLIQUER) { console.log('\n(à blanc — relancer avec --appliquer)'); process.exit(0); }
let pose = 0, echecs = [];
for (const r of retenus) {
  const { error } = await db.from('akasha_relations').insert({ from_entry: r.from.id, to_entry: r.to.id, relation: r.relation });
  if (error) { echecs.push({ de: r.from.name, vers: r.to.name, erreur: error.message }); }
  else pose++;
}
console.log(`\n${pose} arêtes posées · ${echecs.length} échecs`);
fs.writeFileSync(trace.replace('.json', '-bilan.json'), JSON.stringify({ posees: pose, echecs }, null, 1));
