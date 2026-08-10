// scripts/ops-images-nomfr-v4.mjs — LE WIKI DÉCLARE LUI-MÊME NOTRE NOM FRANÇAIS.
//
// ══════════════════ LE PROBLÈME QUE PERSONNE N'AVAIT OUVERT ══════════════════
// 585 fiches n'ont aucune page dont le TITRE égale leur nom, ni en français ni en anglais. Le
// carnet l'explique depuis le 10/08 : nos noms sont des traductions curées (« Fruit de l'Œuf »,
// « Fruit du Dinosaure version Ptéranodon ») et le wiki francophone titre ses articles au nom
// japonais (« Tama Tama no Mi », « Ryu Ryu no Mi, modèle Ptéranodon »). Le plafond était nommé
// « il faudrait un registre d'alias curé à la main ».
//
// Or ce registre existe DÉJÀ, et c'est le wiki qui le tient : ses infobox portent un paramètre
// `nomf` — nom français. La page « Tama Tama no Mi » déclare `nomf = Fruit de l'Œuf`. Ce n'est pas
// une traduction que NOUS produisons (ce serait de l'invention), c'est une déclaration de la source,
// citable mot pour mot, et c'est le témoin d'identité le plus fort qu'on puisse avoir sur ce
// terrain : plus fort que l'égalité de titre, puisqu'il traverse la langue sans rien deviner.
//
// ══════════════════ POURQUOI PASSER PAR LA RECHERCHE, ET CE QUE ÇA NE VAUT PAS ══════════════════
// L'opérateur `insource:` de CirrusSearch permettrait d'interroger le wikitext directement. ÉPROUVÉ
// le 10/08 : `insource:"Fier Baril"` rend [] sur onepiece.fandom.com/fr alors que la recherche
// simple `Fier Baril` rend « Baril Tiger » en tête — l'opérateur n'est pas servi par ce wiki. On
// passe donc par la recherche simple, mais elle ne conclut RIEN : elle ne sert qu'à proposer trois
// pages. C'est le wikitext qui tranche, et seulement s'il déclare notre nom comme VALEUR d'un
// paramètre de nommage. « Le wiki a trouvé un article qui parle de ça » reste, ici comme ailleurs,
// un non-témoin — c'est lui qui colle une image de chapitre sur une fiche d'entité.
//
// RENDEMENT MESURÉ AVANT D'ÉCRIRE (échantillon réparti de 25 sur les 585) : 24 ont au moins un
// résultat de recherche, 4 déclarent notre nom — 16 %. C'est le gisement le plus dense trouvé
// aujourd'hui, loin devant la relecture d'infobox (6 sur 779) et la redirection (3 sur 773).
//
// Toutes les gardes des connecteurs précédents s'appliquent ensuite, sans exception :
// parasite · fichier qui parle du sujet · nature · collision (existante ET interne) · adresse
// rendue par l'API · chargement vérifié dans les octets · plafond de 300 Ko.
//
// Usage :
//   node --env-file=.env.local scripts/ops-images-nomfr-v4.mjs --dry
//   node --env-file=.env.local scripts/ops-images-nomfr-v4.mjs
import { writeFile, mkdir } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';
import { pageDOeuvre } from './lib/fandom.mjs';
import { dimensions, idFichier } from './lib/image-octets.mjs';

const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const DRY = process.argv.includes('--dry');
const LIMIT = Number(arg('limit', Infinity));
const AUDITS = new URL('../data/audits/', import.meta.url).pathname;
const HORO = new Date().toISOString().replace(/[:.]/g, '-');
const TRACE = `${AUDITS}nomfr-v4-trace-${HORO}.json`;
const RAPPORT = `${AUDITS}nomfr-v4-${HORO}.json`;
const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative ; contact : tulbured06@gmail.com)' };
const PAUSE_MS = 270, PLAFOND = 300 * 1024, ECHELLE = [720, 480];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ko = (n) => `${(n / 1024).toFixed(0)} Ko`;

const API_FR = {
  'One Piece': 'https://onepiece.fandom.com/fr/api.php', 'Naruto': 'https://naruto.fandom.com/fr/api.php',
  'Bleach': 'https://bleach.fandom.com/fr/api.php', 'Dragon Ball': 'https://dragonball.fandom.com/fr/api.php',
  "JoJo's Bizarre Adventure": 'https://jjba.fandom.com/fr/api.php', 'Death Note': 'https://deathnote.fandom.com/fr/api.php',
};

const plie = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[’']/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const colle = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

// LES CLÉS DE NOMMAGE RETENUES, ET CELLES QU'ON ÉCARTE. On garde `nomf`/`nom français`/`nom` :
// une seule entité, une seule valeur. On ÉCARTE `alias`, `autres noms`, `surnom` — ce sont des
// LISTES, et une liste ramène le nom d'une entité voisine sur la page d'une autre (c'est la
// mécanique exacte des quatre portraits usurpés du 09/08). On écarte aussi `nomj`/`nomr`
// (japonais et romaji) : ils ne peuvent pas égaler un nom français, les tester serait du bruit.
const CLE_NOM = /^\s*\|\s*(nomf|nom_f|nom[ _]fran[çc]ais|nomfr|nom)\s*=\s*(.+)$/gim;
const CLE_IMAGE = /^\s*\|\s*([A-Za-zÀ-ÿ0-9_ -]*(?:image|photo|img)[A-Za-z0-9_ -]*)\s*=\s*(.*)$/gim;
const EXT = /\.(png|jpe?g|gif|webp|svg)$/i;
const FICHIER_PARASITE = /(site-?logo|wordmark|favicon|placeholder|no[-_ ]?image|no[-_ ]?pic(?:ture)?[-_ ]?avail(?:able)?|nophoto|question[-_ ]?mark|spoiler|under[-_ ]?construction|stub|ambox|icon[-_ ]?wiki|image[-_ ]?non[-_ ]?disponible|camera[-_ ]?font[-_ ]?awesome|nature[-_ ]?icon|gender[-_ ](male|female)|disambig)/i;
const CAT_PERSONNAGE = /\b(characters?|personnages?|humans?|humains?|hommes|femmes|male|female)\b/i;
const HOTE_ATTENDU = 'static.wikia.nocookie.net';
const MOTS_VIDES = /^(the|les|des|une|los|infobox|anime|manga|png|jpg|jpeg|webp|gif|svg|portrait|image|film|movie|episode|chapitre|chapter|new|nv|fichier|file|modele|modèle)$/;
const motsUtiles = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .split(/[^a-z0-9]+/).map((w) => w.replace(/s$/, '')).filter((w) => w.length > 2 && !MOTS_VIDES.test(w));
const rasteriseSvg = (u, px) => /\.svg\/revision\/latest(?!\/scale-to-width-down)/i.test(u)
  ? u.replace(/(\.svg\/revision\/latest)/i, `$1/scale-to-width-down/${px}`) : u;

function nomDeclare(wikitext, notreNom) {
  for (const m of String(wikitext ?? '').matchAll(CLE_NOM)) {
    const val = m[2].trim().replace(/\[\[|\]\]|'''|''/g, '').split('|').pop().trim();
    if (plie(val) === plie(notreNom)) return { cle: m[1].trim(), preuve: m[0].trim().slice(0, 200) };
  }
  return null;
}
function imageDeLInfobox(wikitext) {
  for (const m of String(wikitext ?? '').matchAll(CLE_IMAGE)) {
    const val = m[2].trim(); if (!val) continue;
    const lien = /\[\[\s*(?:File|Fichier|Image)\s*:\s*([^|\]]+?)\s*[|\]]/i.exec(val)
      ?? /(?:File|Fichier|Image)\s*:\s*([^|\]\n<]+)/i.exec(val);
    const nom = (lien ? lien[1] : val.split('|')[0]).trim().replace(/^\[+|\]+$/g, '');
    if (nom && EXT.test(nom) && !/\{\{|\}\}/.test(nom)) return { fichier: nom, preuve: m[0].trim().slice(0, 200) };
  }
  return null;
}
function fichierParleDuSujet(nomFichier, titre, notreNom) {
  const cibles = new Set([...motsUtiles(titre), ...motsUtiles(notreNom)]);
  const communs = motsUtiles(nomFichier).filter((w) => cibles.has(w));
  if (communs.length) return { ok: true, communs };
  const a = colle(nomFichier.replace(EXT, ''));
  for (const b of [colle(titre), colle(notreNom)])
    if (b.length > 6 && (a.includes(b) || b.includes(a))) return { ok: true, communs: [`titre collé « ${b} »`] };
  return { ok: false, communs: [] };
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
let fiches = toutes.filter((e) => !e.image_url && API_FR[e.universe]);
if (Number.isFinite(LIMIT)) fiches = fiches.slice(0, LIMIT);
console.log(`${toutes.length} fiches · ${fiches.length} sans visuel dans les univers à wiki francophone`);
console.log(`${parFichier.size} fichiers de wiki déjà portés en base\n`);

await mkdir(AUDITS, { recursive: true });
await writeFile(TRACE, JSON.stringify({
  chantier: 'images — le nom français déclaré par le wiki (vague 4)',
  pris_le: new Date().toISOString(), mode: DRY ? 'à blanc' : 'application', colonne: 'image_url',
  candidats: fiches.length,
  avant: fiches.map((f) => ({ slug: f.slug, universe: f.universe, type: f.type, name: f.name, image_url: f.image_url })),
}, null, 1));
console.log(`trace d'avant : ${TRACE} (${fiches.length} lignes)\n`);

/* ═════ 2. RECHERCHE → WIKITEXT → DÉCLARATION ═════ */
const verdicts = new Map();
let sansResultat = 0, sansDeclaration = 0, pannes = 0, n = 0;

for (const f of fiches) {
  if (++n % 50 === 0) console.log(`   ${n}/${fiches.length} · ${[...verdicts.values()].filter((v) => v.etat === 'candidat').length} candidat(s)`);
  const api = API_FR[f.universe];
  const rs = await interroger(`${api}?action=query&list=search&srsearch=${encodeURIComponent(f.name)}&srlimit=5&srnamespace=0`);
  await sleep(PAUSE_MS);
  if (!rs.ok) { pannes++; verdicts.set(f.slug, { etat: 'panne', motif: `recherche injoignable (${rs.motif})` }); continue; }
  const hits = (rs.q.search ?? []).map((h) => h.title).slice(0, 3);
  if (!hits.length) { sansResultat++; verdicts.set(f.slug, { etat: 'sans-resultat', motif: 'la recherche du wiki francophone ne rend aucun article' }); continue; }
  const rp = await interroger(`${api}?action=query&prop=revisions|categories&rvprop=content&rvslots=main&cllimit=200`
    + `&redirects=1&titles=${encodeURIComponent(hits.join('|'))}`);
  await sleep(PAUSE_MS);
  if (!rp.ok) { pannes++; verdicts.set(f.slug, { etat: 'panne', motif: `wikitext injoignable (${rp.motif})` }); continue; }
  let pose = null;
  for (const p of rp.q.pages ?? []) {
    if (p.missing) continue;
    const wt = p.revisions?.[0]?.slots?.main?.content ?? '';
    const decl = nomDeclare(wt, f.name);
    if (!decl) continue;
    const img = imageDeLInfobox(wt);
    pose = { titre: p.title, decl, img, cats: (p.categories ?? []).map((c) => c.title.replace(/^Cat[ée]gor(y|ie):/i, '')) };
    break;
  }
  if (!pose) { sansDeclaration++; verdicts.set(f.slug, { etat: 'sans-declaration', motif: `aucune des pages proposées (${hits.join(' | ')}) ne déclare « ${f.name} » comme nom` }); continue; }
  if (!pose.img) { verdicts.set(f.slug, { etat: 'article-sans-image', titre: pose.titre, motif: `« ${pose.titre} » déclare notre nom mais n’a pas d’image d’infobox`, preuve_nom: pose.decl.preuve }); continue; }
  verdicts.set(f.slug, { etat: 'candidat', api, titre: pose.titre, fichier: pose.img.fichier,
    preuve_nom: pose.decl.preuve, cle_nom: pose.decl.cle, preuve_image: pose.img.preuve, categories: pose.cats });
}

const candidats = [...verdicts.entries()].filter(([, v]) => v.etat === 'candidat');
console.log(`\n${candidats.length} page(s) déclarant notre nom ET nommant un fichier — passage des gardes\n`);

/* ═════ 3. LES GARDES ═════ */
const parSlug = new Map(fiches.map((f) => [f.slug, f]));
const reserves = new Map();
for (const [slug, v] of candidats) {
  const f = parSlug.get(slug);
  if (FICHIER_PARASITE.test(v.fichier)) { verdicts.set(slug, { ...v, etat: 'refus-parasite', motif: `« ${v.fichier} » est un carton du wiki` }); continue; }
  const oeuvre = pageDOeuvre(v.titre, '');
  if (oeuvre) { verdicts.set(slug, { ...v, etat: 'refus-nature-titre', motif: oeuvre }); continue; }
  const fp = fichierParleDuSujet(v.fichier, v.titre, f.name);
  if (!fp.ok) { verdicts.set(slug, { ...v, etat: 'refus-fichier', motif: `« ${v.fichier} » ne partage aucun mot avec « ${v.titre} » ni avec « ${f.name} »` }); continue; }
  v.preuve_fichier = `mots communs : ${fp.communs.join(', ')}`;
  if (f.type !== 'character') {
    const touchees = (v.categories ?? []).filter((c) => CAT_PERSONNAGE.test(c));
    if (touchees.length) { verdicts.set(slug, { ...v, etat: 'refus-nature', motif: `page de PERSONNAGE (catégories : ${touchees.slice(0, 3).join(' · ')}) sur une fiche « ${f.type} »` }); continue; }
    v.nature_verifiee = `non-personnage (${(v.categories ?? []).length} catégories)`;
  }
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
    const t = await telecharger(url); await sleep(150);
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
  const cle = idFichier(retenu.url);
  const occupants = (parFichier.get(cle) ?? []).filter((e) => e.slug !== slug);
  if (occupants.length) { verdicts.set(slug, { ...v, etat: 'refus-collision', motif: `fichier déjà porté par ${occupants.map((o) => `${o.slug} (${o.name})`).join(', ')} — doublon probable, à instruire` }); continue; }
  if (reserves.has(cle)) { verdicts.set(slug, { ...v, etat: 'refus-collision-interne', motif: `même fichier que ${reserves.get(cle)} dans cette passe — page-aimant ou visuel générique` }); continue; }
  reserves.set(cle, slug);
  verdicts.set(slug, { ...v, etat: 'trouve', url: retenu.url, largeur: retenu.px, octets: retenu.octets,
    definition_reelle: `${retenu.d.w}×${retenu.d.h} ${retenu.d.type}`, source: retenu.source });
}

/* ═════ 4. COMPTE CROISÉ ═════ */
const par = (e) => [...verdicts.values()].filter((v) => v.etat === e).length;
const C = { trouves: par('trouve'), refus_parasite: par('refus-parasite'), refus_fichier: par('refus-fichier'),
  refus_nature: par('refus-nature'), refus_nature_titre: par('refus-nature-titre'), refus_charge: par('refus-charge'),
  refus_poids: par('refus-poids'), refus_collision: par('refus-collision'), refus_collision_interne: par('refus-collision-interne'),
  article_sans_image: par('article-sans-image'), sans_declaration: par('sans-declaration'),
  sans_resultat: par('sans-resultat'), pannes: par('panne') };
const somme = Object.values(C).reduce((a, b) => a + b, 0);
console.log('─'.repeat(78));
console.log(`candidats ${fiches.length} = ` + Object.entries(C).filter(([, x]) => x).map(([k, x]) => `${k} ${x}`).join(' + '));
if (somme !== fiches.length) { console.error(`✗ COMPTE CROISÉ FAUX : ${somme} ≠ ${fiches.length} — on n'écrit rien.`); process.exit(1); }
console.log(`gardes : ${candidats.length - C.trouves} refus sur ${candidats.length} pages qui déclaraient notre nom`);

/* ═════ 5. ÉCRITURE ═════ */
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
  chantier: 'images — le nom français déclaré par le wiki (vague 4)',
  passe_le: new Date().toISOString(), mode: DRY ? 'à blanc' : 'application', plafond_octets: PLAFOND,
  compte_croise: { candidats: fiches.length, ...C, posees, deja, echecs },
  posees_detail: trouves.map(([slug, v]) => ({
    slug, name: parSlug.get(slug).name, type: parSlug.get(slug).type, universe: parSlug.get(slug).universe,
    titre_wiki: v.titre, cle_de_nommage: v.cle_nom, preuve_nom: v.preuve_nom, preuve_image: v.preuve_image,
    preuve_fichier: v.preuve_fichier, nature_verifiee: v.nature_verifiee ?? 'fiche de personnage',
    fichier: v.fichier, image_url: v.url, largeur: v.largeur, definition_reelle: v.definition_reelle,
    octets: v.octets, source: v.source })),
  refuses_par_les_gardes: [...verdicts.entries()].filter(([, v]) => String(v.etat).startsWith('refus'))
    .map(([slug, v]) => ({ slug, name: parSlug.get(slug).name, type: parSlug.get(slug).type, universe: parSlug.get(slug).universe,
      etat: v.etat, titre_wiki: v.titre, fichier: v.fichier, preuve_nom: v.preuve_nom, pourquoi: v.motif })),
  restees_sans_image: [...verdicts.entries()].filter(([, v]) => v.etat !== 'trouve')
    .map(([slug, v]) => ({ slug, name: parSlug.get(slug).name, universe: parSlug.get(slug).universe,
      type: parSlug.get(slug).type, etat: v.etat, pourquoi: v.motif, titre_resolu: v.titre ?? null })),
}, null, 1));
console.log(`rapport : ${RAPPORT}`);
