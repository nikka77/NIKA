// scripts/lib/fandom.mjs — connecteur Fandom (API MediaWiki publique, sans clé) pour AKASHA.
// Récupère les attaques/techniques d'un univers depuis son wiki communautaire, avec le lien
// personnage→technique quand le wiki expose des pages « List of techniques used by X ».
// Rate-limit courtois (~5 req/s max) : Fandom tolère mais on temporise.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wget(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative)' } });
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

/** Wikitext brut → prose lisible (templates, liens wiki, refs, balises, titres). */
export function cleanWikitext(wt) {
  let s = wt ?? '';
  for (let i = 0; i < 6; i++) s = s.replace(/\{\{[^{}]*\}\}/g, '');       // templates imbriqués
  s = s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/<ref[^>]*\/>/g, '');
  s = s.replace(/\[\[(?:File|Image|Fichier):[^\]]*\]\]/gi, '');
  s = s.replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1');                  // déwikifier
  s = s.replace(/<\/?[^>]+>/g, '');
  s = s.replace(/^=+\s*(.+?)\s*=+$/gm, '\n§ $1');                          // sections → marqueurs
  s = s.replace(/'''?/g, '').replace(/^\s*[*#:]+\s*/gm, '· ');
  return s.replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
}

const CACHE_DIR = new URL('../../.ops-cache/fandom/', import.meta.url).pathname;

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
export function sameEntityName(name, title) {
  const a = nameWords(name), b = nameWords(title);
  if (!a.size || !b.size) return false;
  const inter = [...a].filter((w) => b.has(w)).length;
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
  const file = `${CACHE_DIR}${createHash('sha1').update(`${universe}:${name}`).digest('hex').slice(0, 16)}.json`;
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { /* cache froid */ }

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
    text: cleanWikitext(j.parse.wikitext).slice(0, maxChars),
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
