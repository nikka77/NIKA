// scripts/akasha-op-cibles-collecte.mjs — COLLECTER (sans rien écrire) LA MATIÈRE DES FICHES
// ONE PIECE QUI MANQUENT ET QUI BLOQUENT 204 LIENS.
//
// POURQUOI (10/08/2026, vague 6)
// La vague 5 a fait tomber les isolées One Piece de 451 à 366 puis a buté sur un mur qu'elle a
// chiffré : 204 de ses 229 liens perdus visent une entité qu'AKASHA n'a pas (71 titres distincts).
// La sonde `akasha-op-cibles-sonde.mjs` a repassé ces 204 liens sur l'état FRAIS : 90 isolées
// One Piece sur 366 sortiraient si ces fiches existaient. Et 2 229 fiches One Piece ne comptent
// qu'UNE profession, « Pirate » — d'où « Archaeologist » ×8, « Bounty Hunter » ×8 sans cible.
//
// CE SCRIPT N'ÉCRIT RIEN EN BASE. Il va chercher, pour chaque cible :
//   · le titre canonique (redirections suivies)                → action=query&redirects=1
//   · LE NOM FRANÇAIS DÉCLARÉ PAR LA SOURCE                    → prop=langlinks&lllang=fr
//   · les catégories (elles disent la NATURE : lieu, métier…)  → prop=categories
//   · l'image de tête                                          → prop=pageimages
//   · les premiers paragraphes de l'article rendu              → action=parse&prop=text
//
// TROIS GARDES DE COLLECTE, toutes payées par une leçon :
//  · ANTI-DOUBLON EN DEUX LANGUES. Le contrôle de la vague 3 comparait le titre ANGLAIS à nos
//    noms ; nos noms sont français. « Flower Capital » ne heurte rien, « Capitale des Fleurs »
//    peut-être. On cherche donc les deux, plus la romanisation et le slug.
//  · TITRE INTERLANGUE DÉCLARÉ, LU AVANT DE LE DEMANDER (leçon du 10/08 sur « Sweet City ») : un
//    « # » ou un « / » dans le titre déclaré signale une SECTION ou une SOUS-PAGE — un morceau
//    d'un autre sujet. MediaWiki normalise le « # » à l'appel suivant et ne signale plus rien.
//  · PAGE PARTAGÉE : deux cibles qui tombent sur la même page ne désignent pas deux entités.
//
// Usage : node --env-file=.env.local scripts/akasha-op-cibles-collecte.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';
import { norm } from './audit-isolees-fandom.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const HOTE = 'onepiece.fandom.com';
const HOTE_FR = 'onepiece.fandom.com/fr';
const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (audit graphe, contact tulbured06@gmail.com)' };
const HORODATE = new Date().toISOString().replace(/[:.]/g, '-');
const CACHE = path.join(os.tmpdir(), 'nika-akasha-fandom-html');   // partagé avec akasha-isolees-html.mjs
const REP = path.join(ROOT, 'data/audits');

/* Les cibles viennent de la sonde la plus récente — jamais d'une liste recopiée à la main. */
const SONDE = fs.readdirSync(REP).filter((f) => /^op-cibles-sonde-/.test(f)).sort().pop();
if (!SONDE) throw new Error('aucune sonde : lancer d\'abord akasha-op-cibles-sonde.mjs');
const sonde = JSON.parse(fs.readFileSync(path.join(REP, SONDE), 'utf8'));
console.log(`sonde lue : ${SONDE} (${sonde.cibles.length} cibles)`);

const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;      // un select nu s'arrête à 1000 SANS erreur
  }
  console.log(`  ${t} : ${out.length} lignes`);
  return out;
};

console.log('→ lecture de la base (paginée)…');
const entries = await page('akasha_entries', 'id, slug, name, type, universe, summary, attributes');
const op = entries.filter((e) => e.universe === 'One Piece');
const parSlug = new Map(entries.map((e) => [e.slug, e]));
const parNomOP = new Map();
for (const e of op) for (const c of [norm(e.name), norm(e.slug), norm(e.attributes?.roman_name)]) {
  if (c && !parNomOP.has(c)) parNomOP.set(c, e);
}
/* Index de la PROSE du corpus, pour la garde de nom du script de création. Prose = summary et
   descFr, jamais un dump de `attributes` : une chaîne STOCKÉE par le corpus n'est pas une forme
   EMPLOYÉE par lui (leçon du 10/08 sur « Kanabun Gang »). */
const proseOP = norm(op.map((e) => [e.summary, e.attributes?.descFr].filter(Boolean).join(' ')).join('\n'));
console.log(`  prose One Piece indexée : ${proseOP.length} caractères normalisés`);

const slugifier = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const detague = (s) => String(s ?? '')
  .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, '')       // appels de note [1] : bruit
  .replace(/<[^>]+>/g, '').replace(/&nbsp;|&#160;/g, ' ')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ').trim();

async function htmlRendu(hote, titre) {
  fs.mkdirSync(CACHE, { recursive: true });
  const f = path.join(CACHE, `${hote.replace(/\W+/g, '_')}__${titre.replace(/[^\w.-]/g, '_')}.json`);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  const u = `https://${hote}/api.php?action=parse&prop=text&format=json&formatversion=2&redirects=1&page=${encodeURIComponent(titre)}`;
  try {
    const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(30_000) });
    const j = await r.json();
    const res = j.error ? { erreur: j.error.code } : { titre: j.parse.title, html: j.parse.text };
    fs.writeFileSync(f, JSON.stringify(res));
    return res;
  } catch (err) { return { erreur: String(err?.message ?? err) }; }
}

/** Les premiers paragraphes de l'article, hors infobox et hors bandeaux.
 *  ORDRE DES DEUX GESTES, mesuré : il faut RETIRER l'infobox AVANT de couper au premier `<h2>`.
 *  La portable infobox de ce wiki met son titre dans un `<h2 class="pi-title">` — sur « Paradise »
 *  il tombe à 2 462 caractères du début, soit avant le moindre paragraphe d'article, et la coupe
 *  naïve rendait ZÉRO paragraphe sur 67 des 71 pages. Un filtre qui rend zéro doit d'abord prouver
 *  qu'il sait rendre un : le contrôle `sans intro lue` de ce script est ce témoin. */
function introDe(html) {
  let zone = html.replace(/<table[\s\S]*?<\/table>/gi, ' ').replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<figure[\s\S]*?<\/figure>/gi, ' ')
    .replace(/<div\b[^>]*class="[^"]*\b(notice|mw-collapsible|toc)\b[^"]*"[\s\S]*?<\/div>/gi, ' ');
  zone = zone.split(/<h2\b/i)[0];
  return [...zone.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => detague(m[1])).filter((t) => t.length > 40);
}

/* ═══ Collecte ═══════════════════════════════════════════════════════════════════════════════ */
const titres = sonde.cibles.map((c) => c.titre);
console.log(`\n→ ${titres.length} titres : titre canonique + interlangue fr + catégories + image…`);
const meta = new Map();
for (let i = 0; i < titres.length; i += 20) {
  const paquet = titres.slice(i, i + 20);
  const u = `https://${HOTE}/api.php?action=query&format=json&formatversion=2&redirects=1`
    + `&prop=pageimages|info|categories|langlinks&piprop=original|thumbnail&pithumbsize=1200`
    + `&inprop=url&cllimit=500&clshow=!hidden&lllang=fr&lllimit=50`
    + `&titles=${encodeURIComponent(paquet.join('|'))}`;
  const j = await (await fetch(u, { headers: UA, signal: AbortSignal.timeout(30_000) })).json();
  const alias = new Map();
  for (const n of j.query?.normalized ?? []) alias.set(n.to, n.from);
  const fragments = new Map();
  for (const n of j.query?.redirects ?? []) {
    alias.set(n.to, alias.get(n.from) ?? n.from);
    if (n.tofragment) fragments.set(alias.get(n.to) ?? n.to, `${n.to}#${n.tofragment}`);
  }
  for (const p of j.query?.pages ?? []) {
    const demande = alias.get(p.title) ?? p.title;
    meta.set(demande, { p, fragment: fragments.get(demande) ?? null });
  }
  process.stdout.write(`\r  ${Math.min(i + 20, titres.length)}/${titres.length}`);
  await dormir(250);
}
console.log('');

/* GARDE « page partagée » : deux de nos cibles qui tombent sur la même page canonique ne désignent
   pas deux entités — c'est le signal mécanique de la FUSION (leçon du 10/08 sur les Gardes
   Tsumegeri). Ici il vaut aussi entre cibles : « Marine Ranks » et « Captain (Marine Rank) ». */
const compteurPage = new Map();
for (const t of titres) { const m = meta.get(t); if (m?.p?.title) compteurPage.set(m.p.title, (compteurPage.get(m.p.title) ?? 0) + 1); }

const fiches = [];
for (const c of sonde.cibles) {
  const m = meta.get(c.titre);
  const p = m?.p;
  const titreCanon = p?.title ?? null;
  const cats = (p?.categories ?? []).map((x) => x.title.replace(/^Category:/, ''));
  // Le titre interlangue DÉCLARÉ, lu tel quel : le « # » et le « / » disparaissent à l'appel suivant.
  const frDeclare = p?.langlinks?.[0]?.title ?? null;
  const frFragment = frDeclare && /#/.test(frDeclare) ? frDeclare : null;
  const frSousPage = frDeclare && /\//.test(frDeclare) ? frDeclare : null;

  const r = titreCanon && !p?.missing ? await htmlRendu(HOTE, titreCanon) : { erreur: 'page absente' };
  const paras = r.erreur ? [] : introDe(r.html);

  const slug = slugifier(titreCanon ?? c.titre);
  const nomFr = frDeclare ? frDeclare.split('/').pop().split('#').pop().trim() : null;

  // ANTI-DOUBLON, quatre clés : titre EN, titre FR, nom FR sans préfixe, slug.
  const collisions = [];
  for (const [etiquette, valeur] of [['titre EN', c.titre], ['titre EN canonique', titreCanon],
    ['titre FR déclaré', frDeclare], ['nom FR', nomFr]]) {
    const h = valeur && parNomOP.get(norm(valeur));
    if (h) collisions.push(`${etiquette} « ${valeur} » ≈ ${h.type}/${h.slug} « ${h.name} »`);
  }
  const collisionSlug = parSlug.get(slug) ?? null;

  fiches.push({
    titreDemande: c.titre,
    titreCanonique: titreCanon,
    manquante: !!p?.missing,
    redirigeVersSection: m?.fragment ?? null,
    pagePartagee: titreCanon && compteurPage.get(titreCanon) > 1 ? `${compteurPage.get(titreCanon)} de nos cibles tombent sur « ${titreCanon} »` : null,
    url: p?.fullurl ?? `https://${HOTE}/wiki/${encodeURIComponent(c.titre.replace(/ /g, '_'))}`,
    slugPropose: slug,
    resolutionOk: norm(slug) === norm(c.titre),   // condition pour que le lien d'infobox tombe
    nomFrDeclare: frDeclare,
    nomFr,
    urlFr: frDeclare ? `https://${HOTE_FR}/wiki/${encodeURIComponent(frDeclare.replace(/ /g, '_'))}` : null,
    frFragment, frSousPage,
    nomFrDansLaProse: nomFr ? proseOP.includes(norm(nomFr)) : false,
    titreEnDansLaProse: proseOP.includes(norm(c.titre)),
    categories: cats,
    image: p?.original?.source ?? p?.thumbnail?.source ?? null,
    imageDim: p?.original ? `${p.original.width}×${p.original.height}` : null,
    collisions,
    collisionSlug: collisionSlug && `${collisionSlug.type}/${collisionSlug.slug} « ${collisionSlug.name} »`,
    gainIsolees: c.gainIsoleesEncore,
    liens: c.liens,
    champs: c.champs,
    sourcesEncoreIsolees: c.sourcesEncoreIsolees,
    introSource: paras.slice(0, 3),
  });
  process.stdout.write(`\r  intro ${fiches.length}/${sonde.cibles.length}`);
  await dormir(150);
}
console.log('');

const sortie = path.join(REP, `op-cibles-collecte-${HORODATE}.json`);
fs.writeFileSync(sortie, JSON.stringify({ quand: new Date().toISOString(), hote: HOTE, sondeLue: SONDE, fiches }, null, 1));

console.log('\n=== CONTRÔLES ===');
const l = (t, f) => console.log(`${t.padEnd(24)}: ${fiches.filter(f).map((x) => x.titreDemande).join(', ') || 'aucune'}`);
l('pages absentes', (f) => f.manquante);
l('redirige vers section', (f) => f.redirigeVersSection);
l('page partagée', (f) => f.pagePartagee);
l('slug ≠ titre (non résolvable)', (f) => !f.resolutionOk);
l('collision de slug', (f) => f.collisionSlug);
l('COLLISION DE NOM', (f) => f.collisions.length);
l('interlangue = section (#)', (f) => f.frFragment);
l('interlangue = sous-page (/)', (f) => f.frSousPage);
l('sans nom FR déclaré', (f) => !f.nomFrDeclare);
l('sans image', (f) => !f.image);
l('sans intro lue', (f) => !f.introSource.length);
console.log(`nom FR attesté dans la prose du corpus : ${fiches.filter((f) => f.nomFrDansLaProse).length} / ${fiches.length}`);
console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);

console.log('\n=== MATIÈRE COLLECTÉE (cibles à gain ≥ 1 ou ≥ 4 liens) ===');
for (const f of fiches.filter((x) => x.gainIsolees >= 1 || x.liens >= 4)) {
  console.log(`\n──────── ${f.titreDemande}${f.titreCanonique !== f.titreDemande ? ` → « ${f.titreCanonique} »` : ''}   [${f.gainIsolees} isolées / ${f.liens} liens]`);
  console.log(`  FR déclaré : ${f.nomFrDeclare ?? '—'}${f.nomFrDansLaProse ? '  ✓ attesté dans la prose' : ''}`);
  console.log(`  slug ${f.slugPropose} · image ${f.image ? f.imageDim : 'AUCUNE'}`);
  console.log(`  cat : ${f.categories.slice(0, 8).join(' | ')}`);
  if (f.collisions.length) console.log(`  ⚠ ${f.collisions.join(' ; ')}`);
  for (const t of f.introSource) console.log(`  ¶ ${t}`);
}
