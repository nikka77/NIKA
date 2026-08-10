// scripts/ops-reparer-visuels-morts.mjs — LES FICHES QUI PASSENT POUR ILLUSTRÉES ET NE LE SONT PAS.
//
// POURQUOI (10/08, trouvé par la mesure de poids du stock)
// Sur les 6 700 URL distinctes servies par `image_url`, DIX-SEPT ne rendent pas d'image :
//   · 16 répondent HTTP 404 — le CDN sert quand même 520 octets étiquetés `image/webp` (son carton
//     d'erreur), donc la balise `<img>` ne « casse » pas visiblement : elle affiche un timbre-poste.
//     Quinze sont des `*_Infobox.png` de lieux One Piece capturés en 2013 et depuis renommés sur le
//     wiki ; le `?cb=` figé dans notre URL pointe une révision qui n'existe plus.
//   · 1 est un SVG servi BRUT (`Monzaemon_Symbol.svg`). Un navigateur l'affiche, mais l'image
//     OpenGraph des fiches passe par satori/resvg, qui ne charge pas de SVG distant — la carte de
//     partage sort vide (leçon #65). Le remède est le même que dans les connecteurs : injecter
//     `/scale-to-width-down/720` pour forcer le raster.
// Ces fiches sont PIRES que les 781 sans visuel : elles ne sont dans aucune pile, aucun connecteur
// ne les regarde (tous filtrent `image_url IS NULL`), et le tableau du carnet les compte comme
// illustrées. C'est le défaut du 09/08 dans une autre forme : « une case vide se voit, une mauvaise
// image se croit ».
//
// CE QUE FAIT CE SCRIPT
//  1. Il RE-VÉRIFIE chaque URL en GET (jamais sur la foi du HEAD de l'audit : un serveur peut
//     refuser HEAD et servir GET). Seul un GET qui échoue vaut condamnation.
//  2. Il cherche un remplaçant par la règle de la vague 2 — un article dont le TITRE, normalisé,
//     est notre nom — sur le wiki francophone puis anglophone, avec toutes les gardes : carton de
//     maintenance, hôte, page de personnage sur une fiche qui n'en est pas une, mot commun entre le
//     titre et le nom du fichier, chargement réel, plafond de 300 Ko.
//  3. À défaut de remplaçant, il met `image_url` à NULL. Ce n'est pas une perte : la fiche cesse de
//     mentir, la tuile stylisée reprend sa place (décision de Dan : « forme sans image = tuile
//     stylisée conservée ») et la fiche rejoint la pile des sans-visuel, où un chantier la verra.
//
// Usage :
//   node --env-file=.env.local scripts/ops-reparer-visuels-morts.mjs --rapport=data/audits/poids-visuels-….json --dry
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';
import { WIKIS, wikiApi, pageDOeuvre, pagePlusGenerale, fandomSleep as sleep } from './lib/fandom.mjs';
import { dimensions, idFichier } from './lib/image-octets.mjs';

const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const DRY = process.argv.includes('--dry');
const RAPPORT_IN = arg('rapport');
if (!RAPPORT_IN) { console.error('✗ --rapport=<rapport de audit-poids-visuels.mjs> requis'); process.exit(1); }
const AUDITS = new URL('../data/audits/', import.meta.url).pathname;
const HORO = new Date().toISOString().replace(/[:.]/g, '-');
const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative ; contact : tulbured06@gmail.com)' };
const PLAFOND_OCTETS = 300 * 1024;

const API_FR = {
  'One Piece': 'https://onepiece.fandom.com/fr/api.php', 'Naruto': 'https://naruto.fandom.com/fr/api.php',
  'Bleach': 'https://bleach.fandom.com/fr/api.php', 'Dragon Ball': 'https://dragonball.fandom.com/fr/api.php',
  "JoJo's Bizarre Adventure": 'https://jjba.fandom.com/fr/api.php', 'Death Note': 'https://deathnote.fandom.com/fr/api.php',
};
const FICHIER_PARASITE = /(site-?logo|wiki-?wordmark|wordmark|favicon|placeholder|no[-_]?image|no[-_]?pic(?:ture)?[-_]?avail(?:able)?|nophoto|question[-_]?mark|spoiler|under[-_]?construction|stub|ambox|icon[-_]?wiki|image[-_ ]?non[-_ ]?disponible|pas[-_ ]?d[-_ ]?image|sans[-_ ]?image|aucune[-_ ]?image|image[-_ ]?manquante)/i;
const HOTE_ATTENDU = 'static.wikia.nocookie.net';
const rasteriseSvg = (u) => /\.svg\/revision\/latest(?!\/scale-to-width-down)/i.test(u)
  ? u.replace(/(\.svg\/revision\/latest)/i, '$1/scale-to-width-down/720') : u;
const plie = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[’']/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const MOTS_VIDES = /^(the|les|des|une|los|infobox|anime|manga|png|jpg|jpeg|webp|gif|svg|portrait|image|film|movie|episode|chapitre|chapter|new|nv)$/;
const motsUtiles = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .split(/[^a-z0-9]+/).map((w) => w.replace(/s$/, '')).filter((w) => w.length > 2 && !MOTS_VIDES.test(w));
const enLargeur = (url, px) => {
  const [a, b] = String(url).split('/revision/latest');
  return b === undefined ? null : `${a}/revision/latest/scale-to-width-down/${px}${b.replace(/^\/scale-to-width-down\/\d+/, '')}`;
};

async function api(url, essais = 3) {
  let dernier = 'inconnu';
  for (let i = 0; i < essais; i++) {
    try {
      const r = await fetch(`${url}&maxlag=5`, { headers: UA, signal: AbortSignal.timeout(25_000) });
      if (!r.ok) { dernier = `HTTP ${r.status}`; await sleep(600 * (i + 1)); continue; }
      const j = await r.json();
      if (j?.error) { dernier = `erreur API : ${j.error.code}`; await sleep(600 * (i + 1)); continue; }
      if (!j?.query) { dernier = 'réponse sans query'; await sleep(600 * (i + 1)); continue; }
      return { ok: true, json: j };
    } catch (e) { dernier = String(e?.name ?? e).slice(0, 50); await sleep(600 * (i + 1)); }
  }
  return { ok: false, motif: dernier };
}
// UN CODE HTTP N'EST PAS L'AUTRE. 5xx, 429 et les délais dépassés sont des aléas : on retente, et
// « panne ≠ absence » interdit de conclure. 404 et 410 sont au contraire des VERDICTS du serveur —
// les traiter comme des pannes (première version, 10/08) faisait rendre « à retenter, PAS
// condamnée » pour les seize URL dont on avait précisément la preuve qu'elles sont mortes.
async function telecharger(url, essais = 3) {
  let dernier = 'inconnu';
  for (let i = 0; i < essais; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25_000) });
      if (r.status === 404 || r.status === 410) return { mort: `HTTP ${r.status}` };
      if (!r.ok) { dernier = `HTTP ${r.status}`; await sleep(600 * (i + 1)); continue; }
      const buf = await r.arrayBuffer();
      const d = dimensions(buf);
      if (!d) return { mort: `octets illisibles (${buf.byteLength} o)` };
      return { d, octets: buf.byteLength };
    } catch (e) { dernier = String(e?.message ?? e?.name ?? e).slice(0, 50); await sleep(600 * (i + 1)); }
  }
  return { panne: dernier };
}

/* ── l'état ── */
const site = clientSite();
let toutes = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await site.from('akasha_entries').select('id,slug,name,type,universe,image_url').order('slug').range(de, de + 999);
  if (error) { console.error('✗ lecture :', error.message); process.exit(1); }
  toutes = toutes.concat(data ?? []);
  if ((data ?? []).length < 1000) break;
}
const parSlug = new Map(toutes.map((e) => [e.slug, e]));
const parFichier = new Map();
for (const e of toutes) {
  if (!e.image_url) continue;
  const k = idFichier(e.image_url);
  if (!parFichier.has(k)) parFichier.set(k, []);
  parFichier.get(k).push(e);
}

const rap = JSON.parse(await readFile(RAPPORT_IN, 'utf8'));
const suspects = (rap.non_mesurees ?? []).flatMap((n) => n.fiches.map((s) => ({ slug: s, url: n.url, statut_head: n.statut })));
console.log(`${suspects.length} fiche(s) suspecte(s) issues de ${RAPPORT_IN}\n`);

/* ── 1. RE-VÉRIFICATION EN GET : un HEAD refusé ne condamne pas ── */
const morts = [], vivantes = [], brutSvg = [];
for (const s of suspects) {
  const e = parSlug.get(s.slug);
  if (!e || e.image_url !== s.url) { vivantes.push({ ...s, verdict: 'valeur changée depuis la mesure — ignorée' }); continue; }
  // Le SVG BRUT se reconnaît à son URL, pas à ses octets : `dimensions()` ne sait pas lire un SVG
  // et le classerait « illisible », donc mort — alors que le fichier existe et que le remède connu
  // est de le rasteriser (leçon #65). On tranche sur la forme de l'URL AVANT de télécharger.
  if (rasteriseSvg(s.url) !== s.url) { brutSvg.push({ ...s }); continue; }
  const r = await telecharger(s.url, 2);
  await sleep(150);
  if (r.panne) { vivantes.push({ ...s, verdict: `panne réseau (${r.panne}) — à retenter, PAS condamnée` }); continue; }
  if (r.mort) { morts.push({ ...s, preuve: `GET → ${r.mort}` }); continue; }
  // L'image se charge : soit c'est un SVG brut à rasteriser, soit tout va bien.
  if (rasteriseSvg(s.url) !== s.url) brutSvg.push({ ...s, dimensions: `${r.d.w}×${r.d.h} ${r.d.type}`, octets: r.octets });
  else vivantes.push({ ...s, verdict: `se charge (${r.d.w}×${r.d.h} ${r.d.type}, ${r.octets} o) — rien à faire` });
}
// Le CDN sert son carton d'erreur AVEC des pixels dedans : `dimensions()` le lit sans broncher.
// Le seul témoin fiable reste donc le code HTTP du GET, relu ici pour chaque suspect resté debout.
for (const v of [...vivantes]) {
  if (!String(v.verdict).startsWith('se charge')) continue;
  try {
    const r = await fetch(v.url, { headers: UA, signal: AbortSignal.timeout(20_000) });
    if (!r.ok) { vivantes.splice(vivantes.indexOf(v), 1); morts.push({ ...v, preuve: `GET → HTTP ${r.status} (le CDN sert son carton d'erreur avec des pixels)` }); }
  } catch { /* laissé vivant : on ne condamne pas sur un aléa */ }
  await sleep(120);
}
console.log(`morts confirmés : ${morts.length} · SVG bruts : ${brutSvg.length} · intacts : ${vivantes.length}\n`);

await mkdir(AUDITS, { recursive: true });
const TRACE = `${AUDITS}visuels-morts-trace-${HORO}.json`;
await writeFile(TRACE, JSON.stringify({
  chantier: 'réparation des visuels morts', pris_le: new Date().toISOString(), mode: DRY ? 'à blanc' : 'application',
  colonne: 'image_url', source: RAPPORT_IN,
  avant: [...morts, ...brutSvg, ...vivantes].map((x) => ({ slug: x.slug, image_url: x.url, verdict_lecture: x.preuve ?? x.verdict ?? 'SVG brut' })),
}, null, 1));
console.log(`trace d'avant : ${TRACE}\n`);

/* ── 2. UN REMPLAÇANT, PAR LA RÈGLE DE LA VAGUE 2 (titre normalisé ≡ notre nom) ── */
async function pageEgale(apiUrl, nom) {
  const r = await api(`${apiUrl}?action=query&prop=pageimages&piprop=original|thumbnail&pithumbsize=720`
    + `&format=json&formatversion=2&redirects=1&titles=${encodeURIComponent(nom)}`);
  await sleep(220);
  if (!r.ok) return null;
  const p = r.json.query.pages?.[0];
  if (!p || p.missing) return null;
  if (plie(p.title) !== plie(nom)) return null;              // l'égalité, rien de moins
  return p;
}
async function estPagePersonnage(apiUrl, titre) {
  const r = await api(`${apiUrl}?action=query&prop=categories&cllimit=200&format=json&formatversion=2&redirects=1&titles=${encodeURIComponent(titre)}`);
  await sleep(200);
  if (!r.ok) return { connu: false, motif: r.motif };
  const cats = (r.json.query.pages?.[0]?.categories ?? []).map((c) => c.title.replace(/^Cat[ée]gor(y|ie):/i, ''));
  const t = cats.filter((c) => /\b(characters?|personnages?|humans?|humains?|hommes|femmes|male|female)\b/i.test(c));
  return { connu: true, personnage: t.length > 0, preuve: t.slice(0, 3).join(' · '), cats: cats.length };
}

const journal = [];
for (const m of morts) {
  const f = parSlug.get(m.slug);
  const ligne = { slug: f.slug, name: f.name, universe: f.universe, type: f.type, avant: m.url, preuve_mort: m.preuve };
  let trouve = null;
  for (const [lang, apiUrl] of [['fr', API_FR[f.universe]], ['en', WIKIS[f.universe] ? wikiApi(f.universe) : null]]) {
    if (!apiUrl || trouve) continue;
    const p = await pageEgale(apiUrl, f.name);
    if (!p) continue;
    const nature = pageDOeuvre(p.title, '') ?? pagePlusGenerale(f.name, p.title);
    if (nature) { ligne.refus = `${lang} : ${nature}`; continue; }
    const brut = p.thumbnail?.source ?? p.original?.source;
    if (!brut) { ligne.refus = `${lang} : la page « ${p.title} » n’a plus d’image d’infobox`; continue; }
    const src = rasteriseSvg(brut);
    if (new URL(src).host !== HOTE_ATTENDU) { ligne.refus = `${lang} : image hors de l’hôte attendu`; continue; }
    const fichier = decodeURIComponent(src.split('/images/').pop() ?? '');
    if (FICHIER_PARASITE.test(fichier)) { ligne.refus = `${lang} : carton de maintenance (${fichier.split('/')[2]})`; continue; }
    const occupants = (parFichier.get(idFichier(src)) ?? []).filter((e) => e.slug !== f.slug);
    if (occupants.length) { ligne.refus = `${lang} : fichier déjà porté par ${occupants.map((o) => o.slug).join(', ')}`; continue; }
    if (f.type !== 'character') {
      const nat = await estPagePersonnage(apiUrl, p.title);
      if (nat.connu && nat.personnage) { ligne.refus = `${lang} : page de PERSONNAGE (${nat.preuve}) sur une fiche « ${f.type} »`; continue; }
      ligne.nature_verifiee = nat.connu ? `non-personnage (${nat.cats} catégories)` : `indéterminée (${nat.motif})`;
    }
    const nomFichier = decodeURIComponent(src.split('/images/').pop() ?? '').split('/revision')[0].replace(/^[0-9a-f]\/[0-9a-f]{2}\//, '');
    const duTitre = new Set(motsUtiles(p.title));
    const communs = motsUtiles(nomFichier).filter((w) => duTitre.has(w));
    if (!communs.length) { ligne.refus = `${lang} : le fichier « ${nomFichier} » ne partage aucun mot avec « ${p.title} »`; continue; }
    let url = src;
    const r1 = await telecharger(url);
    if (r1.panne || r1.mort) { ligne.refus = `${lang} : le remplaçant ne se charge pas (${r1.panne ?? r1.mort})`; continue; }
    let { d, octets } = r1;
    if (octets > PLAFOND_OCTETS) {
      const red = enLargeur(url, 480);
      const r2 = red ? await telecharger(red) : { mort: 'URL non redimensionnable' };
      if (r2.panne || r2.mort || r2.octets > PLAFOND_OCTETS) { ligne.refus = `${lang} : ${(octets / 1024).toFixed(0)} Ko, non ramenable sous le plafond`; continue; }
      url = red; d = r2.d; octets = r2.octets;
      ligne.allegee_480 = true;
    }
    if (d.w < 80 || d.h < 80) { ligne.refus = `${lang} : définition réelle ${d.w}×${d.h}`; continue; }
    trouve = { url, preuve: `titre ${lang} « ${p.title} » ≡ notre nom`, dims: `${d.w}×${d.h} ${d.type}`, octets, communs };
  }
  if (trouve) { ligne.apres = trouve.url; ligne.preuve = trouve.preuve; ligne.dimensions_reelles = trouve.dims; ligne.octets = trouve.octets; ligne.verdict = 'remplacée'; }
  else { ligne.apres = null; ligne.verdict = 'mise à NULL — plus aucune image juste, la fiche cesse de mentir'; }
  journal.push(ligne);
}

/* ── 3. LE SVG BRUT : on force le raster, on vérifie qu'il rastérise vraiment ── */
for (const s of brutSvg) {
  const f = parSlug.get(s.slug);
  const cible = rasteriseSvg(s.url);
  const r = await telecharger(cible);
  const ligne = { slug: f.slug, name: f.name, universe: f.universe, type: f.type, avant: s.url, apres: cible };
  if (r.panne || r.mort) { ligne.verdict = `raster refusé (${r.panne ?? r.mort}) — laissé tel quel`; ligne.apres = null; }
  else if (r.d.type === 'gif' || r.d.w < 80) { ligne.verdict = `raster dégénéré (${r.d.w}×${r.d.h})`; ligne.apres = null; }
  else { ligne.verdict = 'rasterisée (le SVG brut ne se charge pas dans l’image OpenGraph)'; ligne.dimensions_reelles = `${r.d.w}×${r.d.h} ${r.d.type}`; ligne.octets = r.octets; }
  journal.push(ligne);
}

/* ── 4. ÉCRITURE ── */
let ecrites = 0, nulls = 0, echecs = 0;
if (!DRY) {
  for (const l of journal) {
    if (l.apres === undefined) continue;
    const f = parSlug.get(l.slug);
    // `.eq('image_url', l.avant)` : on ne réécrit QUE la valeur qu'on a condamnée sur preuve.
    const { data, error } = await site.from('akasha_entries')
      .update({ image_url: l.apres }).eq('id', f.id).eq('image_url', l.avant).select('slug');
    if (error) { echecs++; l.echec = error.message; continue; }
    if (!data?.length) { l.changee_entre_temps = true; continue; }
    if (l.apres === null) nulls++; else ecrites++;
  }
}
const RAPPORT = `${AUDITS}visuels-morts-${HORO}.json`;
await writeFile(RAPPORT, JSON.stringify({
  chantier: 'réparation des visuels morts (404 du CDN et SVG bruts)',
  passe_le: new Date().toISOString(), mode: DRY ? 'à blanc' : 'application', source: RAPPORT_IN,
  compte: { suspects: suspects.length, morts_confirmes: morts.length, svg_bruts: brutSvg.length,
    intacts: vivantes.length, remplacees: journal.filter((l) => l.verdict === 'remplacée').length,
    mises_a_null: journal.filter((l) => String(l.verdict).startsWith('mise à NULL')).length,
    ecrites, nulls_ecrits: nulls, echecs_ecriture: echecs },
  intacts: vivantes, journal,
}, null, 1));
console.log(`remplacées ${journal.filter((l) => l.verdict === 'remplacée').length} · NULL ${journal.filter((l) => String(l.verdict).startsWith('mise à NULL')).length} · rasterisées ${journal.filter((l) => String(l.verdict).startsWith('rasterisée')).length}`);
console.log(DRY ? '→ --dry : aucune écriture.' : `→ ${ecrites} URL réécrite(s) · ${nulls} mise(s) à NULL · ${echecs} échec(s)`);
console.log(`rapport : ${RAPPORT}`);
