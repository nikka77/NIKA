// scripts/ops-images-infobox-v4.mjs — QUAND `pageimages` SE TAIT, ON RELIT L'ARTICLE.
//
// ══════════════════ POURQUOI UNE QUATRIÈME PASSE ══════════════════
// Les trois connecteurs précédents demandent tous la même chose au wiki : `prop=pageimages`, qui
// rend l'image que l'extension PageImages a ÉLUE pour l'article. Sur les 779 fiches encore sans
// visuel le 10/08 à 13 h, 171 sont classées « la page existe mais n'a pas d'image d'infobox ».
// Ce verdict lit un SILENCE comme une absence : PageImages peut ne rien élire alors que l'article
// porte bel et bien une image dans son infobox. Sondé sur 20 cas répartis (trace :
// data/audits/infobox-sonde-*.json), le silence est justifié 19 fois — et faux une fois :
// « Île Confiture » porte `image = [[Fichier:Ile Confiture_Infobox.png|270px]]`, que `pageimages`
// ne rend pas. Un cas sur vingt, c'est peu ; ce n'est pas rien, et ça ne coûte qu'une relecture.
//
// ══════════════════ ON LIT L'INFOBOX, PAS « LES FICHIERS DE LA PAGE » ══════════════════
// La tentation serait de prendre `prop=images` (tous les fichiers employés par l'article). C'est
// exactement ce qu'il ne faut pas faire, et le sondage le montre : les pages de jutsu Naruto sans
// illustration emploient `Camera font awesome.svg` (le carton « pas d'image » du wiki, dans une
// forme que la liste FICHIER_PARASITE existante ne connaît pas), `Nature Icon Lightning.svg`
// (l'icône d'élément), `Gender Male.svg`, `Disambig gray.svg` ; les attaques Dragon Ball emploient
// `Divination.png`. Poser l'un de ces fichiers, c'est illustrer une technique avec un pictogramme
// d'appareil photo. On n'accepte donc QUE le fichier nommé par un paramètre d'image de l'infobox,
// et la ligne de wikitext qui le nomme est consignée comme PHRASE-PREUVE à côté de la valeur.
//
// ══════════════════ LES GARDES, TOUTES REPRISES, AUCUNE INVENTÉE ══════════════════
//  · IDENTITÉ  — égalité stricte du nom plié et du titre FINAL (après redirection), comme le
//    connecteur francophone. Pas d'inclusion de mots : c'est elle qui a fait passer « Ace » pour
//    « Portgas D. Ace » et posé le portrait d'un homme sur la fiche d'un sabre.
//  · NATURE    — une page de personnage ne va pas sur une fiche qui n'en est pas un (catégories).
//  · PARASITE  — liste des cartons de maintenance, ÉTENDUE aux quatre formes trouvées ici
//    (camera font awesome, nature icon, gender, disambig, divination, site-navigation…).
//  · G4        — le nom du fichier doit partager un mot avec le titre de la page.
//  · COLLISION — un fichier déjà porté par une fiche illustrée est refusé : illustrer un doublon,
//    c'est le faire passer pour complet et le soustraire au tri qui doit le fusionner.
//  · ADRESSE   — jamais devinée : `prop=imageinfo` rend l'URL de la vignette, `?cb=` compris.
//  · CHARGE    — on télécharge et on lit la définition DANS LES OCTETS (le CDN sert son carton
//    d'erreur en HTTP 200), et on respecte le plafond de 300 Ko en descendant 720 → 480.
//
// N'écrit QUE `image_url`, jamais `attributes`, jamais par-dessus une valeur existante.
//
// Usage :
//   node --env-file=.env.local scripts/ops-images-infobox-v4.mjs --dry
//   node --env-file=.env.local scripts/ops-images-infobox-v4.mjs
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';
import { pageDOeuvre, pagePlusGenerale } from './lib/fandom.mjs';
import { dimensions, idFichier } from './lib/image-octets.mjs';

const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const DRY = process.argv.includes('--dry');
const LIMIT = Number(arg('limit', Infinity));
const AUDITS = new URL('../data/audits/', import.meta.url).pathname;
const HORO = new Date().toISOString().replace(/[:.]/g, '-');
const TRACE = `${AUDITS}infobox-v4-trace-${HORO}.json`;
const RAPPORT = `${AUDITS}infobox-v4-${HORO}.json`;

const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative ; contact : tulbured06@gmail.com)' };
const LOT = 20;                      // rvprop=content sur 20 pages : poli, et sous tous les plafonds
const PAUSE_MS = 260;
const PLAFOND_OCTETS = 300 * 1024;
const ECHELLE = [720, 480];
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

/* ─────────────────────── ACCÈS (panne ≠ absence) ─────────────────────── */
async function interroger(url, essais = 3) {
  let dernier = 'inconnu';
  for (let i = 0; i < essais; i++) {
    try {
      const r = await fetch(`${url}&maxlag=5&format=json&formatversion=2`, { headers: UA, signal: AbortSignal.timeout(30_000) });
      if (r.status === 429) { dernier = 'HTTP 429'; await sleep(1500 * (i + 1)); continue; }
      if (!r.ok) { dernier = `HTTP ${r.status}`; await sleep(600 * (i + 1)); continue; }
      const j = await r.json();
      if (j?.error) { dernier = `erreur API : ${j.error.code}`; await sleep(600 * (i + 1)); continue; }
      if (!j?.query) { dernier = 'réponse sans query'; await sleep(600 * (i + 1)); continue; }
      return { ok: true, q: j.query };
    } catch (e) { dernier = String(e?.name ?? e).slice(0, 60); await sleep(600 * (i + 1)); }
  }
  return { ok: false, motif: dernier };
}

/* ─────────────────────── L'IDENTITÉ : L'ÉGALITÉ, RIEN DE MOINS ─────────────────────── */
const plie = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[’']/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

/* ─────────────────────── LES CARTONS ET PICTOGRAMMES ─────────────────────── */
// Les six premières familles viennent des connecteurs existants. Les suivantes ont été TROUVÉES
// par le sondage du 10/08 sur les pages « sans image d'infobox » : ce sont les fichiers qu'un
// article NON illustré emploie quand même, et qu'un connecteur qui lirait `prop=images` poserait.
const FICHIER_PARASITE = new RegExp([
  'site-?logo', 'wiki-?wordmark', 'wordmark', 'favicon', 'placeholder',
  'no[-_ ]?image', 'no[-_ ]?pic(?:ture)?[-_ ]?avail(?:able)?', 'nophoto',
  'question[-_ ]?mark', 'spoiler', 'under[-_ ]?construction', 'stub', 'ambox', 'icon[-_ ]?wiki',
  'image[-_ ]?non[-_ ]?disponible', 'pas[-_ ]?d[-_ ]?image', 'sans[-_ ]?image', 'aucune[-_ ]?image', 'image[-_ ]?manquante',
  // trouvés le 10/08 en relisant les articles :
  'camera[-_ ]?font[-_ ]?awesome',   // le carton « pas d'image » du wiki Naruto
  'nature[-_ ]?icon',                // l'icône d'élément (Katon, Raiton…)
  'gender[-_ ]?(male|female)',       // le pictogramme de genre de l'infobox
  'disambig', 'divination\\.png', 'font[-_ ]?awesome',
].join('|'), 'i');
const HOTE_ATTENDU = 'static.wikia.nocookie.net';

/* ─────────────────────── G4 · LE FICHIER PARLE-T-IL DU SUJET ? ─────────────────────── */
const MOTS_VIDES = /^(the|les|des|une|los|infobox|anime|manga|png|jpg|jpeg|webp|gif|svg|portrait|image|film|movie|episode|chapitre|chapter|new|nv|fichier|file)$/;
const motsUtiles = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .split(/[^a-z0-9]+/).map((w) => w.replace(/s$/, '')).filter((w) => w.length > 2 && !MOTS_VIDES.test(w));
const colle = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

function fichierParleDuSujet(nomFichier, titre) {
  const duTitre = new Set(motsUtiles(titre));
  const communs = motsUtiles(nomFichier).filter((w) => duTitre.has(w));
  if (communs.length) return { ok: true, communs };
  const a = colle(nomFichier.replace(/\.(png|jpe?g|gif|webp|svg)$/i, '')), b = colle(titre);
  if (b.length > 6 && (a.includes(b) || b.includes(a))) return { ok: true, communs: [`titre collé « ${b} »`] };
  return { ok: false, communs: [] };
}

/* ─────────────────────── L'EXTRACTION : UN PARAMÈTRE D'IMAGE DE L'INFOBOX ─────────────────────── */
// On ne prend PAS « le premier fichier qui traîne dans l'article ». On cherche une ligne de
// paramètre dont le NOM contient « image » / « photo » / « img », et on rend la ligne entière
// comme phrase-preuve. Les formes rencontrées :
//     | image = [[Fichier:Ile Confiture_Infobox.png|270px]]
//     |image1 = Water Seven Anime Infobox.png
//     | Image = <gallery>Fichier:X.png|Anime</gallery>
const CLE_IMAGE = /^\s*\|\s*([A-Za-zÀ-ÿ0-9_ -]*(?:image|photo|img)[A-Za-z0-9_ -]*)\s*=\s*(.*)$/i;
const EXT = /\.(png|jpe?g|gif|webp|svg)$/i;

function imageDeLInfobox(wikitext) {
  for (const m of String(wikitext ?? '').matchAll(new RegExp(CLE_IMAGE, 'gim'))) {
    const cle = m[1].trim(), val = m[2].trim();
    if (!val) continue;
    // Formes acceptées, de la plus explicite à la plus nue.
    const lien = /\[\[\s*(?:File|Fichier|Image)\s*:\s*([^|\]]+?)\s*[|\]]/i.exec(val)
      ?? /(?:File|Fichier|Image)\s*:\s*([^|\]\n<]+)/i.exec(val);
    let nom = lien ? lien[1].trim() : val.split('|')[0].trim();
    nom = nom.replace(/^\[+|\]+$/g, '').trim();
    if (!nom || !EXT.test(nom)) continue;
    if (/\{\{|\}\}/.test(nom)) continue;                    // un modèle, pas un nom de fichier
    return { fichier: nom, preuve: m[0].trim().slice(0, 200), cle };
  }
  return null;
}

/* ─────────────────────── LA NATURE DE LA PAGE ─────────────────────── */
const CAT_PERSONNAGE = /\b(characters?|personnages?|humans?|humains?|hommes|femmes|male|female)\b/i;

/* ─────────────────────── LE PIÈGE SVG (leçon #65, re-mesuré le 10/08) ─────────────────────── */
// Sur un fichier vectoriel, `iiurlwidth` ne produit AUCUNE vignette : l'API rend l'adresse du .svg
// brut. Le site le sert dans un `<img>` nu, où un navigateur l'affiche — mais l'image OpenGraph
// (satori/resvg) ne charge pas de SVG distant, et notre lecture d'octets ne sait pas y lire une
// définition. On applique donc au retour de l'API le SEUL opérateur d'échelle documenté du CDN,
// exactement comme le font déjà les trois connecteurs existants ; puis on RE-TÉLÉCHARGE.
// Mesuré : `Sarutobi Symbole.svg` (100×100, 4,6 Ko de vecteur) rend un webp 810×810 de 14,4 Ko.
const rasteriseSvg = (u, px) => /\.svg\/revision\/latest(?!\/scale-to-width-down)/i.test(u)
  ? u.replace(/(\.svg\/revision\/latest)/i, `$1/scale-to-width-down/${px}`) : u;

/* ─────────────────────── L'ADRESSE, RENDUE PAR L'API ─────────────────────── */
async function adresseVignette(api, fichier, largeur) {
  const r = await interroger(`${api}?action=query&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=${largeur}`
    + `&titles=${encodeURIComponent('File:' + fichier)}`);
  if (!r.ok) return { panne: r.motif };
  const p = r.q.pages?.[0];
  if (!p || p.missing) return { absent: true };
  const ii = p.imageinfo?.[0];
  if (!ii) return { absent: true };
  return { ii };
}
async function telecharger(url) {
  let dernier = 'inconnu';
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(35_000) });
      if (!r.ok) { dernier = `HTTP ${r.status}`; await sleep(900 * (i + 1)); continue; }
      const buf = await r.arrayBuffer();
      const d = dimensions(buf);
      if (!d) return { octets: buf.byteLength, illisible: Buffer.from(buf).toString('latin1', 0, 40).replace(/[^\x20-\x7e]/g, '.') };
      return { octets: buf.byteLength, d };
    } catch (e) { dernier = String(e?.message ?? e).slice(0, 60); await sleep(900 * (i + 1)); }
  }
  return { panne: dernier };
}

/* ═════════════════════ 1. L'ÉTAT ═════════════════════ */
const site = clientSite();
let toutes = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await site.from('akasha_entries')
    .select('id,slug,name,type,universe,image_url').order('slug').range(de, de + 999);
  if (error) { console.error('✗ lecture akasha_entries :', error.message); process.exit(1); }
  toutes = toutes.concat(data ?? []);
  if ((data ?? []).length < 1000) break;
}
const parFichier = new Map();          // fichier de wiki → fiches qui le portent DÉJÀ
for (const e of toutes) {
  if (!e.image_url) continue;
  const k = idFichier(e.image_url);
  if (!parFichier.has(k)) parFichier.set(k, []);
  parFichier.get(k).push(e);
}
let fiches = toutes.filter((e) => !e.image_url && (API_FR[e.universe] || API_EN[e.universe]));
if (Number.isFinite(LIMIT)) fiches = fiches.slice(0, LIMIT);
console.log(`${toutes.length} fiches · ${toutes.length - toutes.filter((e) => !e.image_url).length} illustrées · ${parFichier.size} fichiers distincts déjà portés`);
console.log(`${fiches.length} fiche(s) sans visuel à relire\n`);

// Les titres déjà RÉSOLUS par les vagues précédentes : quand une passe antérieure a établi qu'une
// page existe sous un titre typographiquement différent du nôtre, on repart de ce titre plutôt que
// de refaire sa recherche. On le re-teste quand même à l'égalité — on ne reprend pas un verdict
// sur parole (leçon du 08/08 : trois exécutants « nets » réfutés sur pièces par leurs contrôleurs).
const titresConnus = new Map();
for (const f of ['images-v2-2026-08-10-application.json', 'images-fr-application-2026-08-10.json']) {
  try {
    const r = JSON.parse(await readFile(`${AUDITS}${f}`, 'utf8'));
    for (const x of r.restees_sans_image ?? []) if (x.titre_resolu) titresConnus.set(x.slug, x.titre_resolu);
  } catch { /* rapport absent : on se rabat sur le nom */ }
}
console.log(`${titresConnus.size} titre(s) déjà résolu(s) par les vagues précédentes, repris comme candidat\n`);

await mkdir(AUDITS, { recursive: true });
await writeFile(TRACE, JSON.stringify({
  chantier: 'images — relecture de l’infobox (vague 4)', pris_le: new Date().toISOString(),
  mode: DRY ? 'à blanc' : 'application', colonne: 'image_url', plafond_octets: PLAFOND_OCTETS,
  candidats: fiches.length,
  avant: fiches.map((f) => ({ slug: f.slug, universe: f.universe, type: f.type, name: f.name, image_url: f.image_url })),
}, null, 1));
console.log(`trace d'avant écrite : ${TRACE} (${fiches.length} lignes)\n`);

/* ═════════════════════ 2. RELECTURE DES ARTICLES (FR puis EN) ═════════════════════ */
const verdicts = new Map();            // slug → { etat, … }
const enAttente = new Map(fiches.map((f) => [f.slug, f]));

for (const [lang, table] of [['fr', API_FR], ['en', API_EN]]) {
  const parUnivers = new Map();
  for (const f of enAttente.values()) {
    if (!table[f.universe]) continue;
    if (!parUnivers.has(f.universe)) parUnivers.set(f.universe, []);
    parUnivers.get(f.universe).push(f);
  }
  for (const [uni, liste] of parUnivers) {
    console.log(`relecture · ${lang} · ${uni} : ${liste.length} fiche(s) en ${Math.ceil(liste.length / LOT)} requête(s)`);
    for (let i = 0; i < liste.length; i += LOT) {
      const lot = liste.slice(i, i + LOT);
      // Le titre demandé : celui qu'une vague précédente a résolu, sinon notre nom.
      const demande = new Map(lot.map((f) => [f.slug, titresConnus.get(f.slug) ?? f.name]));
      const titres = [...new Set(demande.values())];
      const r = await interroger(`${table[uni]}?action=query&prop=revisions|categories&rvprop=content&rvslots=main`
        + `&cllimit=200&redirects=1&titles=${encodeURIComponent(titres.join('|'))}`);
      await sleep(PAUSE_MS);
      if (!r.ok) continue;                        // PANNE ≠ ABSENCE : la fiche reste en attente
      const normalise = new Map((r.q.normalized ?? []).map((n) => [n.from, n.to]));
      const redirige = new Map((r.q.redirects ?? []).map((x) => [x.from, x.to]));
      const parTitre = new Map((r.q.pages ?? []).map((p) => [p.title, p]));
      for (const f of lot) {
        let t = normalise.get(demande.get(f.slug)) ?? demande.get(f.slug);
        const vus = new Set();
        while (redirige.has(t) && !vus.has(t)) { vus.add(t); t = redirige.get(t); }
        const page = parTitre.get(t);
        if (!page || page.missing) continue;                       // pas de page : langue suivante
        // IDENTITÉ — égalité stricte sur le titre FINAL (après redirection).
        if (plie(page.title) !== plie(f.name)) continue;
        const nature = pageDOeuvre(page.title, '') ?? pagePlusGenerale(f.name, page.title);
        if (nature) { verdicts.set(f.slug, { etat: 'refus-nature-titre', lang, titre: page.title, motif: nature }); enAttente.delete(f.slug); continue; }
        const wt = page.revisions?.[0]?.slots?.main?.content ?? '';
        const trouve = imageDeLInfobox(wt);
        if (!trouve) {
          verdicts.set(f.slug, { etat: 'article-sans-image', lang, titre: page.title,
            motif: `l’article « ${page.title} » (${wt.length} caractères) ne nomme aucun fichier dans un paramètre d’image de son infobox` });
          enAttente.delete(f.slug); continue;
        }
        const cats = (page.categories ?? []).map((c) => c.title.replace(/^Cat[ée]gor(y|ie):/i, ''));
        verdicts.set(f.slug, { etat: 'candidat', lang, titre: page.title, api: table[uni],
          fichier: trouve.fichier, preuve_wikitext: trouve.preuve, cle_infobox: trouve.cle,
          categories: cats, preuve_identite: `titre ${lang} « ${page.title} » ≡ notre nom « ${f.name} »` });
        enAttente.delete(f.slug);
      }
    }
  }
}
for (const [slug, f] of enAttente)
  verdicts.set(slug, { etat: 'sans-page', motif: 'aucune page dont le titre égale notre nom, ni en français ni en anglais' });

const candidats = [...verdicts.entries()].filter(([, v]) => v.etat === 'candidat');
console.log(`\n${candidats.length} fiche(s) dont l’infobox nomme un fichier — passage des gardes\n`);

/* ═════════════════════ 3. LES GARDES, UNE PAR UNE ═════════════════════ */
const parSlug = new Map(fiches.map((f) => [f.slug, f]));
const reserves = new Map();            // fichier → slug, pour la collision INTERNE à cette passe

for (const [slug, v] of candidats) {
  const f = parSlug.get(slug);

  // G1 · carton de maintenance ou pictogramme d'infobox
  if (FICHIER_PARASITE.test(v.fichier)) {
    verdicts.set(slug, { ...v, etat: 'refus-parasite', motif: `« ${v.fichier} » est un carton ou un pictogramme du wiki, pas une illustration du sujet` });
    continue;
  }
  // G2 · le fichier parle-t-il du sujet ?
  const fp = fichierParleDuSujet(v.fichier, v.titre);
  if (!fp.ok) {
    verdicts.set(slug, { ...v, etat: 'refus-fichier', motif: `« ${v.fichier} » ne partage aucun mot avec « ${v.titre} » — l’image ne parle probablement pas du sujet` });
    continue;
  }
  v.preuve_fichier = `mots communs titre/fichier : ${fp.communs.join(', ')}`;
  // G3 · nature : une page de personnage sur une fiche qui n'en est pas un
  if (f.type !== 'character') {
    const touchees = (v.categories ?? []).filter((c) => CAT_PERSONNAGE.test(c));
    if (touchees.length) {
      verdicts.set(slug, { ...v, etat: 'refus-nature', motif: `page de PERSONNAGE (catégories : ${touchees.slice(0, 3).join(' · ')}) sur une fiche de type « ${f.type} »` });
      continue;
    }
    v.nature_verifiee = `non-personnage (${(v.categories ?? []).length} catégories)`;
  }
  // G4 · l'adresse — RENDUE PAR L'API, jamais devinée ; puis le plafond de poids.
  let retenu = null, essais = [];
  for (const px of ECHELLE) {
    const a = await adresseVignette(v.api, v.fichier, px);
    await sleep(PAUSE_MS);
    if (a.panne) { essais.push({ largeur: px, resultat: `panne (${a.panne})` }); continue; }
    if (a.absent) { essais.push({ largeur: px, resultat: `le wiki ne connaît pas File:${v.fichier}` }); break; }
    const url = rasteriseSvg(a.ii.thumburl ?? a.ii.url, px);
    let hote; try { hote = new URL(url).host; } catch { essais.push({ largeur: px, resultat: 'URL illisible' }); continue; }
    if (hote !== HOTE_ATTENDU) { essais.push({ largeur: px, resultat: `hôte inattendu ${hote}` }); break; }
    const t = await telecharger(url);
    await sleep(160);
    if (t.panne) { essais.push({ largeur: px, resultat: `panne au téléchargement (${t.panne})` }); continue; }
    if (t.illisible) { essais.push({ largeur: px, resultat: `pas une image (${t.octets} o : « ${t.illisible} »)` }); continue; }
    if (t.d.w < 80 || t.d.h < 80) { essais.push({ largeur: px, resultat: `définition réelle ${t.d.w}×${t.d.h} — sous le plancher` }); break; }
    essais.push({ largeur: px, resultat: `${ko(t.octets)} · ${t.d.w}×${t.d.h} ${t.d.type}`, url });
    if (!retenu || t.octets < retenu.octets) retenu = { url, px, ...t, source: `${a.ii.width}×${a.ii.height} ${a.ii.mime} ${ko(a.ii.size)}` };
    if (t.octets <= PLAFOND_OCTETS) break;
  }
  v.essais = essais;
  if (!retenu) { verdicts.set(slug, { ...v, etat: 'refus-charge', motif: `aucune vignette exploitable : ${essais.map((e) => `${e.largeur}px ${e.resultat}`).join(' ; ')}` }); continue; }
  if (retenu.octets > PLAFOND_OCTETS) {
    verdicts.set(slug, { ...v, etat: 'refus-poids', motif: `${ko(retenu.octets)} même à ${retenu.px} px — au-dessus du plafond de ${ko(PLAFOND_OCTETS)}` });
    continue;
  }
  // G5 · collision avec une fiche DÉJÀ illustrée, ou avec une autre fiche de cette passe
  const cle = idFichier(retenu.url);
  const occupants = (parFichier.get(cle) ?? []).filter((e) => e.slug !== slug);
  if (occupants.length) {
    verdicts.set(slug, { ...v, etat: 'refus-collision', motif: `fichier déjà porté par ${occupants.map((o) => `${o.slug} (${o.name})`).join(', ')} — doublon probable, à instruire` });
    continue;
  }
  if (reserves.has(cle)) {
    verdicts.set(slug, { ...v, etat: 'refus-collision-interne', motif: `même fichier que ${reserves.get(cle)} dans cette passe — visuel générique` });
    continue;
  }
  reserves.set(cle, slug);
  verdicts.set(slug, { ...v, etat: 'trouve', url: retenu.url, largeur: retenu.px,
    definition_reelle: `${retenu.d.w}×${retenu.d.h} ${retenu.d.type}`, octets: retenu.octets, source: retenu.source });
}

/* ═════════════════════ 4. COMPTE CROISÉ ═════════════════════ */
const par = (e) => [...verdicts.values()].filter((v) => v.etat === e).length;
const C = {
  trouves: par('trouve'), refus_parasite: par('refus-parasite'), refus_fichier: par('refus-fichier'),
  refus_nature: par('refus-nature'), refus_nature_titre: par('refus-nature-titre'),
  refus_charge: par('refus-charge'), refus_poids: par('refus-poids'),
  refus_collision: par('refus-collision'), refus_collision_interne: par('refus-collision-interne'),
  article_sans_image: par('article-sans-image'), sans_page: par('sans-page'),
};
const somme = Object.values(C).reduce((a, b) => a + b, 0);
console.log('─'.repeat(78));
console.log(`candidats ${fiches.length} = ` + Object.entries(C).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(' + '));
if (somme !== fiches.length) { console.error(`✗ COMPTE CROISÉ FAUX : ${somme} ≠ ${fiches.length} — on n'écrit rien.`); process.exit(1); }
const eprouves = candidats.length;
console.log(`gardes : ${eprouves - C.trouves} refus sur ${eprouves} fiches dont l'infobox nommait un fichier`);

/* ═════════════════════ 5. ÉCRITURE (image_url SEULEMENT) ═════════════════════ */
const trouves = [...verdicts.entries()].filter(([, v]) => v.etat === 'trouve');
let posees = 0, deja = 0, echecs = 0;
if (!DRY && trouves.length) {
  for (const [slug, v] of trouves) {
    const f = parSlug.get(slug);
    const { data, error } = await site.from('akasha_entries')
      .update({ image_url: v.url }).eq('id', f.id).is('image_url', null).select('slug');
    if (error) { echecs++; v.echec = error.message; continue; }
    if (!data?.length) { deja++; v.dejaRemplieEntreTemps = true; continue; }
    posees++;
  }
  console.log(`→ ${posees} image(s) posée(s) · ${deja} déjà remplie(s) entre-temps · ${echecs} échec(s)`);
} else if (DRY) console.log('→ --dry : aucune écriture.');

await writeFile(RAPPORT, JSON.stringify({
  chantier: 'images — relecture de l’infobox quand pageimages se tait (vague 4)',
  passe_le: new Date().toISOString(), mode: DRY ? 'à blanc' : 'application',
  plafond_octets: PLAFOND_OCTETS, echelle: ECHELLE,
  compte_croise: { candidats: fiches.length, ...C, posees, deja_remplies_entre_temps: deja, echecs_ecriture: echecs },
  posees_detail: trouves.map(([slug, v]) => ({
    slug, universe: parSlug.get(slug).universe, type: parSlug.get(slug).type, name: parSlug.get(slug).name,
    wiki: v.lang, titre_wiki: v.titre, preuve_identite: v.preuve_identite,
    fichier: v.fichier, preuve_wikitext: v.preuve_wikitext, preuve_fichier: v.preuve_fichier,
    nature_verifiee: v.nature_verifiee ?? 'fiche de personnage',
    image_url: v.url, largeur: v.largeur, definition_reelle: v.definition_reelle, octets: v.octets, source: v.source,
  })),
  refuses_par_les_gardes: [...verdicts.entries()].filter(([, v]) => String(v.etat).startsWith('refus'))
    .map(([slug, v]) => ({ slug, name: parSlug.get(slug).name, type: parSlug.get(slug).type, universe: parSlug.get(slug).universe,
      etat: v.etat, titre_wiki: v.titre ?? null, fichier: v.fichier ?? null, preuve_wikitext: v.preuve_wikitext ?? null, pourquoi: v.motif })),
  restees_sans_image: [...verdicts.entries()].filter(([, v]) => v.etat !== 'trouve')
    .map(([slug, v]) => ({ slug, name: parSlug.get(slug).name, universe: parSlug.get(slug).universe,
      type: parSlug.get(slug).type, etat: v.etat, pourquoi: v.motif, titre_resolu: v.titre ?? null })),
}, null, 1));
console.log(`rapport : ${RAPPORT}`);
