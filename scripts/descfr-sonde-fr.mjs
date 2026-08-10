// scripts/descfr-sonde-fr.mjs — SONDE (lecture seule) : le wiki FRANCOPHONE a-t-il nos 454 fiches ?
//
// POURQUOI. `scripts/lib/fandom.mjs` interroge le wiki ANGLOPHONE : sa matière est en anglais, donc
// inutilisable pour `descFr` sans traduire — et traduire, ce serait fabriquer de la connaissance.
// Chaque univers a un wiki francophone (onepiece.fandom.com/fr…) où la matière est DÉJÀ en français.
//
// Cette sonde N'ÉCRIT RIEN. Elle mesure, avant d'écrire quoi que ce soit :
//   · l'hôte FR répond-il (témoin par univers — leçon du 10/08 : un rendement nul mesure d'abord
//     l'extracteur, pas la source) ;
//   · combien de nos noms sont des titres FR exacts, et par quelle route ;
//   · ce que les gardes refuseraient.
//
// Usage : node --env-file=.env.local scripts/descfr-sonde-fr.mjs [nombre] [--tout]
import { writeFile } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';
import {
  cleanWikitext, sameEntityName, sameEntityBySlug, titreStrictementEgal,
  pageDOeuvre, pagePlusGenerale, libelleNu,
} from './lib/fandom.mjs';

const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative ; contact : tulbured06@gmail.com)' };
const API_FR = {
  'One Piece': 'https://onepiece.fandom.com/fr/api.php',
  'Naruto': 'https://naruto.fandom.com/fr/api.php',
  'Bleach': 'https://bleach.fandom.com/fr/api.php',
  'Dragon Ball': 'https://dragonball.fandom.com/fr/api.php',
  'Initial D': 'https://initiald.fandom.com/fr/api.php',
};
// Témoin par univers : si LUI ne répond pas, c'est l'hôte ou la route qui est en cause, pas nos noms.
const TEMOIN = {
  'One Piece': 'Monkey D. Luffy', 'Naruto': 'Naruto Uzumaki', 'Bleach': 'Ichigo Kurosaki',
  'Dragon Ball': 'Son Goku', 'Initial D': 'Takumi Fujiwara',
};

const dort = (ms) => new Promise((s) => setTimeout(s, ms));
async function jget(u, essais = 3) {
  for (let i = 0; i < essais; i++) {
    try {
      const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(25_000) });
      if (r.status === 429 || r.status >= 500) { await dort(1200 * (i + 1)); continue; }
      if (!r.ok) return null;
      return await r.json();
    } catch { await dort(800 * (i + 1)); }
  }
  return null;
}

const parseUrl = (api, t) =>
  `${api}?action=parse&page=${encodeURIComponent(t)}&prop=wikitext%7Csections&redirects=1&format=json&formatversion=2`;

// ── 0. TÉMOINS ────────────────────────────────────────────────────────────────────────────────
console.log('TÉMOINS (l\'hôte FR répond-il ?)');
const temoins = {};
for (const [u, api] of Object.entries(API_FR)) {
  const j = await jget(parseUrl(api, TEMOIN[u]));
  const ok = Boolean(j?.parse?.wikitext);
  temoins[u] = { titre: TEMOIN[u], repond: ok, titreRendu: j?.parse?.title ?? null,
    octets: j?.parse?.wikitext?.length ?? 0 };
  console.log(`  ${ok ? '✓' : '✗'} ${u.padEnd(14)} ${TEMOIN[u].padEnd(18)} → ${j?.parse?.title ?? '(rien)'} (${j?.parse?.wikitext?.length ?? 0} o)`);
  await dort(200);
}

// ── 1. POPULATION ─────────────────────────────────────────────────────────────────────────────
const s = clientSite();
const PAS = 1000;
const lignes = [];
for (let d = 0; ; d += PAS) {
  const { data, error } = await s.from('akasha_entries')
    .select('id,slug,name,type,universe,summary,attributes').order('id').range(d, d + PAS - 1);
  if (error) throw new Error(`lecture @${d} : ${error.message}`);
  lignes.push(...(data ?? []));
  if (!data || data.length < PAS) break;
}
const vide = (x) => typeof x !== 'string' || !x.trim();
const cible = lignes.filter((l) => vide(l.attributes?.descFr) && API_FR[l.universe]);
console.log(`\ncorpus ${lignes.length} · sans descFr sur univers à wiki FR : ${cible.length}`);

const TOUT = process.argv.includes('--tout');
const N = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 30);
// Échantillon RÉPARTI sur les univers et les types : un échantillon pris en tête de liste ne
// mesure que la première famille de fiches (leçon du 08/08 sur la fiche de référence).
const cas = TOUT ? cible : (() => {
  const parClasse = new Map();
  for (const l of cible) {
    const k = `${l.universe}|${l.type}`;
    parClasse.set(k, [...(parClasse.get(k) ?? []), l]);
  }
  const files = [...parClasse.values()];
  const out = [];
  for (let i = 0; out.length < Math.min(N, cible.length); i++) {
    let pris = false;
    for (const f of files) if (f[i]) { out.push(f[i]); pris = true; if (out.length >= N) break; }
    if (!pris) break;
  }
  return out;
})();
console.log(`sonde sur ${cas.length} fiche(s)\n`);

// ── 2. RÉSOLUTION FR, DEUX ROUTES DIRECTES ────────────────────────────────────────────────────
/** Le wikitexte d'un titre sur le wiki FR, ou null. */
async function pageFr(api, titre) {
  const j = await jget(parseUrl(api, titre));
  if (!j?.parse?.wikitext) return null;
  return {
    titre: j.parse.title ?? titre,
    wikitext: j.parse.wikitext,
    redirections: (j.parse.redirects ?? []).map((r) => ({ from: r.from, to: r.to, tofragment: r.tofragment })),
    sections: (j.parse.sections ?? []).map((x) => String(x.line ?? '')),
  };
}

/** Chapeau d'article : tout ce qui précède le premier titre de section. C'est la définition que
 *  le wiki donne de son sujet. On le prend TEL QUEL (nettoyé du wikicode) — on ne rédige rien. */
function chapeau(wikitext) {
  const i = wikitext.search(/^\s*=={1,}/m);
  return cleanWikitext(i > 0 ? wikitext.slice(0, i) : wikitext);
}

const res = [];
for (const c of cas) {
  const api = API_FR[c.universe];
  const r = { slug: c.slug, name: c.name, universe: c.universe, type: c.type };
  let p = await pageFr(api, c.name);
  r.route = p ? 'titre-exact' : null;
  if (!p) {
    const parSlug = String(c.slug).replace(/-/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase());
    if (libelleNu(parSlug) !== libelleNu(c.name)) {
      p = await pageFr(api, parSlug);
      if (p) r.route = 'slug';
    }
  }
  if (!p) { r.etat = 'sans-page-fr'; res.push(r); await dort(180); continue; }

  r.titreFr = p.titre;
  r.redirections = p.redirections;
  r.sections = p.sections.slice(0, 8);
  const texte = chapeau(p.wikitext);
  r.chapeauLong = texte.length;
  r.chapeau = texte.slice(0, 420);

  // GARDES (celles déjà payées, reprises telles quelles depuis scripts/lib/fandom.mjs)
  r.identite = titreStrictementEgal(c.name, p.titre) ? 'titre-egal'
    : sameEntityName(c.name, p.titre) ? 'meme-nom'
      : sameEntityBySlug(c.slug, p.titre) ? 'slug' : 'aucune';
  r.fragment = p.redirections.some((x) => x.tofragment) ? p.redirections.find((x) => x.tofragment) : null;
  r.oeuvre = pageDOeuvre(p.titre, texte);
  r.plusGenerale = pagePlusGenerale(c.name, p.titre, { redirections: p.redirections, sections: p.sections });
  r.etat = r.identite === 'aucune' ? 'identite-refusee'
    : r.fragment ? 'redirection-de-section'
      : r.oeuvre ? 'page-oeuvre'
        : r.plusGenerale ? 'page-plus-generale'
          : texte.length < 80 ? 'chapeau-trop-court' : 'retenu';
  res.push(r);
  await dort(180);
}

// ── 3. UNE PAGE RÉCLAMÉE PAR PLUSIEURS DE NOS FICHES ──────────────────────────────────────────
const parPage = new Map();
for (const r of res.filter((x) => x.titreFr)) {
  const k = `${r.universe}|${libelleNu(r.titreFr)}`;
  parPage.set(k, [...(parPage.get(k) ?? []), r.slug]);
}
const disputees = [...parPage.entries()].filter(([, v]) => v.length > 1);
for (const [k, v] of disputees) for (const r of res) if (v.includes(r.slug)) r.etat = 'page-disputee';

// ── 4. RAPPORT ────────────────────────────────────────────────────────────────────────────────
const compte = {};
for (const r of res) compte[r.etat] = (compte[r.etat] ?? 0) + 1;
console.log('états :', compte);
console.log('pages disputées :', disputees.length, disputees.slice(0, 6).map(([k, v]) => `${k} ← ${v.join(', ')}`));

const chemin = `data/audits/descfr-sonde-fr-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
await writeFile(new URL(`../${chemin}`, import.meta.url), JSON.stringify({
  chantier: 'sonde wiki FR pour descFr', quand: new Date().toISOString(),
  temoins, corpus: lignes.length, cible: cible.length, sonde: cas.length, compte,
  disputees: disputees.map(([k, v]) => ({ page: k, fiches: v })), cas: res,
}, null, 1));
console.log(`trace → ${chemin}`);
