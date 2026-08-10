// scripts/audit-isolees-recherche-wiki.mjs — ÉTAPE 1 : POURQUOI le wiki ne répond pas.
//
// POURQUOI (10/08/2026)
// La vague 1 a compté « page absente » sur 43/49 isolées JoJo, 26/45 Bleach, 16/31 HxH, 8/11 Death
// Note, et en a conclu « rendement nul ». Mais elle n'interrogeait le wiki QUE par accès direct au
// titre `name`. Un titre qui rate ne prouve pas qu'une page manque : il prouve que le libellé
// demandé n'est pas le titre. Trois issues possibles, et il faut savoir LAQUELLE :
//   · la page existe sous un autre titre  → problème d'ALIAS, pas d'absence
//   · la page n'existe pas                → le personnage est un figurant sans article propre
//   · le wiki interrogé n'est pas le bon  → il faut changer d'hôte
//
// Cette sonde ne modifie RIEN. Elle empile quatre voies d'accès sur le MÊME wiki :
//   1. titre direct
//   2. variantes de romanisation (wapuro → macron : Toudou → Tōdō, Hyourinmaru → Hyōrinmaru)
//      — nos noms viennent de l'API MAL, qui écrit les voyelles longues en « ou/uu/oo »
//   3. list=search plein texte (la vraie recherche, jamais faite en vague 1)
//   4. lecture de la cible : page propre, ou redirection vers une SECTION d'une page agrégée
//      (Kōkichirō Takezoe → Miscellaneous Shinigami#Kōkichirō Takezoe) — la garde de la vague 1
//      refuse ces redirections, et elle a raison : l'infobox lue serait celle d'un autre.
//
// Usage : node --env-file=.env.local scripts/audit-isolees-recherche-wiki.mjs [--par-univers=15]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';
import { parametresInfobox, ciblesDuParametre } from './audit-isolees-fandom.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const ARG = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const PAR_UNIVERS = Number(ARG('par-univers', 15));
const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (audit graphe, contact tulbured06@gmail.com)' };

const WIKIS = {
  "JoJo's Bizarre Adventure": { hote: 'jojo.fandom.com', temoin: 'Jotaro Kujo', champs: ['affiliation', 'occupation', 'relatives', 'nationality'] },
  'Bleach': { hote: 'bleach.fandom.com', temoin: 'Ichigo Kurosaki', champs: ['affiliation', 'occupation', 'division', 'race', 'profession', 'previous affiliation'] },
  'Hunter x Hunter': { hote: 'hunterxhunter.fandom.com', temoin: 'Gon Freecss', champs: ['affiliation', 'occupation', 'nen type', 'type', 'previous affiliation'] },
  'Death Note': { hote: 'deathnote.fandom.com', temoin: 'Light Yagami', champs: ['affiliation', 'occupation', 'organization'] },
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

/** Normalisation stricte : casse, accents, ponctuation. */
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
/** Normalisation « romanisation-aveugle » : après avoir ôté les macrons, on replie AUSSI les
 *  voyelles doublées du wapuro, pour que « toudou » et « todo » se rencontrent. */
const normRoman = (s) => norm(s).replace(/ou/g, 'o').replace(/uu/g, 'u').replace(/oo/g, 'o').replace(/aa/g, 'a').replace(/ee/g, 'e');

/** Variantes macronisées d'un nom wapuro. Deux occurrences → 4 titres ; on plafonne à 8. */
function variantesMacron(nom) {
  const paires = [['ou', 'ō'], ['oo', 'ō'], ['uu', 'ū'], ['aa', 'ā'], ['ee', 'ē']];
  let sorties = [nom];
  for (const [wapuro, macron] of paires) {
    const suivantes = new Set();
    for (const s of sorties) {
      suivantes.add(s);
      const re = new RegExp(wapuro, 'gi');
      if (re.test(s)) {
        suivantes.add(s.replace(new RegExp(wapuro, 'g'), macron)
          .replace(new RegExp(wapuro.toUpperCase()[0] + wapuro[1], 'g'), macron.toUpperCase()));
      }
    }
    sorties = [...suivantes].slice(0, 8);
  }
  return sorties.filter((s) => s !== nom);
}

/** action=query&titles= par lots de 50 : existence, redirection, fragment de section. */
async function sonderTitres(hote, titres) {
  const out = new Map();
  for (let i = 0; i < titres.length; i += 50) {
    const lot = titres.slice(i, i + 50);
    const url = `https://${hote}/api.php?action=query&prop=info&redirects=1&format=json&formatversion=2`
      + `&titles=${encodeURIComponent(lot.join('|'))}`;
    const r = await fetch(url, { headers: UA });
    if (!r.ok) { console.error(`  ✗ titres HTTP ${r.status}`); continue; }
    const j = await r.json();
    const origine = new Map();          // titre final → titre demandé
    const fragment = new Map();         // titre demandé → "Cible#Section"
    for (const n of j.query?.normalized ?? []) origine.set(n.to, n.from);
    for (const n of j.query?.redirects ?? []) {
      const demande = origine.get(n.from) ?? n.from;
      origine.set(n.to, demande);
      if (n.tofragment) fragment.set(demande, `${n.to}#${n.tofragment}`);
    }
    for (const p of j.query?.pages ?? []) {
      const demande = origine.get(p.title) ?? p.title;
      out.set(demande, { existe: !p.missing, titreFinal: p.title, fragment: fragment.get(demande) ?? null });
    }
    await new Promise((r2) => setTimeout(r2, 200));
  }
  return out;
}

/** La vraie recherche plein texte — jamais faite en vague 1. */
async function rechercher(hote, terme) {
  const url = `https://${hote}/api.php?action=query&list=search&srnamespace=0&srlimit=6&format=json&formatversion=2`
    + `&srsearch=${encodeURIComponent(terme)}`;
  const r = await fetch(url, { headers: UA });
  if (!r.ok) return { erreur: `HTTP ${r.status}`, hits: [] };
  const j = await r.json();
  await new Promise((r2) => setTimeout(r2, 200));
  return { hits: (j.query?.search ?? []).map((h) => ({ titre: h.title, extrait: String(h.snippet ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').slice(0, 220) })) };
}

async function wikitexteDe(hote, titre) {
  const url = `https://${hote}/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1`
    + `&format=json&formatversion=2&titles=${encodeURIComponent(titre)}`;
  const r = await fetch(url, { headers: UA });
  if (!r.ok) return null;
  const j = await r.json();
  const p = j.query?.pages?.[0];
  await new Promise((r2) => setTimeout(r2, 200));
  return p?.missing ? null : (p?.revisions?.[0]?.slots?.main?.content ?? null);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('→ lecture paginée de la base…');
const entries = await page('akasha_entries', 'id, slug, name, type, universe, attributes');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');
const deg = new Set();
for (const r of rels) { deg.add(r.from_entry); deg.add(r.to_entry); }
const isolees = entries.filter((e) => !deg.has(e.id));
console.log(`${entries.length} fiches · ${rels.length} arêtes · ${isolees.length} isolées`);

const rapport = {
  chantier: 'étape 1 — pourquoi le wiki ne répond pas aux isolées de JoJo/Bleach/HxH/Death Note',
  quand: new Date().toISOString(),
  base: { fiches: entries.length, aretes: rels.length, isolees: isolees.length },
  parUnivers: {},
};

for (const [univers, cfg] of Object.entries(WIKIS)) {
  const lot = isolees.filter((e) => e.universe === univers).sort((a, b) => a.slug.localeCompare(b.slug));
  if (!lot.length) continue;

  // Échantillon ÉTALÉ (un sur n) plutôt que la tête de liste : la tête de liste alphabétique
  // sur-représente un même arc ou une même famille de libellés.
  const pas = Math.max(1, Math.floor(lot.length / PAR_UNIVERS));
  const ech = [];
  for (let i = 0; i < lot.length && ech.length < PAR_UNIVERS; i += pas) ech.push(lot[i]);

  console.log(`\n════ ${univers} — ${lot.length} isolées, échantillon de ${ech.length} sur ${cfg.hote}`);

  // TÉMOIN : le wiki répond-il seulement ? (la vague 1 a soupçonné le mauvais hôte pour JoJo)
  const temoin = await sonderTitres(cfg.hote, [cfg.temoin]);
  const tOk = temoin.get(cfg.temoin)?.existe ?? false;
  console.log(`  témoin « ${cfg.temoin} » : ${tOk ? 'SERVI' : 'ABSENT'} → le wiki ${tOk ? 'est joignable' : 'ne répond pas'}`);

  // Voie 1+2 : titre direct et variantes de romanisation, en un seul lot.
  const candidats = new Map();          // titre candidat → fiche
  for (const e of ech) {
    candidats.set(e.name, e);
    for (const v of variantesMacron(e.name)) if (!candidats.has(v)) candidats.set(v, e);
  }
  const sondes = await sonderTitres(cfg.hote, [...candidats.keys()]);

  const resultats = [];
  for (const e of ech) {
    const mesCandidats = [...candidats.entries()].filter(([, f]) => f.id === e.id).map(([t]) => t);
    const direct = sondes.get(e.name);
    const variante = mesCandidats.filter((t) => t !== e.name).map((t) => ({ t, s: sondes.get(t) })).find((x) => x.s?.existe);

    const res = { slug: e.slug, nom: e.name, type: e.type, candidatsTestes: mesCandidats };
    if (direct?.existe && !direct.fragment) {
      res.issue = 'PAGE PROPRE au titre exact';
      res.titreWiki = direct.titreFinal;
    } else if (direct?.existe && direct.fragment) {
      res.issue = 'REDIRECTION DE SECTION (titre exact)';
      res.titreWiki = direct.fragment;
    } else if (variante && !variante.s.fragment) {
      res.issue = 'ALIAS ROMANISATION → page propre';
      res.titreWiki = variante.s.titreFinal;
      res.aliasTrouve = variante.t;
    } else if (variante && variante.s.fragment) {
      res.issue = 'ALIAS ROMANISATION → redirection de section';
      res.titreWiki = variante.s.fragment;
      res.aliasTrouve = variante.t;
    } else {
      // Voie 3 : la recherche plein texte, le point aveugle de la vague 1.
      const rech = await rechercher(cfg.hote, e.name);
      res.recherche = rech.hits;
      const exact = rech.hits.find((h) => normRoman(h.titre) === normRoman(e.name));
      const contient = rech.hits.find((h) => normRoman(h.titre).includes(normRoman(e.name)) || normRoman(e.name).includes(normRoman(h.titre)));
      if (exact) { res.issue = 'ALIAS (titre retrouvé par recherche)'; res.titreWiki = exact.titre; }
      else if (contient) { res.issue = 'TITRE APPARENTÉ (à confirmer)'; res.titreWiki = contient.titre; }
      else if (rech.hits.length) { res.issue = 'MENTION SEULE (aucun article propre)'; res.titreWiki = null; res.mentionDans = rech.hits[0].titre; res.preuve = rech.hits[0].extrait; }
      else { res.issue = 'INTROUVABLE (0 résultat de recherche)'; res.titreWiki = null; }
    }
    resultats.push(res);
    console.log(`   · ${e.name.padEnd(30)} → ${res.issue}${res.titreWiki ? '  [' + res.titreWiki + ']' : ''}`);
  }

  // Voie 4 : pour les pages PROPRES atteintes, l'infobox porte-t-elle un champ exploitable ?
  // Sans ça, un alias réparé ne rapporte rien — c'est la différence entre un gisement et un mirage.
  for (const r of resultats) {
    if (!r.titreWiki || r.issue.includes('SECTION') || r.issue.includes('MENTION')) continue;
    const wt = await wikitexteDe(cfg.hote, r.titreWiki);
    if (!wt) { r.infobox = 'page illisible'; continue; }
    const params = parametresInfobox(wt);
    const utiles = {};
    for (const c of cfg.champs) {
      const cibles = ciblesDuParametre(params[c]);
      if (cibles.length) utiles[c] = cibles.map((x) => x.titre + (x.ancre ? '#' + x.ancre : ''));
    }
    r.infoboxParams = Object.keys(params).length;
    r.champsUtiles = utiles;
    r.infobox = Object.keys(utiles).length ? `PORTE ${Object.keys(utiles).length} champ(s) à liens` : (Object.keys(params).length ? 'infobox sans champ de rattachement' : 'aucune infobox');
  }

  const compte = {};
  for (const r of resultats) compte[r.issue] = (compte[r.issue] ?? 0) + 1;
  const avecChamp = resultats.filter((r) => r.champsUtiles && Object.keys(r.champsUtiles).length).length;
  console.log(`  ── issues : ${Object.entries(compte).map(([k, v]) => `${k}=${v}`).join(' · ')}`);
  console.log(`  ── infobox exploitable : ${avecChamp}/${ech.length}`);

  rapport.parUnivers[univers] = {
    hote: cfg.hote, temoinServi: tOk, isolees: lot.length, echantillon: ech.length,
    issues: compte, infoboxExploitable: avecChamp, detail: resultats,
  };
}

const sortie = path.join(ROOT, `data/audits/isolees-recherche-wiki-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(sortie, JSON.stringify(rapport, null, 1));
console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);
