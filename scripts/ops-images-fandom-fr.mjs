// scripts/ops-images-fandom-fr.mjs — LE WIKI FRANCOPHONE, LÀ OÙ NOS NOMS SONT DES TITRES.
//
// ══════════════════ POURQUOI CE SECOND CONNECTEUR ══════════════════
// `ops-images-fandom.mjs` interroge le wiki ANGLOPHONE. Passé sur les 818 fiches sans visuel le
// 10/08, il n'en résout que 8 : 521 verdicts « sans page wiki ». Ce n'est pas une absence de page,
// c'est une absence de TRADUCTION — 166 de ces fiches portent un nom français curé (« Bateau de
// Monkey D. Garp », « Royaume de Flevance ») dont aucun titre anglais ne partage les mots.
//
// Or chaque univers a son wiki francophone (onepiece.fandom.com/fr, naruto.fandom.com/fr…) où nos
// noms sont exactement les titres d'articles. L'identité n'y est donc plus à deviner : elle est
// ÉGALE. On exige l'égalité stricte du nom normalisé et du titre rendu — pas d'inclusion de mots,
// pas de squelette de romanisation, pas de redirection. C'est le témoin le plus fort dont on
// dispose, et c'est le seul qu'on accepte ici.
//
// ══════════════════ LES TROIS GARDES AJOUTÉES (mesurées, pas supposées) ══════════════════
// Éprouvés le 10/08, les 8 candidats du connecteur anglophone donnaient 7 erreurs sur 8 :
//
//  · GARDE DE NATURE — notre fiche `ace` est un SABRE (`type: artifact`) ; le wiki résolvait
//    « Ace » → « Portgas D. Ace », le PERSONNAGE, et `sameEntityName` validait par inclusion des
//    mots. On aurait posé le portrait d'un homme sur la fiche d'une épée : la classe exacte des
//    quatre usurpations du 09/08. La page dit pourtant ce qu'elle est, dans ses CATÉGORIES
//    (« Male Characters », « Humans »). On refuse donc toute page de personnage sur une fiche qui
//    n'est pas un personnage. Aucune autre garde du connecteur ne voyait ce cas.
//
//  · GARDE DE COLLISION AVEC L'EXISTANT — le connecteur ne détecte que les collisions INTERNES à
//    sa passe. Six des huit candidats visaient un fichier DÉJÀ porté par une fiche illustrée
//    (« Île Céleste » contre `skypiea-lieu`, « Genkidama » contre `atk-db-spirit-bomb`). Lecture
//    faite : ce sont de vrais DOUBLONS de notre base, pas des usurpations — mais illustrer un
//    doublon, c'est le faire passer pour complet et le soustraire au tri qui doit le fusionner.
//    On refuse et on consigne : la fusion est une décision, pas un effet de bord d'un chantier
//    d'images.
//
//  · GARDE DE CHARGEMENT — un CDN d'images sert son carton d'erreur en HTTP 200 (leçon du 09/08).
//    On télécharge et on lit la DÉFINITION dans les octets de l'en-tête ; sous 80×80, on refuse.
//
// N'écrit QUE `image_url`, jamais `attributes`. N'écrase jamais une valeur existante
// (`.is('image_url', null)` posé à la lecture ET à l'écriture).
//
// Usage :
//   node --env-file=.env.local scripts/ops-images-fandom-fr.mjs --dry
//   node --env-file=.env.local scripts/ops-images-fandom-fr.mjs --suffixe=2026-08-10
import { writeFile, mkdir } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';
import { pageDOeuvre, pagePlusGenerale, fandomSleep as sleep } from './lib/fandom.mjs';
import { dimensions, idFichier } from './lib/image-octets.mjs';

const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const DRY = process.argv.includes('--dry');
const LIMIT = Number(arg('limit', Infinity));
const AUDITS = new URL('../data/audits/', import.meta.url).pathname;
const SUFFIXE = arg('suffixe', DRY ? 'dry' : new Date().toISOString().replace(/[:.]/g, '-'));
const TRACE = `${AUDITS}images-fr-trace-${SUFFIXE}.json`;
const RAPPORT = `${AUDITS}images-fr-${SUFFIXE}.json`;

const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative ; contact : tulbured06@gmail.com)' };
const LOT = 50;
const PAUSE_MS = 250;

/** Les wikis francophones des univers où nos noms sont français. */
const API_FR = {
  'One Piece': 'https://onepiece.fandom.com/fr/api.php',
  'Naruto': 'https://naruto.fandom.com/fr/api.php',
  'Bleach': 'https://bleach.fandom.com/fr/api.php',
  'Dragon Ball': 'https://dragonball.fandom.com/fr/api.php',
};

/* ─────────────────────── L'ACCÈS (panne distincte de l'absence) ─────────────────────── */
async function interroger(url, essais = 3) {
  let dernier = 'inconnu';
  for (let i = 0; i < essais; i++) {
    try {
      const r = await fetch(`${url}&maxlag=5`, { headers: UA, signal: AbortSignal.timeout(25_000) });
      if (r.status === 429) { dernier = 'HTTP 429'; await sleep(1500 * (i + 1)); continue; }
      if (!r.ok) { dernier = `HTTP ${r.status}`; await sleep(500 * (i + 1)); continue; }
      const j = await r.json();
      if (j?.error) { dernier = `erreur API : ${j.error.code}`; await sleep(500 * (i + 1)); continue; }
      if (!j?.query) { dernier = 'réponse sans query'; await sleep(500 * (i + 1)); continue; }
      return { ok: true, json: j };
    } catch (e) { dernier = String(e?.name ?? e).slice(0, 60); }
    await sleep(500 * (i + 1));
  }
  return { ok: false, motif: dernier };
}

/* ─────────────────────── LES GARDES D'IMAGE (reprises du connecteur anglophone) ─────────────── */
// LE CARTON D'ERREUR, EN FRANÇAIS. La liste héritée du connecteur anglophone traque « NoImage »
// et « NoPicAvailable » — elle ne pouvait pas voir `Image_Non_Disponible.png`, qui met les mots
// dans l'autre ordre et dans l'autre langue. Mesuré à blanc le 10/08 : 13 des 52 finalistes (25 %)
// pointaient ce seul fichier, treize royaumes et îles qui auraient reçu un carton vide. C'est
// exactement le piège payé le 08/08 sur One Piece, represénté dans une autre langue — d'où la
// règle générale ajoutée sous ces motifs : `image[-_ ]?non[-_ ]?disponible` et ses voisins.
const FICHIER_PARASITE = /(site-?logo|wiki-?wordmark|wordmark|favicon|placeholder|no[-_]?image|no[-_]?pic(?:ture)?[-_]?avail(?:able)?|nophoto|question[-_]?mark|spoiler|under[-_]?construction|stub|ambox|icon[-_]?wiki|image[-_ ]?non[-_ ]?disponible|pas[-_ ]?d[-_ ]?image|sans[-_ ]?image|aucune[-_ ]?image|image[-_ ]?manquante)/i;
const HOTE_ATTENDU = 'static.wikia.nocookie.net';
const rasteriseSvg = (u) => /\.svg\/revision\/latest(?!\/scale-to-width-down)/i.test(u)
  ? u.replace(/(\.svg\/revision\/latest)/i, '$1/scale-to-width-down/720') : u;

function imageAcceptable(page) {
  const brut = page?.thumbnail?.source ?? page?.original?.source;
  if (!brut) return { ok: false, motif: 'la page FR existe mais n’a pas d’image d’infobox' };
  const src = rasteriseSvg(brut);
  let hote;
  try { hote = new URL(src).host; } catch { return { ok: false, motif: 'URL d’image illisible' }; }
  if (hote !== HOTE_ATTENDU) return { ok: false, motif: `image servie par ${hote}` };
  const fichier = decodeURIComponent(src.split('/images/').pop() ?? '');
  if (FICHIER_PARASITE.test(fichier)) return { ok: false, motif: `fichier de maintenance du wiki : « ${fichier.split('/')[2] ?? fichier} »` };
  const o = page.original ?? {};
  if (o.width && o.height && (o.width < 60 || o.height < 60)) return { ok: false, motif: `image trop petite (${o.width}×${o.height})` };
  return { ok: true, url: src, dim: o.width ? `${o.width}×${o.height}` : null };
}

/* ─────────────────────── L'IDENTITÉ : L'ÉGALITÉ, RIEN DE MOINS ─────────────────────── */
// Pas d'inclusion de mots (c'est elle qui a fait passer « Ace » pour « Portgas D. Ace »), pas de
// squelette de romanisation, pas de redirection. On plie la casse, les accents et la ponctuation —
// « Bateau épicerie de la Marine » ≡ « Bateau Épicerie de la Marine » — et on exige l'égalité.
const plie = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[’']/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

/* ─────────────────────── LA GARDE DE NATURE (par les catégories de la page) ─────────────────── */
// Une page de personnage se déclare dans ses catégories, en anglais comme en français.
// On ne cherche QUE le personnage : c'est la confusion qui coûte cher (un visage sur une épée),
// et c'est la seule dont on a mesuré des cas. Les autres natures restent au jugement des gardes
// existantes — une garde qu'on ne sait pas justifier est une garde qui refusera à tort.
const CAT_PERSONNAGE = /\b(characters?|personnages?|humans?|humains?|hommes|femmes|male|female)\b/i;

/* ─────────────────────── G4 · LE FICHIER PARLE-T-IL DU SUJET ? ─────────────────────── */
// La garde de nature juge la PAGE ; elle ne juge pas ce que l'IMAGE représente. Trouvé à l'œil le
// 10/08 sur les 12 premiers candidats : la fiche « Brench » (une PLANÈTE de Dragon Ball) recevait
// `JeiceBurterVsGokuNV.png` — une scène de combat entre personnages. La page « Brench » est bien
// celle de la planète, ses catégories ne mentionnent aucun personnage : rien, en amont, ne pouvait
// le voir. Le nom du FICHIER, lui, le disait.
//
// Sur les 40 candidats, le wiki nomme son image d'infobox d'après le sujet dans 36 cas
// (`Water_Seven_Anime_Infobox.png`, `Bateau_de_Garp_Anime_Infobox.png`). Les 4 exceptions sont
// précisément les cas douteux. On exige donc UN mot commun entre le titre de la page et le nom du
// fichier — au pluriel près, sans quoi « Navires … G-2 » et `Navire_G-2.png` seraient séparés à
// tort. Le prix est connu et assumé : au plus deux bonnes images perdues sur quarante. Une case
// vide se voit, une mauvaise image se croit.
const MOTS_VIDES = /^(the|les|des|une|los|infobox|anime|manga|png|jpg|jpeg|webp|gif|svg|portrait|image|film|movie|episode|chapitre|chapter|new|nv)$/;
const motsUtiles = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .split(/[^a-z0-9]+/)
  .map((w) => w.replace(/s$/, ''))                    // tolérance de pluriel : « navires » ≡ « navire »
  .filter((w) => w.length > 2 && !MOTS_VIDES.test(w));

function fichierParleDuSujet(url, titre) {
  const fichier = decodeURIComponent(String(url).split('/images/').pop() ?? '').split('/revision')[0];
  const nom = fichier.replace(/^[0-9a-f]\/[0-9a-f]{2}\//, '');
  const duTitre = new Set(motsUtiles(titre));
  const communs = motsUtiles(nom).filter((w) => duTitre.has(w));
  return { ok: communs.length > 0, communs, nom };
}

async function estPagePersonnage(api, titre) {
  const u = `${api}?action=query&prop=categories&cllimit=200&format=json&formatversion=2`
    + `&redirects=1&titles=${encodeURIComponent(titre)}`;
  const r = await interroger(u);
  await sleep(PAUSE_MS);
  if (!r.ok) return { connu: false, motif: r.motif };            // INCONNU ≠ FERMÉ (leçon du 07/08)
  const cats = (r.json.query.pages?.[0]?.categories ?? []).map((c) => c.title.replace(/^Cat[ée]gor(y|ie):/i, ''));
  const touchees = cats.filter((c) => CAT_PERSONNAGE.test(c));
  return { connu: true, personnage: touchees.length > 0, preuve: touchees.slice(0, 3).join(' · '), cats: cats.length };
}

/* ─────────────────────── LECTURE DE L'ÉTAT ─────────────────────── */
const site = clientSite();
let toutes = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await site.from('akasha_entries')
    .select('id,slug,name,type,universe,image_url').order('slug').range(de, de + 999);
  if (error) { console.error('✗ lecture akasha_entries :', error.message); process.exit(1); }
  toutes = toutes.concat(data ?? []);
  if ((data ?? []).length < 1000) break;
}
// L'index des fichiers DÉJÀ portés — la garde de collision avec l'existant.
const parFichier = new Map();
for (const e of toutes) {
  if (!e.image_url) continue;
  const k = idFichier(e.image_url);
  if (!parFichier.has(k)) parFichier.set(k, []);
  parFichier.get(k).push(e);
}
let fiches = toutes.filter((e) => !e.image_url && API_FR[e.universe]);
if (Number.isFinite(LIMIT)) fiches = fiches.slice(0, LIMIT);

console.log(`${toutes.length} fiches · ${toutes.length - fiches.length - toutes.filter((e) => !e.image_url && !API_FR[e.universe]).length} illustrées`);
console.log(`${fiches.length} fiche(s) sans image dans les 4 univers à wiki francophone`);
console.log(`${parFichier.size} fichiers de wiki déjà portés en base\n`);

await mkdir(AUDITS, { recursive: true });
await writeFile(TRACE, JSON.stringify({
  chantier: 'images du wiki francophone', pris_le: new Date().toISOString(),
  mode: DRY ? 'à blanc' : 'application', colonne: 'image_url',
  candidats: fiches.length,
  avant: fiches.map((f) => ({ slug: f.slug, universe: f.universe, type: f.type, name: f.name, image_url: f.image_url })),
}, null, 1));
console.log(`trace d'avant écrite : ${TRACE} (${fiches.length} lignes)\n`);

/* ─────────────────────── RÉSOLUTION PAR LOTS ─────────────────────── */
const verdicts = new Map();
const parUnivers = new Map();
for (const f of fiches) {
  if (!parUnivers.has(f.universe)) parUnivers.set(f.universe, []);
  parUnivers.get(f.universe).push(f);
}

for (const [uni, liste] of parUnivers) {
  const api = API_FR[uni];
  console.log(`${uni} : ${liste.length} titre(s) en ${Math.ceil(liste.length / LOT)} requête(s)`);
  for (let i = 0; i < liste.length; i += LOT) {
    const lot = liste.slice(i, i + LOT);
    const u = `${api}?action=query&prop=pageimages&piprop=original|thumbnail&pithumbsize=720`
      + `&pilimit=${LOT}&format=json&formatversion=2&redirects=1`
      + `&titles=${encodeURIComponent(lot.map((f) => f.name).join('|'))}`;
    const r = await interroger(u);
    await sleep(PAUSE_MS);
    if (!r.ok) {
      for (const f of lot) verdicts.set(f.slug, { etat: 'panne', motif: `wiki FR injoignable (${r.motif})` });
      continue;
    }
    const q = r.json.query;
    const normalise = new Map((q.normalized ?? []).map((n) => [n.from, n.to]));
    const redirige = new Map((q.redirects ?? []).map((x) => [x.from, x.to]));
    const parTitre = new Map((q.pages ?? []).map((p) => [p.title, p]));
    for (const f of lot) {
      let t = normalise.get(f.name) ?? f.name;
      const vus = new Set();
      while (redirige.has(t) && !vus.has(t)) { vus.add(t); t = redirige.get(t); }
      const page = parTitre.get(t);
      if (!page || page.missing) { verdicts.set(f.slug, { etat: 'sans-page', motif: 'aucune page à ce titre sur le wiki FR' }); continue; }
      // IDENTITÉ : égalité stricte du nom plié et du titre plié.
      if (plie(f.name) !== plie(page.title)) {
        verdicts.set(f.slug, { etat: 'refus-identite', titre: page.title,
          motif: `titre résolu « ${page.title} » ≠ notre nom « ${f.name} » (on n'accepte que l'égalité)` });
        continue;
      }
      const nature = pageDOeuvre(page.title, '') ?? pagePlusGenerale(f.name, page.title);
      if (nature) { verdicts.set(f.slug, { etat: 'refus-identite', titre: page.title, motif: nature }); continue; }
      const img = imageAcceptable(page);
      if (!img.ok) { verdicts.set(f.slug, { etat: 'sans-image', titre: page.title, motif: img.motif }); continue; }
      verdicts.set(f.slug, { etat: 'candidat', titre: page.title, url: img.url, dim: img.dim, preuve: `nom ≡ titre FR « ${page.title} »` });
    }
  }
}

/* ─────────────────────── LES TROIS GARDES, SUR LES FINALISTES SEULEMENT ─────────────────────── */
const parSlug = new Map(fiches.map((f) => [f.slug, f]));

// G0 · COLLISION INTERNE À LA PASSE — plusieurs fiches renvoyées sur le MÊME fichier.
// Le connecteur anglophone a cette garde ; je l'avais omise, et c'est elle qui, à blanc, a montré
// que treize fiches visaient toutes `Image_Non_Disponible.png`. Ici l'identité est l'ÉGALITÉ
// stricte du nom et du titre : deux entités aux noms différents ne peuvent pas légitimement être
// LA MÊME page. Un fichier réclamé deux fois est donc soit un carton de maintenance, soit un
// visuel générique — dans les deux cas on refuse tout le groupe et on le consigne.
{
  const parFichierPasse = new Map();
  for (const [slug, v] of verdicts) {
    if (v.etat !== 'candidat') continue;
    const k = idFichier(v.url);
    if (!parFichierPasse.has(k)) parFichierPasse.set(k, []);
    parFichierPasse.get(k).push(slug);
  }
  for (const [k, slugs] of parFichierPasse) {
    if (slugs.length < 2) continue;
    for (const s of slugs) {
      const v = verdicts.get(s);
      verdicts.set(s, { ...v, etat: 'refus-collision-interne',
        motif: `${slugs.length} fiches de cette passe visent le même fichier « ${decodeURIComponent(k.split('/images/').pop() ?? k)} » — visuel générique ou carton de maintenance`,
        groupe: slugs.filter((x) => x !== s) });
    }
  }
}

const finalistes = [...verdicts.entries()].filter(([, v]) => v.etat === 'candidat');
console.log(`\n${finalistes.length} finaliste(s) — passage des gardes\n`);

let refusNature = 0, refusCollision = 0, refusCharge = 0, refusFichier = 0;
for (const [slug, v] of finalistes) {
  const f = parSlug.get(slug);

  // G1 · collision avec une fiche DÉJÀ illustrée
  const occupants = (parFichier.get(idFichier(v.url)) ?? []).filter((e) => e.slug !== slug);
  if (occupants.length) {
    refusCollision++;
    verdicts.set(slug, { ...v, etat: 'refus-collision',
      motif: `fichier déjà porté par ${occupants.map((o) => `${o.slug} (${o.name})`).join(', ')} — doublon probable, à instruire`,
      collision: occupants.map((o) => ({ slug: o.slug, name: o.name })) });
    continue;
  }

  // G2 · nature : une page de personnage sur une fiche qui n'en est pas un
  if (f.type !== 'character') {
    const n = await estPagePersonnage(API_FR[f.universe], v.titre);
    if (n.connu && n.personnage) {
      refusNature++;
      verdicts.set(slug, { ...v, etat: 'refus-nature',
        motif: `page de PERSONNAGE (catégories : ${n.preuve}) posée sur une fiche de type « ${f.type} »` });
      continue;
    }
    v.nature_verifiee = n.connu ? `non-personnage (${n.cats} catégories)` : `indéterminée (${n.motif})`;
  }

  // G4 · le nom du fichier partage-t-il un mot avec le titre de la page ?
  const fp = fichierParleDuSujet(v.url, v.titre);
  if (!fp.ok) {
    refusFichier++;
    verdicts.set(slug, { ...v, etat: 'refus-fichier',
      motif: `le fichier « ${fp.nom} » ne partage aucun mot avec la page « ${v.titre} » — l'image ne parle probablement pas du sujet` });
    continue;
  }
  v.fichier_preuve = `mots communs titre/fichier : ${fp.communs.join(', ')}`;

  // G3 · l'image se charge-t-elle vraiment ?
  try {
    const rep = await fetch(v.url, { headers: UA, signal: AbortSignal.timeout(25_000) });
    if (!rep.ok) throw new Error(`HTTP ${rep.status}`);
    const buf = await rep.arrayBuffer();
    const d = dimensions(buf);
    if (!d) throw new Error(`octets illisibles (${buf.byteLength} o)`);
    if (d.w < 80 || d.h < 80) throw new Error(`définition réelle ${d.w}×${d.h} — sous le plancher`);
    v.dimensions_reelles = `${d.w}×${d.h} ${d.type}`;
    v.octets = buf.byteLength;
  } catch (e) {
    refusCharge++;
    verdicts.set(slug, { ...v, etat: 'refus-charge', motif: `l'image ne se charge pas : ${String(e.message ?? e).slice(0, 80)}` });
    continue;
  }
  verdicts.set(slug, { ...v, etat: 'trouve' });
  await sleep(150);
}

/* ─────────────────────── COMPTE CROISÉ ─────────────────────── */
const par = (e) => [...verdicts.values()].filter((v) => v.etat === e).length;
const C = {
  trouves: par('trouve'), refus_collision: par('refus-collision'),
  refus_collision_interne: par('refus-collision-interne'), refus_nature: par('refus-nature'),
  refus_charge: par('refus-charge'), refus_fichier: par('refus-fichier'), refus_identite: par('refus-identite'),
  page_sans_image: par('sans-image'), sans_page_fr: par('sans-page'), pannes: par('panne'),
};
const somme = Object.values(C).reduce((a, b) => a + b, 0);
console.log('─'.repeat(72));
console.log(`candidats ${fiches.length} = ` + Object.entries(C).map(([k, v]) => `${k} ${v}`).join(' + '));
if (somme !== fiches.length) { console.error(`✗ COMPTE CROISÉ FAUX : ${somme} ≠ ${fiches.length} — on n'écrit rien.`); process.exit(1); }
const eprouves = C.trouves + C.refus_collision + C.refus_collision_interne + C.refus_nature + C.refus_charge + C.refus_fichier;
console.log(`taux d'erreur des gardes ajoutées : ${eprouves ? ((eprouves - C.trouves) / eprouves * 100).toFixed(1) : '0'} % (${eprouves - C.trouves} refusés sur ${eprouves} finalistes)`);

/* ─────────────────────── ÉCRITURE (image_url SEULEMENT) ─────────────────────── */
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
  chantier: 'images du wiki francophone (prop=pageimages sur les wikis /fr)',
  passe_le: new Date().toISOString(), mode: DRY ? 'à blanc' : 'application',
  compte_croise: { candidats: fiches.length, ...C, posees, deja_remplies_entre_temps: deja, echecs_ecriture: echecs },
  posees_detail: trouves.map(([slug, v]) => ({
    slug, universe: parSlug.get(slug).universe, type: parSlug.get(slug).type, name: parSlug.get(slug).name,
    titre_wiki: v.titre, preuve: v.preuve, nature_verifiee: v.nature_verifiee ?? 'fiche de personnage', fichier_preuve: v.fichier_preuve,
    image_url: v.url, dimensions_annoncees: v.dim, dimensions_reelles: v.dimensions_reelles, octets: v.octets,
  })),
  doublons_probables: [...verdicts.entries()].filter(([, v]) => v.etat === 'refus-collision')
    .map(([slug, v]) => ({ slug, name: parSlug.get(slug).name, universe: parSlug.get(slug).universe,
      type: parSlug.get(slug).type, titre_wiki: v.titre, deja_porte_par: v.collision })),
  refus_de_nature: [...verdicts.entries()].filter(([, v]) => v.etat === 'refus-nature')
    .map(([slug, v]) => ({ slug, name: parSlug.get(slug).name, type: parSlug.get(slug).type, motif: v.motif })),
  restees_sans_image: [...verdicts.entries()].filter(([, v]) => v.etat !== 'trouve')
    .map(([slug, v]) => ({ slug, name: parSlug.get(slug).name, universe: parSlug.get(slug).universe,
      type: parSlug.get(slug).type, etat: v.etat, pourquoi: v.motif, titre_resolu: v.titre ?? null })),
}, null, 1));
console.log(`rapport : ${RAPPORT}`);
