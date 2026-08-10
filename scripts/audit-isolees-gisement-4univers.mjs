// scripts/audit-isolees-gisement-4univers.mjs — ÉTAPE 2 : le gisement réel, mesuré. AUCUNE écriture.
//
// POURQUOI (10/08/2026)
// L'étape 1 (scripts/audit-isolees-recherche-wiki.mjs) a écarté deux des trois hypothèses : le wiki
// répond (témoin servi sur les quatre hôtes) et, pour JoJo, la majorité des isolées sont vraiment
// des figurants sans article. Mais elle a aussi mis au jour DEUX défauts de la sonde de vague 1,
// qui suffisent à expliquer son « rendement nul » ailleurs :
//
//   1. `parametresInfobox()` lit le PREMIER gabarit du wikitexte. Sur bleach.fandom.com c'est
//      `{{template:AnimeContent}}`, sur hunterxhunter c'est `{{Quotes|…}}`, sur les pages à onglets
//      c'est `{{Parent Tab Template}}`. L'infobox vient APRÈS. Rurichiyo Kasumiōji a été comptée
//      « aucune infobox » alors que sa fiche porte `affiliation = [[Kasumiōji Clan]], [[Soul Society]]`.
//   2. La liste de champs de vague 1 ne colle pas aux gabarits réels : JoJo n'a pas d'`affiliation`
//      dans `{{Character Info}}` (le champ à liens est `stand`), HxH range le rattachement dans
//      `previous occupation`, Death Note dans `species` de `{{Human3}}`.
//
// Cette sonde corrige les deux, ajoute la variante de romanisation sur le titre SOURCE (nos noms
// viennent de MAL en wapuro : Toudou → Tōdō) et, pour les cibles, un pont anglais→français PROUVÉ
// (lien interlangue du wiki, ou rōmaji de la page cible retrouvé mot pour mot dans notre texte).
// Elle n'écrit rien : elle produit les candidats et leur preuve, pour que le taux d'erreur soit
// mesuré à la main sur vingt cas AVANT d'écrire quoi que ce soit.
//
// Usage : node --env-file=.env.local scripts/audit-isolees-gisement-4univers.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';
import { ciblesDuParametre } from './audit-isolees-fandom.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (audit graphe, contact tulbured06@gmail.com)' };

/** Champ d'infobox → nature d'arête du graphe (vocabulaire de lib/akasha/relation-labels.ts).
 *  Les noms de champs sont RELEVÉS sur le wikitexte réel de chaque wiki, pas supposés. */
export const WIKIS = {
  "JoJo's Bizarre Adventure": {
    hote: 'jojo.fandom.com',
    // `{{Character Info}}` : le seul champ à liens systématique est `stand` (Masazo Kinoto →
    // [[Cheap Trick]]). `occupation`/`nation` y sont du texte libre non lié.
    champs: { stand: 'maitrise', family: 'appartient', affiliation: 'appartient' },
  },
  'Bleach': {
    hote: 'bleach.fandom.com',
    // `{{Bleach Wiki:Character Template (…)}}` — un gabarit par catégorie de personnage.
    champs: {
      affiliation: 'appartient', 'previous affiliation': 'appartient', team: 'appartient',
      'previous team': 'appartient', profession: 'exerce', 'previous profession': 'exerce',
      race: 'appartient', 'base of operations': 'habite',
    },
  },
  'Hunter x Hunter': {
    hote: 'hunterxhunter.fandom.com',
    // `{{Hunterpedia:Character}}` : le rattachement est souvent dans `previous occupation`
    // (Hishita = « [[Zoldyck Family]]'s butler »), et `type` porte le Nen.
    champs: {
      affiliation: 'appartient', 'previous affiliation': 'appartient',
      occupation: 'exerce', 'previous occupation': 'exerce', type: 'maitrise',
    },
  },
  'Death Note': {
    hote: 'deathnote.fandom.com',
    // `{{Human3}}` / `{{Shinigami}}` : `species` est le seul champ lié de façon fiable.
    champs: { species: 'appartient', affiliation: 'appartient', organization: 'appartient' },
  },
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

function variantesMacron(nom) {
  const paires = [['ou', 'ō'], ['oo', 'ō'], ['uu', 'ū']];
  let sorties = [nom];
  for (const [w, m] of paires) {
    const suiv = new Set();
    for (const s of sorties) {
      suiv.add(s);
      if (s.toLowerCase().includes(w)) {
        suiv.add(s.replace(new RegExp(w, 'g'), m).replace(new RegExp(w[0].toUpperCase() + w[1], 'g'), m.toUpperCase()));
      }
    }
    sorties = [...suiv].slice(0, 8);
  }
  return sorties.filter((s) => s !== nom);
}

/** CORRECTIF #1 : parcourt TOUS les gabarits de premier niveau et retient celui qui est une
 *  infobox — par son nom d'abord, par son nombre de paramètres nommés ensuite. */
export function infoboxDuWikitexte(wikitexte) {
  const gabarits = [];
  for (let i = 0; i < wikitexte.length - 1; i++) {
    if (!wikitexte.startsWith('{{', i)) continue;
    let prof = 0, j = i, fin = -1;
    for (; j < wikitexte.length - 1; j++) {
      if (wikitexte.startsWith('{{', j)) { prof++; j++; continue; }
      if (wikitexte.startsWith('}}', j)) { prof--; j++; if (!prof) { fin = j + 1; break; } }
    }
    if (fin < 0) break;
    gabarits.push(wikitexte.slice(i + 2, fin - 2));
    i = fin - 1;
  }
  let meilleur = null;
  for (const corps of gabarits) {
    const morceaux = [];
    let p2 = 0, p3 = 0, courant = '';
    for (let k = 0; k < corps.length; k++) {
      if (corps.startsWith('{{', k)) { p2++; courant += '{{'; k++; continue; }
      if (corps.startsWith('}}', k)) { p2--; courant += '}}'; k++; continue; }
      if (corps.startsWith('[[', k)) { p3++; courant += '[['; k++; continue; }
      if (corps.startsWith(']]', k)) { p3--; courant += ']]'; k++; continue; }
      if (corps[k] === '|' && !p2 && !p3) { morceaux.push(courant); courant = ''; continue; }
      courant += corps[k];
    }
    morceaux.push(courant);
    const nom = morceaux[0].trim();
    const params = {};
    for (const m of morceaux.slice(1)) {
      const eq = m.indexOf('=');
      if (eq < 0) continue;
      params[m.slice(0, eq).trim().toLowerCase()] = m.slice(eq + 1).trim();
    }
    const nb = Object.keys(params).length;
    if (!nb) continue;
    // Un gabarit de MISE EN PAGE (onglets, couleurs) n'est pas une infobox, même bien fourni.
    const misEnPage = /tab template|navbox|gradient|quotes?$/i.test(nom);
    const nomme = /infobox|character|human|shinigami|hunterpedia|character info|template \(/i.test(nom);
    const score = (nomme ? 1000 : 0) - (misEnPage ? 2000 : 0) + nb;
    if (!meilleur || score > meilleur.score) meilleur = { nom, params, score, nb };
  }
  return meilleur ?? { nom: null, params: {}, nb: 0 };
}

async function api(hote, params) {
  const url = `https://${hote}/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  const r = await fetch(url, { headers: UA });
  await new Promise((x) => setTimeout(x, 180));
  if (!r.ok) return null;
  return r.json();
}

/** Wikitexte + langlink FR, par lots de 50. Refuse en bloc les redirections de SECTION :
 *  la page atteinte parle d'un autre sujet, son infobox n'est pas celle qu'on croit. */
async function pagesDe(hote, titres) {
  const out = new Map();
  for (let i = 0; i < titres.length; i += 50) {
    const j = await api(hote, {
      action: 'query', prop: 'revisions|langlinks', rvprop: 'content', rvslots: 'main',
      lllang: 'fr', lllimit: 'max', redirects: '1', titles: titres.slice(i, i + 50).join('|'),
    });
    if (!j) continue;
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
        titre: p.title,
        texte: p.revisions?.[0]?.slots?.main?.content ?? '',
        fragment: fragment.get(dem) ?? null,
        fr: p.langlinks?.[0]?.title ?? null,
      });
    }
    process.stdout.write(`\r    ${hote} ${Math.min(i + 50, titres.length)}/${titres.length}   `);
  }
  console.log('');
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Garde d'import : ce fichier exporte WIKIS et infoboxDuWikitexte à d'autres scripts.
// Sans elle, un simple `import` relancerait tout l'audit (et ses centaines d'appels au wiki).
if (import.meta.url !== `file://${process.argv[1]}`) { /* importé comme module */ } else {
console.log('→ lecture paginée de la base…');
const entries = await page('akasha_entries', 'id, slug, name, type, universe, summary, attributes');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');
const deg = new Set();
for (const r of rels) { deg.add(r.from_entry); deg.add(r.to_entry); }
const isolees = entries.filter((e) => !deg.has(e.id));
console.log(`${entries.length} fiches · ${rels.length} arêtes · ${isolees.length} isolées`);

const rapport = {
  chantier: 'étape 2 — gisement réel des isolées JoJo/Bleach/HxH/Death Note, sonde corrigée',
  quand: new Date().toISOString(),
  base: { fiches: entries.length, aretes: rels.length, isolees: isolees.length },
  parUnivers: {},
  candidats: [],
};

for (const [univers, cfg] of Object.entries(WIKIS)) {
  const lot = isolees.filter((e) => e.universe === univers).sort((a, b) => a.slug.localeCompare(b.slug));
  if (!lot.length) continue;
  console.log(`\n════ ${univers} — ${lot.length} isolées`);

  // Index de résolution, STRICTEMENT intra-univers (jamais d'arête inter-univers).
  const idx = new Map();
  const memeUnivers = entries.filter((e) => e.universe === univers);
  for (const e of memeUnivers) {
    for (const cle of [norm(e.name), normRoman(e.name), norm(e.slug), norm(e.attributes?.roman_name)]) {
      if (!cle) continue;
      if (!idx.has(cle)) idx.set(cle, []);
      if (!idx.get(cle).some((c) => c.id === e.id)) idx.get(cle).push(e);
    }
  }
  // Le texte de chaque fiche, pour le pont anglais→français par preuve littérale.
  const texteDe = new Map(memeUnivers.map((e) => [e.id, norm(`${e.summary ?? ''} ${e.attributes?.descFr ?? ''} ${e.attributes?.descRaw ?? ''}`)]));

  // ── Saut 1 : la page de l'isolée (titre direct + variantes de romanisation)
  const candidatsTitre = new Map();
  for (const e of lot) {
    candidatsTitre.set(e.name, e);
    for (const v of variantesMacron(e.name)) if (!candidatsTitre.has(v)) candidatsTitre.set(v, e);
  }
  console.log(`  saut 1 : ${candidatsTitre.size} titres candidats`);
  const pages = await pagesDe(cfg.hote, [...candidatsTitre.keys()]);

  const compte = { sansPage: 0, sectionRefusee: 0, sansInfobox: 0, sansChampLie: 0, avecCible: 0 };
  const vus = new Set();
  const brut = [];
  for (const [titre, e] of candidatsTitre) {
    if (vus.has(e.id)) continue;
    const p = pages.get(titre);
    if (!p) continue;
    if (p.fragment) continue;              // essayé, mais une autre variante peut mieux tomber
    vus.add(e.id);
    const ib = infoboxDuWikitexte(p.texte);
    if (!ib.nb) { compte.sansInfobox++; continue; }
    let n = 0;
    for (const [champ, relation] of Object.entries(cfg.champs)) {
      for (const c of ciblesDuParametre(ib.params[champ])) { brut.push({ e, titreSource: p.titre, alias: titre !== e.name ? titre : null, champ, relation, cible: c.titre, gabarit: ib.nom }); n++; }
    }
    if (!n) compte.sansChampLie++;
  }
  for (const e of lot) {
    if (vus.has(e.id)) continue;
    const dir = pages.get(e.name);
    if (dir?.fragment) compte.sectionRefusee++; else compte.sansPage++;
  }
  console.log(`  page absente ${compte.sansPage} · redirection de section refusée ${compte.sectionRefusee} · sans infobox ${compte.sansInfobox} · infobox sans champ lié ${compte.sansChampLie} · cibles brutes ${brut.length}`);

  // ── Saut 2 : résoudre la cible anglaise vers une de NOS fiches
  const aTraduire = new Set();
  for (const b of brut) {
    const hit = idx.get(norm(b.cible)) ?? idx.get(normRoman(b.cible));
    if (hit?.length === 1) { b.vers = hit[0]; b.preuve = `infobox ${b.gabarit} · ${b.champ} = [[${b.cible}]] sur ${cfg.hote}/wiki/${encodeURIComponent(b.titreSource)} · nom identique en base`; }
    else if (hit?.length > 1) b.echec = `homonyme en base (${hit.map((h) => h.type).join('/')})`;
    else aTraduire.add(b.cible);
  }
  console.log(`  saut 2 (nom identique) : ${brut.filter((b) => b.vers).length} · ${aTraduire.size} titres à ponter vers le français`);

  // ── Saut 3 : pont anglais→français, PROUVÉ (jamais traduit au jugé)
  //   (a) le wiki porte lui-même un lien interlangue fr
  //   (b) le rōmaji/kana de la page cible se retrouve MOT POUR MOT dans notre texte français
  //   (c) le titre anglais se retrouve MOT POUR MOT dans notre texte français
  const pagesCibles = aTraduire.size ? await pagesDe(cfg.hote, [...aTraduire]) : new Map();
  const pont = new Map();
  for (const [t, p] of pagesCibles) {
    if (!p || p.fragment) continue;
    const ib = infoboxDuWikitexte(p.texte);
    const romaji = String(ib.params['rōmaji'] ?? ib.params.romaji ?? ib.params.rname ?? ib.params.romanji ?? '')
      .replace(/'{2,}/g, '').replace(/<[^>]+>/g, '').split(/[;(]/)[0].trim();
    for (const e of memeUnivers) {
      if (e.type === 'character') continue;                      // une appartenance n'est pas une personne
      const txt = texteDe.get(e.id) ?? '';
      let voie = null, preuve = null;
      if (p.fr && norm(p.fr) === norm(e.name)) { voie = 'lien interlangue'; preuve = `${cfg.hote} déclare le lien interlangue fr : « ${p.titre} » → « ${p.fr} »`; }
      else if (romaji.length > 3 && txt.includes(norm(romaji))) { voie = 'rōmaji retrouvé dans notre texte'; preuve = `l'infobox de « ${p.titre} » donne rōmaji « ${romaji} », présent mot pour mot dans le texte de « ${e.name} »`; }
      else if (t.length > 4 && txt.includes(norm(t))) { voie = 'titre anglais retrouvé dans notre texte'; preuve = `« ${t} » apparaît mot pour mot dans le texte de « ${e.name} »`; }
      if (voie) { pont.set(t, { e, voie, preuve }); break; }
    }
  }
  for (const b of brut) {
    if (b.vers || b.echec) continue;
    const p = pont.get(b.cible);
    if (p) { b.vers = p.e; b.preuve = `infobox ${b.gabarit} · ${b.champ} = [[${b.cible}]] sur ${cfg.hote}/wiki/${encodeURIComponent(b.titreSource)} · pont ${p.voie} : ${p.preuve}`; }
    else b.echec = pagesCibles.get(b.cible) ? 'cible sans équivalent en base' : 'page cible absente';
  }

  // ── Gardes : pas de cible personnage, pas d'auto-arête, pas de doublon d'arête existante
  const dejaLa = new Set(rels.map((r) => `${r.from_entry}>${r.to_entry}>${r.relation}`));
  const retenus = [];
  for (const b of brut) {
    if (!b.vers) continue;
    if (b.vers.type === 'character') { b.echec = `cible personne refusée (${b.vers.name})`; continue; }
    if (b.vers.id === b.e.id) { b.echec = 'auto-arête'; continue; }
    if (dejaLa.has(`${b.e.id}>${b.vers.id}>${b.relation}`)) { b.echec = 'arête déjà posée'; continue; }
    retenus.push(b);
  }
  const uniques = new Map(retenus.map((b) => [`${b.e.id}>${b.vers.id}>${b.relation}`, b]));
  const fichesSorties = new Set([...uniques.values()].map((b) => b.e.id));
  console.log(`  RETENU : ${uniques.size} arêtes · ${fichesSorties.size}/${lot.length} isolées sortiraient de l'isolement`);
  for (const b of [...uniques.values()].slice(0, 25)) {
    console.log(`    · ${b.e.name} --${b.relation}--> ${b.vers.name} (${b.vers.type})   [${b.champ}${b.alias ? ' · alias ' + b.alias : ''}]`);
  }
  const echecs = {};
  for (const b of brut) if (b.echec) echecs[b.echec.replace(/\(.*\)/, '(…)')] = (echecs[b.echec.replace(/\(.*\)/, '(…)')] ?? 0) + 1;
  console.log(`  échecs :`, Object.entries(echecs).sort((a, b2) => b2[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' · ') || '—');

  rapport.parUnivers[univers] = {
    hote: cfg.hote, isolees: lot.length, ...compte, ciblesBrutes: brut.length,
    aretesRetenues: uniques.size, isoleesSorties: fichesSorties.size, echecs,
  };
  for (const b of uniques.values()) {
    rapport.candidats.push({
      univers, deSlug: b.e.slug, de: b.e.name, deType: b.e.type,
      relation: b.relation, versSlug: b.vers.slug, vers: b.vers.name, versType: b.vers.type,
      champ: b.champ, gabarit: b.gabarit, titreWiki: b.titreSource, aliasRomanisation: b.alias, preuve: b.preuve,
    });
  }
}

const total = rapport.candidats.length;
const fiches = new Set(rapport.candidats.map((c) => c.deSlug)).size;
console.log(`\n╔══ TOTAL : ${total} arêtes candidates · ${fiches} isolées sortiraient`);

const sortie = path.join(ROOT, `data/audits/isolees-gisement-4univers-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(sortie, JSON.stringify(rapport, null, 1));
console.log(`trace : ${path.relative(ROOT, sortie)}`);
}
