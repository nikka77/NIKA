// scripts/ops-images-fandom.mjs — LES IMAGES GRATUITES DU WIKI, posées sur `image_url`.
//
// ══════════════════ POURQUOI ══════════════════
// 3 336 fiches AKASHA n'ont aucun visuel, dont 1 925 côté Naruto — et parmi elles 1 433 des
// 1 442 jutsu. Le registre « Naruto · Pouvoirs » aligne donc 1 442 cartes muettes, et les deux
// pouvoirs les plus reliés de l'univers (Rasengan, Multiclonage) n'ont pas une seule image.
// Or ces images existent déjà, gratuitement, à l'endroit exact d'où viennent nos textes : l'API
// `prop=pageimages` du wiki rend l'image d'infobox d'un article, 50 titres par requête, servie
// par static.wikia.nocookie.net — l'hôte qui sert DÉJÀ les 1 527 visuels en base. Même source,
// même hôte, même base légale que l'existant : on ne crée aucune situation nouvelle.
//
// ══════════════════ CE QUE LE SCRIPT REFUSE DE FAIRE ══════════════════
// · Il n'ÉCRASE JAMAIS une `image_url` existante. Le filtre `.is('image_url', null)` est posé
//   à la lecture ET re-posé sur chaque UPDATE (l'usine écrit en parallèle).
// · Il n'accepte pas une image « qui a l'air bonne ». GARDE D'IDENTITÉ : le titre RÉSOLU par le
//   wiki doit désigner notre entité — mêmes témoins que le connecteur prose (alias curé, nom ≡
//   titre, slug ≡ titre, redirection déclarée par le wiki), plus les gardes de nature
//   (pageDOeuvre, pagePlusGenerale). Une image de la mauvaise page est PIRE qu'une case vide :
//   la case vide se voit, la mauvaise image se croit.
// · PANNE ≠ ABSENCE. Une requête qui échoue (réseau, 5xx, maxlag) marque les fiches du lot
//   « panne » — elles restent à retenter. Seul un `missing: true` rendu par une réponse VALIDE
//   vaut « pas de page sur le wiki ».
//
// ══════════════════ POURQUOI LA VIGNETTE ET PAS L'ORIGINAL ══════════════════
// `piprop=original` rend le fichier brut : Rasengan fait 1 440 × 1 080, Hokage Rock 3 840 × 2 152.
// Le site affiche `image_url` dans un `<img>` NU (AkashaMosaic, OmniSearch, Leaderboard) sans
// optimiseur : une mosaïque de 60 tuiles téléchargerait des dizaines de Mo. On stocke donc la
// vignette `pithumbsize=720` — même hôte, même fichier, forme `/scale-to-width-down/720` qui est
// exactement celle des visuels déjà en base, et qui rasterise au passage les SVG que le CDN sert
// bruts (leçon #65). `--original` force l'original si un jour on veut le plein format ; les deux
// URL sont de toute façon consignées dans la trace, la bascule ne coûte qu'une passe.
//
// Usage :
//   node --env-file=.env.local scripts/ops-images-fandom.mjs --dry
//   node --env-file=.env.local scripts/ops-images-fandom.mjs --universe="Naruto" --limit=200
//   node --env-file=.env.local scripts/ops-images-fandom.mjs            # tous les univers couverts
import { writeFile, mkdir } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';
import {
  WIKIS, wikiApi, ALIAS_REGISTRE,
  sameEntityName, sameEntityBySlug, pageDOeuvre, pagePlusGenerale,
  fandomSleep as sleep,
} from './lib/fandom.mjs';

const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const DRY = process.argv.includes('--dry');
const ORIGINAL = process.argv.includes('--original');
const LIMIT = Number(arg('limit', Infinity));
const UNIVERSE = arg('universe');
const TYPE = arg('type');
const AUDITS = new URL('../data/audits/', import.meta.url).pathname;
const TRACE = `${AUDITS}images-fandom-trace.json`;
const RAPPORT = `${AUDITS}images-fandom.json`;

// Politesse : ~4 requêtes/seconde, un lot de 50 titres à chaque fois. L'inventaire entier tient
// en ~150 requêtes, il n'y a aucune raison de bousculer Fandom pour gagner trente secondes.
const PAUSE_MS = 250;
const LOT = 50;                       // plafond `titles` de l'API MediaWiki pour un client normal

/* ─────────────────────── 1. L'ACCÈS AU WIKI (panne distincte de l'absence) ─────────────────── */

/** @returns {{ok:true,json:object}|{ok:false,motif:string}} — jamais un `null` ambigu. */
async function interroger(url, essais = 3) {
  let dernier = 'inconnu';
  for (let i = 0; i < essais; i++) {
    try {
      const r = await fetch(`${url}&maxlag=5`, {
        headers: { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative ; contact : tulbured06@gmail.com)' },
        signal: AbortSignal.timeout(25_000),
      });
      if (r.status === 429) {
        const apres = Number(r.headers.get('retry-after'));
        dernier = 'HTTP 429';
        await sleep(Number.isFinite(apres) && apres > 0 ? apres * 1000 : 1500 * (i + 1));
        continue;
      }
      if (!r.ok) { dernier = `HTTP ${r.status}`; await sleep(500 * (i + 1)); continue; }
      const j = await r.json();
      if (j?.error?.code === 'maxlag') {
        dernier = 'maxlag';
        await sleep(Math.max(5, Number(r.headers.get('retry-after')) || 0) * 1000);
        continue;
      }
      if (j?.error) { dernier = `erreur API : ${j.error.code}`; await sleep(500 * (i + 1)); continue; }
      if (!j?.query) { dernier = 'réponse sans query'; await sleep(500 * (i + 1)); continue; }
      return { ok: true, json: j };
    } catch (e) { dernier = String(e?.name ?? e).slice(0, 60); }
    await sleep(500 * (i + 1));
  }
  return { ok: false, motif: dernier };
}

/** Un lot de ≤50 titres → { titreDemandé → {titre, page, redirige} }. Panne ⇒ `null`. */
async function imagesDuLot(api, titres) {
  const u = `${api}?action=query&prop=pageimages&piprop=original|thumbnail&pithumbsize=720`
    + `&pilimit=${LOT}&format=json&formatversion=2&redirects=1`
    + `&titles=${encodeURIComponent(titres.join('|'))}`;
  const r = await interroger(u);
  await sleep(PAUSE_MS);
  if (!r.ok) return { panne: r.motif };

  const q = r.json.query;
  const normalise = new Map((q.normalized ?? []).map((n) => [n.from, n.to]));
  const redirige = new Map((q.redirects ?? []).map((x) => [x.from, x.to]));
  const parTitre = new Map((q.pages ?? []).map((p) => [p.title, p]));

  const out = new Map();
  for (const demande of titres) {
    let t = normalise.get(demande) ?? demande;
    let viaRedirection = false;
    const vus = new Set();
    while (redirige.has(t) && !vus.has(t)) { vus.add(t); t = redirige.get(t); viaRedirection = true; }
    out.set(demande, { titre: t, page: parTitre.get(t) ?? null, viaRedirection });
  }
  return { out };
}

/* ─────────────────────── 2. LES GARDES ─────────────────────── */

// Fichiers-parasites : un wiki peut rendre son propre logo ou une pastille de maintenance comme
// « image principale ». Aucune de celles-là ne dit quoi que ce soit du sujet.
const FICHIER_PARASITE = /(site-?logo|wiki-?wordmark|wordmark|favicon|placeholder|no[-_]?image|nophoto|question[-_]?mark|spoiler|under[-_]?construction|stub|ambox|icon[-_]?wiki)/i;
const HOTE_ATTENDU = 'static.wikia.nocookie.net';

/** LE PIÈGE SVG (leçon #65). Sur un fichier vectoriel, pageimages ne rend souvent AUCUNE vignette
 *  et le CDN sert alors le `.svg` brut. Un navigateur l'affiche sans broncher, mais pas tout le
 *  monde : l'image OpenGraph des fiches (app/learn/akasha/[slug]/opengraph-image.tsx) passe par
 *  satori/resvg, qui ne charge pas de SVG distant dans un `<img>` — la carte de partage sortirait
 *  vide. On force donc le raster comme le fait déjà le script d'images Naruto : injecter
 *  `/scale-to-width-down/720` après `/revision/latest` rend un webp (vérifié : HTTP 200,
 *  image/webp, le chapeau vert du Kazekage avec son 風). */
const rasteriseSvg = (u) => /\.svg\/revision\/latest(?!\/scale-to-width-down)/i.test(u)
  ? u.replace(/(\.svg\/revision\/latest)/i, '$1/scale-to-width-down/720') : u;

/** L'image est-elle exploitable en soi ? (hôte, nature du fichier, taille) */
function imageAcceptable(page) {
  const brut = ORIGINAL ? page?.original?.source : (page?.thumbnail?.source ?? page?.original?.source);
  if (!brut) return { ok: false, motif: 'la page existe mais n’a pas d’image d’infobox' };
  const src = ORIGINAL ? brut : rasteriseSvg(brut);
  let hote;
  try { hote = new URL(src).host; } catch { return { ok: false, motif: 'URL d’image illisible' }; }
  if (hote !== HOTE_ATTENDU) return { ok: false, motif: `image servie par ${hote}, hors de l’hôte déjà utilisé en base` };
  const fichier = decodeURIComponent(src.split('/images/').pop() ?? '');
  if (FICHIER_PARASITE.test(fichier)) return { ok: false, motif: `fichier de maintenance du wiki : « ${fichier.split('/')[2] ?? fichier}` };
  const o = page.original ?? {};
  if (o.width && o.height && (o.width < 60 || o.height < 60))
    return { ok: false, motif: `image trop petite (${o.width}×${o.height})` };
  return { ok: true, url: src, original: page.original?.source ?? null, dim: o.width ? `${o.width}×${o.height}` : null };
}

/**
 * GARDE D'IDENTITÉ — le titre résolu désigne-t-il bien NOTRE entité ?
 * Quatre témoins, du plus fort au plus faible ; aucun témoin ⇒ refus.
 *  1. ALIAS CURÉ — paire vérifiée à la main (data/alias-cures.json). La curation ne se re-juge pas.
 *  2. NOM ≡ TITRE — inclusion des mots significatifs, squelettes de romanisation compris.
 *  3. SLUG ≡ TITRE — nos slugs gardent souvent le nom d'origine là où `name` porte la traduction.
 * LA REDIRECTION N'EST PAS UN QUATRIÈME TÉMOIN (tranché sur l'échantillon visuel du 07/08).
 * On suit `redirects=1` — sinon on ne récupère qu'une page « #REDIRECT » — mais l'identité est
 * re-testée sur le titre FINAL, exactement comme le fait `fetchFandomProse`. J'avais d'abord
 * traité « le wiki redirige X vers Y » comme une preuve : le wiki déclare bien qu'il COUVRE notre
 * entité sur cette page, mais pas que l'IMAGE de cette page la représente. Vérification à l'œil :
 * « Katen Kyōkotsu » (un zanpakutō) redirige vers « Shunsui Kyōraku » et rapportait le PORTRAIT
 * du porteur sur la fiche du sabre ; « Coup de Vent » rapportait le corps de Franky ; les quatre
 * transformations de Chopper rapportaient toutes l'image du fruit. Trente acceptations perdues
 * sur 2 539 — et une classe entière de fausses images avec.
 * Les gardes de NATURE s'appliquent ensuite à tous, sans exception : page d'œuvre/liste, ou page
 * plus générale que l'entité demandée (le Mangekyō de base ne décrit pas l'Éternel).
 */
const motsDe = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .split(/[^a-z0-9]+/).filter(Boolean);

/** LE SLUG, MAIS SERRÉ D'UN CRAN (mesuré sur la passe à blanc du 07/08).
 *  `sameEntityBySlug` accepte l'INCLUSION d'un ensemble de mots dans l'autre. Sur un slug d'UN
 *  SEUL mot, cette inclusion est presque toujours vraie et ne prouve plus rien : le slug `slug`
 *  (« Planète Slug ») a matché « Lord Slug » — le méchant du film, pas la planète — et le slug
 *  `jelly` (« Île Gelée ») a matché « Jerry » par squelette de romanisation. Pour ce témoin-là,
 *  et lui seul, on exige donc l'ÉGALITÉ des ensembles de mots, et l'égalité LITTÉRALE quand il
 *  n'y a qu'un mot (pas de tolérance de squelette : sur un mot unique, elle tire à pile ou face).
 *  Les bons cas survivent tous : `kuraigana-island` ≡ « Kuraigana Island », `flower-hill` ≡
 *  « Flower Hill », `new-marineford` ≡ « New Marineford ». */
function slugEgaleTitre(slug, titre) {
  const a = motsDe(slug), b = motsDe(titre);
  if (!a.length || a.length !== b.length) return false;
  if (a.length === 1) return a[0] === b[0];
  return sameEntityBySlug(slug, titre);          // cardinal égal + inclusion ⇒ ensembles égaux
}

function identite(fiche, cand, resolu) {
  const t = resolu.titre;
  let preuve = null;
  if (cand.via === 'alias-cure') preuve = `alias curé → « ${t} »`;
  else if (sameEntityName(fiche.name, t)) preuve = 'nom ≡ titre';
  else if (slugEgaleTitre(fiche.slug, t)) preuve = 'slug ≡ titre';
  if (!preuve) return { ok: false,
    // On distingue le refus APRÈS redirection : ce sont les meilleurs candidats au registre
    // d'alias curé, puisque le wiki a lui-même désigné la page — il ne manque qu'un œil humain.
    motif: resolu.viaRedirection
      ? `redirigé hors de l’entité : « ${cand.titre} » → « ${t} » (piste d’alias à vérifier)`
      : `mauvaise entité : « ${t} » ne désigne pas « ${fiche.name} »` };

  // pageDOeuvre veut aussi le texte pour flairer une infobox d'épisode ; on n'a que le titre ici
  // (pageimages ne rend pas le wikitext). Le contrôle de titre attrape l'écrasante majorité.
  const oeuvre = pageDOeuvre(t, '') ?? pagePlusGenerale(fiche.name, t);
  if (oeuvre) return { ok: false, motif: oeuvre };
  return { ok: true, preuve };
}

/* ─────────────────────── 3. LES CANDIDATS DE TITRE ─────────────────────── */

/** Titres à essayer pour une fiche, du plus sûr au plus spéculatif. Aucune recherche plein texte :
 *  elle ramène « n'importe quel article citant le nom » et c'est ainsi qu'on colle une image de
 *  chapitre sur une fiche de personnage. Ici on ne prend que ce que le wiki résout DIRECTEMENT. */
function candidats(fiche) {
  const out = [];
  const vus = new Set();
  const pousse = (titre, via) => {
    const t = String(titre ?? '').trim();
    if (!t || vus.has(t.toLowerCase())) return;
    vus.add(t.toLowerCase()); out.push({ titre: t, via });
  };
  const cure = ALIAS_REGISTRE[fiche.universe]?.[fiche.name];
  if (cure) pousse(cure, 'alias-cure');
  pousse(fiche.name, 'exact');
  pousse(fiche.name.normalize('NFD').replace(/[̀-ͯ]/g, ''), 'ascii');
  if (fiche.slug) pousse(String(fiche.slug).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), 'slug');
  return out;
}

/* ─────────────────────── 4. LECTURE DE L'ÉTAT (instantané d'avant) ─────────────────────── */

const site = clientSite();
const univers = UNIVERSE ? [UNIVERSE] : Object.keys(WIKIS);
for (const u of univers) if (!WIKIS[u]) { console.error(`✗ univers sans wiki connu : « ${u} »`); process.exit(1); }

let fiches = [];
for (let de = 0; ; de += 1000) {
  let q = site.from('akasha_entries').select('id,slug,name,type,universe,image_url')
    .is('image_url', null).in('universe', univers).order('slug').range(de, de + 999);
  if (TYPE) q = q.eq('type', TYPE);
  const { data, error } = await q;
  if (error) { console.error('✗ lecture akasha_entries :', error.message); process.exit(1); }
  fiches = fiches.concat(data ?? []);
  if ((data ?? []).length < 1000) break;
}
if (Number.isFinite(LIMIT)) fiches = fiches.slice(0, LIMIT);

const CANDIDATS = fiches.length;
console.log(`${CANDIDATS} fiche(s) sans image, univers : ${univers.join(', ')}${TYPE ? ` · type ${TYPE}` : ''}`);
if (!CANDIDATS) process.exit(0);

// TRACE AVANT TOUTE ÉCRITURE — règle de la maison. On consigne l'état lu à l'instant, y compris
// en --dry : si la passe casse en cours de route, on sait exactement ce qui était vide avant.
await mkdir(AUDITS, { recursive: true });
await writeFile(TRACE, JSON.stringify({
  chantier: 'images-fandom',
  pris_le: new Date().toISOString(),
  mode: DRY ? 'à blanc' : 'application',
  colonne: 'image_url',
  format_pose: ORIGINAL ? 'original' : 'vignette 720 (scale-to-width-down/720)',
  portee: { univers, type: TYPE ?? 'tous', limite: Number.isFinite(LIMIT) ? LIMIT : null },
  candidats: CANDIDATS,
  avant: fiches.map((f) => ({ slug: f.slug, universe: f.universe, type: f.type, name: f.name, image_url: f.image_url })),
}, null, 1));
console.log(`trace d'avant écrite : ${TRACE} (${CANDIDATS} lignes)`);

/* ─────────────────────── 5. LES PASSES (une par rang de candidat) ─────────────────────── */

/** verdicts : slug → { etat, motif, url, titre, preuve, via } */
const verdicts = new Map();
const restantes = new Map(fiches.map((f) => [f.slug, f]));   // fiches encore sans réponse ferme
const listeCand = new Map(fiches.map((f) => [f.slug, candidats(f)]));
const RANGS = 4;

for (let rang = 0; rang < RANGS; rang++) {
  // Regroupement par univers : chaque wiki a son api.php.
  const parUnivers = new Map();
  for (const [slug, f] of restantes) {
    const c = listeCand.get(slug)[rang];
    if (!c) continue;
    if (!parUnivers.has(f.universe)) parUnivers.set(f.universe, new Map());
    const m = parUnivers.get(f.universe);
    if (!m.has(c.titre)) m.set(c.titre, []);
    m.get(c.titre).push({ fiche: f, cand: c });
  }
  if (!parUnivers.size) continue;

  for (const [uni, parTitre] of parUnivers) {
    const api = wikiApi(uni);
    const titres = [...parTitre.keys()];
    console.log(`  rang ${rang + 1} · ${uni} : ${titres.length} titre(s) en ${Math.ceil(titres.length / LOT)} requête(s)`);
    for (let i = 0; i < titres.length; i += LOT) {
      const lot = titres.slice(i, i + LOT);
      const r = await imagesDuLot(api, lot);
      for (const titre of lot) {
        for (const { fiche, cand } of parTitre.get(titre)) {
          if (r.panne) {
            // PANNE ≠ ABSENCE : on note, on ne conclut pas, la fiche reste à retenter.
            verdicts.set(fiche.slug, { etat: 'panne', motif: `wiki injoignable (${r.panne})`, via: cand.via, titre });
            restantes.delete(fiche.slug);
            continue;
          }
          const resolu = r.out.get(titre);
          if (!resolu?.page || resolu.page.missing) continue;              // rang suivant
          const img = imageAcceptable(resolu.page);
          if (!img.ok) { verdicts.set(fiche.slug, { etat: 'sans-image', motif: img.motif, titre: resolu.titre, via: cand.via }); restantes.delete(fiche.slug); continue; }
          const id = identite(fiche, cand, resolu);
          if (!id.ok) { verdicts.set(fiche.slug, { etat: 'refus-identite', motif: id.motif, titre: resolu.titre, via: cand.via }); restantes.delete(fiche.slug); continue; }
          verdicts.set(fiche.slug, { etat: 'trouve', url: img.url, original: img.original, dim: img.dim, titre: resolu.titre, preuve: id.preuve, via: cand.via });
          restantes.delete(fiche.slug);
        }
      }
    }
  }
  // Une fiche refusée à un rang ne repasse pas au suivant : un refus d'identité est un verdict,
  // pas un échec de résolution. Seules les fiches SANS page trouvée descendent d'un rang.
}
// Ce qui reste après le dernier rang : aucun titre candidat n'existe sur le wiki.
for (const [slug] of restantes)
  verdicts.set(slug, { etat: 'sans-page', motif: 'aucun titre candidat n’existe sur le wiki' });

/* ─────────────────────── 6. COLLISIONS DE PAGE ─────────────────────── */
// Plusieurs fiches d'un même univers renvoyées sur LA MÊME page du wiki. Deux causes très
// différentes, mesurées sur la passe à blanc du 07/08 :
//  · NOS PROPRES DOUBLONS — « Alabasta » deux fois, « Baratie » deux fois, « Enma » deux fois.
//    Là, la même image sur les deux fiches est JUSTE : c'est bien la même entité. On accepte.
//  · UNE PAGE-AIMANT — « Arm Point », « Guard Point », « Horn Point », « Monster Point » tous
//    ramenés sur « Hito Hito no Mi ». Poser l'image du fruit sur quatre transformations
//    différentes remplit quatre cartes avec le même visuel faux. On ne garde alors que la
//    TITULAIRE (celle dont le nom ou le slug EST le titre) ; sans titulaire unique, on refuse
//    tout le groupe et on le consigne — une case vide se voit, une mauvaise image se croit.
const parSlug = new Map(fiches.map((f) => [f.slug, f]));
const plie = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const grappes = new Map();
for (const [slug, v] of verdicts) {
  if (v.etat !== 'trouve') continue;
  // Séparateur ‖ : « One Piece » contient un espace, on ne peut pas recouper sur l'espace.
  const cle = `${parSlug.get(slug).universe}‖${v.titre}`;
  if (!grappes.has(cle)) grappes.set(cle, []);
  grappes.get(cle).push(slug);
}
let collisions = 0, doublonsMaison = 0;
for (const [cle, slugs] of grappes) {
  if (slugs.length < 2) continue;
  // Même nom des deux côtés ⇒ doublon de notre base, pas une erreur de résolution.
  if (new Set(slugs.map((s) => plie(parSlug.get(s).name))).size === 1) { doublonsMaison += slugs.length; continue; }
  const titre = plie(cle.split('‖')[1]);
  const titulaires = slugs.filter((s) => plie(parSlug.get(s).name) === titre || plie(parSlug.get(s).slug) === titre);
  const garde = titulaires.length === 1 ? titulaires[0] : null;
  for (const s of slugs) {
    if (s === garde) continue;
    collisions++;
    verdicts.set(s, { etat: 'refus-identite', titre: verdicts.get(s).titre, via: verdicts.get(s).via,
      motif: `collision de page : ${slugs.length} fiches renvoyées sur « ${verdicts.get(s).titre} »${garde ? ` (titulaire : ${garde})` : ' (aucune titulaire)'}` });
  }
}

/* ─────────────────────── 7. COMPTE CROISÉ, PUIS ÉCRITURE ─────────────────────── */

const par = (e) => [...verdicts.values()].filter((v) => v.etat === e).length;
const trouves = [...verdicts.entries()].filter(([, v]) => v.etat === 'trouve');
// Comptes FIGÉS avant toute écriture : le compte croisé décrit la passe de résolution, il ne doit
// pas se déformer selon ce que la base a fait entre-temps.
const C = { trouves: par('trouve'), refus_identite: par('refus-identite'),
  page_sans_image: par('sans-image'), sans_page_wiki: par('sans-page'), pannes: par('panne') };
const somme = Object.values(C).reduce((a, b) => a + b, 0);
console.log('─'.repeat(72));
console.log(`candidats ${CANDIDATS} = trouvés ${C.trouves} + refus d'identité ${C.refus_identite}`
  + ` + page sans image ${C.page_sans_image} + sans page wiki ${C.sans_page_wiki} + pannes ${C.pannes}`);
if (somme !== CANDIDATS) { console.error(`✗ COMPTE CROISÉ FAUX : ${somme} ≠ ${CANDIDATS} — on n'écrit rien.`); process.exit(1); }
console.log(`(${collisions} refus pour collision de page · ${doublonsMaison} fiches en doublon maison servies par la même page)`);

let posees = 0, deja = 0, echecs = 0;
if (!DRY && trouves.length) {
  const file = [...trouves];
  const travail = async () => {
    for (;;) {
      const item = file.shift();
      if (!item) return;
      const [slug, v] = item;
      const f = parSlug.get(slug);
      // `.is('image_url', null)` re-posé ici : l'usine écrit en parallèle, on ne recouvre jamais.
      const { data, error } = await site.from('akasha_entries')
        .update({ image_url: v.url }).eq('id', f.id).is('image_url', null).select('slug');
      if (error) { echecs++; v.echec = error.message; continue; }
      // Zéro ligne rendue = la garde `.is('image_url', null)` a mordu : quelqu'un a rempli la
      // case entre notre lecture et notre écriture. On NE recouvre PAS, on note.
      if (!data?.length) { deja++; v.dejaRemplieEntreTemps = true; continue; }
      posees++;
    }
  };
  await Promise.all(Array.from({ length: 6 }, travail));
  console.log(`→ ${posees} image(s) posée(s) · ${deja} déjà remplie(s) entre-temps · ${echecs} échec(s) d'écriture`);
} else if (DRY) {
  console.log('→ --dry : aucune écriture.');
}

/* ─────────────────────── 8. RAPPORT ─────────────────────── */

const motifs = {};
const sansImage = [];
for (const [slug, v] of verdicts) {
  if (v.etat === 'trouve') continue;
  const f = parSlug.get(slug);
  const famille = v.etat === 'sans-page' ? 'sans page wiki'
    : v.etat === 'sans-image' ? 'page sans image d’infobox'
    : v.etat === 'panne' ? 'panne (à retenter)' : 'refus d’identité';
  motifs[`${f.universe} · ${f.type} · ${famille}`] = (motifs[`${f.universe} · ${f.type} · ${famille}`] ?? 0) + 1;
  sansImage.push({ slug, name: f.name, universe: f.universe, type: f.type, etat: v.etat, pourquoi: v.motif, titre_resolu: v.titre ?? null });
}

// PLAFONDS : ce qui ne se résoudra jamais par ce chantier, et pourquoi. Ce n'est pas une pile
// à retenter, c'est un constat. On le nomme pour que personne ne relance la même passe en
// espérant un autre résultat.
const plafonds = [
  { plafond: 'les métiers Naruto n’ont pas de page de wiki',
    combien: sansImage.filter((x) => x.universe === 'Naruto' && x.type === 'profession' && x.etat === 'sans-page').length,
    definitif: true,
    pourquoi: 'Sur les 92 métiers Naruto sans image, 8 sont en réalité des titres canon qui ONT une page '
      + '(Kazekage, Mizukage, Raikage, Tsuchikage, Hoshikage, Mercenary Ninja…) et viennent d’être illustrés. '
      + 'Les autres — Accountant, Actor, Bandit, Bodyguard, Astronomer, Gambler, Prisoner… — sont des ÉTIQUETTES '
      + 'de rôle extraites des infobox, pas des sujets d’article : naruto.fandom.com ne consacre pas de page à '
      + '« comptable ». Aucune requête ne les trouvera, il n’y a rien à trouver. Un visuel, s’il en faut un, devra '
      + 'être produit autrement (icône de métier), pas moissonné.' },
  { plafond: 'les entités à nom français curé n’existent sous ce nom sur aucun wiki anglophone',
    combien: sansImage.filter((x) => x.etat === 'sans-page' && /^(Île|Royaume|Village|L’équipage|Équipage|Fruit|Bateau|Colline|Planète|Grand|Archipel)\b/.test(x.name)).length,
    definitif: false,
    pourquoi: 'Nos noms sont des traductions curées (« Royaume de Frauce », « Fruit du Volatile, version Aigle »). '
      + 'Le titre exact échoue, le slug ne porte pas toujours le nom d’origine, et on s’interdit la recherche plein '
      + 'texte — c’est elle qui colle des images de chapitre sur des fiches d’entité. Remède existant et sûr : '
      + 'data/alias-cures.json (nom NIKA → titre canon vérifié à la main). Chaque alias ajouté déverrouille sa fiche '
      + 'à la passe suivante, sans toucher au code.' },
  { plafond: 'des pages existent mais n’ont aucune image d’infobox',
    combien: C.page_sans_image, definitif: true,
    pourquoi: 'Le wiki lui-même n’illustre pas ces articles. Il n’y a rien à moissonner : la seule issue est de '
      + 'produire ou de sourcer une image ailleurs, ce qui sort de ce chantier.' },
];

await writeFile(RAPPORT, JSON.stringify({
  chantier: 'images gratuites du wiki (prop=pageimages)',
  passe_le: new Date().toISOString(),
  mode: DRY ? 'à blanc' : 'application',
  format_pose: ORIGINAL ? 'original' : 'vignette 720',
  portee: { univers, type: TYPE ?? 'tous' },
  compte_croise: { candidats: CANDIDATS, ...C,
    collisions_de_page: collisions, doublons_maison_meme_page: doublonsMaison,
    posees, deja_remplies_entre_temps: deja, echecs_ecriture: echecs },
  motifs_par_univers_type: Object.fromEntries(Object.entries(motifs).sort((a, b) => b[1] - a[1])),
  plafonds,
  // Les refus « page plus générale » sont les seuls réparables sans risque : le titre canon est
  // déjà sous nos yeux, il ne manque qu'une vérification humaine pour entrer au registre d'alias.
  candidats_au_registre_alias: sansImage
    .filter((x) => x.etat === 'refus-identite'
      && (String(x.pourquoi).startsWith('page plus générale') || String(x.pourquoi).startsWith('redirigé hors de l’entité')))
    .map((x) => ({ universe: x.universe, name: x.name, titre_wiki_propose: x.titre_resolu, refus: x.pourquoi })),
  posees_detail: trouves.map(([slug, v]) => ({ slug, universe: parSlug.get(slug).universe, type: parSlug.get(slug).type,
    name: parSlug.get(slug).name, titre_wiki: v.titre, preuve: v.preuve, via: v.via,
    sous_page_du_wiki: v.titre.includes('/') || undefined,
    deja_remplie_entre_temps: v.dejaRemplieEntreTemps || undefined,
    image_url: v.url, original: v.original, dimensions: v.dim })),
  restees_sans_image: sansImage,
}, null, 1));
console.log(`rapport : ${RAPPORT}`);
