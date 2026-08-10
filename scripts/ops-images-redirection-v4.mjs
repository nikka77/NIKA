// scripts/ops-images-redirection-v4.mjs — LA REDIRECTION, QUAND LE FICHIER PORTE NOTRE NOM.
//
// ══════════════════ LE REFUS QU'ON ROUVRE, ET AVEC QUOI ══════════════════
// Les trois connecteurs précédents refusent tous la redirection comme témoin d'identité, et ils ont
// raison de le faire : « le wiki redirige X vers Y » dit que la page Y COUVRE notre entité, pas que
// l'IMAGE de Y la représente. Le connecteur anglophone cite ses cas d'école — « Katen Kyōkotsu »
// (un zanpakutō) redirige vers « Shunsui Kyōraku » et rapportait le portrait du porteur ; les
// quatre transformations de Chopper retombaient toutes sur « Hito Hito no Mi » et recevaient
// l'image du fruit.
//
// Ce script ne rouvre PAS la redirection comme témoin. Il en ajoute un SECOND, indépendant, qui
// répond exactement à l'objection : le NOM DU FICHIER d'infobox de la page d'arrivée doit contenir
// NOTRE nom. C'est le wiki lui-même qui l'a nommé ainsi.
//
// ÉPROUVÉ SUR LES CAS FAUX (leçon du 01/08 : un garde-fou non éprouvé sur des cas FAUX ne prouve
// rien). Les huit pièges connus, interrogés le 10/08 :
//   « Katen Kyōkotsu » → Shunsui Kyōraku · Ep375ShunsuiProfile.png ......... ne porte pas notre nom
//   « Guard/Monster/Arm/Horn Point » → Hito Hito no Mi · Hito_Hito_no_Mi_Infobox.png ..... non
//   « Zabimaru » → Renji Abarai · 685Renji_profile.png ..................... non
//   « Ace » → Portgas D. Ace · Portgas_D._Ace_Anime_Infobox.png ............ non (voir ci-dessous)
// Aucun ne passe. Le cas « Ace » ne passe QUE grâce au plancher de longueur : « ace » est contenu
// dans « portgasdaceanimeinfobox ». Ce plancher (nom plié > 5 caractères) est donc porteur, pas
// décoratif — le retirer ferait poser le portrait d'un homme sur la fiche d'un sabre.
//
// RENDEMENT MESURÉ : sur les 592 fiches sans page à titre égal, 124 atteignent une page par
// redirection ou normalisation, 26 de ces pages nomment un fichier dans leur infobox, et 4 de ces
// fichiers portent notre nom. Quatre. C'est peu, et c'est le prix d'un témoin qui ne se trompe pas.
//
// N'écrit QUE `image_url`, jamais par-dessus une valeur existante.
//
// Usage :
//   node --env-file=.env.local scripts/ops-images-redirection-v4.mjs --dry
//   node --env-file=.env.local scripts/ops-images-redirection-v4.mjs
import { writeFile, mkdir } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';
import { dimensions, idFichier } from './lib/image-octets.mjs';

const DRY = process.argv.includes('--dry');
const AUDITS = new URL('../data/audits/', import.meta.url).pathname;
const HORO = new Date().toISOString().replace(/[:.]/g, '-');
const TRACE = `${AUDITS}redirection-v4-trace-${HORO}.json`;
const RAPPORT = `${AUDITS}redirection-v4-${HORO}.json`;
const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative ; contact : tulbured06@gmail.com)' };
const LOT = 20, PAUSE_MS = 280, PLAFOND = 300 * 1024, ECHELLE = [720, 480];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ko = (n) => `${(n / 1024).toFixed(0)} Ko`;

const API_FR = {
  'One Piece': 'https://onepiece.fandom.com/fr/api.php', 'Naruto': 'https://naruto.fandom.com/fr/api.php',
  'Bleach': 'https://bleach.fandom.com/fr/api.php', 'Dragon Ball': 'https://dragonball.fandom.com/fr/api.php',
  "JoJo's Bizarre Adventure": 'https://jjba.fandom.com/fr/api.php', 'Death Note': 'https://deathnote.fandom.com/fr/api.php',
};
const API_EN = {
  'One Piece': 'https://onepiece.fandom.com/api.php', 'Naruto': 'https://naruto.fandom.com/api.php',
  'Bleach': 'https://bleach.fandom.com/api.php', 'Dragon Ball': 'https://dragonball.fandom.com/api.php',
  "JoJo's Bizarre Adventure": 'https://jojo.fandom.com/api.php', 'Death Note': 'https://deathnote.fandom.com/api.php',
  'Initial D': 'https://initiald.fandom.com/api.php',
};

const colle = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const FICHIER_PARASITE = /(site-?logo|wordmark|favicon|placeholder|no[-_ ]?image|no[-_ ]?pic(?:ture)?[-_ ]?avail(?:able)?|nophoto|question[-_ ]?mark|spoiler|under[-_ ]?construction|stub|ambox|icon[-_ ]?wiki|image[-_ ]?non[-_ ]?disponible|camera[-_ ]?font[-_ ]?awesome|nature[-_ ]?icon|gender[-_ ](male|female)|disambig)/i;
const HOTE_ATTENDU = 'static.wikia.nocookie.net';
const CLE_IMAGE = /^\s*\|\s*([A-Za-zÀ-ÿ0-9_ -]*(?:image|photo|img)[A-Za-z0-9_ -]*)\s*=\s*(.*)$/gim;
const EXT = /\.(png|jpe?g|gif|webp|svg)$/i;
const rasteriseSvg = (u, px) => /\.svg\/revision\/latest(?!\/scale-to-width-down)/i.test(u)
  ? u.replace(/(\.svg\/revision\/latest)/i, `$1/scale-to-width-down/${px}`) : u;

function imageDeLInfobox(wt) {
  for (const m of String(wt ?? '').matchAll(CLE_IMAGE)) {
    const val = m[2].trim(); if (!val) continue;
    const lien = /\[\[\s*(?:File|Fichier|Image)\s*:\s*([^|\]]+?)\s*[|\]]/i.exec(val)
      ?? /(?:File|Fichier|Image)\s*:\s*([^|\]\n<]+)/i.exec(val);
    const nom = (lien ? lien[1] : val.split('|')[0]).trim().replace(/^\[+|\]+$/g, '');
    if (nom && EXT.test(nom) && !/\{\{|\}\}/.test(nom)) return { fichier: nom, preuve: m[0].trim().slice(0, 200) };
  }
  return null;
}
async function interroger(u) {
  let dernier = 'inconnu';
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`${u}&maxlag=5&format=json&formatversion=2`, { headers: UA, signal: AbortSignal.timeout(30_000) });
      if (!r.ok) { dernier = `HTTP ${r.status}`; await sleep(700 * (i + 1)); continue; }
      const j = await r.json();
      if (j?.error) { dernier = j.error.code; await sleep(700 * (i + 1)); continue; }
      if (j?.query) return { ok: true, q: j.query };
    } catch (e) { dernier = String(e?.name ?? e).slice(0, 50); await sleep(700 * (i + 1)); }
  }
  return { ok: false, motif: dernier };
}
async function telecharger(url) {
  let dernier = 'inconnu';
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(40_000) });
      if (!r.ok) { dernier = `HTTP ${r.status}`; await sleep(900 * (i + 1)); continue; }
      const buf = await r.arrayBuffer();
      const d = dimensions(buf);
      if (!d) return { octets: buf.byteLength, illisible: true };
      return { octets: buf.byteLength, d };
    } catch (e) { dernier = String(e?.message ?? e).slice(0, 50); await sleep(900 * (i + 1)); }
  }
  return { panne: dernier };
}

/* ═════ 1. L'ÉTAT (paginé) ═════ */
const site = clientSite();
let toutes = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await site.from('akasha_entries')
    .select('id,slug,name,type,universe,image_url').order('slug').range(de, de + 999);
  if (error) { console.error('✗ lecture :', error.message); process.exit(1); }
  toutes = toutes.concat(data ?? []);
  if ((data ?? []).length < 1000) break;
}
const parFichier = new Map();
for (const e of toutes) {
  if (!e.image_url) continue;
  const k = idFichier(e.image_url);
  if (!parFichier.has(k)) parFichier.set(k, []);
  parFichier.get(k).push(e);
}
const fiches = toutes.filter((e) => !e.image_url && (API_FR[e.universe] || API_EN[e.universe]));
console.log(`${toutes.length} fiches · ${fiches.length} sans visuel · ${parFichier.size} fichiers déjà portés\n`);

await mkdir(AUDITS, { recursive: true });
await writeFile(TRACE, JSON.stringify({
  chantier: 'images — redirection + le fichier porte notre nom (vague 4)',
  pris_le: new Date().toISOString(), mode: DRY ? 'à blanc' : 'application', colonne: 'image_url',
  candidats: fiches.length,
  avant: fiches.map((f) => ({ slug: f.slug, universe: f.universe, type: f.type, name: f.name, image_url: f.image_url })),
}, null, 1));
console.log(`trace d'avant : ${TRACE} (${fiches.length} lignes)\n`);

/* ═════ 2. SUIVRE LA REDIRECTION, LIRE LE NOM DU FICHIER ═════ */
const verdicts = new Map();
const enAttente = new Map(fiches.map((f) => [f.slug, f]));
let pagesAtteintes = 0, avecFichier = 0;

for (const [lang, table] of [['fr', API_FR], ['en', API_EN]]) {
  const parU = new Map();
  for (const f of enAttente.values()) {
    if (!table[f.universe]) continue;
    if (!parU.has(f.universe)) parU.set(f.universe, []);
    parU.get(f.universe).push(f);
  }
  for (const [uni, liste] of parU) {
    console.log(`${lang} · ${uni} : ${liste.length} fiche(s)`);
    for (let i = 0; i < liste.length; i += LOT) {
      const lot = liste.slice(i, i + LOT);
      const r = await interroger(`${table[uni]}?action=query&prop=revisions&rvprop=content&rvslots=main`
        + `&redirects=1&titles=${encodeURIComponent(lot.map((f) => f.name).join('|'))}`);
      await sleep(PAUSE_MS);
      if (!r.ok) continue;                       // PANNE ≠ ABSENCE
      const norm = new Map((r.q.normalized ?? []).map((n) => [n.from, n.to]));
      const redir = new Map((r.q.redirects ?? []).map((x) => [x.from, x.to]));
      const pages = new Map((r.q.pages ?? []).map((p) => [p.title, p]));
      for (const f of lot) {
        let t = norm.get(f.name) ?? f.name; const vus = new Set();
        while (redir.has(t) && !vus.has(t)) { vus.add(t); t = redir.get(t); }
        const p = pages.get(t);
        if (!p || p.missing) continue;
        pagesAtteintes++;
        const img = imageDeLInfobox(p.revisions?.[0]?.slots?.main?.content ?? '');
        if (!img) continue;
        avecFichier++;
        // LE TÉMOIN — le fichier porte NOTRE nom. Plancher de longueur porteur (cas « Ace »).
        if (colle(f.name).length <= 5 || !colle(img.fichier).includes(colle(f.name))) continue;
        verdicts.set(f.slug, { etat: 'candidat', lang, api: table[uni], titre: p.title,
          fichier: img.fichier, preuve_wikitext: img.preuve,
          preuve_temoin: `le fichier d'infobox de « ${p.title} » s'appelle « ${img.fichier} » et contient notre nom « ${f.name} »` });
        enAttente.delete(f.slug);
      }
    }
  }
}
const candidats = [...verdicts.entries()];
console.log(`\n${pagesAtteintes} page(s) atteinte(s) · ${avecFichier} avec un fichier d'infobox · ${candidats.length} dont le fichier porte notre nom\n`);

/* ═════ 3. LES GARDES ═════ */
const parSlug = new Map(fiches.map((f) => [f.slug, f]));
for (const [slug, v] of candidats) {
  if (FICHIER_PARASITE.test(v.fichier)) { verdicts.set(slug, { ...v, etat: 'refus-parasite', motif: `« ${v.fichier} » est un carton du wiki` }); continue; }
  let retenu = null; const essais = [];
  for (const px of ECHELLE) {
    const r = await interroger(`${v.api}?action=query&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=${px}&titles=${encodeURIComponent('File:' + v.fichier)}`);
    await sleep(PAUSE_MS);
    if (!r.ok) { essais.push({ largeur: px, resultat: `panne (${r.motif})` }); continue; }
    const p = r.q.pages?.[0];
    if (!p || p.missing || !p.imageinfo?.[0]) { essais.push({ largeur: px, resultat: 'fichier inconnu du wiki' }); break; }
    const ii = p.imageinfo[0];
    const url = rasteriseSvg(ii.thumburl ?? ii.url, px);
    let hote; try { hote = new URL(url).host; } catch { essais.push({ largeur: px, resultat: 'URL illisible' }); continue; }
    if (hote !== HOTE_ATTENDU) { essais.push({ largeur: px, resultat: `hôte ${hote}` }); break; }
    const t = await telecharger(url); await sleep(160);
    if (t.panne) { essais.push({ largeur: px, resultat: `panne (${t.panne})` }); continue; }
    if (t.illisible) { essais.push({ largeur: px, resultat: `pas une image (${t.octets} o)` }); continue; }
    if (t.d.w < 80 || t.d.h < 80) { essais.push({ largeur: px, resultat: `${t.d.w}×${t.d.h} sous le plancher` }); break; }
    essais.push({ largeur: px, resultat: `${ko(t.octets)} · ${t.d.w}×${t.d.h} ${t.d.type}` });
    if (!retenu || t.octets < retenu.octets) retenu = { url, px, ...t, source: `${ii.width}×${ii.height} ${ii.mime} ${ko(ii.size)}` };
    if (t.octets <= PLAFOND) break;
  }
  v.essais = essais;
  if (!retenu) { verdicts.set(slug, { ...v, etat: 'refus-charge', motif: `aucune vignette exploitable : ${essais.map((e) => `${e.largeur}px ${e.resultat}`).join(' ; ')}` }); continue; }
  if (retenu.octets > PLAFOND) { verdicts.set(slug, { ...v, etat: 'refus-poids', motif: `${ko(retenu.octets)} même à ${retenu.px} px — au-dessus du plafond de ${ko(PLAFOND)}` }); continue; }
  const occupants = (parFichier.get(idFichier(retenu.url)) ?? []).filter((e) => e.slug !== slug);
  if (occupants.length) { verdicts.set(slug, { ...v, etat: 'refus-collision', motif: `fichier déjà porté par ${occupants.map((o) => o.slug).join(', ')}` }); continue; }
  verdicts.set(slug, { ...v, etat: 'trouve', url: retenu.url, largeur: retenu.px, octets: retenu.octets,
    definition_reelle: `${retenu.d.w}×${retenu.d.h} ${retenu.d.type}`, source: retenu.source });
}

/* ═════ 4. ÉCRITURE ═════ */
const trouves = [...verdicts.entries()].filter(([, v]) => v.etat === 'trouve');
let posees = 0, deja = 0, echecs = 0;
if (!DRY) {
  for (const [slug, v] of trouves) {
    const f = parSlug.get(slug);
    const { data, error } = await site.from('akasha_entries')
      .update({ image_url: v.url }).eq('id', f.id).is('image_url', null).select('slug');
    if (error) { echecs++; v.echec = error.message; continue; }
    if (!data?.length) { deja++; continue; }
    posees++;
  }
  console.log(`→ ${posees} posée(s) · ${deja} déjà remplie(s) · ${echecs} échec(s)`);
} else console.log('→ --dry : aucune écriture.');

await writeFile(RAPPORT, JSON.stringify({
  chantier: 'images — redirection + le fichier porte notre nom (vague 4)',
  passe_le: new Date().toISOString(), mode: DRY ? 'à blanc' : 'application',
  plafond_octets: PLAFOND,
  compte: { candidats: fiches.length, pages_atteintes: pagesAtteintes, pages_avec_fichier_infobox: avecFichier,
    fichiers_portant_notre_nom: candidats.length,
    trouves: trouves.length, refus: candidats.length - trouves.length, posees, deja, echecs },
  detail: [...verdicts.entries()].map(([slug, v]) => ({
    slug, name: parSlug.get(slug).name, type: parSlug.get(slug).type, universe: parSlug.get(slug).universe,
    etat: v.etat, wiki: v.lang, titre_wiki: v.titre, fichier: v.fichier,
    preuve_wikitext: v.preuve_wikitext, preuve_temoin: v.preuve_temoin, essais: v.essais,
    image_url: v.url ?? null, definition_reelle: v.definition_reelle ?? null, octets: v.octets ?? null,
    source: v.source ?? null, pourquoi: v.motif ?? null,
  })),
}, null, 1));
console.log(`rapport : ${RAPPORT}`);
