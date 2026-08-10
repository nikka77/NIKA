// scripts/ops-images-vague2.mjs — LE TITRE EST LE MÊME, C'EST LA TYPOGRAPHIE QUI DIFFÈRE.
//
// ══════════════════ CE QUE LES DEUX CONNECTEURS PRÉCÉDENTS LAISSENT ══════════════════
// Mesuré le 10/08 après la vague 1 : 781 fiches sans visuel. Le connecteur anglophone rend
// 521 « aucun titre candidat n'existe sur le wiki », le francophone 660 « aucune page à ce titre ».
// Or, sondé à la main sur deux échantillons répartis de 20, ce verdict est FAUX dans 5 % des cas
// côté anglophone et 15 % côté francophone : la page existe, sous un titre qui ne diffère du nôtre
// QUE par la typographie.
//   « Île 100 % »      ≠ « Île 100% »        (une espace avant le pourcent)
//   « Shuriken Fūma »  ≠ « Shuriken Fûma »   (macron contre circonflexe)
//   « Arc et flèches » ≠ « Arc et Flèches »  (une capitale)
//   « Some no Mai Tsukishiro » ≠ « Some no mai, Tsukishiro »  (une virgule)
// Les deux connecteurs interrogent `titles=` — qui ne pardonne que la première capitale et les
// espaces soulignés. Ils ne pouvaient pas voir ces pages.
//
// ══════════════════ LE TÉMOIN, ET POURQUOI IL N'EST PAS UNE RECHERCHE ══════════════════
// On demande au wiki ses dix meilleurs résultats pour notre nom, puis on ne garde QUE le titre
// dont la forme NORMALISÉE (casse, accents, macrons, ponctuation pliés) est ÉGALE à la nôtre.
// Ce n'est donc pas « le wiki a trouvé un article qui parle de ça » — le piège que les deux autres
// connecteurs s'interdisent à juste titre, et qui colle une image de chapitre sur un personnage —
// c'est « le wiki a un article DONT LE TITRE EST NOTRE NOM ». La recherche ne sert qu'à traverser
// la typographie ; l'identité reste l'égalité, le témoin le plus fort dont on dispose.
// Deux refus mécaniques accompagnent la règle :
//   · DEUX titres égaux ⇒ refus du groupe. Deux articles portant le même nom normalisé, c'est une
//     homonymie : la choisir serait deviner.
//   · L'égalité est re-vérifiée sur le titre FINAL, après redirection. Sans quoi le piège du 10/08
//     revient : la recherche « Ace » ramène la page-redirection, `redirects=1` atterrit sur
//     « Portgas D. Ace », et on pose le portrait d'un homme sur la fiche d'un sabre.
//
// ══════════════════ CE QU'IL AJOUTE ENCORE ══════════════════
// · TROIS UNIVERS DE PLUS côté francophone. Le connecteur FR ne connaît que quatre wikis ; les
//   9 fiches de JoJo / Death Note / Initial D n'avaient donc jamais été interrogées EN FRANÇAIS
//   (elles l'avaient bien été en anglais — le rapport du 10/08 les classe « sans page », leurs noms
//   étant des traductions curées). Sondé : jjba.fandom.com/fr et deathnote.fandom.com/fr existent,
//   initiald.fandom.com/fr rend 404 — c'est un plafond, pas un oubli.
// · LE PLAFOND DE POIDS. `image_url` part dans un `<img>` NU (AkashaList, AkashaMosaic, OmniSearch,
//   Leaderboard) : aucun optimiseur derrière. Au-delà de 300 Ko on repasse par la vignette 480 du
//   CDN et on RE-TÉLÉCHARGE pour vérifier ; si le CDN refuse de redimensionner (il refuse pour les
//   GIF animés : il rend 16 octets de texte), on ne pose pas et on le dit.
//
// N'écrit QUE `image_url`, jamais `attributes`, et jamais par-dessus une valeur existante
// (`.is('image_url', null)` posé à la lecture ET à l'écriture).
//
// Usage :
//   node --env-file=.env.local scripts/ops-images-vague2.mjs --dry
//   node --env-file=.env.local scripts/ops-images-vague2.mjs --suffixe=2026-08-10-app
import { writeFile, mkdir } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';
import { WIKIS, wikiApi, pageDOeuvre, pagePlusGenerale, fandomSleep as sleep } from './lib/fandom.mjs';
import { dimensions, idFichier } from './lib/image-octets.mjs';

const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const DRY = process.argv.includes('--dry');
const LIMIT = Number(arg('limit', Infinity));
const AUDITS = new URL('../data/audits/', import.meta.url).pathname;
const SUFFIXE = arg('suffixe', DRY ? `dry-${new Date().toISOString().replace(/[:.]/g, '-')}` : new Date().toISOString().replace(/[:.]/g, '-'));
const TRACE = `${AUDITS}images-v2-trace-${SUFFIXE}.json`;
const RAPPORT = `${AUDITS}images-v2-${SUFFIXE}.json`;

const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative ; contact : tulbured06@gmail.com)' };
const LOT = 50;
const PAUSE_MS = 260;
const PLAFOND_OCTETS = 300 * 1024;

/** Les wikis francophones. Les quatre premiers viennent du connecteur FR ; les deux suivants sont
 *  la réparation du plafond « le connecteur FR ne couvre que 4 univers ». `initiald` n'y est pas :
 *  https://initiald.fandom.com/fr/api.php rend HTTP 404 — ce wiki n'a pas d'édition française. */
const API_FR = {
  'One Piece': 'https://onepiece.fandom.com/fr/api.php',
  'Naruto': 'https://naruto.fandom.com/fr/api.php',
  'Bleach': 'https://bleach.fandom.com/fr/api.php',
  'Dragon Ball': 'https://dragonball.fandom.com/fr/api.php',
  // jojo.fandom.com/fr et jjba.fandom.com/fr servent le même wiki ; siteinfo rend jjba comme
  // serveur canonique, on prend celui-là pour que les URL d'images restent cohérentes.
  "JoJo's Bizarre Adventure": 'https://jjba.fandom.com/fr/api.php',
  'Death Note': 'https://deathnote.fandom.com/fr/api.php',
};

/* ─────────────────────── ACCÈS (panne ≠ absence) ─────────────────────── */
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

/* ─────────────────────── NORMALISATION ET GARDES D'IMAGE ─────────────────────── */
// Reprises MOT POUR MOT du connecteur FR : les mêmes cartons de maintenance traînent sur tous les
// wikis Fandom, et chaque motif ici a été payé une fois (« NoPicAvailable » le 08/08,
// « Image_Non_Disponible » le 10/08).
const FICHIER_PARASITE = /(site-?logo|wiki-?wordmark|wordmark|favicon|placeholder|no[-_]?image|no[-_]?pic(?:ture)?[-_]?avail(?:able)?|nophoto|question[-_]?mark|spoiler|under[-_]?construction|stub|ambox|icon[-_]?wiki|image[-_ ]?non[-_ ]?disponible|pas[-_ ]?d[-_ ]?image|sans[-_ ]?image|aucune[-_ ]?image|image[-_ ]?manquante)/i;
const HOTE_ATTENDU = 'static.wikia.nocookie.net';
const rasteriseSvg = (u) => /\.svg\/revision\/latest(?!\/scale-to-width-down)/i.test(u)
  ? u.replace(/(\.svg\/revision\/latest)/i, '$1/scale-to-width-down/720') : u;

/** La forme pliée : casse, accents, macrons, ponctuation et espaces multiples. C'est elle, et elle
 *  seule, qui définit l'égalité de titre. Rien d'autre n'est toléré — ni inclusion de mots, ni
 *  squelette de romanisation : ce sont eux qui ont fait passer « Ace » pour « Portgas D. Ace ». */
const plie = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[’']/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

function imageAcceptable(page) {
  const brut = page?.thumbnail?.source ?? page?.original?.source;
  if (!brut) return { ok: false, motif: 'la page existe mais n’a pas d’image d’infobox' };
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

const CAT_PERSONNAGE = /\b(characters?|personnages?|humans?|humains?|hommes|femmes|male|female)\b/i;
async function estPagePersonnage(api, titre) {
  const r = await interroger(`${api}?action=query&prop=categories&cllimit=200&format=json&formatversion=2`
    + `&redirects=1&titles=${encodeURIComponent(titre)}`);
  await sleep(PAUSE_MS);
  if (!r.ok) return { connu: false, motif: r.motif };          // INCONNU ≠ FERMÉ (leçon du 07/08)
  const cats = (r.json.query.pages?.[0]?.categories ?? []).map((c) => c.title.replace(/^Cat[ée]gor(y|ie):/i, ''));
  const touchees = cats.filter((c) => CAT_PERSONNAGE.test(c));
  return { connu: true, personnage: touchees.length > 0, preuve: touchees.slice(0, 3).join(' · '), cats: cats.length };
}

const MOTS_VIDES = /^(the|les|des|une|los|infobox|anime|manga|png|jpg|jpeg|webp|gif|svg|portrait|image|film|movie|episode|chapitre|chapter|new|nv)$/;
const motsUtiles = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .split(/[^a-z0-9]+/).map((w) => w.replace(/s$/, '')).filter((w) => w.length > 2 && !MOTS_VIDES.test(w));
/** LE TÉMOIN DE CONCATÉNATION, ajouté APRÈS la passe du 10/08 (donc absent de son rapport).
 *  Le découpage en mots ne voit rien quand le wiki nomme son fichier en collant les mots :
 *  `SomeNoMaiTsukishiro.gif` sur la page « Some no mai, Tsukishiro » ne rend qu'UN token, absent
 *  du titre — la garde refusait une image manifestement juste. Rejoué à la main sur les QUATRE
 *  refus de fichier du 10/08 : ce témoin en récupère 1 (le vrai positif) et laisse tomber les 3
 *  autres (`77e_Branche_Infobox` sur « Navire de Pudding Pudding », `JeiceBurterVsGokuNV` sur la
 *  planète « Brench », `Karin_localisa_le_chakra_de_Danzo` sur « Type Sensoriel »). Il est donc
 *  strictement plus fort que le mot commun, pas plus tolérant. */
const colle = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
function fichierParleDuSujet(url, titre) {
  const fichier = decodeURIComponent(String(url).split('/images/').pop() ?? '').split('/revision')[0];
  const nom = fichier.replace(/^[0-9a-f]\/[0-9a-f]{2}\//, '');
  const duTitre = new Set(motsUtiles(titre));
  const communs = motsUtiles(nom).filter((w) => duTitre.has(w));
  if (communs.length) return { ok: true, communs, nom };
  const a = colle(nom.replace(/\.(png|jpe?g|gif|webp|svg)$/i, '')), b = colle(titre);
  if (b.length > 6 && (a.includes(b) || b.includes(a))) return { ok: true, communs: [`titre collé « ${b} »`], nom };
  return { ok: false, communs: [], nom };
}

/** LE PLAFOND DE POIDS. On ne DEVINE pas l'adresse réduite (leçon du 09/08 : trois adresses
 *  reconstruites à la main étaient fausses et le CDN a répondu 200 avec son carton d'erreur) : on
 *  part de l'URL RENDUE par l'API et on y remplace le segment d'échelle documenté du CDN, puis on
 *  RE-TÉLÉCHARGE pour lire la définition réelle. Si l'octet ne suit pas, on refuse la fiche. */
const enLargeur = (url, px) => {
  const [avant, apres] = String(url).split('/revision/latest');
  if (apres === undefined) return null;                    // forme d'URL inattendue : on ne bricole pas
  const queue = apres.replace(/^\/scale-to-width-down\/\d+/, '');
  return `${avant}/revision/latest/scale-to-width-down/${px}${queue}`;
};
/** PANNE ≠ ABSENCE, jusque dans le CDN : l'essai à blanc du 10/08 a rendu un HTTP 504 passager sur
 *  `Bushogoma.gif`, que la première version comptait comme « image qui ne se charge pas » — donc
 *  comme un refus définitif. Trois essais, et on ne conclut « illisible » que sur des octets
 *  réellement reçus. */
async function telecharger(url, essais = 3) {
  let dernier = 'inconnu';
  for (let i = 0; i < essais; i++) {
    try {
      const rep = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25_000) });
      if (!rep.ok) { dernier = `HTTP ${rep.status}`; await sleep(700 * (i + 1)); continue; }
      const buf = await rep.arrayBuffer();
      const d = dimensions(buf);
      if (!d) throw new Error(`octets illisibles (${buf.byteLength} o)`);
      return { d, octets: buf.byteLength };
    } catch (e) {
      dernier = String(e?.message ?? e?.name ?? e).slice(0, 60);
      if (dernier.startsWith('octets illisibles')) throw e;   // verdict ferme : pas un aléa réseau
      await sleep(700 * (i + 1));
    }
  }
  throw new Error(dernier);
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
// L'index des fichiers DÉJÀ portés — la garde de collision avec l'existant (connecteur FR, 10/08).
const parFichier = new Map();
for (const e of toutes) {
  if (!e.image_url) continue;
  const k = idFichier(e.image_url);
  if (!parFichier.has(k)) parFichier.set(k, []);
  parFichier.get(k).push(e);
}
let fiches = toutes.filter((e) => !e.image_url && (WIKIS[e.universe] || API_FR[e.universe]));
if (Number.isFinite(LIMIT)) fiches = fiches.slice(0, LIMIT);
const CANDIDATS = fiches.length;
console.log(`${toutes.length} fiches · ${toutes.filter((e) => e.image_url).length} illustrées · ${parFichier.size} fichiers distincts déjà portés`);
console.log(`${CANDIDATS} fiche(s) sans visuel à traiter\n`);

await mkdir(AUDITS, { recursive: true });
await writeFile(TRACE, JSON.stringify({
  chantier: 'images vague 2 — égalité de titre normalisé', pris_le: new Date().toISOString(),
  mode: DRY ? 'à blanc' : 'application', colonne: 'image_url', plafond_octets: PLAFOND_OCTETS,
  candidats: CANDIDATS,
  avant: fiches.map((f) => ({ slug: f.slug, universe: f.universe, type: f.type, name: f.name, image_url: f.image_url })),
}, null, 1));
console.log(`trace d'avant écrite : ${TRACE} (${CANDIDATS} lignes)\n`);

/* ─────────────────────── PASSE 1 · LE TITRE DIRECT (50 par requête) ─────────────────────── */
// Bon marché et sans ambiguïté. Il recouvre le terrain des deux connecteurs précédents pour les
// quatre univers déjà couverts (donc ne trouvera presque rien) et OUVRE JoJo et Death Note côté
// francophone, que personne n'avait interrogés en français.
const verdicts = new Map();   // slug → { etat, … }
const enAttente = new Map(fiches.map((f) => [f.slug, f]));

async function pageimagesLot(api, titres) {
  const u = `${api}?action=query&prop=pageimages&piprop=original|thumbnail&pithumbsize=720`
    + `&pilimit=${LOT}&format=json&formatversion=2&redirects=1&titles=${encodeURIComponent(titres.join('|'))}`;
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
    const vus = new Set();
    while (redirige.has(t) && !vus.has(t)) { vus.add(t); t = redirige.get(t); }
    out.set(demande, parTitre.get(t) ?? null);
  }
  return { out };
}

const langues = [['fr', API_FR], ['en', Object.fromEntries(Object.keys(WIKIS).map((u) => [u, wikiApi(u)]))]];

for (const [lang, table] of langues) {
  const parUnivers = new Map();
  for (const f of enAttente.values()) {
    if (!table[f.universe]) continue;
    if (!parUnivers.has(f.universe)) parUnivers.set(f.universe, []);
    parUnivers.get(f.universe).push(f);
  }
  for (const [uni, liste] of parUnivers) {
    console.log(`passe 1 · ${lang} · ${uni} : ${liste.length} titre(s)`);
    for (let i = 0; i < liste.length; i += LOT) {
      const lot = liste.slice(i, i + LOT);
      const r = await pageimagesLot(table[uni], lot.map((f) => f.name));
      if (r.panne) continue;                                  // panne ≠ absence : on retentera ailleurs
      for (const f of lot) {
        const page = r.out.get(f.name);
        if (!page || page.missing) continue;
        if (plie(page.title) !== plie(f.name)) continue;       // l'égalité, rien de moins
        const img = imageAcceptable(page);
        if (!img.ok) { verdicts.set(f.slug, { etat: 'sans-image', lang, titre: page.title, motif: img.motif }); enAttente.delete(f.slug); continue; }
        verdicts.set(f.slug, { etat: 'candidat', lang, voie: 'titre direct', titre: page.title, url: img.url, dim: img.dim,
          preuve: `titre ${lang} « ${page.title} » ≡ notre nom` });
        enAttente.delete(f.slug);
      }
    }
  }
}
console.log(`passe 1 : ${[...verdicts.values()].filter((v) => v.etat === 'candidat').length} candidat(s) · ${enAttente.size} fiche(s) restantes\n`);

/* ─────────────────────── PASSE 2 · LA RECHERCHE, PUIS L'ÉGALITÉ ─────────────────────── */
// Une requête PAR FICHE : `list=search` ne prend qu'un terme. C'est le coût de la traversée
// typographique. ~1 400 requêtes à 4/s ≈ 6 minutes, sur un wiki qui l'autorise (maxlag=5, UA
// nominatif). On s'arrête à la première langue qui rend une égalité — d'abord le français, où nos
// noms curés SONT les titres.
async function titresEgaux(api, nom) {
  const r = await interroger(`${api}?action=query&list=search&srsearch=${encodeURIComponent(nom)}`
    + `&srlimit=10&srnamespace=0&format=json&formatversion=2`);
  await sleep(PAUSE_MS);
  if (!r.ok) return { panne: r.motif };
  const hits = (r.json.query.search ?? []).map((h) => h.title);
  return { egaux: hits.filter((t) => plie(t) === plie(nom)) };
}

const aSonder = [...enAttente.values()];
let n = 0;
for (const f of aSonder) {
  if (++n % 100 === 0) console.log(`   passe 2 : ${n}/${aSonder.length}…`);
  let pose = false;
  for (const [lang, table] of langues) {
    const api = table[f.universe];
    if (!api) continue;
    const t = await titresEgaux(api, f.name);
    if (t.panne) continue;
    if (!t.egaux.length) continue;
    if (t.egaux.length > 1) {
      // Deux articles au même nom normalisé : c'est une homonymie, la trancher serait deviner.
      verdicts.set(f.slug, { etat: 'refus-homonymie', lang, motif: `${t.egaux.length} titres ${lang} égaux à « ${f.name} » : ${t.egaux.join(' | ')}` });
      pose = true; break;
    }
    const r = await pageimagesLot(api, [t.egaux[0]]);
    if (r.panne) continue;
    const page = r.out.get(t.egaux[0]);
    if (!page || page.missing) continue;
    // RE-VÉRIFICATION APRÈS REDIRECTION — le titre trouvé peut être une redirection vers autre
    // chose (« Ace » → « Portgas D. Ace »). C'est le titre FINAL qui doit être notre nom.
    if (plie(page.title) !== plie(f.name)) {
      verdicts.set(f.slug, { etat: 'refus-redirection', lang, titre: page.title,
        motif: `« ${t.egaux[0] } » redirige vers « ${page.title} », qui n'est plus notre nom` });
      pose = true; break;
    }
    const nature = pageDOeuvre(page.title, '') ?? pagePlusGenerale(f.name, page.title);
    if (nature) { verdicts.set(f.slug, { etat: 'refus-nature-titre', lang, titre: page.title, motif: nature }); pose = true; break; }
    const img = imageAcceptable(page);
    if (!img.ok) { verdicts.set(f.slug, { etat: 'sans-image', lang, titre: page.title, motif: img.motif }); pose = true; break; }
    verdicts.set(f.slug, { etat: 'candidat', lang, voie: 'recherche + égalité', titre: page.title, url: img.url, dim: img.dim,
      preuve: `titre ${lang} « ${page.title} » ≡ notre nom (retrouvé par recherche)` });
    pose = true; break;
  }
  if (!pose) verdicts.set(f.slug, { etat: 'sans-titre-egal', motif: 'aucun wiki ne porte d’article dont le titre soit notre nom' });
  enAttente.delete(f.slug);
}

/* ─────────────────────── LES GARDES, SUR LES FINALISTES ─────────────────────── */
const parSlug = new Map(fiches.map((f) => [f.slug, f]));

// G0 · collision INTERNE à la passe : deux fiches aux noms différents ne peuvent pas légitimement
// être la même page, puisque l'identité EST l'égalité des noms.
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
    for (const s of slugs) verdicts.set(s, { ...verdicts.get(s), etat: 'refus-collision-interne',
      motif: `${slugs.length} fiches de cette passe visent « ${decodeURIComponent(k.split('/images/').pop() ?? k)} »`,
      groupe: slugs.filter((x) => x !== s) });
  }
}

const finalistes = [...verdicts.entries()].filter(([, v]) => v.etat === 'candidat');
console.log(`\n${finalistes.length} finaliste(s) — passage des gardes\n`);

for (const [slug, v] of finalistes) {
  const f = parSlug.get(slug);

  // G1 · le fichier est-il déjà porté par une fiche illustrée ? (doublon probable, à instruire)
  const occupants = (parFichier.get(idFichier(v.url)) ?? []).filter((e) => e.slug !== slug);
  if (occupants.length) {
    verdicts.set(slug, { ...v, etat: 'refus-collision',
      motif: `fichier déjà porté par ${occupants.map((o) => `${o.slug} (${o.name})`).join(', ')} — doublon probable`,
      collision: occupants.map((o) => ({ slug: o.slug, name: o.name })) });
    continue;
  }

  // G2 · nature : une page de PERSONNAGE sur une fiche qui n'en est pas un
  const api = v.lang === 'fr' ? API_FR[f.universe] : wikiApi(f.universe);
  if (f.type !== 'character') {
    const nat = await estPagePersonnage(api, v.titre);
    if (nat.connu && nat.personnage) {
      verdicts.set(slug, { ...v, etat: 'refus-nature',
        motif: `page de PERSONNAGE (catégories : ${nat.preuve}) sur une fiche de type « ${f.type} »` });
      continue;
    }
    v.nature_verifiee = nat.connu ? `non-personnage (${nat.cats} catégories)` : `indéterminée (${nat.motif})`;
  }

  // G3 · le nom du fichier partage-t-il un mot avec le titre ?
  const fp = fichierParleDuSujet(v.url, v.titre);
  if (!fp.ok) {
    verdicts.set(slug, { ...v, etat: 'refus-fichier',
      motif: `le fichier « ${fp.nom} » ne partage aucun mot avec « ${v.titre} »` });
    continue;
  }
  v.fichier_preuve = `mots communs titre/fichier : ${fp.communs.join(', ')}`;

  // G4 + G5 · l'image se charge-t-elle, et pèse-t-elle un poids de vignette ?
  try {
    let url = v.url;
    let { d, octets } = await telecharger(url);
    if (d.w < 80 || d.h < 80) throw new Error(`définition réelle ${d.w}×${d.h} — sous le plancher`);
    if (octets > PLAFOND_OCTETS) {
      const reduite = enLargeur(url, 480);
      if (!reduite) throw new Error(`${(octets / 1024).toFixed(0)} Ko et URL non redimensionnable`);
      const r2 = await telecharger(reduite);                  // le CDN rend 16 octets de texte sur un GIF animé
      if (r2.d.w < 80 || r2.d.h < 80) throw new Error(`vignette 480 dégénérée (${r2.d.w}×${r2.d.h})`);
      if (r2.octets > PLAFOND_OCTETS) throw new Error(`${(r2.octets / 1024).toFixed(0)} Ko même en 480 px (${r2.d.type}) — le CDN ne sait pas l'alléger`);
      url = reduite; d = r2.d; octets = r2.octets;
      v.allegee = true;
    }
    v.url = url; v.dimensions_reelles = `${d.w}×${d.h} ${d.type}`; v.octets = octets;
  } catch (e) {
    verdicts.set(slug, { ...v, etat: 'refus-poids-ou-charge', motif: String(e.message ?? e).slice(0, 110) });
    continue;
  }
  verdicts.set(slug, { ...v, etat: 'trouve' });
  await sleep(150);
}

/* ─────────────────────── COMPTE CROISÉ ─────────────────────── */
const par = (e) => [...verdicts.values()].filter((v) => v.etat === e).length;
const C = {
  trouves: par('trouve'), refus_collision: par('refus-collision'), refus_collision_interne: par('refus-collision-interne'),
  refus_nature: par('refus-nature'), refus_fichier: par('refus-fichier'), refus_poids_ou_charge: par('refus-poids-ou-charge'),
  refus_homonymie: par('refus-homonymie'), refus_redirection: par('refus-redirection'), refus_nature_titre: par('refus-nature-titre'),
  page_sans_image: par('sans-image'), sans_titre_egal: par('sans-titre-egal'),
};
const somme = Object.values(C).reduce((a, b) => a + b, 0);
console.log('─'.repeat(72));
console.log(`candidats ${CANDIDATS} = ` + Object.entries(C).map(([k, x]) => `${k} ${x}`).join(' + '));
if (somme !== CANDIDATS) { console.error(`✗ COMPTE CROISÉ FAUX : ${somme} ≠ ${CANDIDATS} — on n'écrit rien.`); process.exit(1); }
const eprouves = C.trouves + C.refus_collision + C.refus_collision_interne + C.refus_nature + C.refus_fichier + C.refus_poids_ou_charge;
console.log(`gardes sur finalistes : ${eprouves - C.trouves} refus sur ${eprouves} éprouvés (${eprouves ? ((eprouves - C.trouves) / eprouves * 100).toFixed(1) : '0'} %)`);

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
  chantier: 'images vague 2 — égalité de titre normalisé (EN + FR, 6 wikis francophones)',
  passe_le: new Date().toISOString(), mode: DRY ? 'à blanc' : 'application', plafond_octets: PLAFOND_OCTETS,
  compte_croise: { candidats: CANDIDATS, ...C, posees, deja_remplies_entre_temps: deja, echecs_ecriture: echecs },
  posees_detail: trouves.map(([slug, v]) => ({
    slug, universe: parSlug.get(slug).universe, type: parSlug.get(slug).type, name: parSlug.get(slug).name,
    lang: v.lang, voie: v.voie, titre_wiki: v.titre, preuve: v.preuve,
    nature_verifiee: v.nature_verifiee ?? 'fiche de personnage', fichier_preuve: v.fichier_preuve,
    allegee_480: v.allegee || undefined, octets: v.octets, dimensions_reelles: v.dimensions_reelles, image_url: v.url,
  })),
  doublons_probables: [...verdicts.entries()].filter(([, v]) => v.etat === 'refus-collision')
    .map(([slug, v]) => ({ slug, name: parSlug.get(slug).name, universe: parSlug.get(slug).universe, titre_wiki: v.titre, deja_porte_par: v.collision })),
  refuses_par_les_gardes: [...verdicts.entries()]
    .filter(([, v]) => String(v.etat).startsWith('refus-'))
    .map(([slug, v]) => ({ slug, name: parSlug.get(slug).name, universe: parSlug.get(slug).universe, type: parSlug.get(slug).type,
      etat: v.etat, pourquoi: v.motif, titre_resolu: v.titre ?? null, url_visee: v.url ?? null })),
  restees_sans_image: [...verdicts.entries()].filter(([, v]) => v.etat !== 'trouve')
    .map(([slug, v]) => ({ slug, name: parSlug.get(slug).name, universe: parSlug.get(slug).universe,
      type: parSlug.get(slug).type, etat: v.etat, pourquoi: v.motif, titre_resolu: v.titre ?? null })),
}, null, 1));
console.log(`rapport : ${RAPPORT}`);
