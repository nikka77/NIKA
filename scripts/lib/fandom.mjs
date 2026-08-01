// scripts/lib/fandom.mjs — connecteur Fandom (API MediaWiki publique, sans clé) pour AKASHA.
// Récupère les attaques/techniques d'un univers depuis son wiki communautaire, avec le lien
// personnage→technique quand le wiki expose des pages « List of techniques used by X ».
// Rate-limit courtois (~5 req/s max) : Fandom tolère mais on temporise.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wget(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      // Timeout indispensable : sans lui, une connexion Fandom qui traîne bloque le script
      // indéfiniment (constaté le 25/07 — un scoring figé à 0 % CPU pendant 20 min).
      const r = await fetch(url, {
        headers: { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative)' },
        signal: AbortSignal.timeout(25_000),
      });
      if (r.status === 429) { await sleep(1500 * (i + 1)); continue; }
      if (r.ok) return await r.json();
    } catch { /* retry */ }
    await sleep(500 * (i + 1));
  }
  return null;
}

const META = /^(List of|Template:|Category:|File:|User:|Help:|Forum:|Blog:|Talk:|Module:)/i;

/** Tous les membres-PAGE d'une catégorie (paginé). Filtre les pages méta (List of…, Template:…). */
export async function categoryMembers(api, category, maxPages = 8) {
  const out = new Set();
  let cont = null;
  for (let p = 0; p < maxPages; p++) {
    const u = `${api}?action=query&list=categorymembers&cmtitle=Category:${encodeURIComponent(category)}&cmlimit=500&cmtype=page&format=json${cont ? '&cmcontinue=' + encodeURIComponent(cont) : ''}`;
    const j = await wget(u);
    if (!j?.query?.categorymembers) break;
    for (const m of j.query.categorymembers) if (!META.test(m.title)) out.add(m.title);
    cont = j.continue?.cmcontinue;
    if (!cont) break;
    await sleep(220);
  }
  return out;
}

/** Titres de pages correspondant à une recherche (ex. « List of techniques used by »). */
export async function searchTitles(api, query, prefixFilter = null, limit = 120) {
  const out = [];
  let off = 0;
  while (out.length < limit) {
    const j = await wget(`${api}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=50&sroffset=${off}&format=json`);
    const hits = j?.query?.search || [];
    if (!hits.length) break;
    for (const h of hits) if (!prefixFilter || h.title.startsWith(prefixFilter)) out.push(h.title);
    if (!j.continue) break;
    off = j.continue.sroffset;
    await sleep(220);
  }
  return out;
}

/** Liens ns0 d'une page ∩ un ensemble de titres valides (→ techniques réelles d'un perso). */
export async function pageLinksIn(api, page, validSet) {
  const j = await wget(`${api}?action=parse&page=${encodeURIComponent(page)}&prop=links&format=json`);
  const links = (j?.parse?.links || []).filter((l) => l.ns === 0).map((l) => l['*']);
  return links.filter((l) => validSet.has(l));
}

export { sleep as fandomSleep };

/* ════════ NIKA OPS — « yeux » des agents locaux (25/07/2026) ════════
   Les modèles locaux ne naviguent pas : le worker récupère ici la page canon,
   la nettoie en prose et la met en cache disque avant de la passer au modèle. */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

/** univers AKASHA → sous-domaine fandom.com */
export const WIKIS = {
  'Naruto': 'naruto',
  'One Piece': 'onepiece',
  'Bleach': 'bleach',
  'Dragon Ball': 'dragonball',
  'Hunter x Hunter': 'hunterxhunter',
  "JoJo's Bizarre Adventure": 'jojo',
  'Death Note': 'deathnote',
  'Initial D': 'initiald',
};

export const wikiApi = (universe) =>
  WIKIS[universe] ? `https://${WIKIS[universe]}.fandom.com/api.php` : null;

/** Champs d'infobox sans intérêt pour nos agents (médias, apparitions, physique, doublage). */
const INFOBOX_IGNORE = /^(manga|anime|novel|movie|game|ova|appears|japanese|english|voice|seiyu|image|caption|birthdate|deathdate|height|weight|blood|ninja registration|academy|ch(u|ū)nin prom|debut|kanji|romaji|literal|other names?)/i;

/**
 * FICHE TECHNIQUE depuis l'infobox RENDUE (action=parse&prop=text).
 * Les wikis Fandom ne stockent PAS l'infobox dans le wikitext : sur naruto.fandom.com par exemple,
 * la page contient un simple `{{Infobox}}` et les valeurs vivent sur une page « Infobox:X » (constat
 * du 26/07). Il faut donc lire le HTML rendu. C'est là que se trouvent les attributs structurés
 * (Affiliation, Classification, Team, Partner…) que nos agents doivent renseigner — les demander à
 * la prose seule revenait à faire deviner ce qui est écrit noir sur blanc juste à côté.
 */
export async function fetchFandomInfobox(universe, name) {
  const api = wikiApi(universe);
  if (!api) return '';
  const j = await wget(`${api}?action=parse&page=${encodeURIComponent(name)}&prop=text&redirects=1&format=json&formatversion=2`);
  const html = j?.parse?.text;
  if (!html) return '';

  // deux familles de gabarits selon les wikis : table classique ou « portable infobox »
  let i = html.indexOf('<table class="infobox');
  if (i < 0) i = html.indexOf('portable-infobox');
  if (i < 0) return '';
  const seg = html.slice(i, i + 20000);
  const nu = (x) =>
    x.replace(/<[^>]+>/g, ' ')
      .replace(/&#160;|&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#91;/g, '[').replace(/&#93;/g, ']')
      .replace(/\[\s*\d+\s*\]/g, '')          // marqueurs de référence [ 7 ] : bruit pur
      .replace(/\s*:\s*$/, '')                  // certains wikis suffixent déjà les libellés
      .replace(/\s+/g, ' ').trim();

  const lignes = [];
  for (const [, r] of seg.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const th = /<th[^>]*>([\s\S]*?)<\/th>/.exec(r);
    const td = /<td[^>]*>([\s\S]*?)<\/td>/.exec(r);
    if (!th || !td) continue;
    const cle = nu(th[1]), val = nu(td[1]);
    if (!cle || !val || INFOBOX_IGNORE.test(cle) || val.length > 120) continue;
    lignes.push(`${cle} : ${val}`);
  }
  // gabarit portable : <h3 class="pi-data-label">…</h3><div class="pi-data-value">…</div>
  if (!lignes.length) {
    const labels = [...seg.matchAll(/pi-data-label[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => nu(m[1]));
    const values = [...seg.matchAll(/pi-data-value[^>]*>([\s\S]*?)<\/div>/g)].map((m) => nu(m[1]));
    labels.forEach((l, k) => {
      const v = values[k];
      if (l && v && !INFOBOX_IGNORE.test(l) && v.length <= 120) lignes.push(`${l} : ${v}`);
    });
  }
  await sleep(250);
  return lignes.length ? `FICHE TECHNIQUE (infobox du wiki)\n${lignes.slice(0, 18).join('\n')}\n\n` : '';
}

/** Wikitext brut → prose lisible (templates, liens wiki, refs, balises, titres). */
export function cleanWikitext(wt) {
  let s = wt ?? '';
  for (let i = 0; i < 6; i++) s = s.replace(/\{\{[^{}]*\}\}/g, '');       // templates imbriqués
  s = s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/<ref[^>]*\/>/g, '');
  s = s.replace(/\[\[(?:File|Image|Fichier):[^\]]*\]\]/gi, '');
  // Liens INTERLANGUES ([[es:…]], [[pt-br:…]]) : une fois déwikifiés ils ressemblent à du contenu
  // et induisent le modèle en erreur — un juge a cru à une faute d'orthographe dans notre base
  // en lisant la translittération espagnole (25/07). À retirer AVANT de déwikifier.
  s = s.replace(/\[\[[a-z]{2,3}(?:-[a-z]{2,4})?:[^\]]*\]\]/g, '');
  s = s.replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1');                  // déwikifier
  s = s.replace(/<\/?[^>]+>/g, '');
  s = s.replace(/^=+\s*(.+?)\s*=+$/gm, '\n§ $1');                          // sections → marqueurs
  s = s.replace(/'''?/g, '').replace(/^\s*[*#:]+\s*/gm, '· ');
  return s.replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
}

// ~/.cache et pas le dépôt : (1) le dépôt vit dans iCloud — un cache de 139+ fichiers y serait
// resynchronisé en boucle ; (2) l'ancien `.pathname` encodait l'espace de « Mobile Documents » en
// %20 et créait un dossier parasite hors iCloud (découvert le 26/07 — la leçon fileURLToPath du
// 25/07 n'avait pas été balayée sur TOUT le dépôt).
const CACHE_DIR = join(homedir(), '.cache', 'nika', 'fandom') + '/';

/** Mots significatifs d'un nom : sans accents, sans particules ni ponctuation. */
const nameWords = (s) =>
  new Set(
    (s ?? '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w && !['the', 'of', 'de', 'du', 'la', 'le', 'les', 's', 'gou', 'san', 'kun'].includes(w)),
  );

/**
 * Le titre trouvé désigne-t-il bien l'entité demandée ?
 * Tolère l'inversion (« Shamrock Figarland » ≡ « Figarland Shamrock ») ; rejette les voisins
 * (« Giorno's Mother » vs « Giorno Giovanna », « Super 17 » vs « Android 17 »).
 */
// Squelette phonétique d'un mot romanisé : les variantes de translittération (« Oderschvank » ≡
// « Odelschwanck », « Anton » ≡ « Antoine » — refus injustes du 26/07) divergent presque toujours
// sur r/l, v/w, c/k, s/z, les voyelles insérées et les doublements — jamais sur la charpente.
// Une distance d'édition aveugle ne marche pas ici : le seuil qui accepte Odelschwanck (3 écarts)
// accepterait aussi Naruto≡Boruto (2 écarts). Le squelette, lui, sépare les deux.
const skeleton = (w) =>
  (w[0] + w.slice(1).replace(/[aeiouy]/g, ''))   // voyelles hors initiale
    .replace(/h/g, '')                            // h muets des romanisations
    .replace(/r/g, 'l').replace(/v/g, 'w')        // r↔l, v↔w (japonais translittéré)
    .replace(/[cq]/g, 'k').replace(/z/g, 's')     // c/q↔k, s↔z
    .replace(/(.)\1+/g, '$1');                    // doublements

// Deux mots se correspondent s'ils sont égaux, ou assez longs et de même squelette.
const sameWord = (w, x) => w === x || (w.length >= 5 && x.length >= 5 && skeleton(w) === skeleton(x));

export function sameEntityName(name, title) {
  const a = nameWords(name), b = nameWords(title);
  if (!a.size || !b.size) return false;
  const inter = [...a].filter((w) => [...b].some((x) => sameWord(w, x))).length;
  return inter === a.size || inter === b.size;   // l'un est inclus dans l'autre
}

/**
 * Page canon d'une entité, en prose + cache disque.
 * @returns {Promise<{title:string,url:string,text:string}|null>} null si univers/page introuvable.
 */
export async function fetchFandomProse(universe, name, { maxChars = 5000 } = {}) {
  const api = wikiApi(universe);
  if (!api) return null;

  await mkdir(CACHE_DIR, { recursive: true });
  // La version du nettoyeur fait partie de la clé : après correction, les vieilles entrées sont
  // ignorées d'office (sinon un worker encore en mémoire avec l'ancien code repeuple le cache).
  const file = `${CACHE_DIR}${createHash('sha1').update(`v4:${universe}:${name}`).digest('hex').slice(0, 16)}.json`;
  // sameEntity est RECALCULÉ à la lecture : la garde évolue (squelettes de romanisation du 26/07)
  // et un verdict figé dans le cache la court-circuiterait — sans avoir à invalider tout le cache.
  try {
    const c = JSON.parse(await readFile(file, 'utf8'));
    return { ...c, sameEntity: c.title ? sameEntityName(name, c.title) : c.sameEntity };
  } catch { /* cache froid */ }

  // redirects=1 : « Haiya Dragon » → « Icarus » (sinon on ne récupère que « #REDIRECT »)
  const parseUrl = (t) => `${api}?action=parse&page=${encodeURIComponent(t)}&prop=wikitext&redirects=1&format=json&formatversion=2`;
  let title = name;
  let j = await wget(parseUrl(title));

  let resolvedBy = 'exact';
  if (!j?.parse?.wikitext) {                       // titre exact absent → recherche plein texte
    const found = await searchTitles(api, name, null, 1);
    if (!found.length) return null;
    title = found[0];
    resolvedBy = 'search';
    j = await wget(parseUrl(title));
    if (!j?.parse?.wikitext) return null;
  }

  const out = {
    title: j.parse.title ?? title,
    url: `https://${WIKIS[universe]}.fandom.com/wiki/${encodeURIComponent(title)}`,
    text: (await fetchFandomInfobox(universe, title)) + cleanWikitext(j.parse.wikitext).slice(0, maxChars),
    resolvedBy,
    // GARDE D'IDENTITÉ (25/07) : la recherche plein texte ramenait des entités VOISINES
    // (« Giorno's Mother » → article de Giorno ; « Super 17-gou » → Android 17). On compare
    // les ensembles de mots significatifs : titre et nom doivent désigner la même entité.
    sameEntity: sameEntityName(name, j.parse.title ?? title),
  };
  await writeFile(file, JSON.stringify(out));
  await sleep(250);                                 // politesse Fandom
  return out;
}

/** LES SECTIONS D'UNE PAGE — le découpage du travail par le wiki lui-même (L26, 01/08/2026).
 *
 *  Pourquoi : une fiche de 800 caractères produite depuis une fenêtre de 6 000 ne pouvait pas
 *  rendre justice à une page de 246 738 caractères — mesuré sur Naruto Uzumaki, l'agent voyait
 *  2,4 % de la page et en produisait 0,3 %. Le remède n'est pas d'agrandir la fenêtre (aucun
 *  modèle n'avale 250 000 caractères utilement) mais de DÉCOUPER : une section fait ~3 000
 *  caractères, tient sans troncature, porte un sujet homogène, et se juge contre sa propre
 *  source — pas contre un résumé.
 *
 *  Le wiki fournit lui-même le découpage (prop=sections), et sert chaque section isolément
 *  (&section=N) : on ne devine rien, on suit sa structure.
 *
 *  @returns {Promise<{title:string,url:string,sections:Array<{index:string,titre:string,texte:string}>}|null>}
 */
export async function fetchFandomSections(universe, name, { minChars = 350, maxSections = 24 } = {}) {
  const api = wikiApi(universe);
  if (!api) return null;

  // On réutilise la résolution de titre éprouvée (redirections, alias, recherche plein texte).
  const page = await fetchFandomProse(universe, name, { maxChars: 500 });
  if (!page?.title) return null;
  const titre = page.title;

  const j = await wget(`${api}?action=parse&page=${encodeURIComponent(titre)}&prop=sections&redirects=1&format=json&formatversion=2`);
  const brutes = j?.parse?.sections ?? [];
  if (!brutes.length) return { title: titre, url: page.url, sections: [] };

  // Sections de tête uniquement : les sous-sous-parties (toclevel 3+) sont trop fines pour
  // porter une fiche, et gonfleraient la facture sans rien ajouter au lecteur.
  // On écarte ce qui ne raconte rien (références, galeries, liens externes). Trivia RESTE :
  // c'est de la matière canon (14 anecdotes sourcées sur Sharingan), pas du remplissage.
  const IGNORE = /^(references?|notes?|gallery|galerie|external links?|see also|navigation)$/i;
  const retenues = brutes
    .filter((s) => Number(s.toclevel) <= 2 && !IGNORE.test(String(s.line).trim()))
    .slice(0, maxSections);

  const sections = [];
  for (const s of retenues) {
    const p = await wget(`${api}?action=parse&page=${encodeURIComponent(titre)}&section=${s.index}&prop=text&redirects=1&format=json&formatversion=2`);
    const html = String(p?.parse?.text ?? '')
      .replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<table[\s\S]*?<\/table>/g, ' ')          // infobox et navbox : déjà récoltées ailleurs
      .replace(/<sup[\s\S]*?<\/sup>/g, ' ');             // appels de note « [12] »
    const texte = html.replace(/<[^>]+>/g, ' ').replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' ').trim()
      // Le rendu répète le titre de la section et son crochet d'édition en tête : « Acquisition [ ] … »
      .replace(new RegExp('^' + String(s.line).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\[?\\s*\\]?\\s*', 'i'), '')
      .trim();
    // Une section trop courte n'a pas de quoi nourrir une fiche — on ne paie pas pour du vide.
    if (texte.length >= minChars) sections.push({ index: String(s.index), titre: String(s.line).trim(), texte });
    await sleep(250);                                     // même rythme que le reste de la lib
  }
  return { title: titre, url: page.url, sections };
}
